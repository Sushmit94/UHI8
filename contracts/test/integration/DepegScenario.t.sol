import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";

import {DepegGuardianHook} from "../../src/DepegGuardianHook.sol";
import {IDepegGuardian} from "../../src/interfaces/IDepegGuardian.sol";
import {MockChainlinkOracle} from "../mocks/MockChainlinkOracle.sol";

/// @title DepegScenarioTest
/// @notice Integration tests simulating real-world depeg scenarios
contract DepegScenarioTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    DepegGuardianHook hook;
    MockChainlinkOracle oracle;
    address guardian = address(this);

    PoolKey poolKey;
    PoolId poolId;

    function setUp() public {
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        oracle = new MockChainlinkOracle(1e8, 8);

        uint160 flags = uint160(
            Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG
        );
        address hookAddr = address(flags);
        deployCodeTo("DepegGuardianHook.sol", abi.encode(manager, guardian, 3600), hookAddr);
        hook = DepegGuardianHook(hookAddr);

        poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: hook
        });
        poolId = poolKey.toId();

        manager.initialize(poolKey, SQRT_PRICE_1_1);

        IDepegGuardian.GuardianConfig memory config = IDepegGuardian.GuardianConfig({
            oracle: address(oracle),
            driftWarningBps: 10,
            circuitBreakerBps: 200,
            baseFee: 3000,
            maxMultiplier: 15,
            maxOracleAge: 3600,
            tickRange: 50
        });
        hook.registerPool(poolKey, config);

        // Add initial liquidity
        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({
                tickLower: -600,
                tickUpper: 600,
                liquidityDelta: 100e18,
                salt: bytes32(0)
            }),
            ""
        );
    }

    /// @notice Simulate the USDC SVB depeg: $1.00 → $0.877
    function test_USDC_SVB_DepegScenario() public {
        // Stage 1: Start at peg
        IDepegGuardian.GuardianState memory state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.PEGGED, "Should start PEGGED");

        // Stage 2: Slight drift to $0.999 (10 bps)
        oracle.setPrice(0.999e8);
        _swap();
        state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.DRIFTING, "Should be DRIFTING at $0.999");
        assertEq(state.depegBps, 10);

        // Stage 3: Worsening to $0.995 (50 bps)
        oracle.setPrice(0.995e8);
        _swap();
        state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.DRIFTING, "Should be DRIFTING at $0.995");
        assertEq(state.depegBps, 50);

        // Stage 4: Critical drift to $0.985 (150 bps)
        oracle.setPrice(0.985e8);
        _swap();
        state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.DRIFTING, "Should be DRIFTING at $0.985");
        assertEq(state.depegBps, 150);

        // Stage 5: Circuit breaker at $0.98 (200 bps)
        oracle.setPrice(0.98e8);
        _swap(); // This swap goes through, but afterSwap triggers pause
        state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.DEPEGGED, "Should be DEPEGGED at $0.98");
        assertTrue(state.swapsPaused, "Swaps should be paused");

        // Stage 6: Further depeg to $0.877 — swaps should be blocked
        oracle.setPrice(0.877e8);
        vm.expectRevert(IDepegGuardian.SwapsPaused.selector);
        _swap();

        // Stage 7: Recovery back to $1.00 after cooldown
        oracle.setPrice(1e8);
        vm.warp(block.timestamp + 3601); // Past cooldown

        // Force resume as guardian
        hook.forceResumeSwaps();

        // Need to also clear the per-pool pause state by doing a swap
        // Actually, we need to trigger state update
        // Reset the internal state via a swap
        _swap();
        state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.PEGGED, "Should recover to PEGGED");
    }

    /// @notice Test gradual fee increase during drift
    function test_GradualFeeIncrease() public {
        // At 0 bps (PEGGED): fee = 3000
        IDepegGuardian.GuardianState memory state = hook.getDepegState(poolId);
        assertEq(state.currentFee, 3000, "Base fee at peg");

        // At 50 bps: fee = 3000 * 1.875 = 5625
        oracle.setPrice(0.995e8);
        _swap();
        state = hook.getDepegState(poolId);
        assertEq(state.currentFee, 5625, "Fee at 50 bps drift");

        // At 100 bps: fee = 3000 * 4.5 = 13500
        oracle.setPrice(0.99e8);
        _swap();
        state = hook.getDepegState(poolId);
        assertEq(state.currentFee, 13500, "Fee at 100 bps drift");

        // At 150 bps: fee = 3000 * (1 + 14 * 0.5625) = 3000 * 8.875 = 26625
        oracle.setPrice(0.985e8);
        _swap();
        state = hook.getDepegState(poolId);
        assertEq(state.currentFee, 26625, "Fee at 150 bps drift");
    }

    /// @notice Test recovery sequence: DEPEGGED → PEGGED
    function test_RecoverySequence() public {
        // Trigger depeg
        oracle.setPrice(0.97e8);
        _swap();

        IDepegGuardian.GuardianState memory state = hook.getDepegState(poolId);
        assertTrue(state.swapsPaused, "Should be paused");

        // Guardian force resumes
        hook.forceResumeSwaps();

        // Oracle recovers
        oracle.setPrice(1e8);
        _swap();

        state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.PEGGED, "Should recover");
        assertFalse(state.swapsPaused, "Should be unpaused");
    }

    function _swap() internal {
        swapRouter.swap(
            poolKey,
            SwapParams({
                zeroForOne: true,
                amountSpecified: -1e15,
                sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            
            ""
        );
    }
}

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

contract DepegGuardianHookTest is Test, Deployers {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    DepegGuardianHook hook;
    MockChainlinkOracle oracle;
    address guardian = address(this);

    PoolKey poolKey;
    PoolId poolId;

    function setUp() public {
        // Deploy Uniswap v4 manager and routers
        deployFreshManagerAndRouters();
        deployMintAndApprove2Currencies();

        // Deploy mock oracle at $1.00 (1e8 with 8 decimals)
        oracle = new MockChainlinkOracle(1e8, 8);

        // Deploy hook with correct flags
        // beforeSwap + afterSwap + beforeAddLiquidity
        uint160 flags = uint160(
            Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG
        );

        // Deploy hook to address with correct flags
        address hookAddr = address(flags);
        deployCodeTo("DepegGuardianHook.sol", abi.encode(manager, guardian, 3600), hookAddr);
        hook = DepegGuardianHook(hookAddr);

        // Create pool key with dynamic fees
        poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: hook
        });
        poolId = poolKey.toId();

        // Initialize pool at 1:1
        manager.initialize(poolKey, SQRT_PRICE_1_1);

        // Register pool with guardian
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
    }

    // ─── Registration ────────────────────────────────────────────────────────────

    function test_RegisterPool_Success() public view {
        assertTrue(hook.isPoolRegistered(poolId));
    }

    function test_RegisterPool_InitialState() public view {
        IDepegGuardian.GuardianState memory state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.PEGGED);
        assertEq(state.depegBps, 0);
        assertFalse(state.swapsPaused);
    }

    function test_RegisterPool_DuplicateReverts() public {
        IDepegGuardian.GuardianConfig memory config = IDepegGuardian.GuardianConfig({
            oracle: address(oracle),
            driftWarningBps: 10,
            circuitBreakerBps: 200,
            baseFee: 3000,
            maxMultiplier: 15,
            maxOracleAge: 3600,
            tickRange: 50
        });
        vm.expectRevert(abi.encodeWithSelector(IDepegGuardian.PoolAlreadyRegistered.selector, poolId));
        hook.registerPool(poolKey, config);
    }

    function test_RegisterPool_InvalidConfig_ZeroOracle() public {
        PoolKey memory newKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 10,
            hooks: hook
        });

        IDepegGuardian.GuardianConfig memory config = IDepegGuardian.GuardianConfig({
            oracle: address(0),
            driftWarningBps: 10,
            circuitBreakerBps: 200,
            baseFee: 3000,
            maxMultiplier: 15,
            maxOracleAge: 3600,
            tickRange: 50
        });
        vm.expectRevert(IDepegGuardian.InvalidConfig.selector);
        hook.registerPool(newKey, config);
    }

    // ─── Config ──────────────────────────────────────────────────────────────────

    function test_GetConfig() public view {
        IDepegGuardian.GuardianConfig memory config = hook.getConfig(poolId);
        assertEq(config.oracle, address(oracle));
        assertEq(config.driftWarningBps, 10);
        assertEq(config.circuitBreakerBps, 200);
        assertEq(config.baseFee, 3000);
        assertEq(config.maxMultiplier, 15);
    }

    function test_UpdateConfig() public {
        IDepegGuardian.GuardianConfig memory newConfig = IDepegGuardian.GuardianConfig({
            oracle: address(oracle),
            driftWarningBps: 20,
            circuitBreakerBps: 300,
            baseFee: 5000,
            maxMultiplier: 10,
            maxOracleAge: 7200,
            tickRange: 100
        });
        hook.updateConfig(poolKey, newConfig);

        IDepegGuardian.GuardianConfig memory config = hook.getConfig(poolId);
        assertEq(config.driftWarningBps, 20);
        assertEq(config.circuitBreakerBps, 300);
    }

    // ─── State Transitions ───────────────────────────────────────────────────────

    function test_StateTransition_PeggedToDrifting() public {
        // Set oracle to $0.999 (10 bps drift)
        oracle.setPrice(0.999e8);

        // Trigger state update via swap
        _addLiquidity();
        _swap();

        IDepegGuardian.GuardianState memory state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.DRIFTING, "Should transition to DRIFTING");
        assertEq(state.depegBps, 10);
    }

    function test_StateTransition_DriftingToDepegged() public {
        // Set oracle to $0.98 (200 bps = circuit breaker)
        oracle.setPrice(0.98e8);

        _addLiquidity();

        // Swap should revert because circuit breaker will be triggered
        // and afterSwap will pause
        // Actually, the first beforeSwap call updates state and computes fee
        // but doesn't pause yet. afterSwap pauses.
        // The NEXT swap will revert.
        _swap();

        IDepegGuardian.GuardianState memory state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.DEPEGGED, "Should transition to DEPEGGED");
        assertTrue(state.swapsPaused, "Swaps should be paused");
    }

    // ─── TWAP ────────────────────────────────────────────────────────────────────

    function test_TwapPrice_InitializedAtPeg() public view {
        uint256 twap = hook.getTwapPrice(poolId);
        assertEq(twap, 1e18, "TWAP should be initialized at peg price");
    }

    // ─── Stale Oracle ────────────────────────────────────────────────────────────

    function test_StaleOracle_MaxFee() public {
        // Set oracle updatedAt to 2 hours ago (stale)
        oracle.setUpdatedAt(block.timestamp - 7200);

        _addLiquidity();

        // beforeSwap sees stale oracle → sets max fee
        // It also transitions to DEPEGGED state
        // afterSwap will then pause swaps
        _swap();

        IDepegGuardian.GuardianState memory state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.DEPEGGED, "Stale oracle should trigger DEPEGGED");
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────────

    function _addLiquidity() internal {
        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            IPoolManager.ModifyLiquidityParams({
                tickLower: -120,
                tickUpper: 120,
                liquidityDelta: 1e18,
                salt: bytes32(0)
            }),
            ""
        );
    }

    function _swap() internal {
        swapRouter.swap(
            poolKey,
            IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -1e15,
                sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
           
            ""
        );
    }
}

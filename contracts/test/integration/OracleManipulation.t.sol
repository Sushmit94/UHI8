// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
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

/// @title OracleManipulationTest
/// @notice Tests for flash loan attack resistance via TWAP validation
contract OracleManipulationTest is Test, Deployers {
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

    /// @notice Test that a sudden oracle price spike (simulating flash loan manipulation)
    ///         is caught by the TWAP guard
    function test_FlashLoanResistance_SuddenSpike() public {
        // Do several swaps at normal price to establish TWAP
        for (uint256 i = 0; i < 5; i++) {
            _swap();
            vm.warp(block.timestamp + 12); // One block
        }

        // TWAP should be near $1.00
        uint256 twap = hook.getTwapPrice(poolId);
        assertApproxEqRel(twap, 1e18, 0.01e18, "TWAP should be near $1.00");

        // Simulate flash loan attack: oracle suddenly reports $0.90
        // This is a >5% deviation from TWAP ($1.00)
        oracle.setPrice(0.90e8);

        // Swap - the TWAP guard should prevent using the manipulated spot price
        _swap();

        // State should use TWAP price instead of manipulated spot
        IDepegGuardian.GuardianState memory state = hook.getDepegState(poolId);
        // Price should be closer to TWAP than to the manipulated $0.90
        assertTrue(
            state.lastOraclePrice > 0.95e18,
            "TWAP guard should prevent using manipulated price"
        );
    }

    /// @notice Test that gradual price changes pass the TWAP guard
    function test_GradualPriceChange_PassesTwapGuard() public {
        // Gradually decrease price
        int256[] memory prices = new int256[](5);
        prices[0] = 0.998e8;
        prices[1] = 0.996e8;
        prices[2] = 0.994e8;
        prices[3] = 0.992e8;
        prices[4] = 0.990e8;

        for (uint256 i = 0; i < prices.length; i++) {
            oracle.setPrice(prices[i]);
            _swap();
            vm.warp(block.timestamp + 12);
        }

        // State should reflect the actual price (not TWAP override)
        IDepegGuardian.GuardianState memory state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.DRIFTING, "Should be DRIFTING");
    }

    /// @notice Test that invalid oracle data is rejected
    function test_InvalidOracleData_Reverts() public {
        oracle.setInvalidRound(); // roundId = 0

        // Uniswap v4 wraps hook reverts in WrappedError, so expect any revert
        vm.expectRevert();
        _swap();
    }

    /// @notice Test stale oracle fallback to maximum fee
    function test_StaleOracle_FallbackToMaxFee() public {
        // Warp forward so timestamp subtraction doesn't underflow
        vm.warp(10000);

        // Set oracle timestamp to be stale (>maxOracleAge)
        oracle.setUpdatedAt(block.timestamp - 7200); // 2 hours old, max is 3600

        // Use addLiquidity to trigger _updateOracleState (swap would revert immediately)
        modifyLiquidityRouter.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({
                tickLower: -600,
                tickUpper: 600,
                liquidityDelta: 1e18,
                salt: bytes32(uint256(3))
            }),
            ""
        );

        IDepegGuardian.GuardianState memory state = hook.getDepegState(poolId);
        assertTrue(state.state == IDepegGuardian.DepegState.DEPEGGED, "Stale oracle -> DEPEGGED");
        assertEq(state.depegBps, 200, "Should use circuitBreakerBps");
        assertTrue(state.swapsPaused, "Swaps should be paused");
    }

    /// @notice Test multiple rapid oracle updates
    function test_RapidOracleUpdates() public {
        // Rapid price oscillation within same block
        oracle.setPrice(0.999e8);
        _swap();

        oracle.setPrice(1.001e8);
        _swap();

        oracle.setPrice(0.998e8);
        _swap();

        // Should remain operational
        IDepegGuardian.GuardianState memory state = hook.getDepegState(poolId);
        assertTrue(
            state.state == IDepegGuardian.DepegState.PEGGED || state.state == IDepegGuardian.DepegState.DRIFTING,
            "Should still be operational after rapid updates"
        );
    }

    function _swap() internal {
        swapRouter.swap(
            poolKey,
            SwapParams({
                zeroForOne: true,
                amountSpecified: -1e15,
                sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
            }),
            PoolSwapTest.TestSettings({
                takeClaims: false,
                settleUsingBurn: false
            }),
            ""
        );
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {DepegMath} from "../../src/libraries/DepegMath.sol";

contract DepegMathTest is Test {
    uint256 constant PRECISION = 1e18;

    // ─── computeFeeMultiplier ────────────────────────────────────────────────────

    function test_FeeMultiplier_ZeroDepeg() public pure {
        uint256 multiplier = DepegMath.computeFeeMultiplier(0, 200, 15);
        assertEq(multiplier, PRECISION, "Zero depeg should return 1x");
    }

    function test_FeeMultiplier_MaxDepeg() public pure {
        uint256 multiplier = DepegMath.computeFeeMultiplier(200, 200, 15);
        assertEq(multiplier, 15 * PRECISION, "At circuit breaker should return maxMultiplier");
    }

    function test_FeeMultiplier_AboveCircuitBreaker() public pure {
        uint256 multiplier = DepegMath.computeFeeMultiplier(300, 200, 15);
        assertEq(multiplier, 15 * PRECISION, "Above circuit breaker should cap at maxMultiplier");
    }

    function test_FeeMultiplier_HalfwayDepeg() public pure {
        // At 100 bps with circuitBreaker=200, ratio=0.5, ratio²=0.25
        // multiplier = 1 + (15-1) * 0.25 = 1 + 3.5 = 4.5
        uint256 multiplier = DepegMath.computeFeeMultiplier(100, 200, 15);
        assertEq(multiplier, 4.5e18, "Halfway depeg should give 4.5x multiplier");
    }

    function test_FeeMultiplier_QuarterDepeg() public pure {
        // At 50 bps with circuitBreaker=200, ratio=0.25, ratio²=0.0625
        // multiplier = 1 + (15-1) * 0.0625 = 1 + 0.875 = 1.875
        uint256 multiplier = DepegMath.computeFeeMultiplier(50, 200, 15);
        assertEq(multiplier, 1.875e18, "Quarter depeg should give 1.875x multiplier");
    }

    function test_FeeMultiplier_ZeroCircuitBreaker() public pure {
        uint256 multiplier = DepegMath.computeFeeMultiplier(100, 0, 15);
        assertEq(multiplier, 15 * PRECISION, "Zero circuit breaker should return maxMultiplier");
    }

    // ─── computeDynamicFee ───────────────────────────────────────────────────────

    function test_DynamicFee_BaseFeeAtZeroDepeg() public pure {
        uint24 fee = DepegMath.computeDynamicFee(3000, 0, 200, 15);
        assertEq(fee, 3000, "Zero depeg should return base fee");
    }

    function test_DynamicFee_MaxFeeAtCircuitBreaker() public pure {
        uint24 fee = DepegMath.computeDynamicFee(3000, 200, 200, 15);
        assertEq(fee, 45000, "At circuit breaker: 3000 * 15 = 45000");
    }

    function test_DynamicFee_CapsAtMillion() public pure {
        // If baseFee * maxMultiplier > 1_000_000, cap
        uint24 fee = DepegMath.computeDynamicFee(100000, 200, 200, 15);
        assertEq(fee, 1_000_000, "Should cap at 1_000_000");
    }

    // ─── computeDepegBps ─────────────────────────────────────────────────────────

    function test_DepegBps_AtPeg() public pure {
        uint256 bps = DepegMath.computeDepegBps(1e18, 1e18);
        assertEq(bps, 0, "At peg should be 0 bps");
    }

    function test_DepegBps_TenBpsBelow() public pure {
        // $0.999 → 0.1% = 10 bps
        uint256 bps = DepegMath.computeDepegBps(0.999e18, 1e18);
        assertEq(bps, 10, "0.1% deviation should be 10 bps");
    }

    function test_DepegBps_TwoPercentBelow() public pure {
        // $0.98 → 2% = 200 bps
        uint256 bps = DepegMath.computeDepegBps(0.98e18, 1e18);
        assertEq(bps, 200, "2% deviation should be 200 bps");
    }

    function test_DepegBps_AbovePeg() public pure {
        // $1.01 → 1% = 100 bps
        uint256 bps = DepegMath.computeDepegBps(1.01e18, 1e18);
        assertEq(bps, 100, "1% above peg should be 100 bps");
    }

    function test_DepegBps_SVBScenario() public pure {
        // $0.877 → 12.3% = 1230 bps
        uint256 bps = DepegMath.computeDepegBps(0.877e18, 1e18);
        assertEq(bps, 1230, "SVB scenario at $0.877 should be 1230 bps");
    }

    // ─── normalizePrice ──────────────────────────────────────────────────────────

    function test_NormalizePrice_8Decimals() public pure {
        // Chainlink returns 1e8 for $1.00
        uint256 normalized = DepegMath.normalizePrice(1e8, 8);
        assertEq(normalized, 1e18, "8 decimal price should normalize to 1e18");
    }

    function test_NormalizePrice_18Decimals() public pure {
        uint256 normalized = DepegMath.normalizePrice(1e18, 18);
        assertEq(normalized, 1e18, "18 decimal price should stay 1e18");
    }

    function test_NormalizePrice_NegativeReverts() public {
        vm.expectRevert("DepegMath: negative price");
        DepegMath.normalizePrice(-1, 8);
    }

    // ─── classifyState ───────────────────────────────────────────────────────────

    function test_ClassifyState_Pegged() public pure {
        uint8 state = DepegMath.classifyState(5, 10, 200);
        assertEq(state, 0, "Below drift threshold should be PEGGED");
    }

    function test_ClassifyState_Drifting() public pure {
        uint8 state = DepegMath.classifyState(50, 10, 200);
        assertEq(state, 1, "Between thresholds should be DRIFTING");
    }

    function test_ClassifyState_Depegged() public pure {
        uint8 state = DepegMath.classifyState(200, 10, 200);
        assertEq(state, 2, "At circuit breaker should be DEPEGGED");
    }

    function test_ClassifyState_AtDriftBoundary() public pure {
        uint8 state = DepegMath.classifyState(10, 10, 200);
        assertEq(state, 1, "Exactly at drift threshold should be DRIFTING");
    }

    // ─── Fuzz Tests ──────────────────────────────────────────────────────────────

    function testFuzz_FeeMultiplier_Monotonic(uint256 depeg1, uint256 depeg2) public pure {
        depeg1 = bound(depeg1, 0, 200);
        depeg2 = bound(depeg2, depeg1, 200);

        uint256 m1 = DepegMath.computeFeeMultiplier(depeg1, 200, 15);
        uint256 m2 = DepegMath.computeFeeMultiplier(depeg2, 200, 15);

        assertTrue(m2 >= m1, "Fee multiplier should be monotonically increasing");
    }

    function testFuzz_DepegBps_Symmetric(uint256 price) public pure {
        price = bound(price, 0.5e18, 1.5e18);
        uint256 bps = DepegMath.computeDepegBps(price, 1e18);
        assertTrue(bps <= 5000, "Bps should not exceed 50%");
    }
}

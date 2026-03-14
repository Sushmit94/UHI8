// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {TickRebalancer} from "../../src/libraries/TickRebalancer.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

contract TickRebalancerTest is Test {
    // ─── getTickFromPrice ────────────────────────────────────────────────────────

    function test_GetTickFromPrice_AtPeg() public pure {
        int24 tick = TickRebalancer.getTickFromPrice(1e18);
        // At $1.00, tick should be near 0
        assertTrue(tick >= -10 && tick <= 10, "At peg, tick should be near 0");
    }

    function test_GetTickFromPrice_BelowPeg() public pure {
        int24 tick = TickRebalancer.getTickFromPrice(0.99e18);
        assertTrue(tick < 0, "Below peg should give negative tick");
    }

    // ─── computeRebalancedRange ──────────────────────────────────────────────────

    function test_ComputeRebalancedRange_AtPeg() public pure {
        (int24 tickLower, int24 tickUpper) = TickRebalancer.computeRebalancedRange(1e18, 50, 10);
        assertTrue(tickLower < tickUpper, "tickLower must be less than tickUpper");
        assertTrue(tickLower >= TickMath.MIN_TICK, "tickLower should be above MIN_TICK");
        assertTrue(tickUpper <= TickMath.MAX_TICK, "tickUpper should be below MAX_TICK");
    }

    function test_ComputeRebalancedRange_TickSpacingAlignment() public pure {
        (int24 tickLower, int24 tickUpper) = TickRebalancer.computeRebalancedRange(1e18, 50, 60);
        assertEq(tickLower % 60, 0, "tickLower should be aligned to tickSpacing");
        assertEq(tickUpper % 60, 0, "tickUpper should be aligned to tickSpacing");
    }

    function test_ComputeRebalancedRange_WideRange() public pure {
        (int24 tickLower, int24 tickUpper) = TickRebalancer.computeRebalancedRange(1e18, 500, 10);
        int24 width = tickUpper - tickLower;
        assertTrue(width >= 1000, "Width should be at least 2 * tickRange");
    }

    // ─── isOutOfRange ────────────────────────────────────────────────────────────

    function test_IsOutOfRange_InRange() public pure {
        assertFalse(TickRebalancer.isOutOfRange(0, -50, 50), "0 is in range [-50, 50]");
    }

    function test_IsOutOfRange_Below() public pure {
        assertTrue(TickRebalancer.isOutOfRange(-51, -50, 50), "-51 is below range [-50, 50]");
    }

    function test_IsOutOfRange_Above() public pure {
        assertTrue(TickRebalancer.isOutOfRange(51, -50, 50), "51 is above range [-50, 50]");
    }

    function test_IsOutOfRange_AtBoundary() public pure {
        assertFalse(TickRebalancer.isOutOfRange(-50, -50, 50), "At lower boundary should be in range");
        assertFalse(TickRebalancer.isOutOfRange(50, -50, 50), "At upper boundary should be in range");
    }

    // ─── alignTickDown / alignTickUp ─────────────────────────────────────────────

    function test_AlignTickDown() public pure {
        assertEq(TickRebalancer.alignTickDown(55, 10), 50);
        assertEq(TickRebalancer.alignTickDown(50, 10), 50);
        assertEq(TickRebalancer.alignTickDown(-55, 10), -60);
    }

    function test_AlignTickUp() public pure {
        assertEq(TickRebalancer.alignTickUp(55, 10), 60);
        assertEq(TickRebalancer.alignTickUp(50, 10), 50);
        assertEq(TickRebalancer.alignTickUp(-55, 10), -50);
    }

    // ─── sqrt ────────────────────────────────────────────────────────────────────

    function test_Sqrt_Zero() public pure {
        assertEq(TickRebalancer.sqrt(0), 0);
    }

    function test_Sqrt_PerfectSquare() public pure {
        assertEq(TickRebalancer.sqrt(16), 4);
        assertEq(TickRebalancer.sqrt(100), 10);
    }

    function test_Sqrt_NonPerfect() public pure {
        assertEq(TickRebalancer.sqrt(10), 3); // floor
    }

    function test_Sqrt_Large() public pure {
        // sqrt(1e18) = 1e9
        assertEq(TickRebalancer.sqrt(1e18), 1e9);
    }
}

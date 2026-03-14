// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {CircuitBreaker} from "../../src/base/CircuitBreaker.sol";

/// @dev Concrete implementation of CircuitBreaker for testing
contract TestableCircuitBreaker is CircuitBreaker {
    constructor(address _guardian, uint256 _cooldownSeconds) CircuitBreaker(_guardian, _cooldownSeconds) {}

    /// @notice Expose internal _pauseSwaps for testing
    function testPauseSwaps(uint256 depegBps) external {
        _pauseSwaps(depegBps);
    }

    /// @notice Expose internal _resumeSwaps for testing
    function testResumeSwaps() external {
        _resumeSwaps();
    }
}

contract CircuitBreakerTest is Test {
    TestableCircuitBreaker breaker;
    address guardian = address(0xBEEF);
    address nonGuardian = address(0xDEAD);

    function setUp() public {
        breaker = new TestableCircuitBreaker(guardian, 3600); // 1 hour cooldown
    }

    // ─── Constructor ─────────────────────────────────────────────────────────────

    function test_Constructor_SetsGuardian() public view {
        assertEq(breaker.guardian(), guardian);
    }

    function test_Constructor_SetsCooldown() public view {
        assertEq(breaker.cooldownSeconds(), 3600);
    }

    function test_Constructor_NotPaused() public view {
        assertFalse(breaker.swapsPaused());
    }

    function test_Constructor_ZeroAddressReverts() public {
        vm.expectRevert(CircuitBreaker.InvalidGuardian.selector);
        new TestableCircuitBreaker(address(0), 3600);
    }

    // ─── Pause ───────────────────────────────────────────────────────────────────

    function test_PauseSwaps_GuardianCanPause() public {
        vm.prank(guardian);
        breaker.pauseSwaps(200);
        assertTrue(breaker.swapsPaused());
    }

    function test_PauseSwaps_NonGuardianReverts() public {
        vm.prank(nonGuardian);
        vm.expectRevert(CircuitBreaker.NotGuardian.selector);
        breaker.pauseSwaps(200);
    }

    function test_PauseSwaps_DoubleReverts() public {
        vm.startPrank(guardian);
        breaker.pauseSwaps(200);
        vm.expectRevert(CircuitBreaker.AlreadyPaused.selector);
        breaker.pauseSwaps(200);
        vm.stopPrank();
    }

    function test_PauseSwaps_EmitsEvent() public {
        vm.prank(guardian);
        vm.expectEmit(false, false, false, true);
        emit CircuitBreaker.SwapsPaused(block.timestamp, 200);
        breaker.pauseSwaps(200);
    }

    // ─── Resume ──────────────────────────────────────────────────────────────────

    function test_ResumeSwaps_AfterCooldown() public {
        vm.prank(guardian);
        breaker.pauseSwaps(200);

        // Fast forward past cooldown
        vm.warp(block.timestamp + 3601);

        vm.prank(guardian);
        breaker.resumeSwaps();
        assertFalse(breaker.swapsPaused());
    }

    function test_ResumeSwaps_DuringCooldownReverts() public {
        vm.prank(guardian);
        breaker.pauseSwaps(200);

        // Only fast forward 1800s (half cooldown)
        vm.warp(block.timestamp + 1800);

        vm.prank(guardian);
        vm.expectRevert(abi.encodeWithSelector(CircuitBreaker.CooldownActive.selector, 1800));
        breaker.resumeSwaps();
    }

    function test_ResumeSwaps_WhenNotPausedReverts() public {
        vm.prank(guardian);
        vm.expectRevert(CircuitBreaker.NotPaused.selector);
        breaker.resumeSwaps();
    }

    // ─── Force Resume ────────────────────────────────────────────────────────────

    function test_ForceResumeSwaps_BypassesCooldown() public {
        vm.prank(guardian);
        breaker.pauseSwaps(200);

        // No time skip — force resume immediately
        vm.prank(guardian);
        breaker.forceResumeSwaps();
        assertFalse(breaker.swapsPaused());
    }

    function test_ForceResumeSwaps_NonGuardianReverts() public {
        vm.prank(guardian);
        breaker.pauseSwaps(200);

        vm.prank(nonGuardian);
        vm.expectRevert(CircuitBreaker.NotGuardian.selector);
        breaker.forceResumeSwaps();
    }

    // ─── Guardian Management ─────────────────────────────────────────────────────

    function test_SetGuardian() public {
        address newGuardian = address(0xCAFE);
        vm.prank(guardian);
        breaker.setGuardian(newGuardian);
        assertEq(breaker.guardian(), newGuardian);
    }

    function test_SetGuardian_ZeroAddressReverts() public {
        vm.prank(guardian);
        vm.expectRevert(CircuitBreaker.InvalidGuardian.selector);
        breaker.setGuardian(address(0));
    }

    function test_SetGuardian_NonGuardianReverts() public {
        vm.prank(nonGuardian);
        vm.expectRevert(CircuitBreaker.NotGuardian.selector);
        breaker.setGuardian(nonGuardian);
    }

    // ─── Cooldown Management ─────────────────────────────────────────────────────

    function test_SetCooldownSeconds() public {
        vm.prank(guardian);
        breaker.setCooldownSeconds(7200);
        assertEq(breaker.cooldownSeconds(), 7200);
    }

    function test_IsInCooldown_NotPaused() public view {
        assertFalse(breaker.isInCooldown());
    }

    function test_IsInCooldown_DuringCooldown() public {
        vm.prank(guardian);
        breaker.pauseSwaps(200);
        assertTrue(breaker.isInCooldown());
    }

    function test_IsInCooldown_AfterCooldown() public {
        vm.prank(guardian);
        breaker.pauseSwaps(200);
        vm.warp(block.timestamp + 3601);
        assertFalse(breaker.isInCooldown());
    }

    function test_CooldownRemaining() public {
        vm.prank(guardian);
        breaker.pauseSwaps(200);
        assertEq(breaker.cooldownRemaining(), 3600);

        vm.warp(block.timestamp + 1000);
        assertEq(breaker.cooldownRemaining(), 2600);

        vm.warp(block.timestamp + 2601);
        assertEq(breaker.cooldownRemaining(), 0);
    }

    // ─── Internal Functions ──────────────────────────────────────────────────────

    function test_InternalPauseSwaps() public {
        breaker.testPauseSwaps(500);
        assertTrue(breaker.swapsPaused());
        assertEq(breaker.pausedAt(), block.timestamp);
    }

    function test_InternalResumeSwaps_AfterCooldown() public {
        breaker.testPauseSwaps(500);
        vm.warp(block.timestamp + 3601);
        breaker.testResumeSwaps();
        assertFalse(breaker.swapsPaused());
    }
}

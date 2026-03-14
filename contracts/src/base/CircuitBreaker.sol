// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CircuitBreaker
/// @notice Base contract implementing pause/resume logic with cooldown period
/// @dev Intended to be inherited by the main hook contract
abstract contract CircuitBreaker {
    // ─── State ───────────────────────────────────────────────────────────────────

    /// @notice Whether swaps are currently paused
    bool public swapsPaused;

    /// @notice Timestamp when swaps were last paused
    uint256 public pausedAt;

    /// @notice Cooldown period in seconds before swaps can be resumed (default: 1 hour)
    uint256 public cooldownSeconds;

    /// @notice Address authorized to override pause/resume (should be multisig in prod)
    address public guardian;

    // ─── Events ──────────────────────────────────────────────────────────────────

    /// @notice Emitted when swaps are paused
    event SwapsPaused(uint256 timestamp, uint256 depegBps);

    /// @notice Emitted when swaps are resumed
    event SwapsResumed(uint256 timestamp, address triggeredBy);

    /// @notice Emitted when guardian address is updated
    event GuardianUpdated(address oldGuardian, address newGuardian);

    /// @notice Emitted when cooldown period is updated
    event CooldownUpdated(uint256 oldCooldown, uint256 newCooldown);

    // ─── Errors ──────────────────────────────────────────────────────────────────

    /// @notice Thrown when caller is not the guardian
    error NotGuardian();

    /// @notice Thrown when trying to pause already-paused swaps
    error AlreadyPaused();

    /// @notice Thrown when trying to resume already-active swaps
    error NotPaused();

    /// @notice Thrown when trying to resume during cooldown period
    error CooldownActive(uint256 remainingSeconds);

    /// @notice Thrown when setting invalid guardian address
    error InvalidGuardian();

    // ─── Modifiers ───────────────────────────────────────────────────────────────

    /// @notice Restricts function to guardian address only
    modifier onlyGuardian() {
        if (msg.sender != guardian) revert NotGuardian();
        _;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────────

    /// @param _guardian Initial guardian address
    /// @param _cooldownSeconds Initial cooldown period in seconds
    constructor(address _guardian, uint256 _cooldownSeconds) {
        if (_guardian == address(0)) revert InvalidGuardian();
        guardian = _guardian;
        cooldownSeconds = _cooldownSeconds;
    }

    // ─── Internal Functions ──────────────────────────────────────────────────────

    /// @notice Internal function to pause swaps (called by hook logic)
    /// @param depegBps Current depeg deviation in basis points
    function _pauseSwaps(uint256 depegBps) internal {
        if (swapsPaused) revert AlreadyPaused();

        swapsPaused = true;
        pausedAt = block.timestamp;

        emit SwapsPaused(block.timestamp, depegBps);
    }

    /// @notice Internal function to resume swaps (called after conditions met)
    function _resumeSwaps() internal {
        if (!swapsPaused) revert NotPaused();

        uint256 elapsed = block.timestamp - pausedAt;
        if (elapsed < cooldownSeconds) {
            revert CooldownActive(cooldownSeconds - elapsed);
        }

        swapsPaused = false;

        emit SwapsResumed(block.timestamp, msg.sender);
    }

    // ─── Guardian Functions ──────────────────────────────────────────────────────

    /// @notice Guardian can force-pause swaps
    /// @param depegBps Current depeg deviation for event logging
    function pauseSwaps(uint256 depegBps) external onlyGuardian {
        _pauseSwaps(depegBps);
    }

    /// @notice Guardian can resume swaps (still subject to cooldown)
    function resumeSwaps() external onlyGuardian {
        _resumeSwaps();
    }

    /// @notice Guardian can force-resume swaps bypassing cooldown
    function forceResumeSwaps() external onlyGuardian {
        if (!swapsPaused) revert NotPaused();
        swapsPaused = false;
        emit SwapsResumed(block.timestamp, msg.sender);
    }

    /// @notice Update the guardian address
    /// @param newGuardian New guardian address
    function setGuardian(address newGuardian) external onlyGuardian {
        if (newGuardian == address(0)) revert InvalidGuardian();
        address oldGuardian = guardian;
        guardian = newGuardian;
        emit GuardianUpdated(oldGuardian, newGuardian);
    }

    /// @notice Update the cooldown period
    /// @param newCooldown New cooldown period in seconds
    function setCooldownSeconds(uint256 newCooldown) external onlyGuardian {
        uint256 oldCooldown = cooldownSeconds;
        cooldownSeconds = newCooldown;
        emit CooldownUpdated(oldCooldown, newCooldown);
    }

    // ─── View Functions ──────────────────────────────────────────────────────────

    /// @notice Check if the cooldown period is active
    /// @return True if swaps are paused and cooldown hasn't elapsed
    function isInCooldown() public view returns (bool) {
        if (!swapsPaused) return false;
        return (block.timestamp - pausedAt) < cooldownSeconds;
    }

    /// @notice Get remaining cooldown time in seconds
    /// @return Seconds remaining, 0 if not in cooldown
    function cooldownRemaining() public view returns (uint256) {
        if (!swapsPaused) return 0;
        uint256 elapsed = block.timestamp - pausedAt;
        if (elapsed >= cooldownSeconds) return 0;
        return cooldownSeconds - elapsed;
    }
}

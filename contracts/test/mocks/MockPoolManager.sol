// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// MockPoolManager is not needed as we use Uniswap's Deployers test utility
// which provides a real PoolManager in test environments.
// This file is kept as a placeholder for any future custom pool manager mocking needs.

/// @title MockPoolManager
/// @notice Placeholder — tests use forge's Deployers utility for real PoolManager instances
/// @dev See test/unit/*.t.sol for test setup patterns
contract MockPoolManager {
    // In Uniswap v4 testing, we use the Deployers helper which deploys
    // a real PoolManager. This mock exists for potential future use
    // where isolated pool manager behavior testing is needed.
}

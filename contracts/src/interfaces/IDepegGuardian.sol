// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolId} from "@uniswap/v4-core/src/types/PoolId.sol";

/// @title IDepegGuardian
/// @notice Interface for the Depeg Guardian Hook state machine and configuration
interface IDepegGuardian {
    // ─── Enums ───────────────────────────────────────────────────────────────────

    /// @notice Peg states representing escalating protection tiers
    enum DepegState {
        PEGGED, //  Normal operations
        DRIFTING, // Dynamic fee widening (quadratic curve)
        DEPEGGED //  Circuit breaker halts swaps
    }

    // ─── Structs ─────────────────────────────────────────────────────────────────

    /// @notice Configuration for a monitored pool
    struct GuardianConfig {
        address oracle; //           Chainlink oracle address
        uint16 driftWarningBps; //   Basis points threshold for DRIFTING (default: 10 = 0.10%)
        uint16 circuitBreakerBps; // Basis points threshold for DEPEGGED (default: 200 = 2.00%)
        uint24 baseFee; //           Base fee in Uniswap v4 fee units
        uint16 maxMultiplier; //     Maximum fee multiplier (default: 15)
        uint32 maxOracleAge; //      Max oracle staleness in seconds (default: 3600)
        int24 tickRange; //          Half-width of rebalance tick range (default: 50)
    }

    /// @notice Snapshot of current pool guardian state
    struct GuardianState {
        DepegState state; //     Current peg state
        uint256 depegBps; //     Current depeg deviation in basis points
        uint256 currentFee; //   Current computed fee
        uint256 lastOraclePrice; // Last validated oracle price (18 decimals)
        uint256 lastUpdated; //  Timestamp of last state update
        bool swapsPaused; //     Whether circuit breaker is active
    }

    // ─── Events ──────────────────────────────────────────────────────────────────

    /// @notice Emitted when peg state transitions
    event DepegStateChanged(
        PoolId indexed poolId, DepegState oldState, DepegState newState, uint256 depegBps, uint256 oraclePrice
    );

    /// @notice Emitted when dynamic fee is updated
    event FeeUpdated(PoolId indexed poolId, uint24 oldFee, uint24 newFee, uint256 depegBps);

    /// @notice Emitted when a new pool is registered with the guardian
    event PoolRegistered(PoolId indexed poolId, address oracle, uint16 driftWarningBps, uint16 circuitBreakerBps);

    /// @notice Emitted when guardian configuration is updated
    event ConfigUpdated(PoolId indexed poolId, GuardianConfig config);

    /// @notice Emitted when oracle price is recorded for TWAP
    event TwapUpdated(PoolId indexed poolId, uint256 price, uint256 twapPrice);

    // ─── Errors ──────────────────────────────────────────────────────────────────

    /// @notice Thrown when swaps are paused by circuit breaker
    error SwapsCurrentlyPaused();

    /// @notice Thrown when oracle returns invalid data
    error InvalidOracleData();

    /// @notice Thrown when oracle data is stale
    error StaleOracleData(uint256 updatedAt, uint256 maxAge);

    /// @notice Thrown when spot price deviates too far from TWAP (flash loan guard)
    error SpotTwapDeviation(uint256 spotPrice, uint256 twapPrice, uint256 maxDeviationBps);

    /// @notice Thrown when pool is not registered
    error PoolNotRegistered(PoolId poolId);

    /// @notice Thrown when pool is already registered
    error PoolAlreadyRegistered(PoolId poolId);

    /// @notice Thrown when invalid configuration is provided
    error InvalidConfig();

    // ─── View Functions ──────────────────────────────────────────────────────────

    /// @notice Get the current guardian state for a pool
    function getDepegState(PoolId poolId) external view returns (GuardianState memory);

    /// @notice Get the guardian configuration for a pool
    function getConfig(PoolId poolId) external view returns (GuardianConfig memory);

    /// @notice Check if a pool is registered with the guardian
    function isPoolRegistered(PoolId poolId) external view returns (bool);
}

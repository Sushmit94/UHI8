// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";

import {IDepegGuardian} from "./interfaces/IDepegGuardian.sol";
import {IChainlinkOracle} from "./interfaces/IChainlinkOracle.sol";
import {DepegMath} from "./libraries/DepegMath.sol";
import {TickRebalancer} from "./libraries/TickRebalancer.sol";
import {CircuitBreaker} from "./base/CircuitBreaker.sol";

/// @title DepegGuardianHook
/// @notice Uniswap v4 hook that monitors stablecoin peg via Chainlink oracles
///         and responds across three escalating protection tiers:
///         PEGGED → normal operations
///         DRIFTING → dynamic fee widening (quadratic curve)
///         DEPEGGED → circuit breaker halts swaps
/// @dev This hook uses DYNAMIC FEES — Uniswap router will NOT natively route through it.
///      This is intentional for the UHI 8 Hookathon submission.
contract DepegGuardianHook is BaseHook, CircuitBreaker, IDepegGuardian {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    // ─── Constants ───────────────────────────────────────────────────────────────

    /// @notice Peg price for stablecoins (1e18 = $1.00)
    uint256 public constant PEG_PRICE = 1e18;

    /// @notice Max deviation between spot and TWAP before ignoring spot (500 = 5%)
    uint256 public constant MAX_TWAP_DEVIATION_BPS = 500;

    /// @notice Number of TWAP observations to maintain
    uint256 public constant TWAP_WINDOW = 10;

    // ─── Storage ─────────────────────────────────────────────────────────────────

    /// @notice Pool-specific guardian configurations
    mapping(PoolId => GuardianConfig) internal _configs;

    /// @notice Pool-specific state snapshots
    mapping(PoolId => GuardianState) internal _states;

    /// @notice Tracks which pools are registered
    mapping(PoolId => bool) internal _registered;

    /// @notice TWAP observation ring buffer per pool
    mapping(PoolId => uint256[10]) internal _twapObservations;

    /// @notice Current index in the TWAP ring buffer per pool
    mapping(PoolId => uint256) internal _twapIndex;

    /// @notice Number of observations recorded for TWAP per pool
    mapping(PoolId => uint256) internal _twapCount;

    // ─── Constructor ─────────────────────────────────────────────────────────────

    constructor(IPoolManager _poolManager, address _guardian, uint256 _cooldownSeconds)
        BaseHook(_poolManager)
        CircuitBreaker(_guardian, _cooldownSeconds)
    {}

    // ─── Hook Permissions ────────────────────────────────────────────────────────

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // ─── Pool Registration ───────────────────────────────────────────────────────

    /// @notice Register a pool with the guardian hook
    /// @param key The Uniswap v4 pool key
    /// @param config Guardian configuration for this pool
    function registerPool(PoolKey calldata key, GuardianConfig calldata config) external onlyGuardian {
        PoolId poolId = key.toId();
        if (_registered[poolId]) revert PoolAlreadyRegistered(poolId);

        _validateConfig(config);

        _configs[poolId] = config;
        _registered[poolId] = true;

        // Initialize state
        _states[poolId] = GuardianState({
            state: DepegState.PEGGED,
            depegBps: 0,
            currentFee: config.baseFee,
            lastOraclePrice: PEG_PRICE,
            lastUpdated: block.timestamp,
            swapsPaused: false
        });

        // Initialize TWAP with peg price
        for (uint256 i = 0; i < TWAP_WINDOW; i++) {
            _twapObservations[poolId][i] = PEG_PRICE;
        }
        _twapCount[poolId] = TWAP_WINDOW;

        emit PoolRegistered(poolId, config.oracle, config.driftWarningBps, config.circuitBreakerBps);
    }

    /// @notice Update configuration for a registered pool
    /// @param key The Uniswap v4 pool key
    /// @param config New guardian configuration
    function updateConfig(PoolKey calldata key, GuardianConfig calldata config) external onlyGuardian {
        PoolId poolId = key.toId();
        if (!_registered[poolId]) revert PoolNotRegistered(poolId);

        _validateConfig(config);
        _configs[poolId] = config;

        emit ConfigUpdated(poolId, config);
    }

    // ─── Hook Callbacks ──────────────────────────────────────────────────────────

    /// @notice Called before every swap — enforces circuit breaker and computes dynamic fee
    function beforeSwap(address, PoolKey calldata key, IPoolManager.SwapParams calldata, bytes calldata)
        external
        override
        onlyPoolManager
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        PoolId poolId = key.toId();

        // If pool isn't registered, pass through with no fee override
        if (!_registered[poolId]) {
            return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
        }

        // Update oracle state (no external calls that could be reentered)
        _updateOracleState(poolId);

        GuardianState storage state = _states[poolId];

        // Circuit breaker check
        if (state.swapsPaused) {
            revert SwapsPaused();
        }

        // Compute dynamic fee
        GuardianConfig storage config = _configs[poolId];
        uint24 dynamicFee = DepegMath.computeDynamicFee(
            config.baseFee, state.depegBps, config.circuitBreakerBps, config.maxMultiplier
        );

        // Update stored fee
        uint24 oldFee = uint24(state.currentFee);
        state.currentFee = dynamicFee;

        if (oldFee != dynamicFee) {
            emit FeeUpdated(poolId, oldFee, dynamicFee, state.depegBps);
        }

        // Return with lpFeeOverride flag set
        uint24 feeWithFlag = dynamicFee | LPFeeLibrary.OVERRIDE_FEE_FLAG;

        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, feeWithFlag);
    }

    /// @notice Called after every swap — updates state and may trigger circuit breaker
    function afterSwap(address, PoolKey calldata key, IPoolManager.SwapParams calldata, BalanceDelta, bytes calldata)
        external
        override
        onlyPoolManager
        returns (bytes4, int128)
    {
        PoolId poolId = key.toId();

        if (!_registered[poolId]) {
            return (BaseHook.afterSwap.selector, 0);
        }

        // Check if we should auto-pause (DEPEGGED state)
        GuardianState storage state = _states[poolId];
        if (state.state == DepegState.DEPEGGED && !state.swapsPaused) {
            state.swapsPaused = true;
            swapsPaused = true;
            pausedAt = block.timestamp;
            emit SwapsPaused(block.timestamp, state.depegBps);
        }

        return (BaseHook.afterSwap.selector, 0);
    }

    /// @notice Called before adding liquidity — updates oracle state for LPs
    function beforeAddLiquidity(address, PoolKey calldata key, IPoolManager.ModifyLiquidityParams calldata, bytes calldata)
        external
        override
        onlyPoolManager
        returns (bytes4)
    {
        PoolId poolId = key.toId();
        if (_registered[poolId]) {
            _updateOracleState(poolId);
        }
        return BaseHook.beforeAddLiquidity.selector;
    }

    // ─── Internal Oracle Logic ───────────────────────────────────────────────────

    /// @notice Fetches oracle price, validates it, updates TWAP and depeg state
    /// @dev No external calls that could cause reentrancy issues — only reads from oracle
    function _updateOracleState(PoolId poolId) internal {
        GuardianConfig storage config = _configs[poolId];
        GuardianState storage state = _states[poolId];

        // Fetch oracle data
        IChainlinkOracle oracle = IChainlinkOracle(config.oracle);
        (uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = oracle.latestRoundData();

        // Validate oracle data
        if (roundId == 0 || answeredInRound < roundId) {
            revert InvalidOracleData();
        }

        // Staleness check — if stale, use conservative max fee
        if (block.timestamp - updatedAt > config.maxOracleAge) {
            state.depegBps = config.circuitBreakerBps;
            state.currentFee =
                DepegMath.computeDynamicFee(config.baseFee, config.circuitBreakerBps, config.circuitBreakerBps, config.maxMultiplier);
            _transitionState(poolId, DepegState.DEPEGGED);
            return;
        }

        // Normalize price to 18 decimals
        uint8 oracleDecimals = oracle.decimals();
        uint256 normalizedPrice = DepegMath.normalizePrice(answer, oracleDecimals);

        // TWAP flash-loan guard: record observation and compute TWAP
        _recordTwapObservation(poolId, normalizedPrice);
        uint256 twapPrice = _computeTwap(poolId);

        // Check spot vs TWAP deviation
        uint256 twapDeviationBps = DepegMath.computeDepegBps(normalizedPrice, twapPrice);
        if (twapDeviationBps > MAX_TWAP_DEVIATION_BPS) {
            // Spot deviates too much from TWAP — ignore spot (flash loan guard)
            // Use TWAP price instead
            normalizedPrice = twapPrice;
            emit TwapUpdated(poolId, normalizedPrice, twapPrice);
        }

        // Compute depeg basis points
        uint256 depegBps = DepegMath.computeDepegBps(normalizedPrice, PEG_PRICE);

        // Classify state
        uint8 newStateRaw = DepegMath.classifyState(depegBps, config.driftWarningBps, config.circuitBreakerBps);
        DepegState newState = DepegState(newStateRaw);

        // Update state
        state.depegBps = depegBps;
        state.lastOraclePrice = normalizedPrice;
        state.lastUpdated = block.timestamp;

        // Transition state if changed
        _transitionState(poolId, newState);
    }

    /// @notice Record a price observation for TWAP computation
    function _recordTwapObservation(PoolId poolId, uint256 price) internal {
        uint256 idx = _twapIndex[poolId];
        _twapObservations[poolId][idx] = price;
        _twapIndex[poolId] = (idx + 1) % TWAP_WINDOW;

        if (_twapCount[poolId] < TWAP_WINDOW) {
            _twapCount[poolId]++;
        }
    }

    /// @notice Compute simple moving average from TWAP observations
    function _computeTwap(PoolId poolId) internal view returns (uint256) {
        uint256 count = _twapCount[poolId];
        if (count == 0) return PEG_PRICE;

        uint256 sum = 0;
        for (uint256 i = 0; i < count; i++) {
            sum += _twapObservations[poolId][i];
        }
        return sum / count;
    }

    /// @notice Handle state transitions and emit events
    function _transitionState(PoolId poolId, DepegState newState) internal {
        GuardianState storage state = _states[poolId];
        DepegState oldState = state.state;

        if (oldState == newState) return;

        state.state = newState;

        // Auto-pause on DEPEGGED
        if (newState == DepegState.DEPEGGED && !state.swapsPaused) {
            state.swapsPaused = true;
            swapsPaused = true;
            pausedAt = block.timestamp;
            emit SwapsPaused(block.timestamp, state.depegBps);
        }

        // Auto-resume on recovery to PEGGED (if cooldown expired)
        if (newState == DepegState.PEGGED && state.swapsPaused) {
            if (!isInCooldown()) {
                state.swapsPaused = false;
                swapsPaused = false;
                emit SwapsResumed(block.timestamp, address(this));
            }
        }

        emit DepegStateChanged(poolId, oldState, newState, state.depegBps, state.lastOraclePrice);
    }

    // ─── Validation ──────────────────────────────────────────────────────────────

    function _validateConfig(GuardianConfig calldata config) internal pure {
        if (config.oracle == address(0)) revert InvalidConfig();
        if (config.driftWarningBps == 0 || config.driftWarningBps >= config.circuitBreakerBps) revert InvalidConfig();
        if (config.circuitBreakerBps == 0) revert InvalidConfig();
        if (config.baseFee == 0) revert InvalidConfig();
        if (config.maxMultiplier < 2) revert InvalidConfig();
        if (config.maxOracleAge == 0) revert InvalidConfig();
        if (config.tickRange <= 0) revert InvalidConfig();
    }

    // ─── View Functions ──────────────────────────────────────────────────────────

    /// @inheritdoc IDepegGuardian
    function getDepegState(PoolId poolId) external view override returns (GuardianState memory) {
        if (!_registered[poolId]) revert PoolNotRegistered(poolId);
        return _states[poolId];
    }

    /// @inheritdoc IDepegGuardian
    function getConfig(PoolId poolId) external view override returns (GuardianConfig memory) {
        if (!_registered[poolId]) revert PoolNotRegistered(poolId);
        return _configs[poolId];
    }

    /// @inheritdoc IDepegGuardian
    function isPoolRegistered(PoolId poolId) external view override returns (bool) {
        return _registered[poolId];
    }

    /// @notice Get the computed TWAP price for a pool
    function getTwapPrice(PoolId poolId) external view returns (uint256) {
        return _computeTwap(poolId);
    }
}

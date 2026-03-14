// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DepegMath
/// @notice Library for computing dynamic fee multipliers based on stablecoin peg deviation
/// @dev Fee curve: feeMultiplier(x) = 1 + (maxMultiplier - 1) * (x / circuitBreakerBps)²
///      where x = current depeg in basis points
library DepegMath {
    /// @notice Number of basis points in 100% (10_000 = 100%)
    uint256 internal constant BPS_DENOMINATOR = 10_000;

    /// @notice Precision for internal fixed-point math (1e18)
    uint256 internal constant PRECISION = 1e18;

    /// @notice Compute the fee multiplier based on current depeg deviation
    /// @param depegBps Current depeg deviation in basis points
    /// @param circuitBreakerBps Threshold at which circuit breaker activates
    /// @param maxMultiplier Maximum fee multiplier (e.g., 15)
    /// @return multiplier The fee multiplier scaled by PRECISION (1e18 = 1x)
    function computeFeeMultiplier(uint256 depegBps, uint256 circuitBreakerBps, uint256 maxMultiplier)
        internal
        pure
        returns (uint256 multiplier)
    {
        if (depegBps == 0) return PRECISION;
        if (circuitBreakerBps == 0) return maxMultiplier * PRECISION;

        // Cap depegBps at circuitBreakerBps to prevent overflow
        if (depegBps >= circuitBreakerBps) {
            return maxMultiplier * PRECISION;
        }

        // Quadratic curve: 1 + (maxMultiplier - 1) * (depegBps / circuitBreakerBps)²
        // Using fixed-point arithmetic to avoid precision loss
        uint256 ratio = (depegBps * PRECISION) / circuitBreakerBps;
        uint256 ratioSquared = (ratio * ratio) / PRECISION;
        uint256 scaledIncrease = ((maxMultiplier - 1) * ratioSquared);

        multiplier = PRECISION + scaledIncrease;
    }

    /// @notice Compute the dynamic fee given base fee and current depeg
    /// @param baseFee The base fee in Uniswap v4 fee units (e.g., 3000 = 0.3%)
    /// @param depegBps Current depeg deviation in basis points
    /// @param circuitBreakerBps Threshold for circuit breaker activation
    /// @param maxMultiplier Maximum fee multiplier
    /// @return fee The computed fee as uint24 for Uniswap v4 lpFeeOverride
    function computeDynamicFee(uint256 baseFee, uint256 depegBps, uint256 circuitBreakerBps, uint256 maxMultiplier)
        internal
        pure
        returns (uint24 fee)
    {
        uint256 multiplier = computeFeeMultiplier(depegBps, circuitBreakerBps, maxMultiplier);
        uint256 rawFee = (baseFee * multiplier) / PRECISION;

        // Cap at max Uniswap v4 fee (100% = 1_000_000)
        if (rawFee > 1_000_000) {
            rawFee = 1_000_000;
        }

        fee = uint24(rawFee);
    }

    /// @notice Compute depeg deviation in basis points from oracle price
    /// @param oraclePrice Oracle price normalized to 18 decimals (1e18 = $1.00)
    /// @param pegPrice The expected peg price in 18 decimals (usually 1e18 for stablecoins)
    /// @return depegBps The absolute deviation from peg in basis points
    function computeDepegBps(uint256 oraclePrice, uint256 pegPrice) internal pure returns (uint256 depegBps) {
        if (oraclePrice >= pegPrice) {
            depegBps = ((oraclePrice - pegPrice) * BPS_DENOMINATOR) / pegPrice;
        } else {
            depegBps = ((pegPrice - oraclePrice) * BPS_DENOMINATOR) / pegPrice;
        }
    }

    /// @notice Normalize a Chainlink price (8 decimals) to 18 decimals
    /// @param rawPrice The raw price from Chainlink (int256)
    /// @param oracleDecimals The number of decimals in the oracle price
    /// @return normalizedPrice Price in 18 decimals
    function normalizePrice(int256 rawPrice, uint8 oracleDecimals) internal pure returns (uint256 normalizedPrice) {
        require(rawPrice > 0, "DepegMath: negative price");
        if (oracleDecimals < 18) {
            normalizedPrice = uint256(rawPrice) * 10 ** (18 - oracleDecimals);
        } else if (oracleDecimals > 18) {
            normalizedPrice = uint256(rawPrice) / 10 ** (oracleDecimals - 18);
        } else {
            normalizedPrice = uint256(rawPrice);
        }
    }

    /// @notice Determine the DepegState from depeg basis points
    /// @param depegBps Current deviation in basis points
    /// @param driftWarningBps Threshold for DRIFTING state
    /// @param circuitBreakerBps Threshold for DEPEGGED state
    /// @return state 0 = PEGGED, 1 = DRIFTING, 2 = DEPEGGED
    function classifyState(uint256 depegBps, uint256 driftWarningBps, uint256 circuitBreakerBps)
        internal
        pure
        returns (uint8 state)
    {
        if (depegBps >= circuitBreakerBps) {
            return 2; // DEPEGGED
        } else if (depegBps >= driftWarningBps) {
            return 1; // DRIFTING
        } else {
            return 0; // PEGGED
        }
    }
}

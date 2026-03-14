// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";

/// @title TickRebalancer
/// @notice Library for computing rebalanced tick ranges centered on oracle price
/// @dev Uses Uniswap v4 TickMath for sqrtPrice ↔ tick conversions
library TickRebalancer {
    /// @notice Compute new tick range centered on oracle price
    /// @param oraclePrice Oracle price normalized to 18 decimals
    /// @param tickRange Half-width of the desired tick range (e.g., 50 ticks)
    /// @param tickSpacing The pool's tick spacing constraint
    /// @return tickLower The lower bound tick (aligned to tickSpacing)
    /// @return tickUpper The upper bound tick (aligned to tickSpacing)
    function computeRebalancedRange(uint256 oraclePrice, int24 tickRange, int24 tickSpacing)
        internal
        pure
        returns (int24 tickLower, int24 tickUpper)
    {
        int24 oracleTick = getTickFromPrice(oraclePrice);

        // Compute raw tick bounds
        int24 rawLower = oracleTick - tickRange;
        int24 rawUpper = oracleTick + tickRange;

        // Align to tick spacing (round toward center)
        tickLower = alignTickDown(rawLower, tickSpacing);
        tickUpper = alignTickUp(rawUpper, tickSpacing);

        // Enforce TickMath bounds
        if (tickLower < TickMath.MIN_TICK) {
            tickLower = alignTickUp(TickMath.MIN_TICK, tickSpacing);
        }
        if (tickUpper > TickMath.MAX_TICK) {
            tickUpper = alignTickDown(TickMath.MAX_TICK, tickSpacing);
        }

        // Ensure tickLower < tickUpper
        require(tickLower < tickUpper, "TickRebalancer: invalid range");
    }

    /// @notice Check if the current tick is outside the guardian's recommended range
    /// @param currentTick The pool's current tick
    /// @param tickLower Lower bound of guardian range
    /// @param tickUpper Upper bound of guardian range
    /// @return outOfRange True if currentTick is outside [tickLower, tickUpper]
    function isOutOfRange(int24 currentTick, int24 tickLower, int24 tickUpper)
        internal
        pure
        returns (bool outOfRange)
    {
        outOfRange = currentTick < tickLower || currentTick > tickUpper;
    }

    /// @notice Convert an 18-decimal price to a Uniswap tick
    /// @dev price = token1/token0 ratio. For stablecoins near $1, tick ≈ 0
    ///      sqrtPriceX96 = sqrt(price) * 2^96
    /// @param price18 Price with 18 decimals (1e18 = 1.0)
    /// @return tick The corresponding Uniswap tick
    function getTickFromPrice(uint256 price18) internal pure returns (int24 tick) {
        // sqrtPriceX96 = sqrt(price18 / 1e18) * 2^96
        // = sqrt(price18) * 2^96 / sqrt(1e18)
        // = sqrt(price18) * 2^96 / 1e9

        uint256 sqrtPrice = sqrt(price18);
        // Scale: sqrtPrice is sqrt of 18-decimal number, so it has ~9 decimal precision
        // We need to multiply by 2^96 and divide by 1e9 to get sqrtPriceX96
        uint256 sqrtPriceX96 = (sqrtPrice << 96) / 1e9;

        // Clamp to valid range
        if (sqrtPriceX96 < uint256(uint160(TickMath.MIN_SQRT_PRICE))) {
            sqrtPriceX96 = uint256(uint160(TickMath.MIN_SQRT_PRICE));
        }
        if (sqrtPriceX96 > uint256(uint160(TickMath.MAX_SQRT_PRICE)) - 1) {
            sqrtPriceX96 = uint256(uint160(TickMath.MAX_SQRT_PRICE)) - 1;
        }

        tick = TickMath.getTickAtSqrtPrice(uint160(sqrtPriceX96));
    }

    /// @notice Align tick down to the nearest multiple of tickSpacing
    function alignTickDown(int24 tick, int24 tickSpacing) internal pure returns (int24) {
        int24 mod = tick % tickSpacing;
        if (mod < 0) {
            return tick - (mod + tickSpacing);
        }
        return tick - mod;
    }

    /// @notice Align tick up to the nearest multiple of tickSpacing
    function alignTickUp(int24 tick, int24 tickSpacing) internal pure returns (int24) {
        int24 mod = tick % tickSpacing;
        if (mod == 0) return tick;
        if (mod > 0) {
            return tick + (tickSpacing - mod);
        }
        return tick - mod;
    }

    /// @notice Integer square root using Babylonian method
    /// @param x The number to compute the square root of
    /// @return y The floor of the square root
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}

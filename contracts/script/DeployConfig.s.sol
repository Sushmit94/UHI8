// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DeployConfig
/// @notice Deployment configuration for different chains
library DeployConfig {
    struct Config {
        address guardian;
        uint256 cooldownSeconds;
        address usdcOracle;
        address usdtOracle;
        uint16 driftWarningBps;
        uint16 circuitBreakerBps;
        uint24 baseFee;
        uint16 maxMultiplier;
        uint32 maxOracleAge;
        int24 tickRange;
    }

    function getMainnetConfig() internal pure returns (Config memory) {
        return Config({
            guardian: address(0), // Must be set before deploy
            cooldownSeconds: 3600,
            usdcOracle: 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6,
            usdtOracle: 0x3E7d1eAB13ad0104d2750B8863b489D65364e32D,
            driftWarningBps: 10,
            circuitBreakerBps: 200,
            baseFee: 3000,
            maxMultiplier: 15,
            maxOracleAge: 3600,
            tickRange: 50
        });
    }

    function getSepoliaConfig() internal pure returns (Config memory) {
        return Config({
            guardian: address(0), // Must be set before deploy
            cooldownSeconds: 300, // 5 min for testnet
            usdcOracle: address(0), // Deploy mock on Sepolia
            usdtOracle: address(0), // Deploy mock on Sepolia
            driftWarningBps: 10,
            circuitBreakerBps: 200,
            baseFee: 3000,
            maxMultiplier: 15,
            maxOracleAge: 3600,
            tickRange: 50
        });
    }

    function getBaseConfig() internal pure returns (Config memory) {
        return Config({
            guardian: address(0),
            cooldownSeconds: 3600,
            usdcOracle: 0x7e860098F58bBFC8648a4311b374B1D669a2bc6B,
            usdtOracle: address(0), // USDT not common on Base
            driftWarningBps: 10,
            circuitBreakerBps: 200,
            baseFee: 3000,
            maxMultiplier: 15,
            maxOracleAge: 3600,
            tickRange: 50
        });
    }

    function getArbitrumConfig() internal pure returns (Config memory) {
        return Config({
            guardian: address(0),
            cooldownSeconds: 3600,
            usdcOracle: 0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3,
            usdtOracle: 0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7,
            driftWarningBps: 10,
            circuitBreakerBps: 200,
            baseFee: 3000,
            maxMultiplier: 15,
            maxOracleAge: 3600,
            tickRange: 50
        });
    }
}

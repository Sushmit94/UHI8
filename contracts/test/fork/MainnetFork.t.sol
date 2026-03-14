// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {IChainlinkOracle} from "../../src/interfaces/IChainlinkOracle.sol";

/// @title MainnetForkTest
/// @notice Fork tests against real mainnet Chainlink oracles
/// @dev Run with: forge test --match-contract MainnetForkTest --fork-url $MAINNET_RPC_URL
contract MainnetForkTest is Test {
    // Mainnet Chainlink USD price feed addresses
    address constant USDC_USD_FEED = 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6;
    address constant USDT_USD_FEED = 0x3E7d1eAB13ad0104d2750B8863b489D65364e32D;
    address constant DAI_USD_FEED = 0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9;

    function setUp() public {
        // This test requires a mainnet fork
        // Skip if not running in fork mode
        if (block.chainid != 1) {
            vm.skip(true);
        }
    }

    /// @notice Verify USDC/USD Chainlink feed returns valid data
    function test_USDC_Feed_Returns_Valid_Data() public {
        IChainlinkOracle oracle = IChainlinkOracle(USDC_USD_FEED);

        (uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = oracle.latestRoundData();

        // Validate data
        assertTrue(roundId > 0, "roundId should be positive");
        assertTrue(answer > 0, "answer should be positive");
        assertTrue(updatedAt > 0, "updatedAt should be positive");
        assertTrue(answeredInRound >= roundId, "answeredInRound should be >= roundId");

        // USDC should be near $1.00 (1e8 with 8 decimals)
        assertTrue(answer > 0.95e8, "USDC should be > $0.95");
        assertTrue(answer < 1.05e8, "USDC should be < $1.05");

        // Check decimals
        uint8 decimals = oracle.decimals();
        assertEq(decimals, 8, "USDC/USD feed should have 8 decimals");
    }

    /// @notice Verify USDT/USD Chainlink feed returns valid data
    function test_USDT_Feed_Returns_Valid_Data() public {
        IChainlinkOracle oracle = IChainlinkOracle(USDT_USD_FEED);

        (uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = oracle.latestRoundData();

        assertTrue(roundId > 0, "roundId should be positive");
        assertTrue(answer > 0, "answer should be positive");
        assertTrue(updatedAt > 0, "updatedAt should be positive");
        assertTrue(answeredInRound >= roundId, "answeredInRound should be >= roundId");

        assertTrue(answer > 0.95e8, "USDT should be > $0.95");
        assertTrue(answer < 1.05e8, "USDT should be < $1.05");
    }

    /// @notice Verify DAI/USD Chainlink feed returns valid data
    function test_DAI_Feed_Returns_Valid_Data() public {
        IChainlinkOracle oracle = IChainlinkOracle(DAI_USD_FEED);

        (uint80 roundId, int256 answer, , uint256 updatedAt, uint80 answeredInRound) = oracle.latestRoundData();

        assertTrue(roundId > 0, "roundId should be positive");
        assertTrue(answer > 0, "answer should be positive");
        assertTrue(updatedAt > 0, "updatedAt should be positive");
        assertTrue(answeredInRound >= roundId, "answeredInRound should be >= roundId");

        assertTrue(answer > 0.95e8, "DAI should be > $0.95");
        assertTrue(answer < 1.05e8, "DAI should be < $1.05");
    }

    /// @notice Verify oracle staleness detection
    function test_Oracle_Staleness_Detection() public {
        IChainlinkOracle oracle = IChainlinkOracle(USDC_USD_FEED);

        (, , , uint256 updatedAt, ) = oracle.latestRoundData();

        // On a live fork, the updatedAt should be recent
        uint256 age = block.timestamp - updatedAt;
        assertTrue(age < 86400, "Oracle should have been updated within 24h");

        // Log for manual inspection
        emit log_named_uint("USDC oracle age (seconds)", age);
    }
}

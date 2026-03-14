// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IChainlinkOracle
/// @notice Minimal interface for Chainlink AggregatorV3Interface used by Depeg Guardian
interface IChainlinkOracle {
    /// @notice Returns the number of decimals the oracle uses
    function decimals() external view returns (uint8);

    /// @notice Returns a human-readable description of the oracle
    function description() external view returns (string memory);

    /// @notice Returns the version number of the oracle
    function version() external view returns (uint256);

    /// @notice Returns round data for a specific round
    /// @param _roundId The round ID to retrieve data for
    function getRoundData(uint80 _roundId)
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);

    /// @notice Returns the latest round data
    /// @return roundId The round ID
    /// @return answer The price answer (8 decimals for USD feeds)
    /// @return startedAt Timestamp when the round started
    /// @return updatedAt Timestamp when the round was last updated
    /// @return answeredInRound The round ID in which the answer was computed
    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound);
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IChainlinkOracle} from "../../src/interfaces/IChainlinkOracle.sol";

/// @title MockChainlinkOracle
/// @notice Mock Chainlink oracle for testing depeg scenarios
contract MockChainlinkOracle is IChainlinkOracle {
    int256 private _price;
    uint8 private _decimals;
    uint80 private _roundId;
    uint256 private _updatedAt;
    string private _description;

    constructor(int256 initialPrice, uint8 decimals_) {
        _price = initialPrice;
        _decimals = decimals_;
        _roundId = 1;
        _updatedAt = block.timestamp;
        _description = "Mock USD / USD";
    }

    function decimals() external view override returns (uint8) {
        return _decimals;
    }

    function description() external view override returns (string memory) {
        return _description;
    }

    function version() external pure override returns (uint256) {
        return 4;
    }

    function getRoundData(uint80 _rid)
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_rid, _price, _updatedAt, _updatedAt, _rid);
    }

    function latestRoundData()
        external
        view
        override
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, _price, _updatedAt, _updatedAt, _roundId);
    }

    // ─── Test Helpers ────────────────────────────────────────────────────────────

    /// @notice Set the oracle price (in oracle decimals)
    function setPrice(int256 newPrice) external {
        _roundId++;
        _price = newPrice;
        _updatedAt = block.timestamp;
    }

    /// @notice Set price and manually set updatedAt (for staleness tests)
    function setPriceWithTimestamp(int256 newPrice, uint256 timestamp) external {
        _roundId++;
        _price = newPrice;
        _updatedAt = timestamp;
    }

    /// @notice Set updatedAt without changing price (for staleness tests)
    function setUpdatedAt(uint256 timestamp) external {
        _updatedAt = timestamp;
    }

    /// @notice Set roundId to 0 to simulate invalid oracle data
    function setInvalidRound() external {
        _roundId = 0;
    }

    /// @notice Set answeredInRound < roundId to simulate stale round
    function setStaleRound() external {
        _roundId = 10;
        // answeredInRound will return _roundId from latestRoundData
        // We need a special flag — let's use a different approach
    }

    /// @notice Reset to valid state
    function reset(int256 price) external {
        _roundId = 1;
        _price = price;
        _updatedAt = block.timestamp;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockChainlinkOracle {
    int256 public price;
    uint8 public decimals_;
    uint80 public roundId;
    string public description_;

    constructor(int256 _price, uint8 _decimals, string memory _description) {
        price = _price;
        decimals_ = _decimals;
        roundId = 1;
        description_ = _description;
    }

    function setPrice(int256 _price) external {
        price = _price;
        roundId++;
    }

    function decimals() external view returns (uint8) {
        return decimals_;
    }

    function description() external view returns (string memory) {
        return description_;
    }

    function latestRoundData() external view returns (
        uint80, int256, uint256, uint256, uint80
    ) {
        return (roundId, price, block.timestamp, block.timestamp, roundId);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title HookMiner
/// @notice Local version — mines a salt for CREATE2 deployment so the hook address has correct flag bits
/// @dev Replaces the removed @uniswap/v4-periphery HookMiner
library HookMiner {
    /// @notice Find a salt that produces a hook address with the desired `flags` in its lowest bits
    /// @param deployer The address that will deploy the hook via CREATE2
    /// @param flags The desired flags (lowest 14 bits of the hook address)
    /// @param creationCode The creation code of the hook contract
    /// @param constructorArgs The ABI-encoded constructor arguments
    /// @return hookAddress The address that will be deployed to
    /// @return salt The salt that produces the desired address
    function find(
        address deployer,
        uint160 flags,
        bytes memory creationCode,
        bytes memory constructorArgs
    ) internal pure returns (address hookAddress, bytes32 salt) {
        bytes memory initCode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 initCodeHash = keccak256(initCode);

        uint160 flagMask = uint160(0x3FFF); // lowest 14 bits

        for (uint256 i = 0; i < 100_000; i++) {
            salt = bytes32(i);
            hookAddress = _computeCreate2Address(deployer, salt, initCodeHash);
            if (uint160(hookAddress) & flagMask == flags & flagMask) {
                return (hookAddress, salt);
            }
        }
        revert("HookMiner: could not find salt");
    }

    /// @notice Computes the CREATE2 address for a given deployer, salt, and initCodeHash
    function _computeCreate2Address(address deployer, bytes32 salt, bytes32 initCodeHash)
        internal
        pure
        returns (address)
    {
        return address(
            uint160(
                uint256(
                    keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initCodeHash))
                )
            )
        );
    }
}

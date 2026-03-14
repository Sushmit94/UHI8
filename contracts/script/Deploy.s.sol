// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {DepegGuardianHook} from "../src/DepegGuardianHook.sol";
import {DeployConfig} from "./DeployConfig.s.sol";
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

/// @title Deploy
/// @notice Deployment script for DepegGuardianHook
/// @dev Run: forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify
contract Deploy is Script {
    function run() external {
        // Load deployer private key
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);
        address guardianAddr = vm.envOr("GUARDIAN_ADDRESS", deployer);
        address poolManagerAddr = vm.envAddress("POOL_MANAGER_ADDRESS");

        console.log("Deployer:", deployer);
        console.log("Guardian:", guardianAddr);
        console.log("PoolManager:", poolManagerAddr);

        // Determine chain config
        uint256 chainId = block.chainid;
        uint256 cooldownSeconds;

        if (chainId == 1) {
            DeployConfig.Config memory cfg = DeployConfig.getMainnetConfig();
            cooldownSeconds = cfg.cooldownSeconds;
        } else if (chainId == 11155111) {
            DeployConfig.Config memory cfg = DeployConfig.getSepoliaConfig();
            cooldownSeconds = cfg.cooldownSeconds;
        } else if (chainId == 8453) {
            DeployConfig.Config memory cfg = DeployConfig.getBaseConfig();
            cooldownSeconds = cfg.cooldownSeconds;
        } else if (chainId == 42161) {
            DeployConfig.Config memory cfg = DeployConfig.getArbitrumConfig();
            cooldownSeconds = cfg.cooldownSeconds;
        } else {
            cooldownSeconds = 3600; // Default
        }

        // Compute hook flags
        uint160 flags = uint160(
            Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG
        );

        // Mine salt for CREATE2 deployment with correct flag bits
        bytes memory constructorArgs = abi.encode(
            IPoolManager(poolManagerAddr),
            guardianAddr,
            cooldownSeconds
        );

        (address hookAddress, bytes32 salt) = HookMiner.find(
            deployer,
            flags,
            type(DepegGuardianHook).creationCode,
            constructorArgs
        );

        console.log("Computed hook address:", hookAddress);

        vm.startBroadcast(deployerPk);

        DepegGuardianHook hook = new DepegGuardianHook{salt: salt}(
            IPoolManager(poolManagerAddr),
            guardianAddr,
            cooldownSeconds
        );

        require(address(hook) == hookAddress, "Hook deployed to unexpected address");

        console.log("DepegGuardianHook deployed at:", address(hook));

        vm.stopBroadcast();
    }
}

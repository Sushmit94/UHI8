import { createPublicClient, http, type Chain } from "viem";
import { mainnet, sepolia, base, arbitrum } from "viem/chains";

// ─── Chain Configurations ────────────────────────────────────────────────────

export const SUPPORTED_CHAINS: Record<number, Chain> = {
    1: mainnet,
    11155111: sepolia,
    8453: base,
    42161: arbitrum,
};

// ─── RPC URLs (configurable via env) ─────────────────────────────────────────

const RPC_URLS: Record<number, string> = {
    1: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://eth.llamarpc.com",
    11155111: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    8453: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
    42161: process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
};

// ─── Public Client Factory ───────────────────────────────────────────────────

export function getPublicClient(chainId: number) {
    const chain = SUPPORTED_CHAINS[chainId];
    if (!chain) throw new Error(`Unsupported chain: ${chainId}`);

    return createPublicClient({
        chain,
        transport: http(RPC_URLS[chainId]),
        batch: {
            multicall: true,
        },
    });
}

// Default client (Sepolia for dev)
export const defaultChainId = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 11155111);
export const publicClient = getPublicClient(defaultChainId);

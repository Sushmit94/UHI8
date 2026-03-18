// ─── DepegGuardianHook ABI ────────────────────────────────────────────────────

export const DEPEG_GUARDIAN_HOOK_ABI = [
    // View functions
    {
        name: "getDepegState",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "poolId", type: "bytes32" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "state", type: "uint8" },
                    { name: "depegBps", type: "uint256" },
                    { name: "currentFee", type: "uint256" },
                    { name: "lastOraclePrice", type: "uint256" },
                    { name: "lastUpdated", type: "uint256" },
                    { name: "swapsPaused", type: "bool" },
                ],
            },
        ],
    },
    {
        name: "getConfig",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "poolId", type: "bytes32" }],
        outputs: [
            {
                name: "",
                type: "tuple",
                components: [
                    { name: "oracle", type: "address" },
                    { name: "driftWarningBps", type: "uint16" },
                    { name: "circuitBreakerBps", type: "uint16" },
                    { name: "baseFee", type: "uint24" },
                    { name: "maxMultiplier", type: "uint16" },
                    { name: "maxOracleAge", type: "uint32" },
                    { name: "tickRange", type: "int24" },
                ],
            },
        ],
    },
    {
        name: "isPoolRegistered",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "poolId", type: "bytes32" }],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        name: "getTwapPrice",
        type: "function",
        stateMutability: "view",
        inputs: [{ name: "poolId", type: "bytes32" }],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "swapsPaused",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        name: "pausedAt",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "cooldownSeconds",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
    {
        name: "guardian",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "address" }],
    },
    {
        name: "isInCooldown",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "bool" }],
    },
    {
        name: "cooldownRemaining",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint256" }],
    },
    // Write functions
    {
        name: "pauseSwaps",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "depegBps", type: "uint256" }],
        outputs: [],
    },
    {
        name: "resumeSwaps",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [],
        outputs: [],
    },
    {
        name: "forceResumeSwaps",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [],
        outputs: [],
    },
    {
        name: "setGuardian",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "newGuardian", type: "address" }],
        outputs: [],
    },
    {
        name: "setCooldownSeconds",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [{ name: "newCooldown", type: "uint256" }],
        outputs: [],
    },
    // Events
    {
        name: "DepegStateChanged",
        type: "event",
        inputs: [
            { name: "poolId", type: "bytes32", indexed: true },
            { name: "oldState", type: "uint8", indexed: false },
            { name: "newState", type: "uint8", indexed: false },
            { name: "depegBps", type: "uint256", indexed: false },
            { name: "oraclePrice", type: "uint256", indexed: false },
        ],
    },
    {
        name: "FeeUpdated",
        type: "event",
        inputs: [
            { name: "poolId", type: "bytes32", indexed: true },
            { name: "oldFee", type: "uint24", indexed: false },
            { name: "newFee", type: "uint24", indexed: false },
            { name: "depegBps", type: "uint256", indexed: false },
        ],
    },
    {
        name: "SwapsPaused",
        type: "event",
        inputs: [
            { name: "timestamp", type: "uint256", indexed: false },
            { name: "depegBps", type: "uint256", indexed: false },
        ],
    },
    {
        name: "SwapsResumed",
        type: "event",
        inputs: [
            { name: "timestamp", type: "uint256", indexed: false },
            { name: "triggeredBy", type: "address", indexed: false },
        ],
    },
] as const;

// ─── Chainlink Oracle ABI ────────────────────────────────────────────────────

export const CHAINLINK_ORACLE_ABI = [
    {
        name: "latestRoundData",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [
            { name: "roundId", type: "uint80" },
            { name: "answer", type: "int256" },
            { name: "startedAt", type: "uint256" },
            { name: "updatedAt", type: "uint256" },
            { name: "answeredInRound", type: "uint80" },
        ],
    },
    {
        name: "decimals",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "uint8" }],
    },
    {
        name: "description",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ name: "", type: "string" }],
    },
] as const;

// ─── Contract Addresses ─────────────────────────────────────────────────────

export const HOOK_ADDRESSES: Record<number, `0x${string}`> = {
    1: "0x0000000000000000000000000000000000000000", // Mainnet: to be deployed
    11155111: "0xBd990c621408644A1457B4f0e649C49509B2C8C0", // Sepolia: to be deployed
    8453: "0x0000000000000000000000000000000000000000", // Base: to be deployed
    42161: "0x0000000000000000000000000000000000000000", // Arbitrum: to be deployed
};

export const ORACLE_ADDRESSES: Record<number, Record<string, `0x${string}`>> = {
    1: {
        USDC: "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
        USDT: "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
        DAI: "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
    },
    8453: {
        USDC: "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B",
    },
    42161: {
        USDC: "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
        USDT: "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7",
    },
    11155111: {},
};

// ─── Helper ──────────────────────────────────────────────────────────────────

export function getHookAddress(chainId: number): `0x${string}` {
    const addr = HOOK_ADDRESSES[chainId];
    if (!addr) throw new Error(`No hook address for chain ${chainId}`);
    return addr;
}

export function getOracleAddress(chainId: number, token: string): `0x${string}` {
    const oracles = ORACLE_ADDRESSES[chainId];
    if (!oracles || !oracles[token]) throw new Error(`No oracle for ${token} on chain ${chainId}`);
    return oracles[token];
}

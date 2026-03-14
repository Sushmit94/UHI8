import { DEPEG_GUARDIAN_HOOK_ABI, CHAINLINK_ORACLE_ABI } from "@/lib/contracts";

// ─── Inferred Types from ABI ─────────────────────────────────────────────────

export type DepegGuardianHookAbi = typeof DEPEG_GUARDIAN_HOOK_ABI;
export type ChainlinkOracleAbi = typeof CHAINLINK_ORACLE_ABI;

// ─── Contract Return Types ───────────────────────────────────────────────────

export interface OnchainGuardianState {
    state: number;
    depegBps: bigint;
    currentFee: bigint;
    lastOraclePrice: bigint;
    lastUpdated: bigint;
    swapsPaused: boolean;
}

export interface OnchainGuardianConfig {
    oracle: `0x${string}`;
    driftWarningBps: number;
    circuitBreakerBps: number;
    baseFee: number;
    maxMultiplier: number;
    maxOracleAge: number;
    tickRange: number;
}

export interface OnchainOracleData {
    roundId: bigint;
    answer: bigint;
    startedAt: bigint;
    updatedAt: bigint;
    answeredInRound: bigint;
}

// ─── Transaction Types ───────────────────────────────────────────────────────

export interface PauseSwapsTx {
    functionName: "pauseSwaps";
    args: [bigint]; // depegBps
}

export interface ResumeSwapsTx {
    functionName: "resumeSwaps";
    args: [];
}

export interface ForceResumeSwapsTx {
    functionName: "forceResumeSwaps";
    args: [];
}

export interface SetGuardianTx {
    functionName: "setGuardian";
    args: [`0x${string}`]; // newGuardian
}

export interface SetCooldownTx {
    functionName: "setCooldownSeconds";
    args: [bigint]; // newCooldown
}

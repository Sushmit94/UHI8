import { DepegState } from "@/lib/depegMath";

// ─── Pool Types ──────────────────────────────────────────────────────────────

export interface Pool {
    id: string;
    poolId: `0x${string}`;
    token0: TokenInfo;
    token1: TokenInfo;
    fee: number;
    tickSpacing: number;
    chainId: number;
}

export interface TokenInfo {
    address: `0x${string}`;
    symbol: string;
    name: string;
    decimals: number;
    logoUrl?: string;
}

// ─── Guardian State ──────────────────────────────────────────────────────────

export interface GuardianState {
    state: DepegState;
    depegBps: number;
    currentFee: number;
    lastOraclePrice: bigint;
    lastUpdated: Date;
    swapsPaused: boolean;
}

export interface GuardianConfig {
    oracle: `0x${string}`;
    driftWarningBps: number;
    circuitBreakerBps: number;
    baseFee: number;
    maxMultiplier: number;
    maxOracleAge: number;
    tickRange: number;
}

// ─── Oracle Data ─────────────────────────────────────────────────────────────

export interface OracleData {
    price: bigint;
    updatedAt: Date;
    isStale: boolean;
    roundId: bigint;
    decimals: number;
    description: string;
}

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

export interface CircuitBreakerState {
    isPaused: boolean;
    pausedAt: Date | null;
    cooldownSeconds: number;
    isInCooldown: boolean;
    cooldownRemainingSeconds: number;
    guardian: `0x${string}`;
}

// ─── Pool Stats ──────────────────────────────────────────────────────────────

export interface PoolStats {
    tvl: number;
    tvlChange24h: number;
    volume24h: number;
    fees24h: number;
    txCount: number;
    currentTick: number;
}

// ─── Alert Types ─────────────────────────────────────────────────────────────

export interface DepegAlert {
    id: string;
    type: "state_change" | "fee_update" | "circuit_breaker";
    title: string;
    message: string;
    timestamp: Date;
    severity: "info" | "warning" | "critical";
    poolId: string;
    data?: {
        oldState?: DepegState;
        newState?: DepegState;
        depegBps?: number;
        oraclePrice?: number;
        oldFee?: number;
        newFee?: number;
    };
}

// ─── Chart Data ──────────────────────────────────────────────────────────────

export interface PegHistoryDataPoint {
    timestamp: number;
    price: number;
    depegBps: number;
    fee: number;
    state: DepegState;
}

export interface FeeHistoryDataPoint {
    timestamp: number;
    fee: number;
    multiplier: number;
    depegBps: number;
}

// ─── Dashboard Types ─────────────────────────────────────────────────────────

export interface DashboardData {
    guardianState: GuardianState;
    guardianConfig: GuardianConfig;
    oracleData: OracleData;
    circuitBreaker: CircuitBreakerState;
    poolStats: PoolStats;
    alerts: DepegAlert[];
    pegHistory: PegHistoryDataPoint[];
}

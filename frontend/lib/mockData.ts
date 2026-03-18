/**
 * Mock data for the Depeg Guardian dashboard.
 * Used as fallback when on-chain reads / subgraph queries are unavailable.
 *
 * Controlled by NEXT_PUBLIC_USE_MOCK_DATA env var (defaults to "true").
 */

import { DepegState } from "@/lib/depegMath";
import type { GuardianState, OracleData, PoolStats, CircuitBreakerState, PegHistoryDataPoint, DepegAlert } from "@/types/pool";

// ─── Feature Flag ────────────────────────────────────────────────────────────

export const USE_MOCK_DATA =
    process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false"; // default: true

// ─── Mock Guardian State ─────────────────────────────────────────────────────

export const MOCK_GUARDIAN_STATE: GuardianState = {
    state: DepegState.PEGGED,
    depegBps: 5, // 0.05% deviation — healthy peg
    currentFee: 3000, // 0.30% base fee
    lastOraclePrice: BigInt("999500000000000000"), // $0.9995 (18 decimals)
    lastUpdated: new Date(Date.now() - 24_000), // ~24 seconds ago
    swapsPaused: false,
};

// ─── Mock Oracle Data ────────────────────────────────────────────────────────

export const MOCK_ORACLE_DATA: OracleData = {
    price: BigInt("99970000"), // $0.9997 (8 decimals, Chainlink standard)
    updatedAt: new Date(Date.now() - 45_000), // 45 seconds ago
    isStale: false,
    roundId: BigInt("110680464442257320818"),
    decimals: 8,
    description: "USDC / USD",
};

// ─── Mock Pool Stats ─────────────────────────────────────────────────────────

export const MOCK_POOL_STATS: PoolStats = {
    tvl: 2_437_812.45,
    tvlChange24h: 3.2,
    volume24h: 847_293.18,
    fees24h: 2_541.88,
    txCount: 1_247,
    currentTick: -276325,
};

// ─── Mock Circuit Breaker ────────────────────────────────────────────────────

export const MOCK_CIRCUIT_BREAKER: CircuitBreakerState = {
    isPaused: false,
    pausedAt: null,
    cooldownSeconds: 3600,
    isInCooldown: false,
    cooldownRemainingSeconds: 0,
    guardian: "0x48000000000000000000000000000000000095AA" as `0x${string}`,
};

// ─── Mock Oracle Derived Values ──────────────────────────────────────────────

export function getMockOracleFormatted() {
    const dec = MOCK_ORACLE_DATA.decimals;
    const price = Number(MOCK_ORACLE_DATA.price) / 10 ** dec;
    return "$" + price.toFixed(4);
}

export function getMockStalenessPercent(maxOracleAge: number = 3600): number {
    const age = Math.floor((Date.now() - MOCK_ORACLE_DATA.updatedAt.getTime()) / 1000);
    return Math.min(100, (age / maxOracleAge) * 100);
}

// ─── Mock Peg History (7 days, hourly) ───────────────────────────────────────

export function generateMockPegHistory(): PegHistoryDataPoint[] {
    const now = Date.now();
    const points: PegHistoryDataPoint[] = [];

    for (let i = 168; i >= 0; i--) {
        const timestamp = now - i * 3600 * 1000;
        const hour = (168 - i);

        // Create a realistic pattern: mostly pegged with occasional drift events
        let depegBps: number;

        if (hour >= 40 && hour <= 48) {
            // Drift event #1: gradual drift up to ~45 bps, then recovery
            const peak = 45;
            const center = 44;
            const dist = Math.abs(hour - center);
            depegBps = Math.max(2, peak - dist * (peak / 5)) + Math.random() * 3;
        } else if (hour >= 100 && hour <= 115) {
            // Major event: near-depeg reaching ~180 bps before recovery
            const peak = 180;
            const center = 107;
            const dist = Math.abs(hour - center);
            depegBps = Math.max(3, peak - dist * (peak / 8)) + Math.random() * 8;
        } else if (hour >= 130 && hour <= 138) {
            // Small drift event
            const peak = 25;
            const center = 134;
            const dist = Math.abs(hour - center);
            depegBps = Math.max(2, peak - dist * (peak / 4)) + Math.random() * 2;
        } else {
            // Normal operation: 0-8 bps random noise
            depegBps = Math.random() * 8;
        }

        depegBps = Math.max(0, Math.round(depegBps * 100) / 100);
        const price = 1 - depegBps / 10000;
        const fee = 3000 * (1 + (14 * Math.pow(depegBps / 200, 2)));
        const state =
            depegBps >= 200 ? DepegState.DEPEGGED :
            depegBps >= 10 ? DepegState.DRIFTING :
            DepegState.PEGGED;

        points.push({ timestamp, price, depegBps, fee, state });
    }

    return points;
}

// ─── Mock Alerts ─────────────────────────────────────────────────────────────

export function generateMockAlerts(): DepegAlert[] {
    const now = Date.now();
    return [
        {
            id: "mock-1",
            type: "state_change",
            title: "State: PEGGED",
            message: "Peg restored — USDC back within 10 bps of $1.00",
            timestamp: new Date(now - 2 * 3600_000),
            severity: "info",
            poolId: "demo",
            data: { newState: DepegState.PEGGED, depegBps: 4, oraclePrice: 0.9996 },
        },
        {
            id: "mock-2",
            type: "fee_update",
            title: "Fee Updated",
            message: "Dynamic fee adjusted from 0.30% → 1.12% during drift",
            timestamp: new Date(now - 5 * 3600_000),
            severity: "warning",
            poolId: "demo",
            data: { oldFee: 3000, newFee: 11200, depegBps: 65 },
        },
        {
            id: "mock-3",
            type: "state_change",
            title: "State: DRIFTING",
            message: "Peg drift detected — USDC at $0.9935 (65 bps deviation)",
            timestamp: new Date(now - 5.5 * 3600_000),
            severity: "warning",
            poolId: "demo",
            data: { oldState: DepegState.PEGGED, newState: DepegState.DRIFTING, depegBps: 65, oraclePrice: 0.9935 },
        },
        {
            id: "mock-4",
            type: "circuit_breaker",
            title: "Circuit Breaker",
            message: "Swaps resumed after 1h cooldown period",
            timestamp: new Date(now - 18 * 3600_000),
            severity: "info",
            poolId: "demo",
        },
        {
            id: "mock-5",
            type: "state_change",
            title: "State: DEPEGGED",
            message: "Circuit breaker triggered — USDC at $0.9789 (211 bps)",
            timestamp: new Date(now - 19 * 3600_000),
            severity: "critical",
            poolId: "demo",
            data: { oldState: DepegState.DRIFTING, newState: DepegState.DEPEGGED, depegBps: 211, oraclePrice: 0.9789 },
        },
        {
            id: "mock-6",
            type: "fee_update",
            title: "Fee Updated",
            message: "Dynamic fee escalated to 4.50% (15x multiplier)",
            timestamp: new Date(now - 19.5 * 3600_000),
            severity: "critical",
            poolId: "demo",
            data: { oldFee: 11200, newFee: 45000, depegBps: 195 },
        },
        {
            id: "mock-7",
            type: "state_change",
            title: "State: DRIFTING",
            message: "Peg drift detected — USDC at $0.9962 (38 bps deviation)",
            timestamp: new Date(now - 20 * 3600_000),
            severity: "warning",
            poolId: "demo",
            data: { oldState: DepegState.PEGGED, newState: DepegState.DRIFTING, depegBps: 38, oraclePrice: 0.9962 },
        },
    ];
}

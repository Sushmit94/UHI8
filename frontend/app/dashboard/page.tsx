"use client";

import { PegStatusCard } from "@/components/dashboard/PegStatusCard";
import { FeeMultiplierGauge } from "@/components/dashboard/FeeMultiplierGauge";
import { DepegHistoryChart } from "@/components/dashboard/DepegHistoryChart";
import { CircuitBreakerPanel } from "@/components/dashboard/CircuitBreakerPanel";
import { PoolStatsGrid } from "@/components/dashboard/PoolStatsGrid";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { OracleHealth } from "@/components/shared/OracleHealth";
import { useDepegState } from "@/hooks/useDepegState";
import { useFeeMultiplier } from "@/hooks/useFeeMultiplier";
import { useCircuitBreaker } from "@/hooks/useCircuitBreaker";
import { useOraclePrice } from "@/hooks/useOraclePrice";
import { usePoolStats } from "@/hooks/usePoolStats";
import { generateMockPegHistory, generateMockAlerts, USE_MOCK_DATA } from "@/lib/mockData";
import { useMemo } from "react";

// Demo pool ID — replace with real pool ID after deployment
const DEMO_POOL_ID = "0x0000000000000000000000000000000000000000000000000000000000000001" as `0x${string}`;
const DEMO_ORACLE = "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6" as `0x${string}`;

export default function DashboardPage() {
    // Onchain state hooks
    const { state: guardianState, isLoading: stateLoading } = useDepegState(DEMO_POOL_ID);
    const { oracleData, stalenessPercent, isLoading: oracleLoading } = useOraclePrice(DEMO_ORACLE);
    const { poolStats, isLoading: statsLoading } = usePoolStats(DEMO_POOL_ID);
    const {
        circuitBreaker,
        isGuardian,
        pauseSwaps,
        resumeSwaps,
        forceResumeSwaps,
        isPausing,
        isResuming,
        isForcing,
    } = useCircuitBreaker();

    const depegBps = guardianState?.depegBps ?? 0;
    const baseFee = 3000;
    const circuitBreakerBps = 200;
    const maxMultiplier = 15;

    const { multiplier, currentFee, maxFee } = useFeeMultiplier({
        depegBps,
        baseFee,
        circuitBreakerBps,
        maxMultiplier,
    });

    // Mock fallback data for chart and alerts
    const mockPegHistory = useMemo(() => USE_MOCK_DATA ? generateMockPegHistory() : [], []);
    const mockAlerts = useMemo(() => USE_MOCK_DATA ? generateMockAlerts() : [], []);

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-surface-100">Guardian Dashboard</h1>
                <p className="mt-1 text-sm text-surface-500">
                    Real-time monitoring of stablecoin peg status and hook parameters
                </p>
            </div>

            {/* 12-column grid layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Row 1 — Status bar (full width) */}
                <div className="lg:col-span-8">
                    <PegStatusCard
                        guardianState={guardianState}
                        tokenSymbol="USDC"
                        isLoading={stateLoading}
                    />
                </div>
                <div className="lg:col-span-4">
                    <OracleHealth
                        oracleData={oracleData}
                        stalenessPercent={stalenessPercent}
                        isLoading={oracleLoading}
                    />
                </div>

                {/* Row 2 — Pool Stats Grid */}
                <div className="lg:col-span-12">
                    <PoolStatsGrid stats={poolStats} isLoading={statsLoading} />
                </div>

                {/* Row 3 — Main metrics */}
                <div className="lg:col-span-4">
                    <FeeMultiplierGauge
                        multiplier={multiplier}
                        currentFee={currentFee}
                        baseFee={baseFee}
                        maxFee={maxFee}
                    />
                </div>

                {/* Row 3 — Charts */}
                <div className="lg:col-span-8">
                    <DepegHistoryChart
                        data={mockPegHistory}
                        driftWarningBps={10}
                        circuitBreakerBps={circuitBreakerBps}
                    />
                </div>

                {/* Row 4 — Alert Feed */}
                <div className="lg:col-span-8">
                    <AlertFeed alerts={mockAlerts} />
                </div>

                {/* Row 4 — Circuit Breaker Controls */}
                <div className="lg:col-span-4">
                    <CircuitBreakerPanel
                        circuitBreaker={circuitBreaker}
                        isGuardian={isGuardian}
                        onPause={pauseSwaps}
                        onResume={resumeSwaps}
                        onForceResume={forceResumeSwaps}
                        isPausing={isPausing}
                        isResuming={isResuming}
                        isForcing={isForcing}
                        currentDepegBps={depegBps}
                    />
                </div>
            </div>
        </div>
    );
}

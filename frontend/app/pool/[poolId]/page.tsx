"use client";

import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PegStatusCard } from "@/components/dashboard/PegStatusCard";
import { FeeMultiplierGauge } from "@/components/dashboard/FeeMultiplierGauge";
import { DepegHistoryChart } from "@/components/dashboard/DepegHistoryChart";
import { TickRangeVisualizer } from "@/components/pool/TickRangeVisualizer";
import { SwapSimulator } from "@/components/pool/SwapSimulator";
import { OracleHealth } from "@/components/shared/OracleHealth";
import { PoolStatsGrid } from "@/components/dashboard/PoolStatsGrid";

import { useDepegState } from "@/hooks/useDepegState";
import { useFeeMultiplier } from "@/hooks/useFeeMultiplier";
import { useOraclePrice } from "@/hooks/useOraclePrice";
import { usePoolStats } from "@/hooks/usePoolStats";
import { DepegState } from "@/lib/depegMath";

export default function PoolDetailPage() {
    const params = useParams();
    const poolId = (params.poolId as string) || "0x01";

    const poolIdHex = poolId.startsWith("0x")
        ? (poolId as `0x${string}`)
        : (`0x${poolId}` as `0x${string}`);

    const { state: guardianState, isLoading: stateLoading } = useDepegState(poolIdHex);
    const { oracleData, stalenessPercent, isLoading: oracleLoading } = useOraclePrice();
    const { poolStats, isLoading: statsLoading } = usePoolStats(poolId);

    const depegBps = guardianState?.depegBps ?? 0;
    const { multiplier, currentFee, maxFee } = useFeeMultiplier({ depegBps });

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Back nav */}
            <Link
                href="/dashboard"
                className="mb-6 inline-flex items-center gap-2 text-sm text-surface-400 transition-colors hover:text-surface-200"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
            </Link>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-8"
            >
                <h1 className="text-2xl font-bold text-surface-100">
                    Pool Details
                </h1>
                <p className="mt-1 text-sm text-surface-500 font-mono">
                    {poolIdHex.slice(0, 10)}...{poolIdHex.slice(-8)}
                </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Status Row */}
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

                {/* Stats */}
                <div className="lg:col-span-12">
                    <PoolStatsGrid stats={poolStats} isLoading={statsLoading} />
                </div>

                {/* Tick Range Visualizer */}
                <div className="lg:col-span-8">
                    <TickRangeVisualizer
                        currentTick={poolStats.currentTick}
                        oracleTick={0}
                        tickLower={-300}
                        tickUpper={300}
                        tickSpacing={60}
                    />
                </div>

                {/* Fee Gauge */}
                <div className="lg:col-span-4">
                    <FeeMultiplierGauge
                        multiplier={multiplier}
                        currentFee={currentFee}
                        baseFee={3000}
                        maxFee={maxFee}
                    />
                </div>

                {/* Historical Fee Chart */}
                <div className="lg:col-span-7">
                    <DepegHistoryChart data={[]} />
                </div>

                {/* Swap Simulator */}
                <div className="lg:col-span-5">
                    <SwapSimulator
                        depegBps={depegBps}
                        baseFee={3000}
                        circuitBreakerBps={200}
                        maxMultiplier={15}
                        swapsPaused={guardianState?.swapsPaused ?? false}
                        state={guardianState?.state ?? DepegState.PEGGED}
                        tokenSymbol="USDC"
                    />
                </div>
            </div>
        </div>
    );
}

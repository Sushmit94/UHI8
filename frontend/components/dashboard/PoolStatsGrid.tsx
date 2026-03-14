"use client";

import { motion } from "framer-motion";
import { TrendingUp, DollarSign, BarChart3, Activity } from "lucide-react";
import type { PoolStats } from "@/types/pool";

interface PoolStatsGridProps {
    stats: PoolStats;
    isLoading: boolean;
}

function formatUSD(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
}

function formatChange(value: number): string {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
}

const statItems = [
    { key: "tvl", label: "Total Value Locked", icon: DollarSign, format: formatUSD },
    { key: "volume24h", label: "24h Volume", icon: BarChart3, format: formatUSD },
    { key: "fees24h", label: "24h Fees Collected", icon: TrendingUp, format: formatUSD },
    { key: "txCount", label: "Total Transactions", icon: Activity, format: (v: number) => v.toLocaleString() },
] as const;

export function PoolStatsGrid({ stats, isLoading }: PoolStatsGridProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-2xl bg-surface-800/50 p-4 ring-1 ring-surface-700">
                        <div className="h-3 w-16 rounded bg-surface-700" />
                        <div className="mt-2 h-6 w-24 rounded bg-surface-700" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statItems.map(({ key, label, icon: Icon, format }, index) => (
                <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="rounded-2xl bg-gradient-to-br from-surface-800/80 to-surface-900/80 p-4 ring-1 ring-surface-700/50 backdrop-blur-xl"
                >
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-surface-500" />
                        <span className="text-xs text-surface-500">{label}</span>
                    </div>
                    <div className="mt-2">
                        <span className="text-xl font-bold text-surface-100 tabular-nums">
                            {format(stats[key])}
                        </span>
                        {key === "tvl" && stats.tvlChange24h !== 0 && (
                            <span
                                className={`ml-2 text-xs font-medium ${stats.tvlChange24h >= 0 ? "text-pegged-400" : "text-depegged-400"
                                    }`}
                            >
                                {formatChange(stats.tvlChange24h)}
                            </span>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

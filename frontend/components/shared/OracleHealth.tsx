"use client";

import { Activity, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import type { OracleData } from "@/types/pool";

interface OracleHealthProps {
    oracleData: OracleData | null;
    stalenessPercent: number;
    isLoading: boolean;
}

export function OracleHealth({ oracleData, stalenessPercent, isLoading }: OracleHealthProps) {
    if (isLoading) {
        return (
            <div className="animate-pulse rounded-2xl bg-surface-800/50 p-4">
                <div className="h-4 w-32 rounded bg-surface-700" />
                <div className="mt-2 h-3 w-48 rounded bg-surface-700" />
            </div>
        );
    }

    if (!oracleData) {
        return (
            <div className="rounded-2xl bg-surface-800/50 p-4 ring-1 ring-surface-700">
                <div className="flex items-center gap-2 text-surface-400">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Oracle not configured</span>
                </div>
            </div>
        );
    }

    const isHealthy = !oracleData.isStale && stalenessPercent < 80;
    const isWarning = !oracleData.isStale && stalenessPercent >= 80;
    const isStale = oracleData.isStale;

    const timeSinceUpdate = () => {
        const seconds = Math.floor((Date.now() - oracleData.updatedAt.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return `${Math.floor(seconds / 3600)}h ago`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
                "rounded-2xl p-4 ring-1",
                isStale && "bg-depegged-500/10 ring-depegged-500/30",
                isWarning && "bg-drifting-500/10 ring-drifting-500/30",
                isHealthy && "bg-pegged-500/10 ring-pegged-500/30"
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isStale ? (
                        <AlertTriangle className="h-4 w-4 text-depegged-400" />
                    ) : isWarning ? (
                        <AlertTriangle className="h-4 w-4 text-drifting-400" />
                    ) : (
                        <CheckCircle className="h-4 w-4 text-pegged-400" />
                    )}
                    <span className="text-sm font-medium text-surface-200">
                        Oracle Health
                    </span>
                </div>
                <span
                    className={clsx(
                        "text-xs font-semibold",
                        isStale ? "text-depegged-400" : isWarning ? "text-drifting-400" : "text-pegged-400"
                    )}
                >
                    {isStale ? "STALE" : isWarning ? "AGING" : "FRESH"}
                </span>
            </div>

            <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs">
                    <span className="text-surface-400">{oracleData.description}</span>
                    <span className="text-surface-300 font-mono">{timeSinceUpdate()}</span>
                </div>

                {/* Staleness bar */}
                <div className="h-1.5 w-full rounded-full bg-surface-700">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, stalenessPercent)}%` }}
                        transition={{ duration: 0.5 }}
                        className={clsx(
                            "h-full rounded-full",
                            isStale
                                ? "bg-depegged-500"
                                : isWarning
                                    ? "bg-drifting-500"
                                    : "bg-pegged-500"
                        )}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-surface-500">
                    <span>Fresh</span>
                    <span>Stale ({Math.round(stalenessPercent)}%)</span>
                </div>
            </div>
        </motion.div>
    );
}

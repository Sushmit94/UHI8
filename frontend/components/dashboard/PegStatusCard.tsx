"use client";

import { motion } from "framer-motion";
import { TrendingDown, DollarSign } from "lucide-react";
import { StateBadge } from "@/components/shared/StateBadge";
import { formatBpsPercent, normalizePrice18, DepegState } from "@/lib/depegMath";
import type { GuardianState } from "@/types/pool";

interface PegStatusCardProps {
    guardianState: GuardianState | null;
    tokenSymbol?: string;
    isLoading: boolean;
}

export function PegStatusCard({ guardianState, tokenSymbol = "USDC", isLoading }: PegStatusCardProps) {
    if (isLoading || !guardianState) {
        return (
            <div className="animate-pulse rounded-2xl bg-surface-800/50 p-6 ring-1 ring-surface-700">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-surface-700" />
                    <div className="space-y-2">
                        <div className="h-4 w-24 rounded bg-surface-700" />
                        <div className="h-6 w-32 rounded bg-surface-700" />
                    </div>
                </div>
            </div>
        );
    }

    const price = normalizePrice18(guardianState.lastOraclePrice);
    const deviation = formatBpsPercent(guardianState.depegBps);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl bg-gradient-to-br from-surface-800/80 to-surface-900/80 p-6 ring-1 ring-surface-700/50 backdrop-blur-xl"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-700/50 ring-1 ring-surface-600">
                        <DollarSign className="h-6 w-6 text-surface-300" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-surface-400">{tokenSymbol}/USD</span>
                            <StateBadge state={guardianState.state} size="sm" />
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-surface-100 tabular-nums">
                                ${price.toFixed(4)}
                            </span>
                            {guardianState.depegBps > 0 && (
                                <span className={`flex items-center gap-1 text-sm font-medium ${guardianState.state === DepegState.PEGGED
                                        ? "text-pegged-400"
                                        : guardianState.state === DepegState.DRIFTING
                                            ? "text-drifting-400"
                                            : "text-depegged-400"
                                    }`}>
                                    <TrendingDown className="h-3.5 w-3.5" />
                                    {deviation}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-xs text-surface-500">Last updated</div>
                    <div className="text-sm text-surface-300 font-mono">
                        {guardianState.lastUpdated.toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

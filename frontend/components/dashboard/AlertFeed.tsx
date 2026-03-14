"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertTriangle, ShieldOff, TrendingDown, Info } from "lucide-react";
import clsx from "clsx";
import type { DepegAlert } from "@/types/pool";

interface AlertFeedProps {
    alerts: DepegAlert[];
    isLoading?: boolean;
}

// Generate demo alerts when none exist
function getDemoAlerts(): DepegAlert[] {
    const now = Date.now();
    return [
        {
            id: "1",
            type: "state_change",
            title: "State: PEGGED",
            message: "Peg restored after recovery period",
            timestamp: new Date(now - 3600000),
            severity: "info",
            poolId: "demo",
            data: { newState: 0, depegBps: 3, oraclePrice: 0.99997 },
        },
        {
            id: "2",
            type: "fee_update",
            title: "Fee Updated",
            message: "Dynamic fee adjusted to 0.35%",
            timestamp: new Date(now - 7200000),
            severity: "info",
            poolId: "demo",
            data: { oldFee: 3000, newFee: 3500, depegBps: 15 },
        },
        {
            id: "3",
            type: "state_change",
            title: "State: DRIFTING",
            message: "Peg drift detected at $0.9985",
            timestamp: new Date(now - 10800000),
            severity: "warning",
            poolId: "demo",
            data: { oldState: 0, newState: 1, depegBps: 15, oraclePrice: 0.9985 },
        },
        {
            id: "4",
            type: "circuit_breaker",
            title: "Circuit Breaker",
            message: "Swaps resumed after cooldown",
            timestamp: new Date(now - 86400000),
            severity: "info",
            poolId: "demo",
        },
        {
            id: "5",
            type: "state_change",
            title: "State: DEPEGGED",
            message: "Circuit breaker triggered at $0.9790",
            timestamp: new Date(now - 90000000),
            severity: "critical",
            poolId: "demo",
            data: { oldState: 1, newState: 2, depegBps: 210, oraclePrice: 0.979 },
        },
    ];
}

const severityIcons = {
    info: Info,
    warning: AlertTriangle,
    critical: ShieldOff,
};

const severityColors = {
    info: "text-surface-400 bg-surface-700/30",
    warning: "text-drifting-400 bg-drifting-500/10",
    critical: "text-depegged-400 bg-depegged-500/10",
};

export function AlertFeed({ alerts, isLoading }: AlertFeedProps) {
    const displayAlerts = alerts.length > 0 ? alerts : getDemoAlerts();

    if (isLoading) {
        return (
            <div className="animate-pulse rounded-2xl bg-surface-800/50 p-4 ring-1 ring-surface-700 h-80">
                <div className="h-4 w-32 rounded bg-surface-700" />
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="mt-3 h-12 rounded bg-surface-700/50" />
                ))}
            </div>
        );
    }

    const formatTime = (date: Date) => {
        const now = Date.now();
        const diff = now - date.getTime();
        if (diff < 60_000) return "Just now";
        if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
        return `${Math.floor(diff / 86_400_000)}d ago`;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl bg-gradient-to-br from-surface-800/80 to-surface-900/80 p-4 ring-1 ring-surface-700/50 backdrop-blur-xl"
        >
            <div className="mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4 text-surface-400" />
                <h3 className="text-sm font-medium text-surface-400">Event Feed</h3>
                <span className="ml-auto text-xs text-surface-600">
                    {displayAlerts.length} events
                </span>
            </div>

            <div className="max-h-[300px] space-y-2 overflow-y-auto scrollbar-thin">
                <AnimatePresence>
                    {displayAlerts.map((alert, index) => {
                        const Icon = severityIcons[alert.severity];
                        return (
                            <motion.div
                                key={alert.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ delay: index * 0.05 }}
                                className={clsx(
                                    "flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-surface-700/30",
                                    severityColors[alert.severity]
                                )}
                            >
                                <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-surface-200">{alert.title}</span>
                                        <span className="text-[10px] text-surface-500 flex-shrink-0">
                                            {formatTime(alert.timestamp)}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-surface-400 truncate">{alert.message}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

"use client";

import { motion } from "framer-motion";
import { Shield, ShieldOff, Clock, Zap } from "lucide-react";
import clsx from "clsx";
import type { CircuitBreakerState } from "@/types/pool";

interface CircuitBreakerPanelProps {
    circuitBreaker: CircuitBreakerState;
    isGuardian: boolean;
    onPause: (depegBps: bigint) => void;
    onResume: () => void;
    onForceResume: () => void;
    isPausing: boolean;
    isResuming: boolean;
    isForcing: boolean;
    currentDepegBps?: number;
}

function formatCountdown(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export function CircuitBreakerPanel({
    circuitBreaker,
    isGuardian,
    onPause,
    onResume,
    onForceResume,
    isPausing,
    isResuming,
    isForcing,
    currentDepegBps = 0,
}: CircuitBreakerPanelProps) {
    if (!isGuardian) return null;

    const { isPaused, isInCooldown, cooldownRemainingSeconds, guardian } = circuitBreaker;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="rounded-2xl bg-gradient-to-br from-surface-800/80 to-surface-900/80 p-6 ring-1 ring-surface-700/50 backdrop-blur-xl"
        >
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isPaused ? (
                        <ShieldOff className="h-5 w-5 text-depegged-400" />
                    ) : (
                        <Shield className="h-5 w-5 text-pegged-400" />
                    )}
                    <h3 className="text-sm font-medium text-surface-300">Circuit Breaker Controls</h3>
                </div>
                <div
                    className={clsx(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        isPaused
                            ? "bg-depegged-500/20 text-depegged-400 ring-1 ring-depegged-500/30"
                            : "bg-pegged-500/20 text-pegged-400 ring-1 ring-pegged-500/30"
                    )}
                >
                    {isPaused ? "PAUSED" : "ACTIVE"}
                </div>
            </div>

            {/* Cooldown timer */}
            {isPaused && isInCooldown && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4 rounded-xl bg-drifting-500/10 p-3 ring-1 ring-drifting-500/20"
                >
                    <div className="flex items-center gap-2 text-drifting-400">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs font-medium">Cooldown Active</span>
                    </div>
                    <div className="mt-1 text-2xl font-bold text-drifting-300 font-mono tabular-nums">
                        {formatCountdown(cooldownRemainingSeconds)}
                    </div>
                    <div className="mt-1 h-1 w-full rounded-full bg-surface-700">
                        <motion.div
                            initial={{ width: "100%" }}
                            animate={{
                                width: `${(cooldownRemainingSeconds / circuitBreaker.cooldownSeconds) * 100}%`,
                            }}
                            className="h-full rounded-full bg-drifting-500"
                        />
                    </div>
                </motion.div>
            )}

            {/* Guardian address */}
            <div className="mb-4 text-xs text-surface-500">
                Guardian:{" "}
                <span className="font-mono text-surface-400">
                    {guardian.slice(0, 6)}...{guardian.slice(-4)}
                </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
                {!isPaused ? (
                    <button
                        onClick={() => onPause(BigInt(currentDepegBps))}
                        disabled={isPausing}
                        className={clsx(
                            "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all",
                            isPausing
                                ? "bg-surface-700 text-surface-500 cursor-wait"
                                : "bg-depegged-500/20 text-depegged-400 ring-1 ring-depegged-500/30 hover:bg-depegged-500/30 active:scale-95"
                        )}
                    >
                        <ShieldOff className="h-4 w-4" />
                        {isPausing ? "Pausing..." : "Pause Swaps"}
                    </button>
                ) : (
                    <>
                        <button
                            onClick={onResume}
                            disabled={isResuming || isInCooldown}
                            className={clsx(
                                "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all",
                                isResuming || isInCooldown
                                    ? "bg-surface-700 text-surface-500 cursor-not-allowed"
                                    : "bg-pegged-500/20 text-pegged-400 ring-1 ring-pegged-500/30 hover:bg-pegged-500/30 active:scale-95"
                            )}
                        >
                            <Shield className="h-4 w-4" />
                            {isResuming ? "Resuming..." : "Resume"}
                        </button>
                        <button
                            onClick={onForceResume}
                            disabled={isForcing}
                            className={clsx(
                                "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all",
                                isForcing
                                    ? "bg-surface-700 text-surface-500 cursor-wait"
                                    : "bg-drifting-500/20 text-drifting-400 ring-1 ring-drifting-500/30 hover:bg-drifting-500/30 active:scale-95"
                            )}
                        >
                            <Zap className="h-4 w-4" />
                            {isForcing ? "Forcing..." : "Force Resume"}
                        </button>
                    </>
                )}
            </div>
        </motion.div>
    );
}

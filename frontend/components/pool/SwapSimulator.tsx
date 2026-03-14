"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRightLeft, AlertTriangle } from "lucide-react";
import { computeDynamicFee, formatFeePercent, DepegState } from "@/lib/depegMath";
import clsx from "clsx";

interface SwapSimulatorProps {
    depegBps: number;
    baseFee?: number;
    circuitBreakerBps?: number;
    maxMultiplier?: number;
    swapsPaused: boolean;
    state: DepegState;
    tokenSymbol?: string;
}

export function SwapSimulator({
    depegBps,
    baseFee = 3000,
    circuitBreakerBps = 200,
    maxMultiplier = 15,
    swapsPaused,
    state,
    tokenSymbol = "USDC",
}: SwapSimulatorProps) {
    const [inputAmount, setInputAmount] = useState("1000");

    const simulation = useMemo(() => {
        const amount = parseFloat(inputAmount) || 0;
        const fee = computeDynamicFee(baseFee, depegBps, circuitBreakerBps, maxMultiplier);
        const feePercent = fee / 1_000_000;
        const feeAmount = amount * feePercent;
        const outputAmount = amount - feeAmount;

        return {
            inputAmount: amount,
            outputAmount,
            feeAmount,
            feePercent: formatFeePercent(fee),
            feeRaw: fee,
        };
    }, [inputAmount, depegBps, baseFee, circuitBreakerBps, maxMultiplier]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-surface-800/80 to-surface-900/80 p-6 ring-1 ring-surface-700/50 backdrop-blur-xl"
        >
            <div className="mb-4 flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-surface-400" />
                <h3 className="text-sm font-medium text-surface-400">Swap Simulator</h3>
            </div>

            {swapsPaused && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-depegged-500/10 p-3 ring-1 ring-depegged-500/20">
                    <AlertTriangle className="h-4 w-4 text-depegged-400" />
                    <span className="text-xs text-depegged-400 font-semibold">
                        Swaps are currently paused by circuit breaker
                    </span>
                </div>
            )}

            {/* Input */}
            <div className="space-y-3">
                <div className="rounded-xl bg-surface-900/50 p-4 ring-1 ring-surface-700">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-surface-500">You pay</span>
                        <span className="text-xs text-surface-500">{tokenSymbol}</span>
                    </div>
                    <input
                        type="number"
                        value={inputAmount}
                        onChange={(e) => setInputAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1 w-full bg-transparent text-2xl font-bold text-surface-100 outline-none placeholder:text-surface-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                    <div className="rounded-lg bg-surface-700/50 p-1.5">
                        <ArrowRightLeft className="h-4 w-4 text-surface-400 rotate-90" />
                    </div>
                </div>

                {/* Output */}
                <div className="rounded-xl bg-surface-900/50 p-4 ring-1 ring-surface-700">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-surface-500">You receive (estimated)</span>
                        <span className="text-xs text-surface-500">WETH</span>
                    </div>
                    <div className={clsx(
                        "mt-1 text-2xl font-bold tabular-nums",
                        swapsPaused ? "text-surface-600 line-through" : "text-surface-100"
                    )}>
                        {simulation.outputAmount.toFixed(4)}
                    </div>
                </div>
            </div>

            {/* Fee breakdown */}
            <div className="mt-4 space-y-2 rounded-xl bg-surface-900/30 p-3">
                <div className="flex justify-between text-xs">
                    <span className="text-surface-500">Dynamic Fee</span>
                    <span className={clsx(
                        "font-mono font-semibold",
                        state === DepegState.PEGGED ? "text-pegged-400" :
                            state === DepegState.DRIFTING ? "text-drifting-400" :
                                "text-depegged-400"
                    )}>
                        {simulation.feePercent}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-surface-500">Fee Amount</span>
                    <span className="font-mono text-surface-300">
                        {simulation.feeAmount.toFixed(4)} {tokenSymbol}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-surface-500">Price Impact</span>
                    <span className="font-mono text-surface-300">{"< 0.01%"}</span>
                </div>
            </div>

            {/* Swap button */}
            <button
                disabled={swapsPaused}
                className={clsx(
                    "mt-4 w-full rounded-xl py-3.5 text-sm font-semibold transition-all",
                    swapsPaused
                        ? "bg-surface-700 text-surface-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 active:scale-[0.98]"
                )}
            >
                {swapsPaused ? "Swaps Paused" : "Simulate Swap"}
            </button>
        </motion.div>
    );
}

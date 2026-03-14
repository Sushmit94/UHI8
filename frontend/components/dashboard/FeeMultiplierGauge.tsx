"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatFeePercent } from "@/lib/depegMath";

interface FeeMultiplierGaugeProps {
    multiplier: number;
    currentFee: number;
    baseFee: number;
    maxFee: number;
}

export function FeeMultiplierGauge({ multiplier, currentFee, baseFee, maxFee }: FeeMultiplierGaugeProps) {
    const percentage = useMemo(() => {
        return Math.min(100, ((currentFee - baseFee) / (maxFee - baseFee)) * 100);
    }, [currentFee, baseFee, maxFee]);

    const gaugeColor = useMemo(() => {
        if (percentage < 25) return "#22c55e"; // pegged green
        if (percentage < 60) return "#f59e0b"; // drifting amber
        return "#ef4444"; // depegged red
    }, [percentage]);

    const data = [
        { name: "Used", value: Math.max(1, percentage) },
        { name: "Remaining", value: Math.max(1, 100 - percentage) },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl bg-gradient-to-br from-surface-800/80 to-surface-900/80 p-6 ring-1 ring-surface-700/50 backdrop-blur-xl"
        >
            <div className="text-sm font-medium text-surface-400 mb-2">Fee Multiplier</div>

            <div className="relative mx-auto h-40 w-40">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={55}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell fill={gaugeColor} />
                            <Cell fill="#1e293b" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                        key={multiplier}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="text-3xl font-bold text-surface-100"
                        style={{ color: gaugeColor }}
                    >
                        {multiplier.toFixed(1)}x
                    </motion.span>
                    <span className="text-xs text-surface-500">multiplier</span>
                </div>
            </div>

            <div className="mt-2 flex justify-between text-xs text-surface-400">
                <div>
                    <span className="text-surface-500">Base: </span>
                    <span className="font-mono">{formatFeePercent(baseFee)}</span>
                </div>
                <div>
                    <span className="text-surface-500">Current: </span>
                    <span className="font-mono font-semibold text-surface-200">{formatFeePercent(currentFee)}</span>
                </div>
            </div>
        </motion.div>
    );
}

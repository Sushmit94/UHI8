"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import clsx from "clsx";
import { ArrowDown } from "lucide-react";

interface TickRangeVisualizerProps {
    currentTick: number;
    oracleTick?: number;
    tickLower?: number;
    tickUpper?: number;
    tickSpacing?: number;
}

export function TickRangeVisualizer({
    currentTick = 0,
    oracleTick = 0,
    tickLower = -50,
    tickUpper = 50,
    tickSpacing = 60,
}: TickRangeVisualizerProps) {
    const totalRange = tickUpper - tickLower;
    const padding = totalRange * 0.3;
    const displayMin = tickLower - padding;
    const displayMax = tickUpper + padding;
    const displayRange = displayMax - displayMin;

    const toPercent = (tick: number) => {
        return ((tick - displayMin) / displayRange) * 100;
    };

    const currentPercent = toPercent(currentTick);
    const oraclePercent = toPercent(oracleTick);
    const lowerPercent = toPercent(tickLower);
    const upperPercent = toPercent(tickUpper);

    const isInRange = currentTick >= tickLower && currentTick <= tickUpper;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-surface-800/80 to-surface-900/80 p-6 ring-1 ring-surface-700/50 backdrop-blur-xl"
        >
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-surface-400">Tick Range</h3>
                <div
                    className={clsx(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        isInRange
                            ? "bg-pegged-500/20 text-pegged-400"
                            : "bg-depegged-500/20 text-depegged-400"
                    )}
                >
                    {isInRange ? "In Range" : "Out of Range"}
                </div>
            </div>

            {/* Visualization */}
            <div className="relative h-16 mt-6 mb-8">
                {/* Background track */}
                <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-700" />

                {/* Active range area */}
                <div
                    className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-pegged-500/30"
                    style={{
                        left: `${lowerPercent}%`,
                        width: `${upperPercent - lowerPercent}%`,
                    }}
                />

                {/* Out-of-range zones */}
                <div
                    className="absolute top-1/2 h-2 -translate-y-1/2 rounded-l-full bg-depegged-500/15"
                    style={{ left: "0%", width: `${lowerPercent}%` }}
                />
                <div
                    className="absolute top-1/2 h-2 -translate-y-1/2 rounded-r-full bg-depegged-500/15"
                    style={{ left: `${upperPercent}%`, width: `${100 - upperPercent}%` }}
                />

                {/* Tick Lower marker */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${lowerPercent}%` }}
                >
                    <div className="w-0.5 h-4 bg-surface-500 mx-auto" />
                    <div className="mt-1 text-[9px] text-surface-500 text-center whitespace-nowrap">
                        {tickLower}
                    </div>
                </div>

                {/* Tick Upper marker */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${upperPercent}%` }}
                >
                    <div className="w-0.5 h-4 bg-surface-500 mx-auto" />
                    <div className="mt-1 text-[9px] text-surface-500 text-center whitespace-nowrap">
                        {tickUpper}
                    </div>
                </div>

                {/* Oracle price marker */}
                <div
                    className="absolute -translate-x-1/2"
                    style={{ left: `${oraclePercent}%`, top: "-8px" }}
                >
                    <div className="text-[9px] text-drifting-400 text-center mb-0.5">Oracle</div>
                    <ArrowDown className="h-3 w-3 text-drifting-400 mx-auto" />
                    <div className="w-0.5 h-4 bg-drifting-500 mx-auto" />
                </div>

                {/* Current tick marker */}
                <motion.div
                    initial={{ left: "50%" }}
                    animate={{ left: `${currentPercent}%` }}
                    className="absolute -translate-x-1/2"
                    style={{ bottom: "-4px" }}
                >
                    <div className="w-0.5 h-4 bg-purple-400 mx-auto" />
                    <div className="mt-0.5 text-[9px] text-purple-400 text-center whitespace-nowrap font-mono">
                        {currentTick}
                    </div>
                    <div className="text-[8px] text-purple-500 text-center">Current</div>
                </motion.div>
            </div>

            {/* Legend */}
            <div className="mt-4 flex justify-center gap-4 text-[10px] text-surface-500">
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-pegged-500/50" />
                    <span>Active Range</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-drifting-500" />
                    <span>Oracle Price</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-purple-400" />
                    <span>Current Tick</span>
                </div>
            </div>
        </motion.div>
    );
}

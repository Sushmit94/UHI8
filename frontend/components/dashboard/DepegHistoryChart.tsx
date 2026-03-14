"use client";

import { motion } from "framer-motion";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceArea,
    ReferenceLine,
} from "recharts";
import type { PegHistoryDataPoint } from "@/types/pool";

interface DepegHistoryChartProps {
    data: PegHistoryDataPoint[];
    driftWarningBps?: number;
    circuitBreakerBps?: number;
    isLoading?: boolean;
}

// Generate mock demo data when no real data is available
function generateDemoData(): PegHistoryDataPoint[] {
    const now = Date.now();
    const points: PegHistoryDataPoint[] = [];

    for (let i = 168; i >= 0; i--) {
        const timestamp = now - i * 3600 * 1000;
        const baseDeviation = Math.sin(i / 24) * 5 + Math.random() * 3;
        const depegBps = Math.max(0, Math.abs(baseDeviation));
        const price = 1 - depegBps / 10000;

        points.push({
            timestamp,
            price,
            depegBps,
            fee: 3000 * (1 + (14 * (depegBps / 200) ** 2)),
            state: depegBps >= 200 ? 2 : depegBps >= 10 ? 1 : 0,
        });
    }
    return points;
}

export function DepegHistoryChart({
    data,
    driftWarningBps = 10,
    circuitBreakerBps = 200,
    isLoading,
}: DepegHistoryChartProps) {
    const chartData = data.length > 0 ? data : generateDemoData();

    if (isLoading) {
        return (
            <div className="animate-pulse rounded-2xl bg-surface-800/50 p-6 ring-1 ring-surface-700 h-80">
                <div className="h-4 w-40 rounded bg-surface-700" />
                <div className="mt-4 h-full rounded bg-surface-700/50" />
            </div>
        );
    }

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    const formatTooltipTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const driftPct = driftWarningBps / 100;
    const breakerPct = circuitBreakerBps / 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="rounded-2xl bg-gradient-to-br from-surface-800/80 to-surface-900/80 p-6 ring-1 ring-surface-700/50 backdrop-blur-xl"
        >
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-medium text-surface-400">Peg Deviation (7d)</h3>
                <div className="flex items-center gap-3 text-[10px]">
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-pegged-500" />
                        <span className="text-surface-500">Pegged</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-drifting-500" />
                        <span className="text-surface-500">Drifting</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-depegged-500" />
                        <span className="text-surface-500">Depegged</span>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />

                    {/* Threshold zones */}
                    <ReferenceArea y1={0} y2={driftPct} fill="#22c55e" fillOpacity={0.05} />
                    <ReferenceArea y1={driftPct} y2={breakerPct} fill="#f59e0b" fillOpacity={0.08} />
                    <ReferenceArea y1={breakerPct} y2={10} fill="#ef4444" fillOpacity={0.08} />

                    {/* Threshold lines */}
                    <ReferenceLine
                        y={driftPct}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        strokeOpacity={0.6}
                        label={{ value: `${driftPct}%`, fill: "#f59e0b", fontSize: 10, position: "right" }}
                    />
                    <ReferenceLine
                        y={breakerPct}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        strokeOpacity={0.6}
                        label={{ value: `${breakerPct}%`, fill: "#ef4444", fontSize: 10, position: "right" }}
                    />

                    <XAxis
                        dataKey="timestamp"
                        tickFormatter={formatTime}
                        stroke="#475569"
                        fontSize={10}
                        tickLine={false}
                    />
                    <YAxis
                        tickFormatter={(v) => `${v.toFixed(1)}%`}
                        stroke="#475569"
                        fontSize={10}
                        tickLine={false}
                        domain={[0, "auto"]}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: "12px",
                            fontSize: "12px",
                        }}
                        labelFormatter={formatTooltipTime}
                        formatter={(value: number) => [`${(value as number / 100).toFixed(4)}%`, "Deviation"]}
                    />
                    <Line
                        type="monotone"
                        dataKey="depegBps"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: "#8b5cf6" }}
                        name="Depeg (bps)"
                    />
                </LineChart>
            </ResponsiveContainer>
        </motion.div>
    );
}

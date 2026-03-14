"use client";

import { motion } from "framer-motion";
import { DepegState, getStateLabel, getStateColor } from "@/lib/depegMath";
import clsx from "clsx";

interface StateBadgeProps {
    state: DepegState;
    size?: "sm" | "md" | "lg";
    showPulse?: boolean;
}

const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
};

const colorMap: Record<string, { bg: string; text: string; ring: string; pulse: string }> = {
    pegged: {
        bg: "bg-pegged-500/20",
        text: "text-pegged-400",
        ring: "ring-pegged-500/50",
        pulse: "bg-pegged-400",
    },
    drifting: {
        bg: "bg-drifting-500/20",
        text: "text-drifting-400",
        ring: "ring-drifting-500/50",
        pulse: "bg-drifting-400",
    },
    depegged: {
        bg: "bg-depegged-500/20",
        text: "text-depegged-400",
        ring: "ring-depegged-500/50",
        pulse: "bg-depegged-400",
    },
};

export function StateBadge({ state, size = "md", showPulse = true }: StateBadgeProps) {
    const color = getStateColor(state);
    const label = getStateLabel(state);
    const colors = colorMap[color] || colorMap.pegged;

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className={clsx(
                "inline-flex items-center gap-2 rounded-full font-semibold ring-1",
                sizeClasses[size],
                colors.bg,
                colors.text,
                colors.ring
            )}
        >
            {showPulse && (
                <span className="relative flex h-2.5 w-2.5">
                    <motion.span
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={clsx("absolute inline-flex h-full w-full rounded-full opacity-75", colors.pulse)}
                    />
                    <span className={clsx("relative inline-flex h-2.5 w-2.5 rounded-full", colors.pulse)} />
                </span>
            )}
            {label}
        </motion.div>
    );
}

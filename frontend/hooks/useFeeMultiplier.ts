"use client";

import { useMemo } from "react";
import { computeFeeMultiplier, computeDynamicFee, formatFeePercent } from "@/lib/depegMath";

interface UseFeeMultiplierParams {
    depegBps: number;
    baseFee?: number;
    circuitBreakerBps?: number;
    maxMultiplier?: number;
}

/**
 * Mirrors DepegMath.sol fee computation in TypeScript for the UI
 */
export function useFeeMultiplier({
    depegBps,
    baseFee = 3000,
    circuitBreakerBps = 200,
    maxMultiplier = 15,
}: UseFeeMultiplierParams) {
    const result = useMemo(() => {
        const multiplier = computeFeeMultiplier(depegBps, circuitBreakerBps, maxMultiplier);
        const currentFee = computeDynamicFee(baseFee, depegBps, circuitBreakerBps, maxMultiplier);
        const feePercent = formatFeePercent(currentFee);
        const multiplierDisplay = multiplier.toFixed(2) + "x";

        return {
            multiplier,
            currentFee,
            feePercent,
            multiplierDisplay,
            baseFee,
            maxFee: baseFee * maxMultiplier,
        };
    }, [depegBps, baseFee, circuitBreakerBps, maxMultiplier]);

    return result;
}

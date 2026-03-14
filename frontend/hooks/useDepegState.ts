"use client";

import { useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { DEPEG_GUARDIAN_HOOK_ABI, getHookAddress } from "@/lib/contracts";
import { DepegState } from "@/lib/depegMath";
import type { GuardianState } from "@/types/pool";
import type { OnchainGuardianState } from "@/types/contracts";
import { useChainId } from "wagmi";
import toast from "react-hot-toast";

/**
 * Poll onchain depeg state every 12 seconds (one Ethereum block)
 */
export function useDepegState(poolId: `0x${string}`) {
    const chainId = useChainId();
    const prevStateRef = useRef<DepegState | null>(null);
    const queryClient = useQueryClient();

    const hookAddress = (() => {
        try {
            return getHookAddress(chainId);
        } catch {
            return "0x0000000000000000000000000000000000000000" as `0x${string}`;
        }
    })();

    const { data, isLoading, isError, error, queryKey } = useReadContract({
        address: hookAddress,
        abi: DEPEG_GUARDIAN_HOOK_ABI,
        functionName: "getDepegState",
        args: [poolId],
        query: {
            enabled: !!poolId && hookAddress !== "0x0000000000000000000000000000000000000000",
            refetchInterval: 12_000, // 12 seconds
            staleTime: 10_000,
        },
    });

    // Auto-refresh
    useEffect(() => {
        const interval = setInterval(() => {
            queryClient.invalidateQueries({ queryKey });
        }, 12_000);
        return () => clearInterval(interval);
    }, [queryClient, queryKey]);

    // Parse onchain data
    const guardianState: GuardianState | null = data
        ? {
            state: (data as OnchainGuardianState).state as DepegState,
            depegBps: Number((data as OnchainGuardianState).depegBps),
            currentFee: Number((data as OnchainGuardianState).currentFee),
            lastOraclePrice: (data as OnchainGuardianState).lastOraclePrice,
            lastUpdated: new Date(Number((data as OnchainGuardianState).lastUpdated) * 1000),
            swapsPaused: (data as OnchainGuardianState).swapsPaused,
        }
        : null;

    // Toast notifications on state transitions
    useEffect(() => {
        if (!guardianState) return;
        const currentState = guardianState.state;

        if (prevStateRef.current !== null && prevStateRef.current !== currentState) {
            const price = Number(guardianState.lastOraclePrice) / 1e18;

            if (prevStateRef.current === DepegState.PEGGED && currentState === DepegState.DRIFTING) {
                toast("⚠️ Peg drift detected at $" + price.toFixed(4), {
                    icon: "⚠️",
                    style: { background: "#fef3c7", color: "#92400e" },
                });
            } else if (currentState === DepegState.DEPEGGED) {
                toast.error("🚨 Circuit breaker triggered: swaps paused", {
                    duration: 10000,
                });
            } else if (currentState === DepegState.PEGGED && prevStateRef.current !== DepegState.PEGGED) {
                toast.success("✅ Peg restored: swaps resumed");
            }
        }
        prevStateRef.current = currentState;
    }, [guardianState]);

    return {
        state: guardianState,
        isLoading,
        isError,
        error,
    };
}

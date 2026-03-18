"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useChainId, useAccount } from "wagmi";
import { useMemo, useState, useEffect } from "react";
import { DEPEG_GUARDIAN_HOOK_ABI, getHookAddress } from "@/lib/contracts";
import type { CircuitBreakerState } from "@/types/pool";
import toast from "react-hot-toast";
import { USE_MOCK_DATA, MOCK_CIRCUIT_BREAKER } from "@/lib/mockData";

/**
 * Read + write circuit breaker state.
 * Falls back to mock data when on-chain reads are unavailable.
 */
export function useCircuitBreaker() {
    const chainId = useChainId();
    const { address: userAddress } = useAccount();
    const [cooldownTimer, setCooldownTimer] = useState(0);

    const hookAddress = (() => {
        try {
            return getHookAddress(chainId);
        } catch {
            return "0x0000000000000000000000000000000000000000" as `0x${string}`;
        }
    })();

    const enabled = hookAddress !== "0x0000000000000000000000000000000000000000";

    // Read contract state
    const { data: isPaused } = useReadContract({
        address: hookAddress,
        abi: DEPEG_GUARDIAN_HOOK_ABI,
        functionName: "swapsPaused",
        query: { enabled, refetchInterval: 12_000 },
    });

    const { data: pausedAt } = useReadContract({
        address: hookAddress,
        abi: DEPEG_GUARDIAN_HOOK_ABI,
        functionName: "pausedAt",
        query: { enabled, refetchInterval: 12_000 },
    });

    const { data: cooldownSecs } = useReadContract({
        address: hookAddress,
        abi: DEPEG_GUARDIAN_HOOK_ABI,
        functionName: "cooldownSeconds",
        query: { enabled },
    });

    const { data: guardianAddr } = useReadContract({
        address: hookAddress,
        abi: DEPEG_GUARDIAN_HOOK_ABI,
        functionName: "guardian",
        query: { enabled },
    });

    const { data: inCooldown } = useReadContract({
        address: hookAddress,
        abi: DEPEG_GUARDIAN_HOOK_ABI,
        functionName: "isInCooldown",
        query: { enabled, refetchInterval: 5_000 },
    });

    const { data: cooldownRemaining } = useReadContract({
        address: hookAddress,
        abi: DEPEG_GUARDIAN_HOOK_ABI,
        functionName: "cooldownRemaining",
        query: { enabled, refetchInterval: 5_000 },
    });

    // Write contracts
    const { writeContract: pauseSwaps, data: pauseHash, isPending: isPausing } = useWriteContract();
    const { writeContract: resumeSwaps, data: resumeHash, isPending: isResuming } = useWriteContract();
    const { writeContract: forceResume, data: forceHash, isPending: isForcing } = useWriteContract();

    // Track tx receipts
    const { isSuccess: pauseSuccess } = useWaitForTransactionReceipt({ hash: pauseHash });
    const { isSuccess: resumeSuccess } = useWaitForTransactionReceipt({ hash: resumeHash });
    const { isSuccess: forceSuccess } = useWaitForTransactionReceipt({ hash: forceHash });

    // Toast on tx success
    useEffect(() => {
        if (pauseSuccess) toast.success("Swaps paused successfully");
    }, [pauseSuccess]);

    useEffect(() => {
        if (resumeSuccess) toast.success("Swaps resumed successfully");
    }, [resumeSuccess]);

    useEffect(() => {
        if (forceSuccess) toast.success("Swaps force-resumed successfully");
    }, [forceSuccess]);

    // Cooldown timer
    useEffect(() => {
        const remaining = Number(cooldownRemaining || 0);
        setCooldownTimer(remaining);

        if (remaining > 0) {
            const interval = setInterval(() => {
                setCooldownTimer((prev) => Math.max(0, prev - 1));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [cooldownRemaining]);

    // Derived state — use mock data as fallback when on-chain reads are unavailable
    const hasOnchainData = isPaused !== undefined || guardianAddr !== undefined;
    const circuitBreaker: CircuitBreakerState = useMemo(
        () => {
            if (!hasOnchainData && USE_MOCK_DATA) return MOCK_CIRCUIT_BREAKER;
            return {
                isPaused: Boolean(isPaused),
                pausedAt: pausedAt ? new Date(Number(pausedAt) * 1000) : null,
                cooldownSeconds: Number(cooldownSecs || 3600),
                isInCooldown: Boolean(inCooldown),
                cooldownRemainingSeconds: cooldownTimer,
                guardian: (guardianAddr as `0x${string}`) || "0x0000000000000000000000000000000000000000",
            };
        },
        [isPaused, pausedAt, cooldownSecs, inCooldown, cooldownTimer, guardianAddr, hasOnchainData]
    );

    const isGuardian = useMemo(
        () => userAddress?.toLowerCase() === circuitBreaker.guardian?.toLowerCase(),
        [userAddress, circuitBreaker.guardian]
    );

    const handlePauseSwaps = (depegBps: bigint) => {
        pauseSwaps({
            address: hookAddress,
            abi: DEPEG_GUARDIAN_HOOK_ABI,
            functionName: "pauseSwaps",
            args: [depegBps],
        });
    };

    const handleResumeSwaps = () => {
        resumeSwaps({
            address: hookAddress,
            abi: DEPEG_GUARDIAN_HOOK_ABI,
            functionName: "resumeSwaps",
        });
    };

    const handleForceResume = () => {
        forceResume({
            address: hookAddress,
            abi: DEPEG_GUARDIAN_HOOK_ABI,
            functionName: "forceResumeSwaps",
        });
    };

    return {
        circuitBreaker,
        isGuardian,
        pauseSwaps: handlePauseSwaps,
        resumeSwaps: handleResumeSwaps,
        forceResumeSwaps: handleForceResume,
        isPausing,
        isResuming,
        isForcing,
    };
}

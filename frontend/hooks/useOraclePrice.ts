"use client";

import { useReadContract, useChainId } from "wagmi";
import { useMemo } from "react";
import { CHAINLINK_ORACLE_ABI } from "@/lib/contracts";
import type { OracleData } from "@/types/pool";
import { USE_MOCK_DATA, MOCK_ORACLE_DATA, getMockOracleFormatted, getMockStalenessPercent } from "@/lib/mockData";

/**
 * Read Chainlink oracle price feed via viem.
 * Falls back to mock data when oracle reads are unavailable.
 */
export function useOraclePrice(oracleAddress?: `0x${string}`, maxOracleAge: number = 3600) {
    const chainId = useChainId();

    const enabled = !!oracleAddress && oracleAddress !== "0x0000000000000000000000000000000000000000";

    const { data: roundData, isLoading: isLoadingPrice } = useReadContract({
        address: oracleAddress as `0x${string}`,
        abi: CHAINLINK_ORACLE_ABI,
        functionName: "latestRoundData",
        query: {
            enabled,
            refetchInterval: 12_000,
            staleTime: 10_000,
        },
    });

    const { data: decimals, isLoading: isLoadingDecimals } = useReadContract({
        address: oracleAddress as `0x${string}`,
        abi: CHAINLINK_ORACLE_ABI,
        functionName: "decimals",
        query: { enabled },
    });

    const { data: description } = useReadContract({
        address: oracleAddress as `0x${string}`,
        abi: CHAINLINK_ORACLE_ABI,
        functionName: "description",
        query: { enabled },
    });

    const onchainOracleData: OracleData | null = useMemo(() => {
        if (!roundData) return null;

        const [roundId, answer, , updatedAt, answeredInRound] = roundData as [
            bigint,
            bigint,
            bigint,
            bigint,
            bigint
        ];

        const now = Math.floor(Date.now() / 1000);
        const age = now - Number(updatedAt);
        const isStale = age > maxOracleAge;

        return {
            price: answer,
            updatedAt: new Date(Number(updatedAt) * 1000),
            isStale,
            roundId,
            decimals: Number(decimals || 8),
            description: (description as string) || "Unknown Feed",
        };
    }, [roundData, decimals, description, maxOracleAge]);

    // Use mock data as fallback
    const oracleData = onchainOracleData ?? (USE_MOCK_DATA ? MOCK_ORACLE_DATA : null);

    const priceFormatted = useMemo(() => {
        if (!oracleData) return "$-.----";
        if (!onchainOracleData && USE_MOCK_DATA) return getMockOracleFormatted();
        const dec = oracleData.decimals;
        const price = Number(oracleData.price) / 10 ** dec;
        return "$" + price.toFixed(4);
    }, [oracleData, onchainOracleData]);

    const stalenessPercent = useMemo(() => {
        if (!oracleData) return 0;
        if (!onchainOracleData && USE_MOCK_DATA) return getMockStalenessPercent(maxOracleAge);
        const now = Math.floor(Date.now() / 1000);
        const age = now - Math.floor(oracleData.updatedAt.getTime() / 1000);
        return Math.min(100, (age / maxOracleAge) * 100);
    }, [oracleData, onchainOracleData, maxOracleAge]);

    return {
        oracleData,
        priceFormatted,
        stalenessPercent,
        isLoading: USE_MOCK_DATA ? false : (isLoadingPrice || isLoadingDecimals),
    };
}

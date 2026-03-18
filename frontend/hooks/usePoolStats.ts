"use client";

import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { useMemo } from "react";
import { fetchPoolStats } from "@/lib/subgraph";
import type { PoolStats } from "@/types/pool";
import { USE_MOCK_DATA, MOCK_POOL_STATS } from "@/lib/mockData";

/**
 * Fetch pool stats from The Graph subgraph.
 * Falls back to mock data when subgraph is unavailable.
 */
export function usePoolStats(poolId?: string) {
    const chainId = useChainId();

    const { data: subgraphData, isLoading } = useQuery({
        queryKey: ["poolStats", chainId, poolId],
        queryFn: () => fetchPoolStats(chainId, poolId || ""),
        enabled: !!poolId,
        refetchInterval: 30_000, // 30 seconds
        staleTime: 15_000,
    });

    const poolStats: PoolStats = useMemo(() => {
        if (subgraphData) {
            return {
                tvl: parseFloat(subgraphData.totalValueLockedUSD),
                tvlChange24h: 0, // Would need day-over-day comparison
                volume24h: parseFloat(subgraphData.volumeUSD),
                fees24h: parseFloat(subgraphData.feesUSD),
                txCount: parseInt(subgraphData.txCount),
                currentTick: parseInt(subgraphData.tick),
            };
        }

        // Use mock data as fallback
        if (USE_MOCK_DATA) return MOCK_POOL_STATS;

        return {
            tvl: 0,
            tvlChange24h: 0,
            volume24h: 0,
            fees24h: 0,
            txCount: 0,
            currentTick: 0,
        };
    }, [subgraphData]);

    return {
        poolStats,
        token0: subgraphData?.token0,
        token1: subgraphData?.token1,
        isLoading: USE_MOCK_DATA ? false : isLoading,
    };
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useChainId } from "wagmi";
import { useMemo } from "react";
import { fetchPoolStats } from "@/lib/subgraph";
import type { PoolStats } from "@/types/pool";

/**
 * Fetch pool stats from The Graph subgraph
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
        if (!subgraphData) {
            return {
                tvl: 0,
                tvlChange24h: 0,
                volume24h: 0,
                fees24h: 0,
                txCount: 0,
                currentTick: 0,
            };
        }

        return {
            tvl: parseFloat(subgraphData.totalValueLockedUSD),
            tvlChange24h: 0, // Would need day-over-day comparison
            volume24h: parseFloat(subgraphData.volumeUSD),
            fees24h: parseFloat(subgraphData.feesUSD),
            txCount: parseInt(subgraphData.txCount),
            currentTick: parseInt(subgraphData.tick),
        };
    }, [subgraphData]);

    return {
        poolStats,
        token0: subgraphData?.token0,
        token1: subgraphData?.token1,
        isLoading,
    };
}

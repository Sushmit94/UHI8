import { GraphQLClient, gql } from "graphql-request";

// ─── Subgraph URLs ───────────────────────────────────────────────────────────

const SUBGRAPH_URLS: Record<number, string> = {
    1: process.env.NEXT_PUBLIC_SUBGRAPH_MAINNET || "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v4",
    8453: process.env.NEXT_PUBLIC_SUBGRAPH_BASE || "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v4-base",
    42161: process.env.NEXT_PUBLIC_SUBGRAPH_ARBITRUM || "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v4-arbitrum",
    11155111: process.env.NEXT_PUBLIC_SUBGRAPH_SEPOLIA || "",
};

// ─── Client Factory ──────────────────────────────────────────────────────────

export function getSubgraphClient(chainId: number): GraphQLClient | null {
    const url = SUBGRAPH_URLS[chainId];
    if (!url) return null;
    return new GraphQLClient(url);
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const POOL_STATS_QUERY = gql`
  query PoolStats($poolId: String!) {
    pool(id: $poolId) {
      id
      totalValueLockedUSD
      volumeUSD
      feesUSD
      txCount
      token0 {
        symbol
        name
        decimals
      }
      token1 {
        symbol
        name
        decimals
      }
      tick
      sqrtPrice
      liquidity
    }
  }
`;

export const POOL_DAY_DATAS_QUERY = gql`
  query PoolDayDatas($poolId: String!, $days: Int!) {
    poolDayDatas(
      first: $days
      orderBy: date
      orderDirection: desc
      where: { pool: $poolId }
    ) {
      date
      volumeUSD
      feesUSD
      tvlUSD
      open
      high
      low
      close
    }
  }
`;

export const SWAP_EVENTS_QUERY = gql`
  query SwapEvents($poolId: String!, $first: Int!) {
    swaps(
      first: $first
      orderBy: timestamp
      orderDirection: desc
      where: { pool: $poolId }
    ) {
      id
      timestamp
      sender
      amount0
      amount1
      amountUSD
      tick
      sqrtPriceX96
    }
  }
`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubgraphPool {
    id: string;
    totalValueLockedUSD: string;
    volumeUSD: string;
    feesUSD: string;
    txCount: string;
    token0: { symbol: string; name: string; decimals: string };
    token1: { symbol: string; name: string; decimals: string };
    tick: string;
    sqrtPrice: string;
    liquidity: string;
}

export interface PoolDayData {
    date: number;
    volumeUSD: string;
    feesUSD: string;
    tvlUSD: string;
    open: string;
    high: string;
    low: string;
    close: string;
}

export interface SwapEvent {
    id: string;
    timestamp: string;
    sender: string;
    amount0: string;
    amount1: string;
    amountUSD: string;
    tick: string;
    sqrtPriceX96: string;
}

// ─── Fetch Functions ─────────────────────────────────────────────────────────

export async function fetchPoolStats(chainId: number, poolId: string): Promise<SubgraphPool | null> {
    const client = getSubgraphClient(chainId);
    if (!client) return null;

    try {
        const data = await client.request<{ pool: SubgraphPool }>(POOL_STATS_QUERY, { poolId });
        return data.pool;
    } catch {
        console.error("Failed to fetch pool stats from subgraph");
        return null;
    }
}

export async function fetchPoolDayDatas(chainId: number, poolId: string, days: number = 7): Promise<PoolDayData[]> {
    const client = getSubgraphClient(chainId);
    if (!client) return [];

    try {
        const data = await client.request<{ poolDayDatas: PoolDayData[] }>(POOL_DAY_DATAS_QUERY, { poolId, days });
        return data.poolDayDatas;
    } catch {
        console.error("Failed to fetch pool day data from subgraph");
        return [];
    }
}

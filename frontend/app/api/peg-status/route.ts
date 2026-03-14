import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { DEPEG_GUARDIAN_HOOK_ABI, HOOK_ADDRESSES } from "@/lib/contracts";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const poolId = searchParams.get("poolId");
    const chainId = parseInt(searchParams.get("chainId") || "11155111");

    if (!poolId) {
        return NextResponse.json({ error: "poolId is required" }, { status: 400 });
    }

    try {
        const hookAddress = HOOK_ADDRESSES[chainId];
        if (!hookAddress || hookAddress === "0x0000000000000000000000000000000000000000") {
            return NextResponse.json({
                state: 0,
                depegBps: 0,
                currentFee: 3000,
                lastOraclePrice: "1000000000000000000",
                lastUpdated: Math.floor(Date.now() / 1000),
                swapsPaused: false,
                source: "mock",
            });
        }

        const chain = chainId === 1 ? mainnet : sepolia;
        const client = createPublicClient({
            chain,
            transport: http(),
        });

        const result = await client.readContract({
            address: hookAddress,
            abi: DEPEG_GUARDIAN_HOOK_ABI,
            functionName: "getDepegState",
            args: [poolId as `0x${string}`],
        });

        const state = result as {
            state: number;
            depegBps: bigint;
            currentFee: bigint;
            lastOraclePrice: bigint;
            lastUpdated: bigint;
            swapsPaused: boolean;
        };

        return NextResponse.json({
            state: state.state,
            depegBps: state.depegBps.toString(),
            currentFee: state.currentFee.toString(),
            lastOraclePrice: state.lastOraclePrice.toString(),
            lastUpdated: state.lastUpdated.toString(),
            swapsPaused: state.swapsPaused,
            source: "onchain",
        });
    } catch (error) {
        console.error("Error fetching peg status:", error);
        return NextResponse.json(
            { error: "Failed to fetch peg status" },
            { status: 500 }
        );
    }
}

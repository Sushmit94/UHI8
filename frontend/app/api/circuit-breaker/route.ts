import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { DEPEG_GUARDIAN_HOOK_ABI, HOOK_ADDRESSES } from "@/lib/contracts";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get("chainId") || "11155111");

    try {
        const hookAddress = HOOK_ADDRESSES[chainId];
        if (!hookAddress || hookAddress === "0x0000000000000000000000000000000000000000") {
            return NextResponse.json({
                isPaused: false,
                pausedAt: 0,
                cooldownSeconds: 3600,
                isInCooldown: false,
                cooldownRemaining: 0,
                guardian: "0x0000000000000000000000000000000000000000",
                source: "mock",
            });
        }

        const chain = chainId === 1 ? mainnet : sepolia;
        const client = createPublicClient({
            chain,
            transport: http(),
        });

        const [isPaused, pausedAt, cooldownSeconds, isInCooldown, cooldownRemaining, guardian] =
            await Promise.all([
                client.readContract({
                    address: hookAddress,
                    abi: DEPEG_GUARDIAN_HOOK_ABI,
                    functionName: "swapsPaused",
                }),
                client.readContract({
                    address: hookAddress,
                    abi: DEPEG_GUARDIAN_HOOK_ABI,
                    functionName: "pausedAt",
                }),
                client.readContract({
                    address: hookAddress,
                    abi: DEPEG_GUARDIAN_HOOK_ABI,
                    functionName: "cooldownSeconds",
                }),
                client.readContract({
                    address: hookAddress,
                    abi: DEPEG_GUARDIAN_HOOK_ABI,
                    functionName: "isInCooldown",
                }),
                client.readContract({
                    address: hookAddress,
                    abi: DEPEG_GUARDIAN_HOOK_ABI,
                    functionName: "cooldownRemaining",
                }),
                client.readContract({
                    address: hookAddress,
                    abi: DEPEG_GUARDIAN_HOOK_ABI,
                    functionName: "guardian",
                }),
            ]);

        return NextResponse.json({
            isPaused,
            pausedAt: (pausedAt as bigint).toString(),
            cooldownSeconds: (cooldownSeconds as bigint).toString(),
            isInCooldown,
            cooldownRemaining: (cooldownRemaining as bigint).toString(),
            guardian,
            source: "onchain",
        });
    } catch (error) {
        console.error("Error fetching circuit breaker status:", error);
        return NextResponse.json(
            { error: "Failed to fetch circuit breaker status" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    // POST endpoint for documentation purposes.
    // Actual pause/resume is done directly from the frontend using wagmi's useWriteContract.
    // This endpoint could be used by backend services/bots to report status.
    return NextResponse.json(
        {
            message: "Circuit breaker state changes should be made directly onchain via wagmi. Use GET for status.",
        },
        { status: 405 }
    );
}

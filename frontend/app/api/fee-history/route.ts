import { NextRequest, NextResponse } from "next/server";

// Mock historical fee data — in production, this would query an indexer or subgraph
interface FeeHistoryEntry {
    timestamp: number;
    fee: number;
    multiplier: number;
    depegBps: number;
}

function generateMockFeeHistory(days: number = 7): FeeHistoryEntry[] {
    const now = Date.now();
    const entries: FeeHistoryEntry[] = [];

    for (let i = days * 24; i >= 0; i--) {
        const timestamp = now - i * 3600 * 1000;
        const baseDeviation = Math.sin(i / 24) * 5 + Math.random() * 3;
        const depegBps = Math.max(0, Math.abs(baseDeviation));
        const ratio = Math.min(depegBps / 200, 1);
        const multiplier = 1 + 14 * ratio * ratio;
        const fee = Math.floor(3000 * multiplier);

        entries.push({
            timestamp: Math.floor(timestamp / 1000),
            fee,
            multiplier: parseFloat(multiplier.toFixed(4)),
            depegBps: parseFloat(depegBps.toFixed(2)),
        });
    }
    return entries;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const poolId = searchParams.get("poolId");
    const days = parseInt(searchParams.get("days") || "7");

    if (!poolId) {
        return NextResponse.json({ error: "poolId is required" }, { status: 400 });
    }

    try {
        // In production: query The Graph subgraph or event indexer
        const history = generateMockFeeHistory(days);

        return NextResponse.json({
            poolId,
            period: `${days}d`,
            entries: history,
            count: history.length,
        });
    } catch (error) {
        console.error("Error fetching fee history:", error);
        return NextResponse.json(
            { error: "Failed to fetch fee history" },
            { status: 500 }
        );
    }
}

/// @notice TypeScript mirror of DepegMath.sol for UI fee computation
/// All math uses standard JS numbers (sufficient precision for UI display)

const PRECISION = 1e18;
const BPS_DENOMINATOR = 10_000;

export enum DepegState {
    PEGGED = 0,
    DRIFTING = 1,
    DEPEGGED = 2,
}

/**
 * Compute fee multiplier based on depeg deviation
 * @param depegBps - Current depeg in basis points
 * @param circuitBreakerBps - Circuit breaker threshold in bps
 * @param maxMultiplier - Maximum fee multiplier (e.g., 15)
 * @returns multiplier as a number (1.0 = no increase)
 */
export function computeFeeMultiplier(
    depegBps: number,
    circuitBreakerBps: number,
    maxMultiplier: number
): number {
    if (depegBps === 0) return 1.0;
    if (circuitBreakerBps === 0) return maxMultiplier;
    if (depegBps >= circuitBreakerBps) return maxMultiplier;

    const ratio = depegBps / circuitBreakerBps;
    const ratioSquared = ratio * ratio;
    return 1 + (maxMultiplier - 1) * ratioSquared;
}

/**
 * Compute dynamic fee given base fee and depeg
 * @param baseFee - Base fee in Uniswap v4 fee units (e.g., 3000 = 0.3%)
 * @param depegBps - Current depeg in basis points
 * @param circuitBreakerBps - Circuit breaker threshold
 * @param maxMultiplier - Maximum fee multiplier
 * @returns fee as uint24 value
 */
export function computeDynamicFee(
    baseFee: number,
    depegBps: number,
    circuitBreakerBps: number,
    maxMultiplier: number
): number {
    const multiplier = computeFeeMultiplier(depegBps, circuitBreakerBps, maxMultiplier);
    const rawFee = Math.floor(baseFee * multiplier);
    return Math.min(rawFee, 1_000_000);
}

/**
 * Compute depeg deviation in basis points
 * @param oraclePrice - Price in 18 decimals (1e18 = $1.00)
 * @param pegPrice - Expected peg price (default: 1e18)
 * @returns deviation in basis points
 */
export function computeDepegBps(
    oraclePrice: number,
    pegPrice: number = 1.0
): number {
    if (oraclePrice >= pegPrice) {
        return Math.floor(((oraclePrice - pegPrice) / pegPrice) * BPS_DENOMINATOR);
    }
    return Math.floor(((pegPrice - oraclePrice) / pegPrice) * BPS_DENOMINATOR);
}

/**
 * Classify the depeg state from basis points
 */
export function classifyState(
    depegBps: number,
    driftWarningBps: number,
    circuitBreakerBps: number
): DepegState {
    if (depegBps >= circuitBreakerBps) return DepegState.DEPEGGED;
    if (depegBps >= driftWarningBps) return DepegState.DRIFTING;
    return DepegState.PEGGED;
}

/**
 * Format a fee value to a human-readable percentage
 * @param fee - Fee in Uniswap v4 units (1_000_000 = 100%)
 */
export function formatFeePercent(fee: number): string {
    return (fee / 10_000).toFixed(2) + "%";
}

/**
 * Format basis points to percentage string
 */
export function formatBpsPercent(bps: number): string {
    return (bps / 100).toFixed(2) + "%";
}

/**
 * Normalize an 18-decimal bigint price to a JS number
 */
export function normalizePrice18(price: bigint): number {
    return Number(price) / 1e18;
}

/**
 * Get the state label text
 */
export function getStateLabel(state: DepegState): string {
    switch (state) {
        case DepegState.PEGGED:
            return "PEGGED";
        case DepegState.DRIFTING:
            return "DRIFTING";
        case DepegState.DEPEGGED:
            return "DEPEGGED";
        default:
            return "UNKNOWN";
    }
}

/**
 * Get the state color for Tailwind classes
 */
export function getStateColor(state: DepegState): string {
    switch (state) {
        case DepegState.PEGGED:
            return "pegged";
        case DepegState.DRIFTING:
            return "drifting";
        case DepegState.DEPEGGED:
            return "depegged";
        default:
            return "surface";
    }
}

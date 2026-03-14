# 🛡️ Depeg Guardian Hook

> A Uniswap v4 hook that protects stablecoin pools from depegging events through dynamic fee adjustment, automated LP rebalancing, and circuit-breaker mechanics.

Built for **UHI 8 Hookathon** | Powered by Chainlink Price Feeds

---

## 📌 Overview

Stablecoin depegs are one of the most dangerous events in DeFi liquidity. When USDC or USDT drifts from its $1.00 peg, LPs face catastrophic impermanent loss, traders face slippage spirals, and pools can be drained within blocks.

**Depeg Guardian Hook** is a production-ready Uniswap v4 hook that acts as an autonomous risk layer on top of any stablecoin pool. It monitors the peg via Chainlink oracles and responds in real-time across three escalating tiers of protection.

```
$1.00 ──── PEGGED ──── 0.1% drift ──── DRIFTING ──── 1% drift ──── DEPEGGED
              ✅ Normal fees          ⚠️ Fee ramp up           🚨 Circuit breaker
```

---

## ✨ Features

### 🔺 Dynamic Fee Widening
As the peg drifts, swap fees increase exponentially to disincentivize bank-run selling and compensate LPs for elevated impermanent loss risk.

| Peg Deviation | Fee Multiplier | Behavior |
|---|---|---|
| < 0.1% | 1x (baseline) | Normal pool operations |
| 0.1% – 0.5% | 2x – 5x | Early warning ramp |
| 0.5% – 1.0% | 5x – 15x | Aggressive deterrent |
| > 1.0% | Max cap | Approaches circuit breaker |
| > 2.0% | ∞ | Swaps halted |

### 🔄 Automated LP Range Rebalancing
When the oracle detects a price shift, the hook computes optimal new tick bounds centered on the oracle price and triggers an in-hook rebalance — keeping liquidity concentrated where it matters most rather than becoming stranded out-of-range.

### ⛔ Circuit Breaker
A configurable hard stop on swaps when the depeg exceeds a critical threshold (default: 2%). Includes:
- Configurable cooldown period before swaps can resume
- Governance-controlled override
- `SwapsPaused` / `SwapsResumed` event emission for off-chain monitoring

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              Uniswap v4 Pool                 │
│                                             │
│  beforeSwap() ──► DepegGuardianHook         │
│                        │                   │
│                   ┌────▼────┐              │
│                   │ Oracle  │ Chainlink    │
│                   │ Check   │ Price Feed   │
│                   └────┬────┘              │
│                        │                   │
│              ┌─────────▼──────────┐        │
│              │  State Machine     │        │
│              │  PEGGED            │        │
│              │  DRIFTING          │        │
│              │  DEPEGGED          │        │
│              └─────────┬──────────┘        │
│                        │                   │
│        ┌───────────────┼───────────────┐   │
│        ▼               ▼               ▼   │
│   DepegMath      TickRebalancer   CircuitBreaker
│   (fee curve)    (LP ranges)      (pause/resume)
└─────────────────────────────────────────────┘
```

### Hook Lifecycle

| Hook Callback | Action |
|---|---|
| `beforeSwap` | Fetch oracle price → compute depeg % → apply fee override or revert if paused |
| `afterSwap` | Update TWAP state, check if rebalance is needed |
| `beforeAddLiquidity` | Validate LP is adding within guardian-approved tick range |

---

## 📁 Folder Structure

```
depeg-guardian-hook/
├── README.md
├── foundry.toml
├── package.json
│
├── src/
│   ├── DepegGuardianHook.sol          # Core hook contract
│   ├── interfaces/
│   │   ├── IDepegGuardian.sol         # Hook interface & events
│   │   └── IChainlinkOracle.sol       # Chainlink price feed interface
│   ├── libraries/
│   │   ├── DepegMath.sol              # Fee curve & depeg % calculations
│   │   └── TickRebalancer.sol         # LP range rebalancing logic
│   └── base/
│       └── CircuitBreaker.sol         # Pause logic & cooldown mechanics
│
├── script/
│   ├── Deploy.s.sol                   # Foundry deploy script
│   └── DeployConfig.s.sol             # Chain-specific config
│
├── test/
│   ├── unit/                          # Isolated contract tests
│   ├── integration/                   # Full depeg scenario simulations
│   ├── fork/                          # Mainnet fork tests (USDC/USDT pools)
│   └── mocks/                         # MockChainlinkOracle, MockPoolManager
│
└── docs/
    ├── architecture.md
    ├── fee-curve.md
    └── circuit-breaker.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js >= 18
- Git

### Installation

```bash
git clone https://github.com/your-org/depeg-guardian-hook
cd depeg-guardian-hook
forge install
npm install
```

### Build

```bash
forge build
```

### Run Tests

```bash
# All tests
forge test

# With verbosity
forge test -vvvv

# Fork tests (requires RPC URL)
MAINNET_RPC_URL=https://... forge test --match-path test/fork/*

# Specific depeg simulation
forge test --match-test test_DepegScenario_USDC_March2023 -vvvv
```

---

## ⚙️ Configuration

Configure the hook at deployment time via `DeployConfig.s.sol`:

```solidity
DepegGuardianConfig memory config = DepegGuardianConfig({
    // Chainlink price feed for the stablecoin
    priceFeed: 0xAb5c49580294Aff77670F839ea425f5b78ab3Ae,

    // Depeg thresholds (in basis points, 100 = 1%)
    driftWarningBps: 10,       // 0.10% → enter DRIFTING state
    circuitBreakerBps: 200,    // 2.00% → halt swaps

    // Fee curve (multiplied against base fee)
    maxFeeMultiplier: 15,      // 15x fee at maximum drift before halt

    // Circuit breaker cooldown before swaps can resume
    cooldownSeconds: 3600,     // 1 hour

    // Governance address for emergency override
    guardian: 0xYourMultisig
});
```

### Supported Price Feeds

| Asset | Network | Feed Address |
|---|---|---|
| USDC/USD | Ethereum | `0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6` |
| USDT/USD | Ethereum | `0x3E7d1eAB13ad0104d2750B8863b489D65364e32D` |
| USDC/USD | Base | `0x7e860098F58bBFC8648a4311b374B1D669a2bc9b` |
| USDC/USD | Arbitrum | `0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3` |

---

## 🧪 Testing Strategy

### Unit Tests
Each library and base contract is tested in isolation with fuzz inputs to validate edge cases in the fee curve and tick math.

### Integration — Depeg Scenarios
Simulates real-world events:

```bash
# Simulates the USDC March 2023 depeg ($0.877)
forge test --match-test test_USDC_SVB_DepegScenario

# Simulates gradual drift + recovery
forge test --match-test test_GradualDrift_ThenRepeg

# Simulates oracle manipulation attempt
forge test --match-test test_OracleFlashLoan_Attack
```

### Fork Tests
Runs against a mainnet fork to validate against real Uniswap v4 pool state and real Chainlink feed data.

---

## 🔐 Security Considerations

- **Oracle freshness**: The hook validates that the Chainlink round is not stale (configurable `maxOracleAge`). If the oracle is stale, the hook defaults to the most conservative fee tier.
- **Reentrancy**: All state changes follow checks-effects-interactions. The hook does not call external contracts during `beforeSwap`.
- **Governance risk**: The `guardian` address can override the circuit breaker. This should be a timelock-controlled multisig in production.
- **Flash loan oracle manipulation**: Oracle price is validated against a short TWAP to prevent single-block manipulation. See `docs/architecture.md` for details.

---

## 📊 Fee Curve Math

The fee is computed as:

```
fee = baseFee × feeMultiplier(depegBps)

feeMultiplier(x) = 1 + (maxMultiplier - 1) × (x / circuitBreakerBps)²
```

This quadratic curve means fees increase slowly during small drifts and accelerate aggressively as the peg approaches the circuit breaker threshold. See `docs/fee-curve.md` for full derivation and graphs.

---

## 🌐 Deployments

| Network | Hook Address | Status |
|---|---|---|
| Ethereum Sepolia | `0x...` | ✅ Testnet Live |
| Base Sepolia | `0x...` | ✅ Testnet Live |
| Arbitrum Sepolia | `0x...` | 🔜 Coming Soon |
| Ethereum Mainnet | — | 🔜 Post-audit |

---

## 🗺️ Roadmap

- [x] Core hook with three-tier state machine
- [x] Chainlink oracle integration
- [x] Dynamic fee widening
- [x] Circuit breaker with cooldown
- [ ] Automated LP tick rebalancing (v1.1)
- [ ] Multi-oracle aggregation for manipulation resistance (v1.2)
- [ ] Governance dashboard for guardian parameter updates (v1.3)
- [ ] Mainnet deployment post-audit (v2.0)

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

```bash
# Run linter
forge fmt --check

# Run slither static analysis
slither src/

# Run full CI suite
forge test && forge fmt --check && slither src/
```

---

## 📄 License

MIT © 2025 Depeg Guardian Contributors

---

## 🙏 Acknowledgements

- [Uniswap v4](https://github.com/Uniswap/v4-core) — Hook architecture
- [Chainlink](https://chain.link) — Price feed infrastructure
- [Uniswap Hook Incubator](https://atrium.academy/uniswap) — UHI 8 Hackathon
- [Brevis](https://brevis.network) — ZK coprocessor inspiration for TWAP proofs

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Zap, Eye, ArrowRight, TrendingUp, Lock, Activity } from "lucide-react";

const features = [
    {
        icon: Eye,
        title: "Oracle-Powered Monitoring",
        description: "Real-time Chainlink oracle integration with TWAP flash-loan protection detects peg deviation before it becomes critical.",
        color: "from-blue-500 to-cyan-500",
    },
    {
        icon: TrendingUp,
        title: "Dynamic Fee Curve",
        description: "Quadratic fee widening protects LPs during drift. Fees scale from 1x to 15x based on deviation severity.",
        color: "from-drifting-500 to-orange-500",
    },
    {
        icon: Lock,
        title: "Circuit Breaker",
        description: "Automatic swap halt at 2% depeg with configurable cooldown. Guardian multisig can override for emergency response.",
        color: "from-depegged-500 to-pink-500",
    },
    {
        icon: Activity,
        title: "Three Protection Tiers",
        description: "PEGGED → normal ops. DRIFTING → fee escalation. DEPEGGED → full circuit breaker. Automated state transitions.",
        color: "from-pegged-500 to-emerald-500",
    },
];

const demoPool = {
    id: "0x0000000000000000000000000000000000000001",
    name: "USDC / WETH",
    state: "PEGGED",
    tvl: "$2.4M",
    fee: "0.30%",
    depeg: "0.02%",
};

export default function HomePage() {
    return (
        <div className="relative">
            {/* Hero Section */}
            <section className="relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 -z-10">
                    <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-pegged-500/10 blur-3xl" />
                    <div className="absolute right-1/4 top-20 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
                </div>

                <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center"
                    >
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-pegged-500/10 px-4 py-1.5 text-sm text-pegged-400 ring-1 ring-pegged-500/20">
                            <Shield className="h-4 w-4" />
                            UHI 8 Hookathon Submission
                        </div>

                        <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
                            <span className="text-surface-100">Depeg</span>{" "}
                            <span className="text-gradient">Guardian</span>
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-lg text-surface-400">
                            A Uniswap v4 hook that monitors stablecoin pegs via Chainlink oracles
                            and responds with dynamic fee escalation and circuit breaker protection.
                        </p>

                        <div className="mt-10 flex items-center justify-center gap-4">
                            <Link
                                href="/dashboard"
                                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pegged-500 to-pegged-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-pegged-500/25 transition-all hover:shadow-xl hover:shadow-pegged-500/40"
                            >
                                Launch Dashboard
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl bg-surface-800 px-6 py-3 text-sm font-semibold text-surface-300 ring-1 ring-surface-700 transition-all hover:bg-surface-700"
                            >
                                View Source
                            </a>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="grid gap-6 md:grid-cols-2"
                >
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="group glass-card p-6 transition-all hover:ring-surface-600/50"
                        >
                            <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3 shadow-lg`}>
                                <feature.icon className="h-5 w-5 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-surface-100">{feature.title}</h3>
                            <p className="mt-2 text-sm text-surface-400 leading-relaxed">{feature.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </section>

            {/* Demo Pool */}
            <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="glass-card overflow-hidden"
                >
                    <div className="border-b border-surface-700/50 px-6 py-4">
                        <h3 className="text-sm font-medium text-surface-400">Monitored Pools</h3>
                    </div>
                    <div className="divide-y divide-surface-800">
                        <Link
                            href="/dashboard"
                            className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface-800/30"
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-700/50">
                                    <Zap className="h-5 w-5 text-pegged-400" />
                                </div>
                                <div>
                                    <div className="font-semibold text-surface-100">{demoPool.name}</div>
                                    <div className="text-xs text-surface-500">Uniswap v4 · Dynamic Fees</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-8 text-sm">
                                <div className="text-right">
                                    <div className="text-surface-500 text-xs">TVL</div>
                                    <div className="font-mono text-surface-200">{demoPool.tvl}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-surface-500 text-xs">Fee</div>
                                    <div className="font-mono text-surface-200">{demoPool.fee}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-surface-500 text-xs">Depeg</div>
                                    <div className="font-mono text-pegged-400">{demoPool.depeg}</div>
                                </div>
                                <div className="rounded-full bg-pegged-500/20 px-3 py-1 text-xs font-semibold text-pegged-400 ring-1 ring-pegged-500/30">
                                    {demoPool.state}
                                </div>
                                <ArrowRight className="h-4 w-4 text-surface-500" />
                            </div>
                        </Link>
                    </div>
                </motion.div>
            </section>
        </div>
    );
}

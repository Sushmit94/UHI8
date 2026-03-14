"use client";

import Link from "next/link";
import { Shield } from "lucide-react";
import { ConnectWallet } from "@/components/shared/ConnectWallet";

export function Navbar() {
    return (
        <header className="sticky top-0 z-50 border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pegged-500 to-pegged-600 shadow-lg shadow-pegged-500/20 transition-transform group-hover:scale-105">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <span className="text-lg font-bold text-surface-100">Depeg</span>
                        <span className="text-lg font-bold text-pegged-400">Guardian</span>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="hidden items-center gap-1 md:flex">
                    <Link
                        href="/"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200"
                    >
                        Pools
                    </Link>
                    <Link
                        href="/dashboard"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200"
                    >
                        Dashboard
                    </Link>
                    <a
                        href="https://docs.uniswap.org/contracts/v4/overview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200"
                    >
                        Docs
                    </a>
                </nav>

                {/* Wallet */}
                <ConnectWallet />
            </div>
        </header>
    );
}

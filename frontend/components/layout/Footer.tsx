"use client";

import { Shield, Github, ExternalLink } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-surface-800 bg-surface-950">
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-pegged-500" />
                        <span className="text-sm font-semibold text-surface-400">
                            Depeg Guardian Hook
                        </span>
                        <span className="text-xs text-surface-600">|</span>
                        <span className="text-xs text-surface-600">
                            UHI 8 Hookathon Submission
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-surface-500 transition-colors hover:text-surface-300"
                        >
                            <Github className="h-4 w-4" />
                            GitHub
                        </a>
                        <a
                            href="https://docs.uniswap.org/contracts/v4/overview"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-surface-500 transition-colors hover:text-surface-300"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Uniswap v4 Docs
                        </a>
                    </div>

                    <div className="text-xs text-surface-600">
                        Built with Uniswap v4 Hooks · Chainlink Oracles
                    </div>
                </div>
            </div>
        </footer>
    );
}

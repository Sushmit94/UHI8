"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function ConnectWallet() {
    return (
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
            }) => {
                const ready = mounted && authenticationStatus !== "loading";
                const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus || authenticationStatus === "authenticated");

                return (
                    <div
                        {...(!ready && {
                            "aria-hidden": true,
                            style: {
                                opacity: 0,
                                pointerEvents: "none",
                                userSelect: "none",
                            },
                        })}
                    >
                        {(() => {
                            if (!connected) {
                                return (
                                    <button
                                        onClick={openConnectModal}
                                        className="rounded-xl bg-gradient-to-r from-pegged-500 to-pegged-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pegged-500/25 transition-all hover:shadow-xl hover:shadow-pegged-500/40 hover:scale-105 active:scale-95"
                                    >
                                        Connect Wallet
                                    </button>
                                );
                            }

                            if (chain.unsupported) {
                                return (
                                    <button
                                        onClick={openChainModal}
                                        className="rounded-xl bg-depegged-500/20 px-5 py-2.5 text-sm font-semibold text-depegged-400 ring-1 ring-depegged-500/50 transition-all hover:bg-depegged-500/30"
                                    >
                                        Wrong network
                                    </button>
                                );
                            }

                            return (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={openChainModal}
                                        className="flex items-center gap-2 rounded-xl bg-surface-800 px-3 py-2 text-sm text-surface-300 ring-1 ring-surface-700 transition-all hover:bg-surface-700"
                                    >
                                        {chain.hasIcon && (
                                            <div
                                                className="h-5 w-5 overflow-hidden rounded-full"
                                                style={{ background: chain.iconBackground }}
                                            >
                                                {chain.iconUrl && (
                                                    <img
                                                        alt={chain.name ?? "Chain"}
                                                        src={chain.iconUrl}
                                                        className="h-5 w-5"
                                                    />
                                                )}
                                            </div>
                                        )}
                                        {chain.name}
                                    </button>

                                    <button
                                        onClick={openAccountModal}
                                        className="rounded-xl bg-surface-800 px-4 py-2 text-sm font-medium text-surface-200 ring-1 ring-surface-700 transition-all hover:bg-surface-700"
                                    >
                                        {account.displayName}
                                        {account.displayBalance ? ` (${account.displayBalance})` : ""}
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
}

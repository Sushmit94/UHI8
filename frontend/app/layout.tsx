import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
    title: "Depeg Guardian | Uniswap v4 Hook",
    description:
        "Monitor stablecoin pegs and protect liquidity with the Depeg Guardian Hook — a Uniswap v4 hook with dynamic fees and circuit breaker protection.",
    keywords: ["Uniswap", "v4", "hook", "depeg", "stablecoin", "DeFi", "Chainlink"],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
            <body className="min-h-screen bg-surface-950 font-sans text-surface-100 antialiased">
                <Providers>
                    <div className="flex min-h-screen flex-col">
                        <Navbar />
                        <main className="flex-1">{children}</main>
                        <Footer />
                    </div>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            className: "!bg-surface-800 !text-surface-100 !ring-1 !ring-surface-700 !rounded-xl !text-sm",
                            duration: 5000,
                        }}
                    />
                </Providers>
            </body>
        </html>
    );
}

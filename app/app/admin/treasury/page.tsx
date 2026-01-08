"use client";

import { useEffect, useState } from "react";
import { ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function TreasuryPage() {
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchTreasury = () => {
        setLoading(true);
        fetch("/api/admin/stats")
            .then((res) => res.json())
            .then((data) => {
                setBalance(data.treasuryBalance);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchTreasury();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Treasury Management</h1>
                    <p className="mt-1 text-sm text-gray-400">
                        Monitor the project's liquidity and on-chain assets.
                    </p>
                </div>
                <div>
                    <button
                        onClick={fetchTreasury}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 hover:scale-105 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70 disabled:hover:scale-100"
                    >
                        <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
                        Refresh Balance
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Main Balance Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 to-emerald-700 shadow-xl p-8">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CheckCircleIcon className="h-48 w-48 text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <CheckCircleIcon className="h-6 w-6 text-white" />
                            </div>
                            <span className="text-green-100 font-medium tracking-wide text-sm uppercase">Live On-Chain Balance</span>
                        </div>

                        <div className="mt-6">
                            <h2 className="text-5xl font-bold text-white tracking-tight">
                                {loading ? "..." : balance?.toLocaleString()}
                                <span className="text-2xl font-normal text-green-200 ml-2">ARB</span>
                            </h2>
                            <p className="text-green-100 mt-2 text-sm opacity-80">
                                Enough for {((balance || 0) / 10).toFixed(0)} upcoming withdrawals.
                            </p>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white/50 w-[75%]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Health Status Card */}
                <div className="rounded-2xl border border-white/5 bg-[#1A1D27] p-8">
                    <h3 className="text-lg font-semibold text-white mb-6">System Health</h3>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                <span className="text-sm text-gray-300">RPC Connection</span>
                            </div>
                            <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded">Operational</span>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                <span className="text-sm text-gray-300">Withdrawal API</span>
                            </div>
                            <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded">Active</span>
                        </div>

                        {(!balance || balance < 100) && (
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-yellow-500">Low Balance Warning</p>
                                    <p className="text-xs text-yellow-100/60 mt-1">The Treasury is running low. Please top up the wallet to ensure withdrawals continue smoothly.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

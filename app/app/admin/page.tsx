/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
    UsersIcon,
    BanknotesIcon,
    ArrowTrendingDownIcon,
    CircleStackIcon,
    ShieldCheckIcon,
    ClockIcon
} from "@heroicons/react/24/outline";

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/stats")
            .then((res) => res.json())
            .then((data) => {
                setStats(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const cards = [
        {
            name: 'Total Users',
            value: stats?.totalUsers || 0,
            change: stats?.usersChange || 0,
            icon: UsersIcon,
            bg: 'bg-gradient-to-br from-blue-500/10 to-blue-600/5',
            border: 'border-blue-500/20',
            text: 'text-blue-400'
        },
        {
            name: 'Circulating Points',
            value: stats?.totalPointsCurrent?.toLocaleString() || 0,
            change: stats?.pointsChange || 0,
            icon: CircleStackIcon,
            bg: 'bg-gradient-to-br from-purple-500/10 to-purple-600/5',
            border: 'border-purple-500/20',
            text: 'text-purple-400'
        },
        {
            name: 'Withdrawn (ARB)',
            value: stats?.totalWithdrawn?.toLocaleString() || 0,
            change: stats?.withdrawalsChange || 0,
            icon: ArrowTrendingDownIcon,
            bg: 'bg-gradient-to-br from-pink-500/10 to-pink-600/5',
            border: 'border-pink-500/20',
            text: 'text-pink-400'
        },
        {
            name: 'Treasury (ARB)',
            value: stats?.treasuryBalance?.toLocaleString() || 0,
            change: 0, // No history for treasury yet
            icon: BanknotesIcon,
            bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5',
            border: 'border-emerald-500/20',
            text: 'text-emerald-400'
        },
    ];

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Overview</h1>
                    <p className="text-sm text-gray-400 mt-1">Real-time platform insights and activity.</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-[#1A1D27] rounded-lg border border-white/5">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-medium text-gray-300">System Online</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => {
                    const isPositive = card.change >= 0;
                    const changeText = `${Math.abs(card.change).toFixed(1)}%`;

                    return (
                        <div key={card.name} className={`relative overflow-hidden rounded-2xl bg-[#1A1D27] border p-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 ${card.border}`}>
                            <div className={`absolute inset-0 opacity-20 ${card.bg}`}></div>
                            <div className="relative">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`rounded-xl p-3 bg-white/5 ${card.text}`}>
                                        <card.icon className="h-6 w-6" aria-hidden="true" />
                                    </div>
                                    {/* Percentage Badge */}
                                    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${card.change !== 0
                                            ? (isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400')
                                            : 'bg-white/5 text-gray-400'
                                        }`}>
                                        {card.change !== 0 && (isPositive ? '+' : '-')}
                                        {changeText}
                                    </span>
                                </div>
                                <dt className="truncate text-sm font-medium text-gray-400">{card.name}</dt>
                                <dd className="mt-1 flex items-baseline md:block lg:flex">
                                    <div className="flex items-baseline text-2xl font-bold text-white">
                                        {card.value}
                                    </div>
                                </dd>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Security / Activity Section Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 rounded-2xl bg-[#1A1D27] border border-white/5 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white">Platform Activity</h3>
                        <select className="bg-black/20 border border-white/10 text-xs text-gray-400 rounded-lg px-3 py-1 outline-none focus:border-purple-500">
                            <option>This Week</option>
                            <option>This Month</option>
                        </select>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-2 px-2">
                        {/* Real Data Bar Chart */}
                        {(stats?.chartData || []).map((item: any, i: number) => {
                            // Normalize height relative to max value (or default to 10 if 0)
                            const max = Math.max(...(stats?.chartData?.map((d: any) => d.count) || [10]));
                            const height = Math.max((item.count / max) * 100, 5); // Min 5% height
                            return (
                                <div key={i} className="flex flex-col items-center gap-2 w-full group">
                                    <div
                                        className="w-full bg-gradient-to-t from-purple-500/10 to-purple-500/40 hover:to-purple-500/60 rounded-t-sm transition-all duration-300 relative"
                                        style={{ height: `${height}%` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            {item.count}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-500 rotate-0 truncate w-full text-center">{item.date}</span>
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex justify-between mt-4 text-xs text-gray-500">
                        {/* Dates are now under bars */}
                    </div>        </div>

                {/* Side List */}
                <div className="rounded-2xl bg-[#1A1D27] border border-white/5 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Alerts</h3>
                    <div className="space-y-4">
                        {[
                            { title: "New Withdrawal High", time: "2m ago", icon: ArrowTrendingDownIcon, color: "text-orange-400" },
                            { title: "Treasury Deposit", time: "1h ago", icon: ShieldCheckIcon, color: "text-green-400" },
                            { title: "User Verify Request", time: "3h ago", icon: UsersIcon, color: "text-blue-400" },
                            { title: "System Maintained", time: "5h ago", icon: ClockIcon, color: "text-gray-400" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 transition-colors">
                                <item.icon className={`h-5 w-5 ${item.color}`} />
                                <div>
                                    <p className="text-sm font-medium text-gray-200">{item.title}</p>
                                    <p className="text-xs text-gray-500">{item.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

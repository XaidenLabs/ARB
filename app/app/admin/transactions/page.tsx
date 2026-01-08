"use client";

import { useEffect, useState } from "react";
import { FunnelIcon } from "@heroicons/react/24/outline";

export default function TransactionsPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [typeFilter, setTypeFilter] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [, setTotalCount] = useState(0);

    const fetchTransactions = () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: page.toString(),
            type: typeFilter,
        });
        fetch(`/api/admin/transactions?${params}`)
            .then((res) => res.json())
            .then((resData) => {
                setData(resData.transactions);
                setTotalPages(resData.totalPages);
                setTotalCount(resData.total);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchTransactions();
    }, [typeFilter, page]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Transaction History</h1>
                    <p className="mt-1 text-sm text-gray-400">
                        Audit log of all system activities.
                    </p>
                </div>
                <div className="w-48">
                    <div className="relative">
                        <FunnelIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <select
                            className="block w-full rounded-xl border border-white/10 bg-[#1A1D27] py-2 pl-9 pr-4 text-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 sm:text-sm appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Transactions</option>
                            <option value="withdrawal">Withdrawal</option>
                            <option value="upload">Upload</option>
                            <option value="review">Review</option>
                            <option value="signup">Signup</option>
                            <option value="verification">Verification</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#1A1D27] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-black/20">
                            <tr>
                                <th scope="col" className="py-4 pl-6 pr-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                                <th scope="col" className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                                <th scope="col" className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                                <th scope="col" className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                                <th scope="col" className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500 bg-white/5 animate-pulse">Loading transactions...</td></tr>
                            ) : data.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No transactions found.</td></tr>
                            ) : (
                                data.map((tx) => (
                                    <tr key={tx.id} className="group hover:bg-white/5 transition-colors">
                                        <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                                            <div className="font-medium text-white">{tx.users?.email || "Unknown"}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tx.type === 'withdrawal' ? 'bg-red-400/10 text-red-400 ring-red-400/20' :
                                                    tx.type === 'signup' ? 'bg-blue-400/10 text-blue-400 ring-blue-400/20' :
                                                        'bg-green-400/10 text-green-400 ring-green-400/20'
                                                }`}>
                                                {(tx.type || "UNKNOWN").toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-gray-300">
                                            {tx.points > 0 ? (
                                                <span className="text-green-400">+{tx.points}</span>
                                            ) : (
                                                <span className="text-red-400">{tx.points}</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {tx.description}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            {new Date(tx.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 bg-black/10 px-6 py-4">
                    <div className="text-sm text-gray-400">
                        Page <span className="text-white font-medium">{page}</span> of <span className="text-white font-medium">{totalPages}</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

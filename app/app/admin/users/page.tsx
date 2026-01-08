"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon, UserCircleIcon } from "@heroicons/react/24/outline";

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    const fetchUsers = () => {
        setLoading(true);
        const params = new URLSearchParams({
            page: page.toString(),
            search,
        });
        fetch(`/api/admin/users?${params}`)
            .then((res) => res.json())
            .then((data) => {
                setUsers(data.users);
                setTotalPages(data.totalPages);
                setTotalUsers(data.total);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, page]);

    return (
        <div className="space-y-6">
            <div className="sm:flex sm:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
                    <p className="mt-1 text-sm text-gray-400">
                        Total of <span className="text-purple-400 font-semibold">{totalUsers}</span> registered users.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-xl border border-white/10 bg-[#1A1D27] py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 sm:text-sm transition-all"
                        placeholder="Search email, wallet..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#1A1D27] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/5">
                        <thead className="bg-black/20">
                            <tr>
                                <th scope="col" className="py-4 pl-6 pr-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                                <th scope="col" className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Wallet Address</th>
                                <th scope="col" className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Points</th>
                                <th scope="col" className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-3 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500 bg-white/5 animate-pulse">Loading users...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No users found matching your search.</td></tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                                        <td className="whitespace-nowrap py-4 pl-6 pr-3">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold mr-3 shadow-lg shadow-purple-500/20">
                                                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : <UserCircleIcon className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{user.full_name || "Unknown User"}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400 font-mono">
                                            {user.wallet_address ? (
                                                <span className="bg-black/30 px-2 py-1 rounded text-gray-300">{user.wallet_address.slice(0, 4)}...{user.wallet_address.slice(-4)}</span>
                                            ) : (
                                                <span className="text-gray-600 italic">No Wallet</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-white font-medium">
                                            {user.total_points?.toLocaleString()} <span className="text-purple-500 text-xs">PTS</span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                                            <span className="inline-flex items-center rounded-full bg-green-400/10 px-2 py-1 text-xs font-medium text-green-400 ring-1 ring-inset ring-green-400/20">
                                                Active
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination with dark theme */}
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

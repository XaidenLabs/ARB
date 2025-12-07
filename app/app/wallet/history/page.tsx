"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Filter, Search, ExternalLink, ArrowUpCircle, RefreshCcw } from "lucide-react";
import { useSession } from "next-auth/react";

interface Tx {
  id: string;
  user_id: string;
  points: number;
  action: string;
  type?: string | null;
  description?: string | null;
  created_at: string;
}

export default function WalletHistoryPage() {
  const { data: session, status } = useSession();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setError("Sign in to view your transaction history.");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = (session as any)?.supabaseAccessToken;
        if (!token) {
          throw new Error("Missing auth token. Please sign in again.");
        }
        const res = await fetch("/api/wallet?limit=200", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load transactions");
        setTransactions(json.transactions || json.balances?.transactions || json.recentTransactions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session, status]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const term = search.toLowerCase();
      if (term) {
        const desc = tx.description?.toLowerCase() || "";
        const typeText = (tx.type || tx.action || "").toLowerCase();
        if (!desc.includes(term) && !typeText.includes(term)) return false;
      }

      const typeVal = (tx.type || tx.action || "").toLowerCase();
      if (typeFilter && typeVal !== typeFilter) return false;

      const amount = Math.abs(tx.points);
      if (minAmount && amount < Number(minAmount)) return false;
      if (maxAmount && amount > Number(maxAmount)) return false;

      if (startDate) {
        const txDate = new Date(tx.created_at).getTime();
        if (txDate < new Date(startDate).getTime()) return false;
      }
      if (endDate) {
        const txDate = new Date(tx.created_at).getTime();
        if (txDate > new Date(endDate).getTime()) return false;
      }

      if (statusFilter) {
        const status = tx.points < 0 ? "debit" : "credit";
        if (status !== statusFilter) return false;
      }

      return true;
    });
  }, [transactions, search, typeFilter, statusFilter, minAmount, maxAmount, startDate, endDate]);

  const typeOptions = useMemo(() => {
    const seen = new Set<string>();
    transactions.forEach((tx) => {
      const key = (tx.type || tx.action || "").toLowerCase();
      if (key) seen.add(key);
    });
    return Array.from(seen);
  }, [transactions]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/wallet" className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-gray-700 font-medium">
              <Filter className="w-4 h-4" /> Filters
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                <RefreshCcw className="w-4 h-4" /> Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description or type"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All statuses</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
            <div className="flex gap-2">
              <input
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                type="number"
                placeholder="Min"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                type="number"
                placeholder="Max"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700 font-semibold">
              <ArrowUpCircle className="w-5 h-5 text-purple-600" /> Results
            </div>
            <div className="text-sm text-gray-500">{filtered.length} transaction(s)</div>
          </div>

          {error && (
            <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-700">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 bg-gray-50">
                  <th className="py-2 px-4">Date</th>
                  <th className="py-2 px-4">Type</th>
                  <th className="py-2 px-4">Description</th>
                  <th className="py-2 px-4 text-right">Amount</th>
                  <th className="py-2 px-4 text-right">Status</th>
                  <th className="py-2 px-4 text-right">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td className="py-6 px-4 text-center text-gray-500" colSpan={6}>
                      Loading transactions...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="py-6 px-4 text-center text-gray-500" colSpan={6}>
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((tx) => {
                    const signature = (tx as any).metadata?.transaction_signature;
                    const status = tx.points < 0 ? "Debit" : "Credit";
                    const type = (tx.type || tx.action || "").replace(/_/g, " ");
                    return (
                      <tr key={tx.id}>
                        <td className="py-3 px-4 text-gray-900 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString()}{" "}
                          <span className="text-xs text-gray-500">
                            {new Date(tx.created_at).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-900 capitalize">{type || "transaction"}</td>
                        <td className="py-3 px-4 text-gray-700">{tx.description || "—"}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {tx.points} $ARB
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${status === "Debit" ? "bg-red-50 text-red-700 border border-red-100" : "bg-green-50 text-green-700 border border-green-100"}`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {signature ? (
                            <Link
                              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                            >
                              View <ExternalLink className="w-4 h-4" />
                            </Link>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

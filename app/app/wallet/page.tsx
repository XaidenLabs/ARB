/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Wallet as WalletIcon,
  RefreshCcw,
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useEnhancedWallet } from "../hooks/useEnhancedWallet";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";


// Constants
const ARB_MINT = new PublicKey("D7ao8w8yjmjMWDfNzgt7J1uVP6qa3JNiRndkoXncyai");
const PROGRAM_ID = new PublicKey("EAo3vy4cYj9ezXbkZRwWkhUnNCjiBcF2qp8vwXwNsPPD");

// Minimal IDL for Withdrawals
const REDEEM_IDL: any = {
  "address": "EAo3vy4cYj9ezXbkZRwWkhUnNCjiBcF2qp8vwXwNsPPD",
  "metadata": {
    "name": "africa_research_base",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "redeem_points",
      "discriminator": [200, 100, 50, 20, 10, 5, 2, 3],
      "accounts": [
        { "name": "user", "writable": true, "signer": true },
        { "name": "reputation", "writable": true, "pda": { "seeds": [{ "kind": "const", "value": [114, 101, 112, 117, 116, 97, 116, 105, 111, 110] }, { "kind": "account", "path": "user" }] } },
        { "name": "reward_vault", "writable": true },
        { "name": "user_token_account", "writable": true },
        { "name": "vault_authority", "pda": { "seeds": [{ "kind": "const", "value": [118, 97, 117, 108, 116, 95, 97, 117, 116, 104, 111, 114, 105, 116, 121] }] } },
        { "name": "token_program", "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Reputation",
      "discriminator": [55, 148, 90, 71, 68, 183, 193, 28]
    }
  ],
  "types": [
    {
      "name": "Reputation",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "contributor", "type": "pubkey" },
          { "name": "total_uploads", "type": "u32" },
          { "name": "dataset_count", "type": "u32" },
          { "name": "download_time", "type": "i64" },
          { "name": "total_quality_score", "type": "u64" },
          { "name": "total_downloads", "type": "u64" },
          { "name": "total_citations", "type": "u32" },
          { "name": "reputation_score", "type": "u32" },
          { "name": "total_reviews", "type": "u64" },
          { "name": "last_activity_timestamp", "type": "i64" },
          { "name": "daily_activity_points", "type": "u32" },
          { "name": "total_upload_points", "type": "u64" },
          { "name": "total_review_points", "type": "u64" },
          { "name": "total_activity_points", "type": "u64" },
          { "name": "claimed_points", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ]
};

interface WalletOverview {
  balances: {
    points: number;
    arbTokens: number;
    walletAddress: string | null;
  };
  profile: {
    email: string;
    full_name: string;
  };
  transactions: Array<{
    id: string;
    points: number;
    transaction_type?: string;
    action?: string;
    type?: string | null;
    description: string | null;
    created_at: string;
    metadata?: any;
  }>;
  rewardRates: Record<string, number>;
}

export default function WalletPage() {
  const { data: nextAuthSession, status } = useSession();
  const { walletState, connectWallet, disconnectWallet, fetchBalance, anchorWallet, connection } = useEnhancedWallet();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [overview, setOverview] = useState<WalletOverview | null>(null);

  const authHeaders = useMemo(() => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [nextAuthSession]);

  useEffect(() => {
    const syncSession = async () => {
      try {
        const token = (nextAuthSession as any)?.supabaseAccessToken;
        if (token) {
          await supabase.auth.setSession({
            access_token: token,
            refresh_token: token,
          });
        }
      } catch (err) {
        console.warn("Supabase session sync failed:", err);
      }
    };
    syncSession();
  }, [nextAuthSession]);

  useEffect(() => {
    if (status === "authenticated") {
      loadWalletData();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWalletData = async () => {
    if (!authHeaders.Authorization) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/wallet", { headers: { ...authHeaders } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load wallet");
      setOverview(json);
      await fetchBalance();
    } catch (err: any) {
      console.error("Wallet load error:", err);
      // Handle unauthorized explicitly
      if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
        await signOut({ callbackUrl: "/" });
        return;
      }
      toast.error(err.message || "Could not load wallet data.");
    } finally {
      setLoading(false);
    }
  };

  const saveWalletAddress = async () => {
    if (!walletState.publicKey) {
      toast.error("Connect a wallet first.");
      return;
    }
    if (!nextAuthSession?.user?.id) {
      toast.error("Sign in to link your wallet.");
      return;
    }
    try {
      setSyncing(true);
      const { error } = await supabase
        .from("users")
        .update({ wallet_address: walletState.publicKey })
        .eq("id", nextAuthSession.user.id);
      if (error) throw error;
      toast.success("Wallet address saved to profile.");
      loadWalletData();
    } catch (err) {
      console.error("Save wallet error:", err);
      toast.error("Could not save wallet address.");
    } finally {
      setSyncing(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount to withdraw.");
      return;
    }
    if (!authHeaders.Authorization) {
      toast.error("Sign in to withdraw.");
      return;
    }
    if (!anchorWallet) {
      toast.error("Connect your Solana wallet to withdraw.");
      connectWallet();
      return;
    }

    setWithdrawing(true);
    const toastId = toast.loading("Initializing withdrawal...");

    try {
      // 1. Setup Anchor Provider
      const provider = new AnchorProvider(connection, anchorWallet, {
        preflightCommitment: "confirmed",
      });

      // Use minimal IDL to avoid crashes
      const program = new Program(REDEEM_IDL, provider);

      // 2. Derive PDAs
      const [reputationPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("reputation"), anchorWallet.publicKey.toBuffer()],
        PROGRAM_ID
      );

      const [vaultAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault_authority")],
        PROGRAM_ID
      );

      // 3. Get Token Accounts
      // Fetch Mint Info to determine Program ID (Token or Token-2022)
      const mintInfo = await connection.getAccountInfo(ARB_MINT);
      const tokenProgramId = mintInfo?.owner || TOKEN_PROGRAM_ID;
      console.log("Resolved Token Program ID:", tokenProgramId.toBase58());

      // Reward Vault (Owned by vault_authority)
      const rewardVault = await getAssociatedTokenAddress(
        ARB_MINT,
        vaultAuthorityPda,
        true, // allowOwnerOffCurve = true for PDAs
        tokenProgramId
      );

      // User Token Account
      const userTokenAccount = await getAssociatedTokenAddress(
        ARB_MINT,
        anchorWallet.publicKey,
        false,
        tokenProgramId
      );

      console.log("PDAs Derived:", {
        reputation: reputationPda.toBase58(),
        vaultAuthority: vaultAuthorityPda.toBase58(),
        rewardVault: rewardVault.toBase58(),
        userTokenAccount: userTokenAccount.toBase58(),
      });

      // CHECK IF USER ATA EXISTS
      // We must pass the correct programId to getAccount as well
      const userAtaInfo = await connection.getAccountInfo(userTokenAccount);
      const preInstructions: TransactionInstruction[] = [];

      if (!userAtaInfo) {
        console.log("User ATA missing, adding create instruction...");
        toast.loading("Adding account creation (you pay rent)...", { id: toastId });
        preInstructions.push(
          createAssociatedTokenAccountInstruction(
            anchorWallet.publicKey, // payer
            userTokenAccount,       // ata
            anchorWallet.publicKey, // owner
            ARB_MINT,               // mint
            tokenProgramId          // programId
          )
        );
      }

      if (amount > (overview?.balances.points ?? 0)) {
        throw new Error("Withdrawal amount exceeds available points.");
      }

      toast.loading("Please sign the transaction...", { id: toastId });

      const tx = await program.methods
        .redeemPoints()
        .accounts({
          user: anchorWallet.publicKey,
          reputation: reputationPda,
          rewardVault: rewardVault,
          userTokenAccount: userTokenAccount,
          vaultAuthority: vaultAuthorityPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .preInstructions(preInstructions)
        .rpc();

      console.log("Transaction Signature:", tx);

      // 5. Record Transaction on Backend
      toast.loading("Confirming transaction...", { id: toastId });

      await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          amount, // Log the amount they engaged with (or max)
          txSignature: tx,
          description: `Redemption of ${amount} Points for ARB`
        }),
      });

      toast.success(`Successfully withdrew ARB! Tx: ${tx.slice(0, 8)}...`, { id: toastId });
      setWithdrawAmount("");
      await loadWalletData(); // Refresh DB stats
      await fetchBalance();   // Refresh Solana balance

    } catch (err: any) {
      console.error("Withdraw error:", err);
      const isCancelled = err.message?.includes("User rejected") || err.name === "WalletSignTransactionError";

      if (isCancelled) {
        toast.error("Transaction cancelled", { id: toastId });
      } else {
        toast.error(err.message || "Withdrawal failed.", { id: toastId });
      }
    } finally {
      setWithdrawing(false);
    }
  };

  if (status === "unauthenticated") {
    // Client-side redirect to home with auth param
    window.location.href = `/?auth=signin&redirect=${encodeURIComponent("/wallet")}`;
    return null;
  }

  // Fallback for NextAuth loading state
  if (status === "loading" || loading || !nextAuthSession?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading...
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">Wallet</p>
            <h1 className="text-3xl font-bold text-gray-900">ARB Wallet & Earnings</h1>
            <p className="text-gray-600">
              Connect your Solana wallet, track ARB points, and withdraw tokens.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadWalletData}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-100"
            >
              <RefreshCcw className="w-4 h-4" /> Refresh
            </button>
            {walletState.connected ? (
              <button
                onClick={disconnectWallet}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-100"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={connectWallet}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                <WalletIcon className="w-4 h-4" /> Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BalanceCard
            title="ARB Points"
            value={overview?.balances.points ?? 0}
            sub="Available to withdraw"
            icon={<Coins className="w-5 h-5" />}
            accent="from-blue-500 to-indigo-500"
          />
          <BalanceCard
            title="On-chain $ARB"
            value={overview?.balances.arbTokens ?? 0}
            sub="In your Solana wallet"
            icon={<ArrowDownCircle className="w-5 h-5" />}
            accent="from-emerald-500 to-teal-500"
          />
          <BalanceCard
            title="SOL Balance"
            value={walletState.balance ?? 0}
            sub={walletState.publicKey ? `${walletState.walletName || "Wallet"} connected` : "Not connected"}
            icon={<ArrowUpCircle className="w-5 h-5" />}
            accent="from-amber-500 to-orange-500"
          />
        </div>

        {/* Wallet address + actions */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Wallet address</h2>
              <p className="text-sm text-gray-600">
                Linked to your profile for rewards and withdrawals.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                {walletState.publicKey ? "Wallet connected" : "Connect to update"}
              </span>
              {overview?.balances.walletAddress && (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                  Profile: {overview.balances.walletAddress.slice(0, 4)}...
                  {overview.balances.walletAddress.slice(-4)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-800 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <div className="font-semibold text-gray-900">Connected</div>
              <div className="text-gray-600">
                {walletState.publicKey || "No wallet connected"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={connectWallet}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-100"
              >
                {walletState.connected ? "Switch wallet" : "Connect wallet"}
              </button>
              <button
                onClick={saveWalletAddress}
                disabled={!walletState.publicKey || syncing}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {syncing ? "Saving..." : "Save to profile"}
              </button>
            </div>
          </div>
        </div>

        {/* Withdraw + rewards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Withdraw $ARB</h3>
            </div>
            <p className="text-sm text-gray-600">
              Convert your ARB points into on-chain $ARB tokens. Tokens are sent to your linked wallet.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[50, 100, 250].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setWithdrawAmount(String(preset))}
                  className={`px-3 py-2 rounded-lg border text-sm ${Number(withdrawAmount) === preset
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-700 hover:border-blue-200"
                    }`}
                >
                  {preset} Points
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="number"
                min="1"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter points amount"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="sm:w-40 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {withdrawing ? "Processing..." : "Withdraw"}
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Available points: {overview?.balances.points?.toLocaleString() ?? 0}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-900">Reward rates</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              {overview?.rewardRates &&
                Object.entries(overview.rewardRates).map(([label, value]) => (
                  <li key={label} className="flex items-center justify-between">
                    <span className="capitalize">{label.replace(/_/g, " ").toLowerCase()}</span>
                    <span className="font-semibold text-gray-900">{value} Points</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Transaction history</h3>
            <div className="ml-auto">
              <Link
                href="/wallet/history"
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                View more
              </Link>
            </div>
          </div>
          {overview?.transactions?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-700">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Description</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                    <th className="py-2 pr-4 text-right">Status</th>
                    <th className="py-2 pr-4 text-right">Tx</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {overview.transactions.slice(0, 4).map((tx) => {
                    const signature = (tx as any).metadata?.transaction_signature || (tx as any).metadata?.txSignature;
                    const tokenTransferred = (tx as any).metadata?.token_transferred;
                    const status = signature
                      ? "Confirmed"
                      : tokenTransferred === false
                        ? "Pending retry"
                        : "Recorded";

                    return (
                      <tr key={tx.id}>
                        <td className="py-3 pr-4 text-gray-900">
                          {new Date(tx.created_at).toLocaleDateString()}{" "}
                          <span className="text-xs text-gray-500">
                            {new Date(tx.created_at).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="py-3 pr-4 capitalize text-gray-900">
                          {((tx as any).transaction_type || tx.action || tx.type || "transaction").replace(/_/g, " ")}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {tx.description || "—"}
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold text-gray-900">
                          {tx.points} Pts
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${signature
                              ? "bg-green-50 text-green-700 border border-green-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                              }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {signature ? (
                            <Link
                              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                              target="_blank"
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
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> No transactions yet.
            </div>
          )}
        </div>

        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-lg p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm text-blue-100">Need help?</p>
            <h3 className="text-xl font-semibold">Secure, Solana-native rewards</h3>
            <p className="text-sm text-blue-100">
              All ARB token payouts use the Solana wallet you connect and save to your profile.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Solana Safe
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 text-sm">
              <WalletIcon className="w-4 h-4" /> Phantom / Solflare
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BalanceCardProps {
  title: string;
  value: number;
  sub: string;
  icon: ReactNode;
  accent: string;
}

const BalanceCard = ({ title, value, sub, icon, accent }: BalanceCardProps) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-2">
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${accent} text-white flex items-center justify-center`}>
        {icon}
      </div>
      <span className="text-xs text-gray-500">{sub}</span>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value?.toLocaleString()}</div>
    <div className="text-sm text-gray-600">{title}</div>
  </div>
);

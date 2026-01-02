/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { supabaseServer } from "@/lib/supabase";
import { arbTokenService, REWARD_AMOUNTS } from "@/lib/arbToken";

const getUserFromAuth = async (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || null;
  if (!token || !supabaseServer) return null;
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
};

export async function GET(req: NextRequest) {
  try {
    if (!supabaseServer) throw new Error("Supabase server client not available");

    const user = await getUserFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile, error: profileError } = await supabaseServer
      .from("users")
      .select("wallet_address,total_points,email,full_name")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    let arbBalance = 0;
    if (profile?.wallet_address) {
      try {
        const pk = new PublicKey(profile.wallet_address);
        arbBalance = await arbTokenService.getTokenBalance(pk);
      } catch (err) {
        console.warn("Failed to fetch on-chain balance:", err);
      }
    }

    const url = new URL(req.url);
    const limitParam = Number(url.searchParams.get("limit") || 20);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 20;

    const { data: transactions } = await supabaseServer
      .from("points_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    return NextResponse.json({
      success: true,
      balances: {
        points: profile?.total_points || 0,
        arbTokens: arbBalance,
        walletAddress: profile?.wallet_address || null,
      },
      profile: {
        email: profile?.email || user.email || "",
        full_name: profile?.full_name || user.email || "",
      },
      transactions: transactions || [],
      rewardRates: REWARD_AMOUNTS,
    });
  } catch (err: any) {
    console.error("Wallet GET error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load wallet data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseServer) throw new Error("Supabase server client not available");

    const user = await getUserFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const amount = Number(body?.amount || 0);
    const description = body?.description || "User withdrawal";

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseServer
      .from("users")
      .select("wallet_address,total_points")
      .eq("id", user.id)
      .single();

    if (profileError) throw profileError;

    if (!profile?.wallet_address) {
      return NextResponse.json(
        { error: "No wallet connected. Please add a wallet address first." },
        { status: 400 }
      );
    }

    const availablePoints = profile.total_points || 0;
    if (amount > availablePoints) {
      return NextResponse.json(
        { error: "Insufficient ARB points to withdraw that amount." },
        { status: 400 }
      );
    }

    let signature: string | null = null;
    const userPk = new PublicKey(profile.wallet_address);

    try {
      signature = await arbTokenService.transferTokens(userPk, amount, description);
    } catch (transferError: any) {
      console.error("Token withdrawal failed:", transferError);
      return NextResponse.json(
        { error: transferError.message || "Failed to transfer tokens" },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabaseServer
      .from("users")
      .update({ total_points: availablePoints - amount })
      .eq("id", user.id);
    if (updateError) console.warn("Failed to decrement points after withdrawal:", updateError);

    const { error: txError } = await supabaseServer.from("points_transactions").insert({
      user_id: user.id,
      points: -amount, // reflect deduction
      action: "manual", // closest allowed action; type carries withdrawal label
      type: "withdrawal",
      description,
      reference_id: null
    });
    if (txError) console.warn("Failed to log withdrawal transaction:", txError);

    return NextResponse.json({
      success: true,
      signature,
      explorerUrl: signature
        ? `https://explorer.solana.com/tx/${signature}?cluster=mainnet-beta`
        : null,
      newBalances: {
        points: Math.max(availablePoints - amount, 0),
      },
    });
  } catch (err: any) {
    console.error("Wallet POST error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process withdrawal" },
      { status: 500 }
    );
  }
}

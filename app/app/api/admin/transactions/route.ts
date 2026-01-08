import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { supabaseServer } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseServer) throw new Error("Supabase client missing");

    const url = new URL(req.url);
    const filterType = url.searchParams.get("type") || "";
    const page = Number(url.searchParams.get("page") || 1);
    const limit = 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseServer
      .from("points_transactions")
      .select("*, users(email, full_name, wallet_address)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filterType) {
      query = query.eq("type", filterType);
    }

    const { data: transactions, count, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      transactions: transactions || [],
      total: count || 0,
      page,
      totalPages: count ? Math.ceil(count / limit) : 1
    });

  } catch (error: any) {
    console.error("Admin Transactions Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

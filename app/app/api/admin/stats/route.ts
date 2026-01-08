import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { supabaseServer } from "@/lib/supabase";
import { arbTokenService } from "@/lib/arbToken";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseServer) throw new Error("Supabase client missing");

    // 1. Get Total Users
    const { count: totalUsers, error: usersError } = await supabaseServer
      .from("users")
      .select("*", { count: "exact", head: true });
    
    if (usersError) throw usersError;

    // 2. Get Total Points Distributed (Sum of total_points is current points, roughly)
    // Better: Sum of all POSITIVE transactions
    const { data: pointsData, error: pointsError } = await supabaseServer
      .rpc('sum_total_points'); // Assuming an RPC exists, or fallback to fetching all users and reducing (slow but works for small app)
    
    // Fallback: Fetch basic user sum manually if RPC fails or doesn't exist
    // For now, let's just sum current holdings
    const { data: allUsers } = await supabaseServer.from("users").select("total_points");
    const totalPointsCurrent = allUsers?.reduce((acc, u) => acc + (u.total_points || 0), 0) || 0;


    // 3. Get Total Withdrawals
    const { data: withdrawals } = await supabaseServer
      .from("points_transactions")
      .select("points")
      .eq("type", "withdrawal");
    
    const totalWithdrawn = withdrawals?.reduce((acc, tx) => acc + Math.abs(tx.points || 0), 0) || 0;

    // 4. Get Treasury Balance (Live On-Chain)
    let treasuryBalance = 0;
    try {
        treasuryBalance = await arbTokenService.getTreasuryBalance();
    } catch (e) {
        console.error("Failed to fetch treasury balance:", e);
    }

    // --- CALCULATE REAL PERCENTAGES (7-Day Growth) ---
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString();

    // A. Users Growth
    const { count: oldUsersCount } = await supabaseServer
        .from("users")
        .select("*", { count: "exact", head: true })
        .lt("created_at", dateStr);
    
    const currentUsers = totalUsers || 0;
    const previousUsers = oldUsersCount || 0; // If 0 (brand new app), growth is 100% if current > 0
    const usersChange = previousUsers === 0 
        ? (currentUsers > 0 ? 100 : 0) 
        : ((currentUsers - previousUsers) / previousUsers) * 100;

    // B. Points Growth (Net Points Added in last 7 days)
    // We need sum of transactions created AFTER 7 days ago vs BEFORE
    // This is expensive to do perfectly with just simple queries, so we'll approximate using recent volume.
    // Better approximation: 
    // New Points = Sum of 'points' in 'points_transactions' where created_at > 7 days ago
    // Old Total = Current Total - New Points
    // Growth = (New Points / Old Total) * 100
    
    const { data: recentPointsTx } = await supabaseServer
        .from("points_transactions")
        .select("points")
        .gt("created_at", dateStr);
    
    const netChange7Days = recentPointsTx?.reduce((acc, tx) => acc + (tx.points || 0), 0) || 0;
    const oldTotalPoints = totalPointsCurrent - netChange7Days;
    const pointsChange = oldTotalPoints === 0 
        ? (totalPointsCurrent > 0 ? 100 : 0) 
        : (netChange7Days / oldTotalPoints) * 100;

    // C. Withdrawals Growth
    const { data: recentWithdrawals } = await supabaseServer
        .from("points_transactions")
        .select("points")
        .eq("type", "withdrawal")
        .gt("created_at", dateStr);
    
    const newWithdrawalsVol = recentWithdrawals?.reduce((acc, tx) => acc + Math.abs(tx.points || 0), 0) || 0;
    const oldWithdrawalsVol = totalWithdrawn - newWithdrawalsVol;
    const withdrawalsChange = oldWithdrawalsVol === 0
        ? (totalWithdrawn > 0 ? 100 : 0)
        : (newWithdrawalsVol / oldWithdrawalsVol) * 100;


    // 5. Get Platform Activity (Last 30 Days)
    const { data: recentTx } = await supabaseServer
        .from("points_transactions")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(500); // Sample size for chart

    // Aggregate by date
    const activityMap: Record<string, number> = {};
    const today = new Date();
    // Initialize last 7 days with 0
    for(let i=6; i>=0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        activityMap[key] = 0;
    }

    recentTx?.forEach(tx => {
        const date = tx.created_at.split('T')[0];
        if (activityMap[date] !== undefined) {
            activityMap[date]++;
        }
    });

    const chartData = Object.keys(activityMap).sort().map(date => ({
        date: new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        count: activityMap[date]
    }));

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      usersChange,
      totalPointsCurrent,
      pointsChange,
      totalWithdrawn,
      withdrawalsChange,
      treasuryBalance,
      chartData // [{ date: '01 Jan', count: 5 }, ...]
    });

  } catch (error: any) {
    console.error("Admin Stats Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

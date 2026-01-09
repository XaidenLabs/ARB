/* eslint-disable @typescript-eslint/no-explicit-any */
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

    // 6. Get User Locations (Real Data from Auth)
    // We fetch users from Supabase Auth to get the 'user_metadata' which contains the country
    const { data: { users: authUsers }, error: authError } = await supabaseServer.auth.admin.listUsers({
      page: 1,
      perPage: 1000 // optimize: fetch a good chunk. For huge apps, this needs pagination loops.
    });

    if (authError) {
        console.error("Auth Fetch Error:", authError);
    }
    
    // Country Coordinate Map (Lat/Lon)
    const countryCoords: Record<string, [number, number]> = {
        "Nigeria": [8.6753, 9.0820],
        "United States": [-95.7129, 37.0902],
        "United Kingdom": [-3.4360, 55.3781],
        "India": [78.9629, 20.5937],
        "Germany": [10.4515, 51.1657],
        "Canada": [-106.3468, 56.1304],
        "France": [2.2137, 46.2276],
        "China": [104.1954, 35.8617],
        "Australia": [133.7751, -25.2744],
        "Brazil": [-51.9253, -14.2350],
        "Russia": [105.3188, 61.5240],
        "Japan": [138.2529, 36.2048],
        "South Africa": [22.9375, -30.5595],
        "Kenya": [37.9062, -0.0236],
        "Ghana": [-1.0232, 7.9465],
        "South Korea": [127.7669, 35.9078],
        "Italy": [12.5674, 41.8719],
        "Spain": [-3.7492, 40.4637],
        "Indonesia": [113.9213, -0.7893],
        "Vietnam": [108.2772, 14.0583],
        "Thailand": [100.9925, 15.8700],
        "Singapore": [103.8198, 1.3521],
        "Netherlands": [5.2913, 52.1326],
        "Sweden": [18.6435, 60.1282],
        "Switzerland": [8.2275, 46.8182],
        "UAE": [53.8478, 23.4241],
        "Saudi Arabia": [45.0792, 23.8859],
        "Turkey": [35.2433, 38.9637],
        "Mexico": [-102.5528, 23.6345],
        "Argentina": [-63.6167, -38.4161],
        "Chile": [-71.5430, -35.6751],
        "Colombia": [-74.2973, 4.5709],
        "Egypt": [30.8025, 26.8206],
        "Pakistan": [69.3451, 30.3753],
        "Bangladesh": [90.3563, 23.6850],
        "Philippines": [121.7740, 12.8797],
        "Malaysia": [101.9758, 4.2105],
        "New Zealand": [174.8860, -40.9006],
        "Ukraine": [31.1656, 48.3794],
        "Poland": [19.1451, 51.9194]
    };

    const geoDistribution: Record<string, number> = {};

    authUsers?.forEach((user: any) => {
        // Safe access to country. Some users might not have metadata or country.
        // Normalize keys if needed (e.g. "Country" vs "country")
        const meta = user.user_metadata || {};
        const country = meta.country || meta.Country || "Unknown";
        
        if (country && countryCoords[country]) {
            geoDistribution[country] = (geoDistribution[country] || 0) + 1;
        }
    });

    const geoData = Object.entries(geoDistribution).map(([name, count]) => ({
        name,
        coordinates: countryCoords[name],
        count
    }));

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      usersChange,
      totalPointsCurrent,
      pointsChange,
      totalWithdrawn,
      withdrawalsChange,
      treasuryBalance,
      chartData,
      geoData 
    });

  } catch (error: any) {
    console.error("Admin Stats Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

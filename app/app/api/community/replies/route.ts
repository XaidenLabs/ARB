/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

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
    const threadId = req.nextUrl.searchParams.get("threadId");
    if (!threadId) return NextResponse.json({ error: "threadId required" }, { status: 400 });

    const { data, error } = await supabaseServer
      .from("community_replies")
      .select("id, thread_id, user_id, body, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const authorIds = Array.from(new Set((data || []).map((r) => r.user_id)));
    let authorMap: Record<string, { full_name: string | null }> = {};
    if (authorIds.length) {
      const { data: authors } = await supabaseServer
        .from("users")
        .select("id, full_name")
        .in("id", authorIds);
      authorMap = Object.fromEntries(
        (authors || []).map((a) => [a.id, { full_name: a.full_name || null }])
      );
    }

    const replies =
      data?.map((r) => ({
        ...r,
        author: authorMap[r.user_id] || null,
      })) || [];

    return NextResponse.json({ replies });
  } catch (err: any) {
    console.error("Replies GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load replies" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseServer) throw new Error("Supabase server client not available");
    const user = await getUserFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { threadId, body } = await req.json();
    if (!threadId || !body) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { data, error } = await supabaseServer
      .from("community_replies")
      .insert({
        thread_id: threadId,
        user_id: user.id,
        body: body.trim(),
      })
      .select("id, thread_id, user_id, body, created_at")
      .single();
    if (error) throw error;

    return NextResponse.json({
      reply: {
        ...data,
        author: { full_name: user.user_metadata?.full_name || user.email || null },
      },
    });
  } catch (err: any) {
    console.error("Replies POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to post reply" }, { status: 500 });
  }
}

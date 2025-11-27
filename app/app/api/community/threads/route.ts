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
  const topic = req.nextUrl.searchParams.get("topic");
  const threadId = req.nextUrl.searchParams.get("threadId");
  const search = req.nextUrl.searchParams.get("search");
  const page = parseInt(req.nextUrl.searchParams.get("page") || "0", 10);
  const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") || "10", 10);
  const from = page * pageSize;
  const to = from + pageSize - 1;

  try {
    if (!supabaseServer) throw new Error("Supabase server client not available");

    let query = supabaseServer
      .from("community_threads")
      .select("id,user_id,title,body,topic,replies_count,likes_count,created_at", {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (threadId) {
      query = query.eq("id", threadId);
    } else {
      query = query.range(from, to);
    }

    if (topic && topic !== "all") {
      query = query.eq("topic", topic);
    }
    if (search) {
      const term = `%${search}%`;
      query = query.or(`title.ilike.${term},body.ilike.${term}`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // fetch authors
    const authorIds = Array.from(new Set((data || []).map((t) => t.user_id)));
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

    const threads =
      data?.map((t) => ({
        ...t,
        author: authorMap[t.user_id] || null,
      })) || [];

    return NextResponse.json({
      threads,
      hasMore: threadId ? false : (count || 0) > to + 1,
    });
  } catch (err: any) {
    console.error("Threads GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load threads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseServer) throw new Error("Supabase server client not available");
    const user = await getUserFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { title, body: content, topic } = body;
    if (!title || !content || !topic) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("community_threads")
      .insert({
        title: title.trim(),
        body: content.trim(),
        topic,
        user_id: user.id,
      })
      .select("id,user_id,title,body,topic,replies_count,likes_count,created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({
      thread: {
        ...data,
        author: { full_name: user.user_metadata?.full_name || user.email || null },
      },
    });
  } catch (err: any) {
    console.error("Threads POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to create thread" }, { status: 500 });
  }
}

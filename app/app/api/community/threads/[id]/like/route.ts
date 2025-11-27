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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!supabaseServer) throw new Error("Supabase server client not available");
    const user = await getUserFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const threadId = params.id;
    const { action } = await req.json();

    if (action === "unlike") {
      const { error } = await supabaseServer
        .from("community_reactions")
        .delete()
        .match({ thread_id: threadId, user_id: user.id });
      if (error) throw error;
    } else {
      const { error } = await supabaseServer
        .from("community_reactions")
        .insert({ thread_id: threadId, user_id: user.id })
        .select()
        .maybeSingle();
      if (error && !`${error.message}`.includes("duplicate")) throw error;
    }

    const { data: updated } = await supabaseServer
      .from("community_threads")
      .select("id, likes_count")
      .eq("id", threadId)
      .single();

    return NextResponse.json({ likes_count: updated?.likes_count || 0 });
  } catch (err: any) {
    console.error("Like error:", err);
    return NextResponse.json({ error: err.message || "Failed to toggle like" }, { status: 500 });
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

const getUserFromAuth = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || null;

  if (!token || !supabaseServer) return null;

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
};

export async function PATCH(req: Request, context: any) {
  try {
    if (!supabaseServer) throw new Error("Supabase server client not available");

    const user = await getUserFromAuth(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const threadId = context?.params?.id;
    const payload = await req.json();
    const { title, body, topic } = payload || {};

    const updates: Record<string, any> = {};
    if (title !== undefined) {
      if (!title.trim())
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      updates.title = title.trim();
    }
    if (body !== undefined) {
      if (!body.trim())
        return NextResponse.json(
          { error: "Body cannot be empty" },
          { status: 400 }
        );
      updates.body = body.trim();
    }
    if (topic !== undefined) updates.topic = topic;

    if (!Object.keys(updates).length)
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );

    // Ensure the user owns the thread
    const { data: thread, error: fetchError } = await supabaseServer
      .from("community_threads")
      .select("user_id")
      .eq("id", threadId)
      .single();

    if (fetchError) throw fetchError;

    if (!thread || thread.user_id !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: updated, error: updateError } = await supabaseServer
      .from("community_threads")
      .update(updates)
      .eq("id", threadId)
      .select(
        "id,user_id,title,body,topic,replies_count,likes_count,created_at"
      )
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ thread: updated });
  } catch (err: any) {
    console.error("Thread PATCH error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update thread" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    if (!supabaseServer) throw new Error("Supabase server client not available");

    const user = await getUserFromAuth(req);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const threadId = context?.params?.id;

    // Ensure the user owns the thread
    const { data: thread, error: fetchError } = await supabaseServer
      .from("community_threads")
      .select("user_id")
      .eq("id", threadId)
      .single();

    if (fetchError) throw fetchError;

    if (!thread || thread.user_id !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error: deleteError } = await supabaseServer
      .from("community_threads")
      .delete()
      .eq("id", threadId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Thread DELETE error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete thread" },
      { status: 500 }
    );
  }
}

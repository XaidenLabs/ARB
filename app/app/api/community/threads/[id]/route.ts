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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!supabaseServer) throw new Error("Supabase server client not available");
    const user = await getUserFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure user owns the thread
    const { data: thread, error: fetchError } = await supabaseServer
      .from("community_threads")
      .select("user_id")
      .eq("id", params.id)
      .single();
    if (fetchError) throw fetchError;
    if (!thread || thread.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: deleteError } = await supabaseServer
      .from("community_threads")
      .delete()
      .eq("id", params.id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Thread DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete thread" }, { status: 500 });
  }
}

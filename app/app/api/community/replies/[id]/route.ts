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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!supabaseServer) throw new Error("Supabase server client not available");
    const user = await getUserFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { body } = await req.json();
    if (!body) return NextResponse.json({ error: "Body required" }, { status: 400 });

    const { error } = await supabaseServer
      .from("community_replies")
      .update({ body: body.trim() })
      .eq("id", params.id)
      .eq("user_id", user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Reply PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to update reply" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!supabaseServer) throw new Error("Supabase server client not available");
    const user = await getUserFromAuth(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabaseServer
      .from("community_replies")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Reply DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete reply" }, { status: 500 });
  }
}

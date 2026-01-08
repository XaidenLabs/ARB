/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { supabaseServer } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 1. Verify Authentication
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify Admin Access (Role-based)
    if (session.user?.role !== 'admin') {
       return NextResponse.json({ error: "Forbidden: Admin access only" }, { status: 403 });
    }

    // 3. Perform Query using Service Role Client
    if (!supabaseServer) throw new Error("Supabase client missing");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabaseServer
      .from("researcher_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("contact_status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ leads: data });
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseServer) throw new Error("Supabase client missing");

    const body = await request.json();
    const { full_name, affiliation, project_summary, contact_status } = body;

    if (!full_name) {
        return NextResponse.json({ error: "Full Name is required" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("researcher_leads")
      .insert([
        {
          full_name,
          affiliation,
          project_summary,
          contact_status: contact_status || 'new'
        }
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ lead: data });
  } catch (error: any) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseServer) throw new Error("Supabase client missing");

    const body = await request.json();
    const { id, full_name, affiliation, project_summary, contact_status } = body;

    if (!id) {
        return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("researcher_leads")
      .update({
          full_name,
          affiliation,
          project_summary,
          contact_status
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ lead: data });
  } catch (error: any) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: error?.message || "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseServer) throw new Error("Supabase client missing");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Lead ID is required" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("researcher_leads")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: error?.message || "Delete failed" }, { status: 500 });
  }
}


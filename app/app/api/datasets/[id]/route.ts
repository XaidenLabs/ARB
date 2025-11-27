// Dataset Details | Valid Endpoint!!!
// export const runtime = "edge";
// export const runtime = "node.js";



import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseServer } from '../../../lib/supabase';


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ 
        error: 'Dataset not found' 
      }, { status: 404 });
    }

    // Increment view count (not download count)
    await supabase
      .from('datasets')
      .update({ download_count: (data.download_count || 0) + 1 })
      .eq('id', id);

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching dataset:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch dataset' 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || null;

  if (!supabaseServer) {
    return NextResponse.json({ error: "Server client not available" }, { status: 500 });
  }
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseServer.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: dataset, error: fetchError } = await supabaseServer
      .from('datasets')
      .select('id,uploader_id')
      .eq('id', id)
      .single();

    if (fetchError || !dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    if (dataset.uploader_id !== userData.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabaseServer
      .from('datasets')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete dataset error:', error);
    return NextResponse.json({ error: 'Failed to delete dataset' }, { status: 500 });
  }
}

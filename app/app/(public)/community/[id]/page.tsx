/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Heart, MessageSquare, Send, Users, Trash2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

type Topic = "introductions" | "projects" | "collaboration";

interface Thread {
  id: string;
  user_id: string;
  title: string;
  body: string;
  topic: Topic;
  replies_count: number;
  likes_count: number;
  created_at: string;
  author?: {
    full_name: string | null;
  } | null;
  liked_by_me?: boolean;
}

interface Reply {
  id: string;
  thread_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: {
    full_name: string | null;
  } | null;
}

export default function ThreadDetailPage() {
  const params = useParams<{ id: string }>();
  const threadId = params?.id;
  const { data: nextAuthSession } = useSession();
  const router = useRouter();
  const [thread, setThread] = useState<Thread | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyDraft, setReplyDraft] = useState("");
  const [liking, setLiking] = useState(false);
  const [postingReply, setPostingReply] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const authHeaders = (): Record<string, string> => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (!threadId) return;
    fetchThread();
  }, [threadId]);

  const fetchThread = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/community/threads?threadId=${threadId}`, {
        headers: { ...authHeaders() },
      });
      const json = await res.json();
      if (!res.ok || !json.threads?.length) throw new Error(json.error || "Thread not found");
      const mapped: Thread = json.threads[0];
      setThread(mapped);
      await fetchReplies();
    } catch (err) {
      console.error("Thread fetch error:", err);
      toast.error("Could not load thread.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    const res = await fetch(`/api/community/replies?threadId=${threadId}`, {
      headers: { ...authHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      console.warn("Replies load error:", json.error);
      return;
    }
    setReplies(json.replies || []);
  };

  const toggleLike = async () => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    if (!token || !thread) {
      toast.error("Sign in to react.");
      return;
    }
    if (liking) return;
    setLiking(true);
    const liked = thread.liked_by_me;
    const updated: Thread = {
      ...thread,
      liked_by_me: !liked,
      likes_count: (thread.likes_count || 0) + (liked ? -1 : 1),
    };
    setThread(updated);

    const res = await fetch(`/api/community/threads/${thread.id}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: liked ? "unlike" : "like" }),
    });
    const json = await res.json();
    if (!res.ok) {
      setThread(thread);
      toast.error(json.error || "Could not update reaction.");
    } else {
      setThread((prev) => (prev ? { ...prev, likes_count: json.likes_count ?? prev.likes_count } : prev));
    }
    setLiking(false);
  };

  const submitReply = async () => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    if (!token || !thread) {
      toast.error("Sign in to reply.");
      return;
    }
    const body = replyDraft.trim();
    if (!body) return;
    setPostingReply(true);

    const res = await fetch("/api/community/replies", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ threadId: thread.id, body }),
    });
    const json = await res.json();
    if (!res.ok || !json.reply) {
      toast.error(json.error || "Could not post reply.");
      setPostingReply(false);
      return;
    }

    const newReply: Reply = json.reply;
    setReplies((prev) => [newReply, ...prev]);
    setThread((prev) =>
      prev ? { ...prev, replies_count: (prev.replies_count || 0) + 1 } : prev
    );
    setReplyDraft("");
    setPostingReply(false);
  };

  const deleteThread = async () => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    if (!token || !thread) {
      toast.error("Sign in to delete.");
      return;
    }
    const res = await fetch(`/api/community/threads/${thread.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || "Could not delete thread.");
      return;
    }
    toast.success("Thread deleted.");
    router.push("/community");
  };

  const startEditReply = (reply: Reply) => {
    setEditingReplyId(reply.id);
    setEditingText(reply.body);
  };

  const saveEditReply = async (replyId: string) => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    if (!editingText.trim() || !token) return;
    const updated = editingText.trim();
    setReplies((prev) => prev.map((r) => (r.id === replyId ? { ...r, body: updated } : r)));
    setEditingReplyId(null);
    setEditingText("");
    const res = await fetch(`/api/community/replies/${replyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: updated }),
    });
    if (!res.ok) {
      toast.error("Could not update reply.");
      fetchReplies();
    }
  };

  const deleteReply = async (replyId: string) => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    if (!token || !thread) return;

    const res = await fetch(`/api/community/replies/${replyId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      toast.error("Could not delete reply.");
      fetchReplies();
      fetchThread();
      return;
    }

    setReplies((prev) => prev.filter((r) => r.id !== replyId));
    setThread((prev) =>
      prev ? { ...prev, replies_count: Math.max((prev.replies_count || 1) - 1, 0) } : prev
    );
  };

  const topicLabel = useMemo(() => {
    if (!thread) return "";
    if (thread.topic === "introductions") return "Introduction";
    if (thread.topic === "projects") return "Project";
    return "Collab request";
  }, [thread]);

  if (loading || !thread) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading thread...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Link href="/community" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to community
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700">{topicLabel}</span>
            <span>{new Date(thread.created_at).toLocaleString()}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{thread.title}</h1>
          <p className="text-gray-700">{thread.body}</p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1">
              <Users className="w-4 h-4" /> {thread.author?.full_name || "Member"}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="w-4 h-4" /> {thread.replies_count || 0} replies
            </span>
            <button
              type="button"
              onClick={toggleLike}
              className={`inline-flex items-center gap-1 ${thread.liked_by_me ? "text-red-600" : "text-gray-600"}`}
            >
              <Heart className={`w-4 h-4 ${thread.liked_by_me ? "fill-red-500 text-red-500" : ""}`} />
              {thread.likes_count || 0} reactions
            </button>
            {thread.user_id === (nextAuthSession as any)?.user?.id && (
              <button
                type="button"
                onClick={deleteThread}
                className="inline-flex items-center gap-1 text-red-600"
              >
                <Trash2 className="w-4 h-4" /> Delete thread
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Replies</h2>
          {replies.length === 0 ? (
            <p className="text-sm text-gray-500">No replies yet. Start the discussion.</p>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => (
                <div key={reply.id} className="border border-gray-100 rounded-xl p-3 bg-gray-50 text-sm text-gray-800">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span className="font-semibold text-gray-800">
                      {reply.author?.full_name || "Member"}
                    </span>
                    <span>{new Date(reply.created_at).toLocaleString()}</span>
                  </div>
                  {editingReplyId === reply.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        rows={2}
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="px-3 py-1 rounded bg-blue-600 text-white text-xs"
                          onClick={() => saveEditReply(reply.id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded border text-xs"
                          onClick={() => {
                            setEditingReplyId(null);
                            setEditingText("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between gap-3">
                      <p className="flex-1">{reply.body}</p>
                      {reply.user_id === (nextAuthSession as any)?.user?.id && (
                        <div className="flex items-center gap-2 text-[11px] text-blue-700">
                          <button
                            type="button"
                            onClick={() => startEditReply(reply)}
                            className="hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteReply(reply.id)}
                            className="hover:underline text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 pt-3 space-y-2">
            <textarea
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder="Reply with feedback, resources, or collab interest..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={submitReply}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                disabled={!replyDraft.trim() || postingReply}
              >
                <Send className="w-4 h-4" /> {postingReply ? "Posting..." : "Reply"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Users,
  MessageSquare,
  Lightbulb,
  Handshake,
  PlusCircle,
  Send,
  Sparkles,
  Filter,
  Heart,
} from "lucide-react";
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
    role?: string | null;
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

export default function CommunityPage() {
  const { data: nextAuthSession } = useSession();
  const [activeTopic, setActiveTopic] = useState<Topic | "all">("all");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [replies, setReplies] = useState<Record<string, Reply[]>>({});
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [hasMore, setHasMore] = useState(true);
  const [newPost, setNewPost] = useState({
    topic: "introductions" as Topic,
    title: "",
    message: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [threadDraft, setThreadDraft] = useState({
    title: "",
    body: "",
    topic: "introductions" as Topic,
  });
  const [savingThreadId, setSavingThreadId] = useState<string | null>(null);

  const authHeaders = (): HeadersInit => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    setThreads([]);
    setPage(0);
    setHasMore(true);
    fetchThreads(0, true);
  }, [activeTopic, debouncedQuery]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const highlightMatch = (text: string) => {
    if (!debouncedQuery) return text;
    const safe = debouncedQuery.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    return text.replace(new RegExp(`(${safe})`, "gi"), "%%$1%%");
  };

  const fetchThreads = async (pageToFetch = page, replace = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        topic: activeTopic,
        page: pageToFetch.toString(),
        pageSize: pageSize.toString(),
      });
      if (debouncedQuery) params.set("search", debouncedQuery);

      const res = await fetch(`/api/community/threads?${params.toString()}`, {
        headers: { ...authHeaders() },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load threads");
      const mapped: Thread[] = json.threads || [];

      setThreads((prev) => (replace ? mapped : [...prev, ...mapped]));
      await loadRepliesForThreads(mapped);
      setHasMore(json.hasMore);
    } catch (err) {
      console.error("Fetch threads error:", err);
      toast.error("Failed to load community threads.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    if (!token) {
      toast.error("Sign in to post.");
      return;
    }
    if (!newPost.title.trim() || !newPost.message.trim()) {
      toast.error("Add a title and message.");
      return;
    }

    try {
      setPosting(true);
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...("Authorization" in authHeaders() ? { Authorization: (authHeaders() as Record<string, string>).Authorization } : {}),
      };

      const res = await fetch("/api/community/threads", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: newPost.title.trim(),
          body: newPost.message.trim(),
          topic: newPost.topic,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create thread");
      const mapped: Thread = json.thread;
      setThreads((prev) => [mapped, ...prev]);
      setNewPost({ topic: "introductions", title: "", message: "" });
      toast.success("Posted to community.");
    } catch (err) {
      console.error("Create thread error:", err);
      const message = (err as any)?.message || "Could not post. Try again.";
      toast.error(message);
    } finally {
      setPosting(false);
    }
  };

  const filtered = useMemo(() => {
    if (activeTopic === "all") return threads;
    return threads.filter((t) => t.topic === activeTopic);
  }, [threads, activeTopic]);

  const loadRepliesForThreads = async (threadBatch: Thread[]) => {
    const ids = threadBatch.map((t) => t.id);
    if (!ids.length) return;

    const grouped: Record<string, Reply[]> = {};
    await Promise.all(
      ids.map(async (id) => {
        const res = await fetch(`/api/community/replies?threadId=${id}`, {
          headers: { ...authHeaders() },
        });
        const json = await res.json();
        if (res.ok) grouped[id] = json.replies || [];
      })
    );
    setReplies((prev) => ({ ...prev, ...grouped }));
  };

  const toggleLike = async (thread: Thread) => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    if (!token) {
      toast.error("Sign in to react.");
      return;
    }
    const liked = thread.liked_by_me;
    const threadId = thread.id;

    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? { ...t, liked_by_me: !liked, likes_count: (t.likes_count || 0) + (liked ? -1 : 1) }
          : t
      )
    );

    const res = await fetch(`/api/community/threads/${threadId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ action: liked ? "unlike" : "like" }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || "Could not update reaction.");
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, liked_by_me: liked, likes_count: thread.likes_count } : t
        )
      );
    } else {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, likes_count: json.likes_count ?? t.likes_count } : t
        )
      );
    }
  };

  const deleteThread = async (threadId: string) => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    if (!token) {
      toast.error("Sign in to delete.");
      return;
    }
    const res = await fetch(`/api/community/threads/${threadId}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error || "Could not delete thread.");
      return;
    }
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    const { [threadId]: _, ...rest } = replies;
    setReplies(rest);
    toast.success("Thread deleted.");
  };

  const startEditThread = (thread: Thread) => {
    setEditingThreadId(thread.id);
    setThreadDraft({ title: thread.title, body: thread.body, topic: thread.topic });
  };

  const cancelEditThread = () => {
    setEditingThreadId(null);
    setSavingThreadId(null);
    setThreadDraft({ title: "", body: "", topic: "introductions" });
  };

  const saveThreadEdit = async (threadId: string) => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    if (!token) {
      toast.error("Sign in to edit.");
      return;
    }
    const title = threadDraft.title.trim();
    const body = threadDraft.body.trim();
    if (!title || !body) {
      toast.error("Add a title and message.");
      return;
    }
    setSavingThreadId(threadId);
    try {
      const res = await fetch(`/api/community/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ title, body, topic: threadDraft.topic }),
      });
      const json = await res.json();
      if (!res.ok || !json.thread)
        throw new Error(json.error || "Failed to update thread");
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? { ...t, ...json.thread, liked_by_me: t.liked_by_me }
            : t
        )
      );
      toast.success("Thread updated.");
      cancelEditThread();
    } catch (err) {
      console.error("Update thread error:", err);
      toast.error((err as any)?.message || "Could not update thread.");
      setSavingThreadId(null);
    }
  };

  const submitReply = async (threadId: string) => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    if (!token) {
      toast.error("Sign in to reply.");
      return;
    }
    const body = replyDrafts[threadId]?.trim();
    if (!body) return;

    try {
      const res = await fetch("/api/community/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ threadId, body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to post reply");

      const newReply: Reply = json.reply;
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId ? { ...t, replies_count: (t.replies_count || 0) + 1 } : t
        )
      );
      setReplies((prev) => ({
        ...prev,
        [threadId]: [newReply, ...(prev[threadId] || [])],
      }));
      setReplyDrafts((prev) => ({ ...prev, [threadId]: "" }));
    } catch (err) {
      toast.error("Could not post reply.");
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? { ...t, replies_count: Math.max((t.replies_count || 1) - 1, 0) }
            : t
        )
      );
    }
  };

  const startEditReply = (reply: Reply) => {
    setEditingReplyId(reply.id);
    setEditingText(reply.body);
  };

  const saveEditReply = async (threadId: string, replyId: string) => {
    if (!editingText.trim()) return;
    const updated = editingText.trim();
    setReplies((prev) => ({
      ...prev,
      [threadId]: (prev[threadId] || []).map((r) =>
        r.id === replyId ? { ...r, body: updated } : r
      ),
    }));
    setEditingReplyId(null);
    setEditingText("");
    const res = await fetch(`/api/community/replies/${replyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ body: updated }),
    });
    if (!res.ok) {
      toast.error("Could not update reply.");
      fetchThreads(0, true);
    }
  };

  const deleteReply = async (threadId: string, replyId: string) => {
    const token = (nextAuthSession as any)?.supabaseAccessToken;
    if (!token) {
      toast.error("Sign in to delete replies.");
      return;
    }

    const res = await fetch(`/api/community/replies/${replyId}`, {
      method: "DELETE",
      headers: { ...authHeaders() },
    });
    if (!res.ok) {
      toast.error("Could not delete reply.");
      return;
    }

    setReplies((prev) => ({
      ...prev,
      [threadId]: (prev[threadId] || []).filter((r) => r.id !== replyId),
    }));
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId ? { ...t, replies_count: Math.max((t.replies_count || 1) - 1, 0) } : t
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Hero */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Community</p>
            <h1 className="text-3xl font-bold text-gray-900">Meet, share, collaborate</h1>
            <p className="text-gray-600">
              Introduce yourself, showcase ongoing projects, or request collaborators.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" /> Researchers, reviewers, and organizations
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-2xl">
            <div className="relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/15 via-purple-500/10 to-pink-500/15 blur-lg opacity-0 group-hover:opacity-100 transition" />
              <div className="relative flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                  <Filter className="w-4 h-4" />
                </div>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search threads by title or content..."
                  className="w-full bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-gray-500 hover:text-gray-800"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700">Instant</span>
                <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700">Fuzzy match</span>
                <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700">Suggestions</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" /> Topics:
            </div>
            {[
              { value: "all", label: "All" },
              { value: "introductions", label: "Introductions" },
              { value: "projects", label: "Projects" },
              { value: "collaboration", label: "Collab requests" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTopic(tab.value as any)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  activeTopic === tab.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Post form */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <PlusCircle className="w-4 h-4 text-blue-600" />
                Start a thread
              </div>
              {!nextAuthSession?.user ? (
                <div className="text-sm text-gray-600 space-y-3">
                  <p>Sign in to introduce yourself or request collaborators.</p>
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Sign in
                  </Link>
                </div>
              ) : (
                <form className="space-y-3" onSubmit={handleSubmit}>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Topic</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "introductions", label: "Intro", icon: Users },
                      { value: "projects", label: "Projects", icon: Lightbulb },
                      { value: "collaboration", label: "Collab", icon: Handshake },
                    ].map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          type="button"
                          key={option.value}
                          onClick={() => setNewPost((p) => ({ ...p, topic: option.value as Topic }))}
                          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-sm transition ${
                            newPost.topic === option.value
                              ? "border-blue-500 bg-blue-50 text-blue-700"
                              : "border-gray-200 hover:border-blue-200 text-gray-700"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <input
                      value={newPost.title}
                      onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Title"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      value={newPost.message}
                      onChange={(e) => setNewPost((p) => ({ ...p, message: e.target.value }))}
                      placeholder="Share your intro, project, or request..."
                      rows={4}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!newPost.title.trim() || !newPost.message.trim() || posting}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {posting ? "Posting..." : "Post"}
                  </button>
                </form>
              )}
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-2xl p-4 space-y-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-800">
                <Sparkles className="w-4 h-4" /> Tips for great posts
              </div>
              <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
                <li>Include your field, region, and data format needs.</li>
                <li>Share links or share-links to your datasets for context.</li>
                <li>Offer to review others’ work to build mutual connections.</li>
              </ul>
            </div>
          </div>

          {/* Threads */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-gray-500">
                Loading threads...
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-gray-500">
                No posts yet. Start the conversation!
              </div>
            ) : (
              filtered.map((thread) => (
                <div
                  key={thread.id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 w-full">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                          {thread.topic === "introductions"
                            ? "Introduction"
                            : thread.topic === "projects"
                            ? "Project"
                            : "Collab request"}
                        </span>
                        <span>{new Date(thread.created_at).toLocaleString()}</span>
                      </div>
                      {editingThreadId === thread.id ? (
                        <div className="space-y-2">
                          <input
                            value={threadDraft.title}
                            onChange={(e) => setThreadDraft((p) => ({ ...p, title: e.target.value }))}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Title"
                          />
                          <textarea
                            value={threadDraft.body}
                            onChange={(e) => setThreadDraft((p) => ({ ...p, body: e.target.value }))}
                            rows={3}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Share your update..."
                          />
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="font-semibold text-gray-700">Topic:</span>
                            <select
                              value={threadDraft.topic}
                              onChange={(e) =>
                                setThreadDraft((p) => ({ ...p, topic: e.target.value as Topic }))
                              }
                              className="rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="introductions">Introduction</option>
                              <option value="projects">Project</option>
                              <option value="collaboration">Collab request</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => saveThreadEdit(thread.id)}
                              disabled={savingThreadId === thread.id}
                              className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-60"
                            >
                              {savingThreadId === thread.id ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditThread}
                              className="inline-flex items-center gap-1 rounded border px-3 py-1 text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              href={`/community/${thread.id}`}
                              className="text-lg font-semibold text-gray-900 hover:underline"
                            >
                              <span
                                className="whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{
                                  __html: highlightMatch(thread.title).replace(/%%(.*?)%%/g, '<mark class="bg-amber-200 text-gray-900 rounded px-0.5">$1</mark>'),
                                }}
                              />
                            </Link>
                            {thread.user_id === (nextAuthSession as any)?.user?.id && (
                              <div className="flex items-center gap-2 text-xs text-blue-700">
                                <button
                                  type="button"
                                  onClick={() => startEditThread(thread)}
                                  className="hover:underline"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteThread(thread.id)}
                                  className="text-red-600 hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">
                            <span
                              className="whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{
                                __html: highlightMatch(thread.body).replace(/%%(.*?)%%/g, '<mark class="bg-amber-200 text-gray-900 rounded px-0.5">$1</mark>'),
                              }}
                            />
                          </p>
                        </>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-600 space-y-1">
                      <div className="font-semibold text-gray-900">
                        {thread.author?.full_name || "Anonymous"}
                      </div>
                      <div className="text-xs text-blue-700">{thread.author?.role || "Member"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" /> {thread.replies_count || 0} replies
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleLike(thread)}
                        className={`inline-flex items-center gap-1 ${thread.liked_by_me ? "text-red-600" : "text-gray-600"}`}
                      >
                        <Heart className={`w-4 h-4 ${thread.liked_by_me ? "fill-red-500 text-red-500" : ""}`} />
                        {thread.likes_count || 0} reactions
                      </button>
                    </span>
                  </div>

                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="space-y-2">
                      {(replies[thread.id] || []).slice(0, 5).map((reply) => (
                        <div
                          key={reply.id}
                          className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                        >
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
                                  onClick={() => saveEditReply(thread.id, reply.id)}
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
                              {reply.user_id === nextAuthSession?.user?.id && (
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
                                    onClick={() => deleteReply(thread.id, reply.id)}
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
                      {replies[thread.id]?.length === 0 && (
                        <p className="text-xs text-gray-500">Be the first to reply.</p>
                      )}
                      <div className="flex justify-end">
                        <Link
                          href={`/community/${thread.id}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View thread details
                        </Link>
                      </div>
                    </div>

                    <textarea
                      value={replyDrafts[thread.id] || ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({ ...prev, [thread.id]: e.target.value }))
                      }
                      placeholder="Reply with feedback, resources, or collab interest..."
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Replies keep everyone accountable and build trust.</span>
                      <button
                        type="button"
                        onClick={() => submitReply(thread.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                        disabled={!replyDrafts[thread.id]?.trim()}
                      >
                        <Send className="w-4 h-4" /> Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {hasMore && !loading && (
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchThreads(nextPage);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

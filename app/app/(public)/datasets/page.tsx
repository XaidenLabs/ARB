/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { DynamicTimestamp } from "@/components/DynamicTimestamp";
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  Lock,
  Plus,
  Share2,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Dataset {
  id: string;
  title: string;
  description: string;
  created_at: string;
  download_count?: number;
  view_count?: number;
  ai_confidence_score?: number | null;
  is_verified?: boolean;
  status?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  is_public?: boolean;
  share_link?: string | null;
}

export default function MyDatasetsPage() {
  const { data: nextAuthSession, status } = useSession();
  const [session, setSession] = useState<any>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSession, setSyncingSession] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Keep Supabase auth in sync with NextAuth so RLS works for private rows
  useEffect(() => {
    if (status === "loading") return;

    const syncSession = async () => {
      try {
        setSyncingSession(true);

        if (nextAuthSession?.supabaseAccessToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: nextAuthSession.supabaseAccessToken,
            refresh_token: nextAuthSession.supabaseAccessToken,
          });
          if (error) console.warn("Supabase session sync error:", error);
          if (data?.session) setSession(data.session);
        } else {
          const { data } = await supabase.auth.getSession();
          if (data?.session) setSession(data.session);
        }
      } catch (err) {
        console.error("Session sync error:", err);
      } finally {
        setSyncingSession(false);
      }
    };

    syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, updatedSession) => {
        if (updatedSession) setSession(updatedSession);
      }
    );

    return () => listener?.subscription.unsubscribe();
  }, [nextAuthSession, status]);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    fetchMyDatasets();

    const refresh = () => fetchMyDatasets();
    window.addEventListener("datasetUploaded", refresh);
    return () => window.removeEventListener("datasetUploaded", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const fetchMyDatasets = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("datasets")
        .select("*")
        .eq("uploader_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDatasets(data || []);
    } catch (err) {
      console.error("Error fetching user datasets:", err);
      toast.error("Could not load your datasets.");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const verified = datasets.filter((d) => d.is_verified).length;
    const downloads = datasets.reduce(
      (sum, d) => sum + (d.download_count || 0),
      0
    );
    const views = datasets.reduce((sum, d) => sum + (d.view_count || 0), 0);
    return {
      total: datasets.length,
      verified,
      downloads,
      views,
    };
  }, [datasets]);

  const copyDatasetLink = async (dataset: Dataset) => {
    const linkToCopy = dataset.file_url || "";
    if (!linkToCopy) {
      toast.error("No file link available yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(linkToCopy);
      toast.success("Dataset link copied.");
    } catch (err) {
      console.error("Copy link error:", err);
      toast.error("Unable to copy the link.");
    }
  };

  const deleteDataset = async (datasetId: string) => {
    const token = nextAuthSession?.supabaseAccessToken;
    if (!token) {
      toast.error("Sign in to delete.");
      return;
    }
    setDeletingId(datasetId);
    try {
      const res = await fetch(`/api/datasets/${datasetId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setDatasets((prev) => prev.filter((d) => d.id !== datasetId));
      toast.success("Dataset deleted.");
    } catch (err) {
      console.error("Delete dataset error:", err);
      toast.error("Could not delete dataset.");
    } finally {
      setDeletingId(null);
    }
  };

  const renderStatusBadge = (dataset: Dataset) => {
    const statusLabel =
      dataset.status ||
      (dataset.is_public ? "active" : "private") ||
      "pending";

    const badgeStyles: Record<string, string> = {
      verified: "bg-green-100 text-green-700",
      ai_verified: "bg-blue-100 text-blue-700",
      under_review: "bg-purple-100 text-purple-700",
      pending: "bg-amber-100 text-amber-700",
      rejected: "bg-red-100 text-red-700",
      private: "bg-gray-100 text-gray-700",
      active: "bg-blue-50 text-blue-700",
    };

    const normalized = statusLabel.toLowerCase();
    const classes =
      badgeStyles[normalized] || "bg-gray-100 text-gray-700 border border-gray-200";

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${classes}`}>
        {statusLabel.replace(/_/g, " ")}
      </span>
    );
  };

  const renderVisibilityBadge = (dataset: Dataset) =>
    dataset.is_public ? (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
        <Eye className="w-3.5 h-3.5" /> Public
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        <Lock className="w-3.5 h-3.5" /> Private
      </span>
    );

  if ((status === "loading" && syncingSession) || syncingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        Preparing your datasets...
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-center" />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Sign in to view your datasets
            </h1>
            <p className="text-gray-600">
              Your uploads will appear here once you are logged in.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/explore"
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100"
            >
              Browse public datasets
            </Link>
            <Link
              href="/upload"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Upload a dataset
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-center" />
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">My uploads</p>
            <h1 className="text-3xl font-bold text-gray-900">
              Your datasets
            </h1>
            <p className="text-gray-600 mt-1">
              Track downloads, visibility, and verification status.
            </p>
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            Upload new dataset
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total datasets" value={stats.total} icon={<FileText className="w-4 h-4" />} />
          <StatCard label="Downloads" value={stats.downloads} icon={<Download className="w-4 h-4" />} />
          <StatCard label="Views" value={stats.views} icon={<Eye className="w-4 h-4" />} />
          <StatCard label="Verified" value={stats.verified} icon={<CheckCircle2 className="w-4 h-4" />} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-500">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading your datasets...
          </div>
        ) : datasets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                No uploads yet
              </h2>
              <p className="text-gray-600">
                Upload your first dataset to see it listed here.
              </p>
            </div>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Upload dataset
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {datasets.map((dataset) => (
              <div
                key={dataset.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <DynamicTimestamp uploadDate={dataset.created_at} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {dataset.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {dataset.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {renderStatusBadge(dataset)}
                      {renderVisibilityBadge(dataset)}
                      {dataset.is_verified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      )}
                      {typeof dataset.ai_confidence_score === "number" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700">
                          AI score: {dataset.ai_confidence_score.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm text-gray-500">{dataset.file_name}</span>
                    <div className="text-xs text-gray-500">
                      ID: {dataset.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="inline-flex items-center gap-1">
                    <Download className="w-4 h-4 text-gray-400" />
                    {dataset.download_count || 0} downloads
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <Eye className="w-4 h-4 text-gray-400" />
                    {dataset.view_count || 0} views
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <Share2 className="w-4 h-4 text-gray-400" />
                    {dataset.is_public ? "Publicly shared" : "Private link only"}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={dataset.file_url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    View / download
                  </a>
                  <button
                    onClick={() => copyDatasetLink(dataset)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
                  >
                    <Share2 className="w-4 h-4" />
                    Copy link
                  </button>
                  <button
                    onClick={() => deleteDataset(dataset.id)}
                    disabled={deletingId === dataset.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === dataset.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                      </>
                    ) : (
                      <>
                        <span>Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

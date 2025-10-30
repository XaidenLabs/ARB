/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  ArrowLeft,
  Download,
  Star,
  Send,
  Loader2,
  Share2,
} from "lucide-react";
import { DynamicTimestamp } from "@/components/DynamicTimestamp";
import toast, { Toaster } from "react-hot-toast";

interface Dataset {
  id: string;
  title: string;
  description: string;
  file_name: string;
  file_url: string;
  uploader_id: string;
  created_at: string;
  research_field?: string;
  file_size?: number;
  ai_confidence_score?: number;
  ai_analysis?: string;
  tags?: string[];
}

export default function ExplorePage() {
  const { data: nextAuthSession, status } = useSession();
  const [session, setSession] = useState<any>(null);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [recommendation, setRecommendation] = useState<"approve" | "reject">(
    "approve"
  );
  const [submitting, setSubmitting] = useState(false);
  const [shareMenuId, setShareMenuId] = useState<string | null>(null);

  /**
   * ==============================================
   * SHARE DATASET
   * ==============================================
   */
  const shareDataset = async (dataset: Dataset) => {
    const shareTitle = dataset.title;
    const shareText = dataset.description
      ? `${dataset.title}\n\n${dataset.description}`
      : dataset.title;
    const shareUrl = dataset.file_url;

    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast.success("Share sheet opened.");
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(
          [shareTitle, dataset.description, shareUrl]
            .filter(Boolean)
            .join("\n\n")
        );
        toast.success("Dataset link copied to clipboard.");
        return;
      }

      toast.error("Sharing is not supported on this device.");
    } catch (error) {
      console.error("Dataset share error:", error);
      toast.error("Unable to share this dataset right now.");
    }
  };

  const copyDatasetLink = async (dataset: Dataset) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(dataset.file_url);
        toast.success("Dataset link copied to clipboard.");
        return;
      }
      toast.error("Copying is not supported on this device.");
    } catch (error) {
      console.error("Dataset copy link error:", error);
      toast.error("Unable to copy this dataset link right now.");
    }
  };

  useEffect(() => {
    if (!shareMenuId) return;

    const handleClickAway = () => setShareMenuId(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShareMenuId(null);
    };

    document.addEventListener("click", handleClickAway);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleClickAway);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [shareMenuId]);

  /**
   * ==============================================
   * SYNC NEXTAUTH SESSION → SUPABASE SESSION
   * ==============================================
   */
  useEffect(() => {
    const syncSession = async () => {
      if (status === "loading") return;
      try {
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

  /**
   * ==============================================
   * FETCH DATASETS
   * ==============================================
   */
  const fetchDatasets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("datasets")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Failed to fetch datasets.");
    } else {
      setDatasets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDatasets();
    const refresh = () => fetchDatasets();
    window.addEventListener("datasetUploaded", refresh);
    return () => window.removeEventListener("datasetUploaded", refresh);
  }, []);

  /**
   * ==============================================
   * STAR RATING UI
   * ==============================================
   */
  const renderStars = (value: number, interactive = false) => (
    <div className="flex space-x-1">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${interactive ? "cursor-pointer" : ""} ${
            i < value ? "text-yellow-400 fill-current" : "text-gray-300"
          }`}
          onClick={interactive ? () => setRating(i + 1) : undefined}
        />
      ))}
    </div>
  );

  /**
   * ==============================================
   * SEARCH
   * ==============================================
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() === "") {
      fetchDatasets();
      return;
    }
    const filtered = datasets.filter((d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setDatasets(filtered);
  };

  /**
   * ==============================================
   * REVIEW SUBMISSION
   * ==============================================
   */
  const handleSubmitReview = async () => {
    if (!selectedDataset) return toast.error("Please select a dataset first.");

    const { data: liveSession } = await supabase.auth.getSession();
    const activeSession = liveSession?.session || session;

    if (!activeSession?.user?.id)
      return toast.error("You must be signed in to review datasets.");

    if (rating === 0) return toast.error("Please provide a rating first.");

    setSubmitting(true);
    toast.loading("Submitting your review...");

    try {
      const access_token = activeSession.access_token;
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          datasetId: selectedDataset.id,
          accuracyRating: rating,
          completenessRating: rating,
          relevanceRating: rating,
          methodologyRating: rating,
          feedback,
          recommendation,
        }),
      });

      const data = await res.json();
      toast.dismiss();

      if (!res.ok) {
        toast.error(data.error || "Failed to submit review");
        return;
      }

      toast.success(data.message || "✅ Review submitted successfully!");
      setRating(0);
      setFeedback("");
      setSelectedDataset(null);
      fetchDatasets();
    } catch (error) {
      console.error("Review submission error:", error);
      toast.error("Something went wrong while submitting your review.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * ==============================================
   * LOADING STATE
   * ==============================================
   */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400 animate-pulse">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading datasets...
      </div>
    );
  }

  /**
   * ==============================================
   * DATASET CARD
   * ==============================================
   */
  const DatasetCard = ({ dataset }: { dataset: Dataset }) => {
    const score = dataset.ai_confidence_score || 75;
    const starValue = Math.round(score / 20);

    return (
      <div
        key={dataset.id}
        onClick={() => setSelectedDataset(dataset)}
        className="relative bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-500">
                <DynamicTimestamp uploadDate={dataset.created_at} />
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {dataset.title}
            </h3>
            <div className="flex items-center gap-2 mb-3">
              {renderStars(starValue)}
              <span className="text-xs text-gray-500">
                ({score.toFixed(0)}%)
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-3">
              {dataset.description}
            </p>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setShareMenuId((current) =>
                current === dataset.id ? null : dataset.id
              );
            }}
            className="ml-3 text-gray-400 hover:text-blue-600 transition-colors"
            aria-haspopup="true"
            aria-expanded={shareMenuId === dataset.id}
            aria-label={`Share ${dataset.title}`}
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        {shareMenuId === dataset.id && (
          <div
            onClick={(event) => event.stopPropagation()}
            className="absolute top-5 right-5 z-20 w-40 rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <button
              type="button"
              onClick={async (event) => {
                event.stopPropagation();
                setShareMenuId(null);
                await shareDataset(dataset);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Share dataset
            </button>
            <button
              type="button"
              onClick={async (event) => {
                event.stopPropagation();
                setShareMenuId(null);
                await copyDatasetLink(dataset);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              Copy link
            </button>
          </div>
        )}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm font-medium text-gray-900 truncate">
            📄 {dataset.file_name}
          </span>
          <button className="text-blue-600 text-sm font-medium hover:underline">
            View
          </button>
        </div>
      </div>
    );
  };

  /**
   * ==============================================
   * DATASET DETAIL
   * ==============================================
   */
  const DatasetDetail = ({ dataset }: { dataset: Dataset }) => {
    const score = dataset.ai_confidence_score || 75;
    const starValue = Math.round(score / 20);

    return (
      <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm max-w-4xl mx-auto">
        <button
          onClick={() => setSelectedDataset(null)}
          className="flex items-center text-gray-600 hover:text-blue-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to all datasets
        </button>

        <h1 className="text-3xl font-bold mb-2 text-gray-900">
          {dataset.title}
        </h1>
        <p className="text-gray-500 mb-4">
          Uploaded by{" "}
          <span className="font-medium text-blue-600">
            {dataset.uploader_id.slice(0, 6)}...
          </span>{" "}
          • <DynamicTimestamp uploadDate={dataset.created_at} />
        </p>

        <div className="flex items-center gap-2 mb-4">
          {renderStars(starValue)}
          <span className="text-sm text-gray-500">
            AI Confidence: {score.toFixed(0)}%
          </span>
        </div>

        <p className="text-gray-700 leading-relaxed mb-6">
          {dataset.description}
        </p>

        {dataset.ai_analysis && (
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-6">
            <p className="text-sm text-gray-600">
              🤖 <span className="font-semibold">AI Analysis:</span>{" "}
              {dataset.ai_analysis}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <a
            href={dataset.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Dataset
          </a>

          {/* Review Form */}
          <div className="w-full sm:w-1/2 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="text-lg font-semibold mb-2 text-gray-800">
              Leave a Review
            </h4>
            {renderStars(rating, true)}
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg text-sm mb-3"
              rows={3}
              placeholder="Share your feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-gray-600">Recommendation:</label>
              <select
                value={recommendation}
                onChange={(e) =>
                  setRecommendation(e.target.value as "approve" | "reject")
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
              </select>
            </div>

            <button
              onClick={handleSubmitReview}
              disabled={submitting}
              className="w-full px-5 py-3 bg-green-600 text-white rounded-lg flex items-center justify-center font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> Submit Review
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
   * ==============================================
   * MAIN RENDER
   * ==============================================
   */
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <Toaster position="top-center" />
      <div className="max-w-7xl mx-auto">
        {!selectedDataset && (
          <form
            onSubmit={handleSearch}
            className="relative max-w-2xl mx-auto mb-10"
          >
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search author, topic, or field..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </form>
        )}

        {selectedDataset ? (
          <DatasetDetail dataset={selectedDataset} />
        ) : datasets.length === 0 ? (
          <p className="text-center text-gray-400">No public datasets yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {datasets.map((ds) => (
              <DatasetCard key={ds.id} dataset={ds} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

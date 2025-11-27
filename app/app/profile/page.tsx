"use client";

import { useEffect, useMemo, useState, Children, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  User,
  Mail,
  Building2,
  MapPin,
  ShieldCheck,
  Upload,
  Star,
  Link2,
  Users,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface Profile {
  full_name: string | null;
  email: string | null;
  institution: string | null;
  research_field: string | null;
  country: string | null;
  bio: string | null;
  wallet_address: string | null;
  total_points: number;
  role: string | null;
}

interface DatasetSummary {
  id: string;
  title: string;
  created_at: string;
  status: string;
  download_count: number | null;
}

interface ReviewSummary {
  id: string;
  dataset_id: string;
  created_at: string;
  is_approved: boolean | null;
}

interface SocialConnection {
  platform: string;
  platform_username: string;
}

export default function ProfilePage() {
  const { data: nextAuthSession, status } = useSession();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploads, setUploads] = useState<DatasetSummary[]>([]);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);

  // Sync NextAuth session → Supabase client (for RLS)
  useEffect(() => {
    if (status === "loading") return;
    const syncSession = async () => {
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
      (_event, updatedSession) => updatedSession && setSession(updatedSession)
    );
    return () => listener?.subscription.unsubscribe();
  }, [nextAuthSession, status]);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const userId = session.user.id;

      const [
        { data: profileData, error: profileError },
        { data: uploadList },
        { data: reviewList },
        { data: socialList },
      ] = await Promise.all([
        supabase.from("users").select("*").eq("id", userId).single(),
        supabase
          .from("datasets")
          .select("id,title,created_at,status,download_count")
          .eq("uploader_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("reviews")
          .select("id,dataset_id,created_at,is_approved")
          .eq("reviewer_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("social_connections")
          .select("platform,platform_username")
          .eq("user_id", userId),
      ]);

      if (profileError) throw profileError;

      setProfile(profileData as Profile);
      setUploads((uploadList as DatasetSummary[]) || []);
      setReviews((reviewList as ReviewSummary[]) || []);
      setSocialConnections((socialList as SocialConnection[]) || []);
    } catch (err) {
      console.error("Profile fetch error:", err);
      toast.error("Could not load profile.");
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    return {
      points: profile?.total_points || 0,
      uploads: uploads.length,
      reviews: reviews.length,
    };
  }, [profile, uploads, reviews]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        Loading profile...
      </div>
    );
  }

  if (!session?.user?.id || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sign in to view your profile</h1>
          <p className="text-gray-600">Your points, uploads, and reviews are visible after login.</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Home
            </Link>
            <Link
              href="/explore"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Explore datasets
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Profile</p>
            <h1 className="text-3xl font-bold text-gray-900">
              {profile.full_name || "Anonymous"}
            </h1>
            <p className="text-gray-600">
              {profile.bio || "Add a short bio to share your background and interests."}
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-gray-600">
              <span className="inline-flex items-center gap-2">
                <User className="w-4 h-4" /> {profile.role || "Researcher"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Mail className="w-4 h-4" /> {profile.email}
              </span>
              {profile.institution && (
                <span className="inline-flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> {profile.institution}
                </span>
              )}
              {profile.country && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {profile.country}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
              Points: {stats.points.toLocaleString()}
            </span>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
              Wallet: {profile.wallet_address ? truncate(profile.wallet_address) : "Not connected"}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Points" value={stats.points.toLocaleString()} icon={<Star className="w-5 h-5" />} accent="from-blue-500 to-purple-500" />
          <StatCard label="Uploaded datasets" value={stats.uploads.toString()} icon={<Upload className="w-5 h-5" />} accent="from-emerald-500 to-teal-500" />
          <StatCard label="Reviews" value={stats.reviews.toString()} icon={<Users className="w-5 h-5" />} accent="from-amber-500 to-orange-500" />
        </div>

        {/* Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Recent uploads" actionLink="/datasets" emptyMessage="No uploads yet.">
            <div className="space-y-3">
              {uploads.map((ds) => (
                <div key={ds.id} className="flex items-start justify-between rounded-lg border border-gray-200 p-4 bg-white">
                  <div>
                    <p className="font-semibold text-gray-900">{ds.title}</p>
                    <p className="text-xs text-gray-500 mt-1">Status: {ds.status}</p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>{ds.download_count || 0} downloads</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recent reviews" actionLink="/reviews" emptyMessage="You have not reviewed datasets yet.">
            <div className="space-y-3">
              {reviews.map((rv) => (
                <div key={rv.id} className="flex items-start justify-between rounded-lg border border-gray-200 p-4 bg-white">
                  <div>
                    <p className="font-semibold text-gray-900">Dataset {truncate(rv.dataset_id)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {rv.is_approved === null ? "Pending" : rv.is_approved ? "Approved" : "Rejected"}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>{new Date(rv.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Social connections */}
        <Card title="Social connections" emptyMessage="No social accounts linked yet. Add Twitter, LinkedIn, or others to build trust.">
          <div className="flex flex-wrap gap-2">
            {socialConnections.map((conn) => (
              <span
                key={`${conn.platform}-${conn.platform_username}`}
                className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium inline-flex items-center gap-1"
              >
                <Link2 className="w-3 h-3" />
                {conn.platform}: {conn.platform_username}
              </span>
            ))}
          </div>
          {socialConnections.length === 0 && (
            <div className="text-sm text-gray-500 mt-3">
              Mutual connections and followers are coming soon. Link accounts to help others recognize you.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent} text-white flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function Card({
  title,
  actionLink,
  emptyMessage,
  children,
}: {
  title: string;
  actionLink?: string;
  emptyMessage?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {actionLink && (
          <Link href={actionLink} className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        )}
      </div>
      {Children.count(children) === 0 && emptyMessage ? (
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        children
      )}
    </div>
  );
}

const truncate = (value: string) => (value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value);

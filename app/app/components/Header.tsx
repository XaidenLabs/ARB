/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Menu, X, LogOut, Wallet, User, ChevronDown } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { createClient } from "@/lib/supabase";

const SignInModal = dynamic(
  () => import("./SignInModal").then((mod) => mod.SignInModal),
  { ssr: false },
);
const SignUpModal = dynamic(
  () => import("./SignUpModal").then((mod) => mod.SignUpModal),
  { ssr: false },
);
const ReviewInterface = dynamic(
  () => import("./ReviewInterface").then((mod) => mod.ReviewInterface),
  { ssr: false },
);
const UploadModal = dynamic(
  () => import("./UploadModal").then((mod) => mod.UploadModal),
  { ssr: false },
);

interface HeaderProps {
  onUploadClick?: () => void;
}

export function Header({ onUploadClick }: HeaderProps) {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [userPoints, setUserPoints] = useState<number>(0);
  const searchParams = useSearchParams();
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) return null;

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const router = useRouter(); // You need to import useRouter from "next/navigation"

  // Open modal based on URL query params
  // Open modal based on URL query params
  useEffect(() => {
    // Wait for auth check to complete
    if (status === "loading") return;

    if (session) {
      // If logged in, close modals just in case
      setIsSignInModalOpen(false);
      setIsSignUpModalOpen(false);

      // If logged in, ignore auth params and clean URL
      if (searchParams.get("auth") || searchParams.get("redirect")) {
        const newUrl = searchParams.get("redirect") || "/wallet";
        router.replace(newUrl);
      }
      return;
    }

    const authParam = searchParams.get("auth");
    if (authParam === "signin") setIsSignInModalOpen(true);
    if (authParam === "signup") setIsSignUpModalOpen(true);
  }, [searchParams, session, status, router]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Fetch total_points on mount or refresh
  useEffect(() => {
    if (session?.user?.id) fetchUserPoints();
  }, [session]);

  const fetchUserPoints = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("total_points")
        .eq("id", session?.user?.id)
        .single();
      if (!error && data?.total_points) setUserPoints(data.total_points);
    } catch (err) {
      console.warn("Failed to fetch user points:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase signOut error:", err);
    }
    window.location.reload();
  };

  const refreshUserData = async () => {
    try {
      await fetchUserPoints(); // ✅ refresh points
      const { data } = await supabase.auth.getSession();
      console.log("Refreshed supabase session:", data.session ?? null);
    } catch (err) {
      console.warn("Error refreshing user data:", err);
    }
  };

  const userInitial = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : "?";

  const computeLevelInfo = (points: number) => {
    if (points >= 5000) return { level: 4, label: "Lead", priority: "Highest" };
    if (points >= 2000) return { level: 3, label: "Trusted", priority: "High" };
    if (points >= 500) return { level: 2, label: "Contributor", priority: "Standard" };
    return { level: 1, label: "Explorer", priority: "Basic" };
  };

  const levelInfo = computeLevelInfo(userPoints || 0);
  const roleLabel =
    session?.user?.role === "reviewer"
      ? "Reviewer"
      : session?.user?.role === "admin"
        ? "Admin"
        : "Contributor";

  return (
    <>
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[95vw] lg:max-w-5xl">
        <div className="bg-[#0a0f1c]/60 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl px-4 sm:px-6 py-3 transition-all duration-300 hover:bg-[#0a0f1c]/80 hover:border-white/20">
          <div className="flex items-center justify-between gap-4 lg:gap-8 h-12">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2.5 hover:opacity-80 transition-opacity shrink-0"
            >
              <Image
                src="/logo.svg"
                alt="Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="text-lg lg:text-xl font-bold text-white hidden sm:block whitespace-nowrap">
                AFRICA RESEARCH BASE
              </span>
              <span className="text-xl font-bold text-white sm:hidden">
                ARB
              </span>
            </Link>

            {/* Navbar Links */}
            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2">
              {[
                { label: 'Discover', href: '/explore' },
                { label: 'Community', href: '/community' },
                ...(session ? [{ label: 'My Datasets', href: '/datasets' }] : []),
                { label: 'FAQ', href: '/faq' },
                { label: 'About Us', href: '/about' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 xl:px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 rounded-full transition-colors whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side controls */}
            <div className="flex items-center space-x-2 lg:space-x-3 shrink-0">
              {status === "loading" ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/10 rounded-full animate-pulse" />
                  <div className="w-20 h-8 bg-white/10 rounded animate-pulse hidden sm:block" />
                </div>
              ) : !session ? (
                <>
                  <button
                    onClick={() => setIsSignInModalOpen(true)}
                    className="px-3 lg:px-4 py-2 text-sm font-medium text-gray-200 hover:text-white transition-colors whitespace-nowrap"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => setIsSignUpModalOpen(true)}
                    className="hidden sm:flex px-4 lg:px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-full shadow-lg shadow-blue-500/20 transition-all hover:scale-105 whitespace-nowrap"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  {/* Upload button visible only when logged in */}
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="hidden sm:flex px-4 lg:px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-full shadow-lg shadow-amber-500/20 transition-all hover:scale-105 whitespace-nowrap"
                  >
                    Upload
                  </button>

                  {/* Profile Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen((s) => !s)}
                      className="flex items-center gap-3 bg-white/5 pl-2 pr-3 py-1.5 rounded-full border border-white/5 hover:bg-white/10 transition group"
                      aria-haspopup="true"
                      aria-expanded={isDropdownOpen}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-[#0a0f1c] group-hover:ring-blue-500/50 transition-all">
                        {userInitial}
                      </div>
                      <div className="text-left hidden lg:block">
                        <div className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors whitespace-nowrap">
                          {userPoints ?? 0} pts
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-all duration-200 ${isDropdownOpen ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    {/* Dropdown Menu - Dark Theme */}
                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-3 w-60 bg-[#0f1629] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-5 py-4 border-b border-white/5 bg-white/5">
                          <p className="text-sm font-semibold text-white">
                            {session.user?.name ?? "User"}
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {session.user?.email ?? ""}
                          </p>
                          <div className="mt-3 space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 text-blue-300 font-medium bg-blue-500/10 px-2 py-1 rounded-md w-fit">
                              <span>🌟</span> {userPoints ?? 0} pts • L{levelInfo.level}
                            </div>
                            <p className="text-gray-500 pl-1">
                              {roleLabel} • {levelInfo.priority}
                            </p>
                          </div>
                        </div>

                        <div className="p-2 space-y-1">
                          <Link
                            href="/profile"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                          >
                            <User className="w-4 h-4" /> <span>Profile</span>
                          </Link>

                          <Link
                            href="/wallet"
                            onClick={() => setIsDropdownOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                          >
                            <Wallet className="w-4 h-4" /> <span>Wallet</span>
                          </Link>
                        </div>

                        <div className="border-t border-white/5 p-2">
                          <button
                            onClick={handleSignOut}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                          >
                            <LogOut className="w-4 h-4" /> <span>Logout</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMenuOpen((s) => !s)}
                className="lg:hidden p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Content - Floating below */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-3 mx-4 p-2 bg-[#0a0f1c]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 origin-top">
            <nav className="flex flex-col space-y-1">
              {[
                { label: 'Discover', href: '/explore' },
                { label: 'Community', href: '/community' },
                ...(session ? [
                  { label: 'Upload', onClick: () => setIsUploadModalOpen(true) },
                  { label: 'My Datasets', href: '/datasets' },
                  { label: 'Wallet', href: '/wallet' }
                ] : []),
                { label: 'FAQ', href: '/faq' },
                { label: 'About Us', href: '/about' },
              ].map((item, idx) => (
                item.onClick ? (
                  <button
                    key={idx}
                    onClick={() => { item.onClick && item.onClick(); setIsMenuOpen(false); }}
                    className="text-left px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <Link
                    key={idx}
                    href={item.href || '#'}
                    onClick={() => setIsMenuOpen(false)}
                    className="px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    {item.label}
                  </Link>
                )
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Modals */}
      {isSignInModalOpen && (
        <SignInModal
          isOpen={isSignInModalOpen}
          onClose={() => setIsSignInModalOpen(false)}
          onSwitchToSignup={() => {
            setIsSignInModalOpen(false);
            setIsSignUpModalOpen(true);
          }}
          redirectUrl={searchParams.get("redirect") || undefined}
        />
      )}
      {isSignUpModalOpen && (
        <SignUpModal
          isOpen={isSignUpModalOpen}
          onClose={() => setIsSignUpModalOpen(false)}
          onSwitchToLogin={() => {
            setIsSignUpModalOpen(false);
            setIsSignInModalOpen(true);
          }}
        />
      )}
      {isReviewModalOpen && (
        <ReviewInterface
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
        />
      )}
      {isUploadModalOpen && (
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
        />
      )}
    </>
  );
}

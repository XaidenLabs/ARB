"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  X,
  LogOut,
  Wallet,
  User,
  ChevronDown,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { SignInModal } from "./SignInModal";
import { SignUpModal } from "./SignUpModal";
import { ReviewInterface } from "./ReviewInterface";
import { createClient } from "@/lib/supabase";
import { UploadModal } from "./UploadModal";
import { WalletModal } from "./WalletModal";

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
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

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
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-3 hover:opacity-80"
            >
              <Image
                src="/logo.svg"
                alt="Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                AFRICA RESEARCH BASE
              </span>
              <span className="text-xl font-bold text-gray-900 sm:hidden">
                ARB
              </span>
            </Link>

            {/* Navbar Links */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link href="/explore" className="text-gray-700 hover:text-blue-600">
                Discover
              </Link>
              <Link href="/community" className="text-gray-700 hover:text-blue-600">
                Community
              </Link>
              {session && (
                <Link href="/datasets" className="text-gray-700 hover:text-blue-600">
                  My Datasets
                </Link>
              )}
              <Link href="/faq" className="text-gray-700 hover:text-blue-600">
                FAQ
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600">
                About Us
              </Link>
            </nav>

            {/* Right side controls */}
            <div className="flex items-center space-x-4">
              {status === "loading" ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                  <div className="w-20 h-8 bg-gray-200 rounded animate-pulse hidden sm:block" />
                </div>
              ) : !session ? (
                <>
                  <button
                    onClick={() => setIsSignInModalOpen(true)}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => setIsSignUpModalOpen(true)}
                    className="hidden sm:flex px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  {/* Upload button visible only when logged in */}
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="hidden sm:flex px-4 py-2 bg-amber-600 text-white rounded-lg"
                  >
                    Upload
                  </button>

                  {/* Profile Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen((s) => !s)}
                      className="flex items-center gap-3 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 hover:bg-blue-100 transition"
                      aria-haspopup="true"
                      aria-expanded={isDropdownOpen}
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold">
                        {userInitial}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-blue-800">
                          {userPoints ?? 0} pts
                        </div>
                        <div className="text-[11px] text-blue-700">
                          {roleLabel} • L{levelInfo.level}
                        </div>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-blue-700 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900">
                            {session.user?.name ?? "User"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {session.user?.email ?? ""}
                          </p>
                          <div className="mt-2 space-y-1 text-xs">
                            <p className="text-blue-700 font-semibold">
                              🌟 {userPoints ?? 0} pts • Level {levelInfo.level} {levelInfo.label}
                            </p>
                            <p className="text-gray-600">
                              Role: {roleLabel} • Priority: {levelInfo.priority}
                            </p>
                          </div>
                        </div>

                        <Link
                          href="/profile"
                          onClick={() => setIsDropdownOpen(false)}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <User className="w-4 h-4" /> <span>Profile</span>
                        </Link>

                        <button
                          onClick={() => {
                            setIsWalletModalOpen(true);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Wallet className="w-4 h-4" /> <span>Wallet</span>
                        </button>

                        <div className="border-t border-gray-100" />

                        <button
                          onClick={handleSignOut}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" /> <span>Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMenuOpen((s) => !s)}
                className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-100">
              <div className="flex flex-col space-y-4 px-4">
                <Link href="/explore" className="text-gray-700 hover:text-blue-600">
                  Discover
                </Link>
                <Link href="/community" className="text-gray-700 hover:text-blue-600">
                  Community
                </Link>
                {session && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="text-left text-gray-700 hover:text-blue-600"
                  >
                    Upload
                  </button>
                )}
                {session && (
                  <Link href="/datasets" className="text-gray-700 hover:text-blue-600">
                    My Datasets
                  </Link>
                )}
                <Link href="/faq" className="text-gray-700 hover:text-blue-600">
                  FAQ
                </Link>
                <Link href="/about" className="text-gray-700 hover:text-blue-600">
                  About Us
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Modals */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
        onSwitchToSignup={() => {
          setIsSignInModalOpen(false);
          setIsSignUpModalOpen(true);
        }}
      />
      <SignUpModal
        isOpen={isSignUpModalOpen}
        onClose={() => setIsSignUpModalOpen(false)}
        onSwitchToLogin={() => {
          setIsSignUpModalOpen(false);
          setIsSignInModalOpen(true);
        }}
      />
      <ReviewInterface
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
      />
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </>
  );
}

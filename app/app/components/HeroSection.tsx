"use client"

import { useState } from 'react';
import { Upload, TrendingUp, Globe, Sparkles, ShieldCheck, Users, Rocket, ArrowRight, HeartHandshake } from 'lucide-react';

interface HeroSectionProps {
  onExploreClick: () => void;
  onJoinDaoClick?: () => void;
}

export function HeroSection({ onExploreClick, onJoinDaoClick }: HeroSectionProps) {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [email, setEmail] = useState('');
  const [isCardClicked, setIsCardClicked] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Save email to database
    console.log('Email signup:', email);
    setShowSignupModal(false);
    setEmail('');
    // After signup, trigger wallet connection
    onUploadClick();
  };

  const handleCardClick = () => {
    setIsCardClicked(true);
    setTimeout(() => setIsCardClicked(false), 300);
  };

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#0b1222] to-[#0d1a33] text-white">
        <div className="absolute inset-0">
          <div className="absolute -left-10 -top-10 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="absolute left-1/4 bottom-0 h-60 w-60 rounded-full bg-purple-500/20 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold border border-white/20">
                <Sparkles className="w-4 h-4 text-amber-300" /> Africa Research Base
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-white">
                  The command center for Africa&apos;s research, data, and funding
                </h1>
                <p className="text-lg text-gray-200 leading-relaxed">
                  Upload, verify, and monetize African datasets with transparent governance. Discover collaborators,
                  reviewers, and backers in one trusted hub.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onExploreClick}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 font-semibold shadow-lg shadow-blue-500/20 transition"
                >
                  Explore data <ArrowRight className="w-4 h-4" />
                </button>
                
                {onJoinDaoClick && (
                  <button
                    onClick={onJoinDaoClick}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/30 bg-white/5 hover:bg-white/10 font-semibold transition"
                  >
                    Join DAO <HeartHandshake className="w-4 h-4 text-amber-200" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-200">
                {[
                  { icon: ShieldCheck, label: "Verified datasets" },
                  { icon: TrendingUp, label: "Funding-ready" },
                  { icon: Users, label: "Review network" },
                  { icon: Globe, label: "Pan-African reach" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <Icon className="w-4 h-4 text-amber-200" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Content - Feature Card */}
            <div
              className={`relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 p-8 shadow-2xl text-white overflow-hidden ${isCardClicked ? 'scale-95 shadow-lg' : 'hover:shadow-3xl hover:scale-[1.02]'} transition`}
              onClick={handleCardClick}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-amber-500/5 to-blue-500/5 opacity-70" />
              <div className="relative space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-amber-200" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-200">Featured mission</p>
                    <p className="text-lg font-semibold text-white">Sovereign AI data vault</p>
                  </div>
                </div>

                {[
                  { icon: Upload, title: "Upload", desc: "Ship your dataset with on-chain provenance" },
                  { icon: TrendingUp, title: "Earn", desc: "Funding, points, and verification rewards" },
                  { icon: Globe, title: "Impact", desc: "Power local AI, policy, and innovation" },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 rounded-2xl bg-white/5 border border-white/10 p-4">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-amber-200" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{title}</p>
                      <p className="text-sm text-gray-200">{desc}</p>
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Datasets", value: "5.2k" },
                    { label: "Reviewers", value: "1.1k" },
                    { label: "Cities", value: "120+" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <p className="text-lg font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-gray-200">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Join Africa Research Base</h2>
            <p className="text-gray-600 mb-6">Enter your email to get started and connect your wallet.</p>

            <form onSubmit={handleSignup} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSignupModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
function onUploadClick() {
  // Simulate wallet connection or show a wallet connect modal
  // For now, just log to console
  console.log('Trigger wallet connection after signup');
  // You can integrate with a wallet provider here (e.g., MetaMask, WalletConnect)
}


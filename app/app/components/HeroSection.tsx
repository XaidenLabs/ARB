"use client"

import { useState } from 'react';
import { Upload, TrendingUp, Globe as GlobeIcon, Sparkles, ShieldCheck, Users, Rocket, ArrowRight, HeartHandshake } from 'lucide-react';
import { Globe } from './Globe';

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
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden bg-[#02050a] text-white pt-20 pb-16">
        {/* Cosmic Background Effects */}
        {/* Cosmic Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Noise Texture Overlay - Increased Visibility */}
          <div className="absolute inset-0 opacity-[0.20] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }}
          />

          {/* Stars - Increased Brightness */}
          <div className="absolute inset-0 animate-pulse-slow"
            style={{
              backgroundImage: 'radial-gradient(white 1.5px, transparent 1.5px)',
              backgroundSize: '40px 40px',
              opacity: 0.3
            }}
          />
          <div className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
              backgroundSize: '90px 90px',
              opacity: 0.25,
              backgroundPosition: '15px 15px'
            }}
          />

          {/* Central Cosmic Glow / Eclipse - INTENSIFIED */}
          <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[90vw] h-[50vh] bg-indigo-600/40 blur-[100px] rounded-[100%] mix-blend-screen" />
          <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[60vw] h-[30vh] bg-blue-500/30 blur-[60px] rounded-[100%] mix-blend-overlay" />

          {/* Planet Horizon Edge - Defined */}
          <div className="absolute -top-[60%] left-1/2 -translate-x-1/2 w-[180vw] h-[180vw] border border-blue-400/20 rounded-full blur-[1px] opacity-40 shadow-[0_0_100px_rgba(59,130,246,0.3)]" />

          {/* ROTATING GLOBE */}
          <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-60 mix-blend-screen grayscale">
            <Globe className="w-full h-full" />
          </div>

          {/* Gradient Mask for Globe */}
          <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-[#02050a] via-[#02050a]/90 to-transparent z-10" />

          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-purple-900/30 blur-[120px] rounded-full mix-blend-screen opacity-60" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center pt-16">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-medium text-gray-300 mb-8 animate-fade-in-up">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Africa Research Base</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-medium tracking-tight leading-[1.1] mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/70">
            The command center for <span className="italic text-blue-200 inline-block transition-all duration-300 hover:scale-110 hover:-rotate-2 hover:text-blue-300 hover:drop-shadow-[0_0_15px_rgba(147,197,253,0.5)] cursor-pointer">Africa&apos;s</span> research, data, and <span className="italic text-purple-200">funding</span>.
          </h1>

          {/* Description */}
          <p className="max-w-2xl text-lg md:text-xl text-gray-400 leading-relaxed mb-10">
            Upload, verify, and monetize African datasets with transparent governance. Discover collaborators,
            reviewers, and backers in one trusted hub.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-20">
            <button
              onClick={onExploreClick}
              className="group relative px-8 py-4 rounded-full bg-blue-600 font-semibold text-white shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_-10px_rgba(37,99,235,0.7)] transition-all duration-300 hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center gap-2">
                Explore data <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            {onJoinDaoClick && (
              <button
                onClick={onJoinDaoClick}
                className="px-8 py-4 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 font-medium text-gray-200 transition-all hover:border-white/20"
              >
                Join DAO
              </button>
            )}
          </div>

          {/* Bottom Stats / Feature Pill */}
          <div
            onClick={handleCardClick}
            className={`
              relative group cursor-pointer
              flex flex-col md:flex-row items-stretch md:items-center gap-6 
              p-2 md:pr-8 rounded-[2rem] 
              bg-[#0a0f1c]/80 backdrop-blur-xl border border-white/10 
              transition-all duration-500 ease-out
              ${isCardClicked ? 'scale-[0.98] ring-2 ring-blue-500/50' : 'hover:scale-[1.01] hover:border-white/20 hover:shadow-2xl hover:shadow-blue-900/10'}
            `}
          >
            {/* Featured Section */}
            <div className="flex items-center gap-4 bg-white/5 rounded-[1.5rem] p-4 border border-white/5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-blue-300" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Featured Mission</p>
                <p className="text-sm font-medium text-white">Sovereign AI data vault</p>
              </div>
            </div>

            {/* Separator (Hidden on mobile) */}
            <div className="hidden md:block w-px h-12 bg-white/10" />

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-8 px-4 md:px-0">
              {[
                { label: "Active Users", value: "5.2k" },
                { label: "Insights Delivered", value: "1.1k" },
                { label: "System Reliability", value: "99%" },
              ].map((stat) => (
                <div key={stat.label} className="text-center md:text-left space-y-1">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{stat.label}</p>
                  <p className="text-xl font-serif text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Glow Effect */}
            <div className="absolute -inset-px rounded-[2rem] bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </div>

          <div className="mt-8 flex items-center justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Brands / Partners Placeholders if needed, or keeping it clean as per design */}
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><ShieldCheck className="w-5 h-5" /> Lightspeed</div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Globe className="w-5 h-5" /> Chromainc</div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white"><Users className="w-5 h-5" /> Convergence</div>
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


"use client"

import Image from 'next/image';

export function SolutionSection() {
  return (
    <section className="relative py-24 overflow-hidden bg-[#02050a]">
      {/* Background Cosmic Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-500/5 rounded-[100%] blur-[120px]" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden group hover:border-blue-400/30 transition-colors duration-500 text-center">

            {/* Inner Glow/Highlight */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-semibold mb-8 uppercase tracking-wide">
                <span>The Solution</span>
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium text-white mb-8 leading-tight">
                An AI-powered African data repository with transparent <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">blockchain attribution</span>.
              </h2>

              <p className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto mb-10">
                Upload once, build reputation, collaborate, buy and sell data, share data as a service and stay discoverable forever.
              </p>

              {/* Mini Features/Badges */}
              <div className="flex flex-wrap justify-center gap-3">
                {['Build Reputation', 'Collaborate', 'Monetize', 'Share Data'].map((tag) => (
                  <span key={tag} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 backdrop-blur-sm">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
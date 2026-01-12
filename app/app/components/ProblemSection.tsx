"use client"

import Image from 'next/image';

export function ProblemSection() {
  return (
    <section className="relative py-24 overflow-hidden bg-[#02050a]">
      {/* Background Cosmic Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden group hover:border-white/20 transition-colors duration-500">
            {/* Inner Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-semibold mb-8 uppercase tracking-wide">
                <span>The Challenge</span>
              </div>

              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium text-white mb-8 leading-tight">
                Africa does not have a central <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-200 to-orange-200">home</span>  for its research data.
              </h2>

              <p className="text-lg sm:text-xl text-gray-300 leading-relaxed max-w-2xl mx-auto">
                Without a shared repository, researchers, innovators, and builders struggle to find reliable African data—wasting time recreating what already exists and relying on foreign sources that don’t reflect our realities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
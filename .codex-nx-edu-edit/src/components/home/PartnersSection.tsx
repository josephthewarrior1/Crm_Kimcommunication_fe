import React from "react";
import { Sparkles, ArrowUpRight } from "lucide-react";

const partnerTiers = [
  "Title Sponsor",
  "Platinum Sponsor",
  "Gold Sponsor",
  "Silver Sponsor",
  "Bronze Sponsor",
  "Strategic Partner",
  "Community Partner",
  "Media Partner"
];

export const PartnersSection: React.FC = () => {
  const triggerRegisterModal = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-register-modal"));
  };

  return (
    <section id="partners" className="relative py-20 md:py-32 bg-white text-[#0B1230] font-sans select-none border-t border-slate-200/80 overflow-hidden">
      
      {/* Subtle Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#0B1230 1px, transparent 1px), radial-gradient(#0B1230 1px, #FFFFFF 1px)`,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px'
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center">
        
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#008CFF] text-[11px] font-black tracking-widest uppercase mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
          <span>PARTNERSHIPS & SPONSORS</span>
        </div>

        {/* Headline */}
        <h2 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-[#0B1230] leading-tight tracking-tight max-w-4xl mx-auto mb-6">
          Bring your institution, brand, or industry into the room <br className="hidden sm:block" />
          <span className="text-[#008CFF]">where future education decisions are being shaped.</span>
        </h2>

        {/* Supporting Copy */}
        <p className="text-slate-600 text-xs sm:text-base font-semibold leading-relaxed max-w-2xl mx-auto mb-8">
          Partnership with nx:edu is not only about visibility. It is about relevance, trust, usefulness, and an active role in shaping future choices.
        </p>

        {/* Highlight Tagline Box */}
        <div className="max-w-md mx-auto rounded-full bg-[#0B1230] text-white py-3 px-6 text-sm font-black tracking-widest uppercase mb-10 shadow-lg border border-slate-800">
          ✨ Not a logo wall. A role in the room.
        </div>

        {/* Partner Tiers Chips */}
        <div className="flex flex-wrap justify-center gap-2.5 max-w-3xl mx-auto mb-10">
          {partnerTiers.map((tier) => (
            <span
              key={tier}
              className="px-4 py-2 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs shadow-2xs hover:bg-blue-50 hover:text-[#008CFF] hover:border-blue-200 transition-all"
            >
              {tier}
            </span>
          ))}
        </div>

        {/* Action CTA Button */}
        <div className="flex justify-center">
          <button
            onClick={triggerRegisterModal}
            className="rounded-full bg-[#008CFF] hover:bg-blue-600 text-white font-extrabold text-xs px-9 py-4 uppercase tracking-wider transition-all cursor-pointer shadow-xl active:scale-95 inline-flex items-center gap-2"
          >
            <span>Become a Partner</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </section>
  );
};

export default PartnersSection;

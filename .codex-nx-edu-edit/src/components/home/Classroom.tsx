import React from "react";
import { Sparkles, ArrowUpRight } from "lucide-react";

export const Classroom: React.FC = () => {
  const handleExplorePrograms = (e: React.MouseEvent) => {
    e.preventDefault();
    document.querySelector("#programs")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="new-classroom" className="relative py-16 md:py-24 bg-[#050C24] text-white font-sans select-none border-t border-slate-800 overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#008CFF]/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10 text-center space-y-6">
        
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#008CFF] text-[11px] font-black tracking-widest uppercase shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
          <span>THE IDEA BEHIND NX:EDU</span>
        </div>

        {/* Headline */}
        <h2 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-white leading-tight tracking-tight max-w-4xl mx-auto">
          The new classroom is <span className="text-[#008CFF]">not a room.</span>
        </h2>

        {/* Supporting Copy */}
        <p className="text-slate-300 text-xs sm:text-base md:text-lg font-medium leading-relaxed max-w-3xl mx-auto pt-2">
          It is a conversation between students, parents, teachers, universities, companies, policymakers, creators, communities, and technologies. At nx:edu, that conversation becomes a real experience.
        </p>

        {/* Action Button */}
        <div className="pt-2 flex justify-center">
          <button
            onClick={handleExplorePrograms}
            className="rounded-full bg-[#008CFF] hover:bg-blue-600 text-white font-extrabold text-xs px-8 py-3.5 uppercase tracking-wider transition-all cursor-pointer shadow-xl active:scale-95 inline-flex items-center gap-2"
          >
            <span>Explore the Programs</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </section>
  );
};

export default Classroom;

import React from "react";
import { Sparkles, ArrowUpRight } from "lucide-react";

const insightCategories = [
  "Future Careers",
  "Parent Guides",
  "Education Trends",
  "AI in Education",
  "EdTech",
  "Gaming & Esports Careers",
  "Education Financing",
  "Industry Explainers",
  "Interviews",
  "Media Releases"
];

const sampleArticles = [
  {
    title: "Navigating AI & Human Skills in Next-Gen Careers",
    cat: "Future Careers",
    date: "July 2026",
    img: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "How Families Can Guide Education Decisions Without Anxiety",
    cat: "Parent Guides",
    date: "July 2026",
    img: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "The Real Careers Behind Gaming, Content & Production",
    cat: "Gaming & Esports",
    date: "July 2026",
    img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop"
  }
];

export const InsightsSection: React.FC = () => {
  const triggerRegisterModal = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-register-modal"));
  };

  return (
    <section id="insights" className="relative py-20 md:py-32 bg-[#F8FAFC] text-[#0B1230] font-sans select-none border-t border-slate-200/80 overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-3xl text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#008CFF] text-[11px] font-black tracking-widest uppercase mb-4 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>INSIGHTS & PERSPECTIVES</span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-[#0B1230] leading-[1.05] tracking-tight">
              Ideas for the <br />
              <span className="text-[#008CFF]">new classroom.</span>
            </h2>
          </div>

          <div className="max-w-md text-left lg:text-right">
            <p className="text-slate-600 text-xs sm:text-sm font-semibold leading-relaxed">
              Explore Articles, Interviews, Parent Guides, and Industry Explainers designed to make education trends visible and useful.
            </p>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-10">
          {insightCategories.map((cat) => (
            <span
              key={cat}
              className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs hover:border-[#008CFF] hover:text-[#008CFF] cursor-pointer transition-all"
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Article Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12">
          {sampleArticles.map((art, idx) => (
            <div
              key={idx}
              className="group rounded-[28px] bg-white border border-slate-200/90 p-5 shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between text-left cursor-pointer hover:-translate-y-1.5"
            >
              <div className="space-y-4">
                <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-slate-100 relative">
                  <img
                    src={art.img}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-[#0B1230]/90 backdrop-blur-md text-white text-[10px] font-black uppercase px-3 py-1 rounded-full border border-white/20">
                    {art.cat}
                  </span>
                </div>

                <h3 className="font-display font-black text-lg sm:text-xl text-[#0B1230] group-hover:text-[#008CFF] transition-colors leading-snug">
                  {art.title}
                </h3>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-slate-400">
                <span>{art.date}</span>
                <span className="text-[#008CFF] group-hover:translate-x-1 transition-transform">Read Article →</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="flex justify-center">
          <button
            onClick={triggerRegisterModal}
            className="rounded-full bg-[#008CFF] hover:bg-blue-600 text-white font-extrabold text-xs px-9 py-4 uppercase tracking-wider transition-all cursor-pointer shadow-xl active:scale-95 inline-flex items-center gap-2"
          >
            <span>Read Insights</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </section>
  );
};

export default InsightsSection;

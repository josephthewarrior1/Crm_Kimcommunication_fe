import React from "react";
import { Sparkles, ArrowUpRight, Target } from "lucide-react";

interface BentoCardItem {
  num: string;
  tag: string;
  title: string;
  desc: string;
  img: string;
  bgTint: string;
  borderColor: string;
  tagColor: string;
  cornerArcColor: string;
  topRightIcon: React.ReactNode;
  verticalOffset: string;
}

const bentoCardsExact: BentoCardItem[] = [
  {
    num: "01",
    tag: "FOR STUDENTS",
    title: "See more than one straight road.",
    desc: "Meet people, fields, and possibilities before you have to decide.",
    img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=800&auto=format&fit=crop",
    bgTint: "bg-[#FFFFFF]",
    borderColor: "border-[#008CFF]/30 hover:border-[#008CFF]",
    tagColor: "text-[#008CFF]",
    cornerArcColor: "border-[#008CFF]/20 bg-[#008CFF]/5",
    topRightIcon: <ArrowUpRight className="w-4 h-4 text-[#FF7A00]" />,
    verticalOffset: "lg:-translate-y-6"
  },
  {
    num: "02",
    tag: "FOR FAMILIES",
    title: "Make bigger choices with clearer context.",
    desc: "Turn uncertainty into conversations you can have together.",
    img: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop",
    bgTint: "bg-[#FFF6EC]",
    borderColor: "border-[#FF7A00]/30 hover:border-[#FF7A00]",
    tagColor: "text-[#008CFF]",
    cornerArcColor: "border-[#FF7A00]/30 bg-[#FF7A00]/10",
    topRightIcon: <Target className="w-4 h-4 text-[#FF7A00]" />,
    verticalOffset: "lg:translate-y-6"
  },
  {
    num: "03",
    tag: "FOR THE ECOSYSTEM",
    title: "Turn future change into shared action.",
    desc: "Bring education, work, culture, and technology into the same room.",
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop",
    bgTint: "bg-[#EEF4FE]",
    borderColor: "border-[#008CFF]/30 hover:border-[#008CFF]",
    tagColor: "text-[#008CFF]",
    cornerArcColor: "border-[#008CFF]/20 bg-[#008CFF]/10",
    topRightIcon: <Sparkles className="w-4 h-4 text-[#FF7A00]" />,
    verticalOffset: "lg:translate-y-1"
  }
];

export const About: React.FC = () => {
  const handleScrollToNext = (e: React.MouseEvent) => {
    e.preventDefault();
    document.querySelector("#new-classroom")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section id="about" className="relative py-20 md:py-32 bg-[#F8FAFC] text-[#0B1230] font-sans select-none border-t border-slate-200/80 overflow-hidden">
      
      {/* Background Subtle Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#0B1230 1px, transparent 1px), radial-gradient(#0B1230 1px, #FFFFFF 1px)`,
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0, 12px 12px'
        }}
      />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-16 lg:mb-20">
          <div className="max-w-3xl text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#008CFF] text-[11px] font-black tracking-widest uppercase mb-4 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>WHY NOW</span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-[#0B1230] leading-[1.05] tracking-tight">
              The world is changing faster <br />
              <span className="text-[#008CFF]">than education decisions are being made.</span>
            </h2>
          </div>

          <div className="max-w-lg text-left lg:text-right">
            <p className="text-slate-600 text-xs sm:text-sm font-semibold leading-relaxed">
              The future is arriving faster than most education decisions are made. Students are choosing paths in a world where industries change quickly, careers are no longer linear, and skills are shaped by technology, creativity, culture, and human judgment. nx:edu exists to make those changes visible, discussable, and useful.
            </p>
          </div>
        </div>

        {/* Staggered Landscape Bento Cards with Photography Container */}
        <div className="relative pt-4 pb-4">
          
          {/* Dashed Horizontal Connecting Line Behind Cards */}
          <div className="hidden lg:block absolute top-1/2 left-4 right-4 -translate-y-1/2 border-t-2 border-dashed border-blue-200/60 pointer-events-none z-0" />

          {/* 3 Landscape Bento Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative z-10 items-center">
            {bentoCardsExact.map((card) => (
              <div
                key={card.num}
                onClick={handleScrollToNext}
                className={`group relative rounded-[28px] sm:rounded-[32px] ${card.bgTint} border ${card.borderColor} p-6 sm:p-7 text-left transition-all duration-500 hover:-translate-y-4 shadow-xl shadow-slate-300/30 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[300px] sm:min-h-[320px] ${card.verticalOffset}`}
              >
                {/* Bottom Right Corner Arc Element */}
                <div className={`absolute -bottom-7 -right-7 w-24 h-24 rounded-full border-2 ${card.cornerArcColor} pointer-events-none transition-transform group-hover:scale-110`} />

                {/* Top Bar: Number Circle Pill (01, 02, 03) + Top Right Icon */}
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-[#0B1230] text-white flex items-center justify-center font-mono font-black text-xs shadow-md">
                    {card.num}
                  </div>

                  <div className="w-7 h-7 flex items-center justify-center">
                    {card.topRightIcon}
                  </div>
                </div>

                {/* Embedded Photography Image Container */}
                <div className="w-full h-28 sm:h-32 rounded-2xl overflow-hidden border border-white/80 shadow-sm relative my-2 z-10">
                  <img
                    src={card.img}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1230]/40 to-transparent opacity-50" />
                </div>

                {/* Bottom Content Area */}
                <div className="space-y-1.5 pt-1 relative z-10">
                  {/* Category Tag */}
                  <div className={`text-[10px] font-black tracking-widest uppercase ${card.tagColor}`}>
                    {card.tag}
                  </div>

                  {/* Title */}
                  <h3 className="font-display font-black text-lg sm:text-xl text-[#0B1230] group-hover:text-[#008CFF] transition-colors leading-[1.18]">
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-500 text-xs font-semibold leading-relaxed line-clamp-2">
                    {card.desc}
                  </p>
                </div>

              </div>
            ))}
          </div>

        </div>

        {/* Bottom CTA Button */}
        <div className="flex justify-center mt-14 sm:mt-18">
          <button
            onClick={handleScrollToNext}
            className="rounded-full bg-[#008CFF] hover:bg-blue-600 text-white font-extrabold text-xs px-9 py-4 uppercase tracking-wider transition-all cursor-pointer shadow-xl active:scale-95 inline-flex items-center gap-2"
          >
            <span>Discover the New Classroom</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </section>
  );
};

export default About;

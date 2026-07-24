import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, CheckCircle2, Sparkles, X, ChevronRight } from "lucide-react";

interface RolePerspectiveItem {
  id: string;
  num: string;
  roleShort: string;
  roleFull: string;
  title: string;
  desc: string;
  color: string;
  img: string;
  badgeBg: string;
  highlights: string[];
}

const rolePerspectives: RolePerspectiveItem[] = [
  {
    id: "students",
    num: "01",
    roleShort: "Students & Young Talent",
    roleFull: "STUDENTS & YOUNG TALENT",
    title: "There is more after school than one straight road.",
    desc: "Discover 30+ emerging industries, tech skills, creative communities, and career possibilities before making choices that shape your future.",
    color: "#008CFF",
    badgeBg: "bg-[#008CFF]",
    img: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop",
    highlights: [
      "Uncover 30+ emerging career sectors & tech roles",
      "Hands-on AI, EdTech & Gaming experience arenas",
      "Direct mentorship from top industry leaders"
    ]
  },
  {
    id: "parents",
    num: "02",
    roleShort: "Parents & Families",
    roleFull: "PARENTS & FAMILIES",
    title: "Make future decisions with clarity and confidence.",
    desc: "Financial planning, university roadmaps, and actionable guidance for navigating tomorrow's job market alongside your children.",
    color: "#FF7A00",
    badgeBg: "bg-[#FF7A00]",
    img: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1200&auto=format&fit=crop",
    highlights: [
      "Parent Planning Hub: financial & university roadmap",
      "Understand AI impact on future job stability",
      "Expert guidance on youth wellbeing & direction"
    ]
  },
  {
    id: "schools",
    num: "03",
    roleShort: "Schools & Universities",
    roleFull: "SCHOOLS & UNIVERSITIES",
    title: "Showcase progress and lead modern learning.",
    desc: "Connect institutional achievements directly with real-world industry transformation and prospective student recruitment.",
    color: "#2F5BDA",
    badgeBg: "bg-[#2F5BDA]",
    img: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop",
    highlights: [
      "Showcase university & school innovations",
      "Connect with global EdTech & industry leaders",
      "Direct engagement with prospective students"
    ]
  },
  {
    id: "educators",
    num: "04",
    roleShort: "Educators & Policy",
    roleFull: "EDUCATORS & POLICY LEADERS",
    title: "Bridge classroom learning with real-world relevance.",
    desc: "Co-create education policy, adopt modern EdTech tools, and develop future-ready learning frameworks across sectors.",
    color: "#00A3FF",
    badgeBg: "bg-sky-500",
    img: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop",
    highlights: [
      "Network with 2,500+ education stakeholders",
      "Discover modern EdTech tools for classrooms",
      "Co-create future-focused teaching methodologies"
    ]
  },
  {
    id: "industry",
    num: "05",
    roleShort: "Industry & Employers",
    roleFull: "INDUSTRY & EMPLOYERS",
    title: "Inspire the talent entering your sector.",
    desc: "Help future talent understand the roles, skills, and opportunities inside your sector long before graduation day.",
    color: "#10B981",
    badgeBg: "bg-emerald-600",
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1200&auto=format&fit=crop",
    highlights: [
      "Build brand relevance with next-gen talent",
      "Host keynotes & interactive experience booths",
      "Build early pipeline for high-demand skills"
    ]
  },
  {
    id: "tech",
    num: "06",
    roleShort: "Technology & EdTech",
    roleFull: "TECHNOLOGY & EDTECH",
    title: "Demonstrate tools where learning happens.",
    desc: "Put AI, digital learning tools, interactive software, and hardware in the hands of active educators and students.",
    color: "#6366F1",
    badgeBg: "bg-indigo-600",
    img: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop",
    highlights: [
      "Live interactive demonstration labs",
      "Direct feedback from schools, teachers & students",
      "B2B & B2C EdTech partnership opportunities"
    ]
  },
  {
    id: "finance",
    num: "07",
    roleShort: "Financial Institutions",
    roleFull: "FINANCIAL INSTITUTIONS",
    title: "Power the investments behind education.",
    desc: "Empower families and institutions with sustainable tuition planning, education financing, loans, and financial literacy.",
    color: "#F59E0B",
    badgeBg: "bg-amber-600",
    img: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=1200&auto=format&fit=crop",
    highlights: [
      "Connect directly with families investing in education",
      "Introduce scholarship & student loan products",
      "Lead financial literacy workshops"
    ]
  },
  {
    id: "media",
    num: "08",
    roleShort: "Communities & Media",
    roleFull: "COMMUNITIES & MEDIA",
    title: "Amplify conversations that move learning forward.",
    desc: "Engage youth culture, creative media, gaming arenas, and community movements with real social impact.",
    color: "#EC4899",
    badgeBg: "bg-pink-600",
    img: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop",
    highlights: [
      "Omnichannel media coverage & PR amplification",
      "Co-host gaming, creative & community stages",
      "Drive conversations across youth platforms"
    ]
  },
  {
    id: "partners",
    num: "09",
    roleShort: "Sponsors & Partners",
    roleFull: "SPONSORS & STRATEGIC PARTNERS",
    title: "Not a logo wall. A role in the room.",
    desc: "Build strategic relevance inside an ecosystem shaping education choices, youth aspiration, and future talent.",
    color: "#8B5CF6",
    badgeBg: "bg-purple-600",
    img: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1200&auto=format&fit=crop",
    highlights: [
      "Custom co-branded experience arenas & zones",
      "High-level networking lounge & VIP access",
      "Long-term ecosystem engagement after event"
    ]
  }
];

export const ForYouOrbit: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [modalDetail, setModalDetail] = useState<RolePerspectiveItem | null>(null);

  const activeRole = rolePerspectives[activeIdx];

  const triggerRegisterModal = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-register-modal"));
  };

  return (
    <section id="foryou-orbit" className="relative py-20 md:py-32 bg-[#050C24] text-white font-sans select-none border-t border-slate-800/80 overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-[#008CFF]/10 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 lg:mb-14">
          <div className="max-w-3xl text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#008CFF] text-[11px] font-black tracking-widest uppercase mb-4 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>NINE CONNECTED PERSPECTIVES</span>
            </div>
            
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-white leading-[1.05] tracking-tight">
              Nine questions. <br />
              <span className="text-[#008CFF]">One connected future.</span>
            </h2>
          </div>

          <div className="max-w-md text-left lg:text-right">
            <p className="text-slate-300 text-xs sm:text-sm font-semibold leading-relaxed">
              Choose the perspective that matters to you. Each path reveals a different way to take part in nx:edu.
            </p>
          </div>
        </div>

        {/* 2-Column Clean Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* Column 1 (Left): Clean Role List (No SELECT PERSPECTIVE Header & No Numbers) */}
          <div className="lg:col-span-5 h-[480px] sm:h-[520px] rounded-[32px] bg-[#081230] border border-slate-700/60 p-4 sm:p-5 flex flex-col justify-between shadow-2xl overflow-hidden">
            
            {/* 9 Stacked Clean Interactive Role Pills */}
            <div className="flex-1 overflow-y-auto space-y-2 py-1 pr-1 no-scrollbar">
              {rolePerspectives.map((item, idx) => {
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveIdx(idx)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all duration-300 cursor-pointer flex items-center justify-between border ${
                      isActive
                        ? "bg-[#008CFF] border-[#008CFF] text-white shadow-lg shadow-blue-500/25 scale-[1.01]"
                        : "bg-[#0B173B]/80 hover:bg-[#0E1F4B] border-slate-800/80 text-slate-300 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Photo Thumbnail */}
                      <img
                        src={item.img}
                        alt={item.roleShort}
                        className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/20"
                      />

                      <span className="text-xs sm:text-sm font-extrabold truncate">
                        {item.roleShort}
                      </span>
                    </div>

                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isActive ? "text-white translate-x-0.5" : "text-slate-500 opacity-60"}`} />
                  </button>
                );
              })}
            </div>

          </div>

          {/* Column 2 (Right): Dynamic High-Impact Detail Card */}
          <div className="lg:col-span-7 relative h-[480px] sm:h-[520px] rounded-[32px] bg-[#081230] border border-slate-700/60 p-7 sm:p-10 flex flex-col justify-between shadow-2xl text-left overflow-hidden">
            
            {/* Dynamic Photo Background */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeRole.id}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 z-0 bg-cover bg-center filter brightness-[0.72]"
                style={{ backgroundImage: `url(${activeRole.img})` }}
              />
            </AnimatePresence>

            {/* Dark Vignette Mask */}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#050C24] via-[#050C24]/75 to-[#050C24]/30" />

            {/* Top Role Badge (No Numbers) */}
            <div className="relative z-20 flex items-center justify-between">
              <span className={`text-[11px] font-black tracking-widest uppercase text-white px-4 py-1.5 rounded-full ${activeRole.badgeBg} shadow-md`}>
                {activeRole.roleFull}
              </span>
            </div>

            {/* Main Content */}
            <div className="relative z-20 mt-6 space-y-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeRole.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35 }}
                  className="space-y-4"
                >
                  <h3 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-white leading-tight">
                    {activeRole.title}
                  </h3>

                  <p className="text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                    {activeRole.desc}
                  </p>

                  {/* Highlights Bullet List */}
                  <div className="pt-2 space-y-2">
                    {activeRole.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-sky-200">
                        <CheckCircle2 className="w-4 h-4 text-[#008CFF] shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Action CTA */}
            <div className="relative z-20 pt-6 border-t border-white/20 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => setModalDetail(activeRole)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95"
              >
                <span>IN-PAGE BREAKDOWN</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>

              <button
                onClick={triggerRegisterModal}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#008CFF] hover:bg-blue-600 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <span>REGISTER INTEREST</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Floating In-Page Detail Modal */}
      <AnimatePresence>
        {modalDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#081230] border border-slate-700/80 rounded-[32px] p-6 sm:p-10 shadow-2xl text-white text-left no-scrollbar"
            >
              {/* Close Button */}
              <button
                onClick={() => setModalDetail(null)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-4">
                <span 
                  className="w-8 h-8 rounded-full flex items-center justify-center font-mono font-black text-xs text-white"
                  style={{ backgroundColor: modalDetail.color }}
                >
                  {modalDetail.num}
                </span>

                <span className="text-xs font-black tracking-widest uppercase text-slate-300">
                  {modalDetail.roleFull}
                </span>
              </div>

              <h2 className="font-display font-black text-2xl sm:text-4xl text-white leading-tight mb-4">
                {modalDetail.title}
              </h2>

              <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed mb-6 border-b border-slate-700/60 pb-6">
                {modalDetail.desc}
              </p>

              {/* Highlights */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-[#008CFF] uppercase tracking-wider">
                  Key Pathway Highlights
                </h4>

                <div className="space-y-2.5">
                  {modalDetail.highlights.map((h, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-white/5 border border-slate-700/60 flex items-start gap-3 text-xs sm:text-sm font-medium text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-[#FF7A00] shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Bottom CTA */}
              <div className="pt-8 mt-6 border-t border-slate-700/60 flex items-center justify-between">
                <button
                  onClick={() => setModalDetail(null)}
                  className="text-xs font-black uppercase text-slate-400 hover:text-white cursor-pointer"
                >
                  Close Window
                </button>

                <button
                  onClick={(e) => {
                    setModalDetail(null);
                    triggerRegisterModal(e);
                  }}
                  className="px-7 py-3 rounded-full bg-[#008CFF] hover:bg-blue-600 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 inline-flex items-center gap-2"
                >
                  <span>Register Interest</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
};

export default ForYouOrbit;

import React from "react";
import { Sparkles } from "lucide-react";

interface ProgramItem {
  img: string;
  t: string;
  d: string;
  badgeBg: string;
}

const mainProgramsList: ProgramItem[] = [
  {
    t: "nx:edu Summit",
    d: "A flagship forum for education leaders, policymakers, institutions, industry, technology, finance, and communities.",
    badgeBg: "bg-emerald-600",
    img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=800&auto=format&fit=crop"
  },
  {
    t: "Future Careers Forum",
    d: "A signature forum opening students & parents to emerging industries—AI, gaming, esports, media & digital business.",
    badgeBg: "bg-[#2F5BDA]",
    img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop"
  },
  {
    t: "Parent Planning Hub",
    d: "A practical space for families to explore education pathways, financial planning, talent mapping, and career decisions.",
    badgeBg: "bg-[#FF7A00]",
    img: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop"
  },
  {
    t: "AI & EdTech Experience",
    d: "Hands-on exposure to tools, platforms, and technologies changing how people learn, create, teach, and work.",
    badgeBg: "bg-[#008CFF]",
    img: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800&auto=format&fit=crop"
  },
  {
    t: "University & School Showcase",
    d: "A stage for institutions to present degree programs, scholarships, achievements, and future-oriented learning.",
    badgeBg: "bg-indigo-600",
    img: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop"
  },
  {
    t: "Gaming & Esports Arena",
    d: "A window into youth industry showing careers in content, production, law, business, marketing, and analysis.",
    badgeBg: "bg-purple-600",
    img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop"
  }
];

export const Programs: React.FC = () => {
  const triggerRegisterModal = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-register-modal"));
  };

  return (
    <section id="programs" className="relative py-20 md:py-32 bg-[#04091A] text-white font-sans border-t border-slate-800 select-none overflow-hidden">
      
      <style>{`
        .riot-card {
          position: relative;
          flex: 0 0 285px;
          height: 420px;
          border-radius: 24px;
          overflow: hidden;
          scroll-snap-align: start;
          transform: skewX(-6deg);
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s, border-color 0.4s;
          border: 2px solid rgba(0, 140, 255, 0.15);
          box-shadow: 0 10px 30px rgba(11, 18, 48, 0.2);
          cursor: pointer;
          background: #0B1230;
        }
        .riot-card:hover {
          transform: translateY(-8px) skewX(-6deg) scale(1.02);
          border-color: #008CFF;
          box-shadow: 0 20px 40px rgba(0, 140, 255, 0.25);
        }
        .riot-card-inner {
          width: 100%;
          height: 100%;
          position: relative;
          transform: skewX(6deg) scale(1.22);
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .riot-card:hover .riot-card-inner {
          transform: skewX(6deg) scale(1.26);
        }
        .riot-cover {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .riot-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .riot-grad {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(4, 9, 26, 0.95) 18%, rgba(4, 9, 26, 0.35) 55%, transparent 100%);
        }
        .riot-body {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 24px 20px 68px;
          color: #fff;
          z-index: 10;
        }
        .riot-arrow {
          position: absolute;
          bottom: 20px;
          right: 20px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #fff;
          color: #0B1230;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          border: none;
          z-index: 20;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s, background 0.3s, color 0.3s;
          cursor: pointer;
        }
        .riot-card:hover .riot-arrow {
          background: #008CFF;
          color: #fff;
          transform: scale(1.1);
        }
        .exprow-slanted {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          width: 100vw;
          margin-left: calc(50% - 50vw);
          padding: 24px 0 16px 0;
          position: relative;
        }
        .ticker-track {
          display: flex;
          gap: 22px;
          width: max-content;
          padding: 0 26px;
        }
        @media (max-width: 640px) {
          .exprow-slanted {
            overflow-x: auto !important;
            scroll-snap-type: x mandatory;
            padding: 24px 0 16px;
            width: 100vw;
            margin-left: calc(50% - 50vw);
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }
          .ticker-track {
            gap: 16px !important;
            padding-left: 26px;
            padding-right: 26px;
          }
          .riot-card {
            scroll-snap-align: start;
            flex: 0 0 220px;
            height: 330px;
            border-radius: 18px;
          }
        }
      `}</style>

      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-[#008CFF]/10 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        
        {/* Header Section (Matching Excel Blueprint 100%) */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="max-w-3xl text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#008CFF] text-[11px] font-black tracking-widest uppercase mb-4 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#FF7A00]" />
              <span>OUR PROGRAMS</span>
            </div>

            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-white leading-[1.05] tracking-tight">
              Step inside the <br />
              <span className="text-[#008CFF]">nx:edu platform.</span>
            </h2>
          </div>

          <div className="max-w-md text-left lg:text-right">
            <p className="text-slate-300 text-xs sm:text-sm font-semibold leading-relaxed">
              The New Classroom is the idea. These are the forums, showcases, planning spaces, and hands-on experiences that bring it to life.
            </p>
          </div>
        </div>

        {/* Slanted Visual Image Cards Track */}
        <div className="exprow-slanted">
          <div className="ticker-track">
            {mainProgramsList.map((prog) => (
              <div key={prog.t} className="riot-card" onClick={triggerRegisterModal}>
                <div className="riot-card-inner">
                  <div className="riot-cover">
                    <img loading="lazy" alt={prog.t} src={prog.img} />
                  </div>
                  <div className="riot-grad" />
                  <div className="riot-body text-left">
                    <div className="disp font-display font-black text-xl sm:text-2xl text-white leading-tight mb-2">
                      {prog.t}
                    </div>
                    <p className="text-xs font-semibold text-slate-200 opacity-90 leading-relaxed">
                      {prog.d}
                    </p>
                  </div>
                  <button onClick={triggerRegisterModal} className="riot-arrow" aria-label={`Explore ${prog.t}`}>
                    ↗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </section>
  );
};

export default Programs;

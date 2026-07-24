import React, { useState, useEffect } from "react";
import Hero from "../components/hero/Hero";
import About from "../components/home/About";
import Stats from "../components/home/Stats";
import Classroom from "../components/home/Classroom";
import WhatIsNxEdu from "../components/home/WhatIsNxEdu";
import ForYouOrbit from "../components/home/ForYouOrbit";
import Programs from "../components/home/Programs";
import FeaturedStatement from "../components/home/FeaturedStatement";
import NusantaraPlayground from "../components/home/NusantaraPlayground";
import PartnersSection from "../components/home/PartnersSection";
import InsightsSection from "../components/home/InsightsSection";
import FinalCTA from "../components/home/FinalCTA";
import Voices from "../components/home/Voices";
import Awards from "../components/home/Awards";
import Toast from "../components/common/Toast";
import Confetti from "../components/common/Confetti";
import Footer from "../components/Footer";
import { X, CheckCircle2, ArrowRight } from "lucide-react";

export const Home: React.FC = () => {
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [triggerConfetti, setTriggerConfetti] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setToastMsg(customEvent.detail || "Success!");
    };
    const handleConfetti = () => {
      setTriggerConfetti(true);
      setTimeout(() => setTriggerConfetti(false), 3000);
    };
    const handleOpenRegister = () => {
      setIsRegisterOpen(true);
    };

    window.addEventListener("trigger-toast", handleToast);
    window.addEventListener("trigger-confetti", handleConfetti);
    window.addEventListener("open-register-modal", handleOpenRegister);

    return () => {
      window.removeEventListener("trigger-toast", handleToast);
      window.removeEventListener("trigger-confetti", handleConfetti);
      window.removeEventListener("open-register-modal", handleOpenRegister);
    };
  }, []);

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    window.dispatchEvent(new CustomEvent("trigger-confetti"));
    setTimeout(() => {
      setIsRegisterOpen(false);
      setFormSubmitted(false);
      window.dispatchEvent(
        new CustomEvent("trigger-toast", {
          detail: "🎉 Registration successful! Check your inbox soon."
        })
      );
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans overflow-x-hidden">
      
      {/* Toast Notification Container */}
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
      
      {/* Confetti Explosion Component */}
      {triggerConfetti && <Confetti />}

      {/* Homepage narrative: context → concept → platform → audience → programs */}
      <Hero />
      <Stats />
      <About />
      <Classroom />
      <WhatIsNxEdu />
      <ForYouOrbit />
      <Programs />
      <FeaturedStatement />
      <NusantaraPlayground />
      <Voices />
      <Awards />
      <PartnersSection />
      <InsightsSection />
      <FinalCTA />
      
      <Footer />

      {/* Backdrop Modal for Registration Form */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#070F2B] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-white text-left overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => setIsRegisterOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {!formSubmitted ? (
              <>
                <div className="mb-6">
                  <div className="inline-block px-3 py-1 bg-blue-500/20 text-[#008CFF] text-[11px] font-extrabold tracking-wider rounded-full uppercase mb-2">
                    EXPRESS INTEREST
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-display font-black text-white">
                    Register Interest for nx:edu
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1">
                    Be the first to access summit passes, forum updates, and partnership details.
                  </p>
                </div>

                <form onSubmit={handleModalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Alex Morgan"
                      className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#008CFF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
                    <input
                      required
                      type="email"
                      placeholder="alex@example.com"
                      className="w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#008CFF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">I am attending as...</label>
                    <select
                      className="w-full bg-[#0E1B4D] border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#008CFF]"
                    >
                      <option value="student">Student / Young Talent</option>
                      <option value="parent">Parent / Family</option>
                      <option value="educator">Educator / Institution Leader</option>
                      <option value="industry">Industry Professional / Employer</option>
                      <option value="partner">Potential Sponsor / Partner</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 bg-[#008CFF] hover:bg-blue-600 text-white font-extrabold text-sm py-3.5 rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    <span>Submit Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h4 className="text-2xl font-black text-white">Interest Registered!</h4>
                <p className="text-slate-300 text-sm max-w-sm mx-auto">
                  Thank you! We've recorded your interest and will reach out with exclusive invitations and updates.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;

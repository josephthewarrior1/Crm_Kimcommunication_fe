import { useState, useEffect } from "react";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState("#top");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const anchors = ["#about", "#foryou-orbit", "#programs", "#partners", "#insights"];
      let currentActive = "#top";

      for (const anchor of anchors) {
        const el = document.querySelector(anchor);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140 && rect.bottom >= 140) {
            currentActive = anchor;
            break;
          }
        }
      }
      setActiveAnchor(currentActive);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (path.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(path === "#top" ? "body" : path);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const triggerRegisterModal = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("open-register-modal"));
  };

  const navLinksDesktop = [
    { name: "Home", path: "#top" },
    { name: "About", path: "#about" },
    { name: "Programs", path: "#programs" },
    { name: "For You", path: "#foryou-orbit" },
    { name: "Insights", path: "#insights" },
    { name: "Partners", path: "#partners" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "py-2 sm:py-3 px-4 sm:px-8"
            : "py-3.5 sm:py-4 px-4 sm:px-8 bg-white/90 backdrop-blur-sm border-b border-slate-200/50"
        }`}
      >
        <div
          className={`mx-auto transition-all duration-300 flex items-center justify-between ${
            isScrolled
              ? "max-w-7xl bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-full px-5 py-2 shadow-lg shadow-blue-950/5"
              : "max-w-7xl"
          }`}
        >
          {/* Left: Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              to="/"
              className="logo font-display font-black text-2xl sm:text-3xl tracking-tight select-none flex items-center gap-1 group cursor-pointer"
            >
              <span className="text-[#008CFF] group-hover:scale-105 transition-transform">nx</span>
              <span className="text-[#FF7A00] animate-pulse">:</span>
              <span className="text-[#2F5BDA] group-hover:scale-105 transition-transform">edu</span>
            </Link>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-full border border-slate-200/70">
            {navLinksDesktop.map((link) => {
              const isActive = activeAnchor === link.path;
              return (
                <a
                  key={link.name}
                  href={link.path}
                  onClick={(e) => handleSmoothScroll(e, link.path)}
                  className={`font-sans text-[12.5px] px-3.5 py-1.5 rounded-full cursor-pointer select-none transition-all ${
                    isActive
                      ? "bg-white text-[#008CFF] font-black shadow-xs"
                      : "text-slate-600 font-bold hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  {link.name}
                </a>
              );
            })}
          </nav>

          {/* Right: Primary CTA Register Interest Button */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={triggerRegisterModal}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#008CFF] to-[#2563EB] hover:from-[#0077E6] hover:to-[#1E40AF] text-white font-sans font-extrabold text-[12.5px] px-5 py-2.5 rounded-full shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
            >
              <span>Register Interest</span>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle Menu"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setIsOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed top-[64px] left-4 right-4 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-[#0B1230] animate-in fade-in slide-in-from-top-4 duration-300 max-h-[85vh] overflow-y-auto"
          >
            {/* Links */}
            <div className="flex flex-col space-y-1">
              {navLinksDesktop.map((link) => {
                const isActive = activeAnchor === link.path;
                return (
                  <a
                    key={link.name}
                    href={link.path}
                    onClick={(e) => {
                      handleSmoothScroll(e, link.path);
                      setIsOpen(false);
                    }}
                    className={`font-sans text-base font-bold px-4 py-2 rounded-2xl transition-all ${
                      isActive
                        ? "bg-blue-50 text-[#008CFF] font-black"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {link.name}
                  </a>
                );
              })}
            </div>

            {/* Mobile CTA */}
            <button
              onClick={(e) => {
                setIsOpen(false);
                triggerRegisterModal(e);
              }}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#008CFF] to-[#2563EB] text-white font-sans font-black text-sm py-3.5 rounded-2xl shadow-md cursor-pointer uppercase tracking-wider"
            >
              <span>Register Interest</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;

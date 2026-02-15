import { Link } from "react-router-dom";
import { Instagram, Mail, ExternalLink, ArrowUpRight, Heart } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden">
      <div className="h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="absolute inset-0 bg-[hsl(222,35%,5%)]" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[300px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[250px] bg-purple-500/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6">
          {/* Brand */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden ring-2 ring-white/10">
                <img src="/lovable-uploads/ozc-agency-logo.jpg" alt="Ozc Agency" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-white font-bold text-base tracking-tight">Ozc Agency</span>
                <span className="block text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">Creator Management</span>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Premium management for ambitious original and adult content creators. We handle strategy, growth, and engagement so you can focus on creating.
            </p>
            <div className="flex items-center gap-2">
              <a href="https://instagram.com/ozcagency" target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-300">
                <Instagram className="h-3.5 w-3.5 text-white/60 group-hover:text-white transition-colors" />
                <span className="text-white/60 group-hover:text-white text-xs font-medium transition-colors">@ozcagency</span>
              </a>
              <a href="mailto:liam@ozcagency.com"
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-300">
                <Mail className="h-3.5 w-3.5 text-white/60 group-hover:text-white transition-colors" />
                <span className="text-white/60 group-hover:text-white text-xs font-medium transition-colors">Email</span>
              </a>
            </div>
          </div>

          {/* Columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-6">
            <div>
              <h4 className="text-white/70 text-[11px] font-semibold uppercase tracking-[0.15em] mb-3">Navigate</h4>
              <div className="flex flex-col gap-1.5">
                {[
                  { to: "/", label: "Home" },
                  { to: "/services", label: "Services" },
                  { to: "/onboarding", label: "Get Started" },
                  { to: "/faq", label: "FAQ" },
                  { to: "/admin", label: "CRM Panel" },
                ].map((link) => (
                  <Link key={link.to} to={link.to}
                    className="group text-white/45 hover:text-white text-sm transition-all duration-200 flex items-center gap-1 w-fit">
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white/70 text-[11px] font-semibold uppercase tracking-[0.15em] mb-3">Legal</h4>
              <div className="flex flex-col gap-1.5">
                <Link to="/privacy" className="group text-white/45 hover:text-white text-sm transition-all duration-200 flex items-center gap-1 w-fit">
                  Privacy Policy <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </Link>
                <Link to="/terms" className="group text-white/45 hover:text-white text-sm transition-all duration-200 flex items-center gap-1 w-fit">
                  Terms & Conditions <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </Link>
                <a href="https://gdpr.eu" target="_blank" rel="noopener noreferrer" className="group text-white/45 hover:text-white text-sm transition-all duration-200 flex items-center gap-1 w-fit">
                  GDPR <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity" />
                </a>
                <a href="https://oag.ca.gov/privacy/ccpa" target="_blank" rel="noopener noreferrer" className="group text-white/45 hover:text-white text-sm transition-all duration-200 flex items-center gap-1 w-fit">
                  CCPA <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-white/70 text-[11px] font-semibold uppercase tracking-[0.15em] mb-3">Contact</h4>
              <div className="flex flex-col gap-1.5">
                <a href="mailto:liam@ozcagency.com" className="text-white/45 hover:text-white text-sm transition-colors">liam@ozcagency.com</a>
                <a href="https://instagram.com/ozcagency" target="_blank" rel="noopener noreferrer" className="text-white/45 hover:text-white text-sm transition-colors">Instagram DM</a>
                <span className="text-white/30 text-xs">Replies within 24h</span>
              </div>
              <Link to="/onboarding"
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.15] text-white/70 hover:text-white text-xs font-medium transition-all duration-300 group">
                Apply Now <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-white/30 text-xs flex items-center gap-1">
            © {year} Ozc Agency. Built with <Heart className="h-3 w-3 text-pink-500/60 fill-pink-500/60" /> for creators.
          </p>
          <div className="flex items-center gap-3 text-[11px] text-white/30">
            <span>GDPR</span>
            <span className="w-0.5 h-0.5 rounded-full bg-white/25" />
            <span>CCPA</span>
            <span className="w-0.5 h-0.5 rounded-full bg-white/25" />
            <span>CPRA</span>
            <span className="w-0.5 h-0.5 rounded-full bg-white/25" />
            <span>18+</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

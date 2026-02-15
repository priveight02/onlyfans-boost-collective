import { Link } from "react-router-dom";
import { Instagram, Mail, ExternalLink, ArrowUpRight, Heart } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden">
      {/* Gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      {/* Ambient glow effects */}
      <div className="absolute inset-0 bg-[hsl(222,35%,5%)]" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[300px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-[400px] h-[250px] bg-purple-500/6 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
        {/* Top section: Brand + Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand block */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-white/10">
                <img src="/lovable-uploads/ozc-agency-logo.jpg" alt="Ozc Agency" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-white font-bold text-lg tracking-tight">Ozc Agency</span>
                <span className="block text-white/30 text-[11px] uppercase tracking-[0.2em] font-medium">Creator Management</span>
              </div>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              Premium management for ambitious creators. We handle the strategy, growth, and engagement — you focus on creating.
            </p>

            {/* Social row */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://instagram.com/ozcagency"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300"
              >
                <Instagram className="h-3.5 w-3.5 text-white/50 group-hover:text-white transition-colors" />
                <span className="text-white/50 group-hover:text-white text-xs font-medium transition-colors">@ozcagency</span>
              </a>
              <a
                href="mailto:liam@ozcagency.com"
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300"
              >
                <Mail className="h-3.5 w-3.5 text-white/50 group-hover:text-white transition-colors" />
                <span className="text-white/50 group-hover:text-white text-xs font-medium transition-colors">Email Us</span>
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Navigate */}
            <div>
              <h4 className="text-white/60 text-[11px] font-semibold uppercase tracking-[0.15em] mb-4">Navigate</h4>
              <div className="flex flex-col gap-2.5">
                {[
                  { to: "/", label: "Home" },
                  { to: "/services", label: "Services" },
                  { to: "/onboarding", label: "Get Started" },
                  { to: "/faq", label: "FAQ" },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="group text-white/35 hover:text-white text-sm transition-all duration-200 flex items-center gap-1"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white/60 text-[11px] font-semibold uppercase tracking-[0.15em] mb-4">Legal</h4>
              <div className="flex flex-col gap-2.5">
                <Link to="/privacy" className="group text-white/35 hover:text-white text-sm transition-all duration-200 flex items-center gap-1">
                  Privacy Policy
                  <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </Link>
                <Link to="/terms" className="group text-white/35 hover:text-white text-sm transition-all duration-200 flex items-center gap-1">
                  Terms & Conditions
                  <ArrowUpRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                </Link>
                <a href="https://gdpr.eu" target="_blank" rel="noopener noreferrer" className="group text-white/35 hover:text-white text-sm transition-all duration-200 flex items-center gap-1">
                  GDPR <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity" />
                </a>
                <a href="https://oag.ca.gov/privacy/ccpa" target="_blank" rel="noopener noreferrer" className="group text-white/35 hover:text-white text-sm transition-all duration-200 flex items-center gap-1">
                  CCPA <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity" />
                </a>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white/60 text-[11px] font-semibold uppercase tracking-[0.15em] mb-4">Get in Touch</h4>
              <div className="flex flex-col gap-2.5">
                <a href="mailto:liam@ozcagency.com" className="text-white/35 hover:text-white text-sm transition-colors">
                  liam@ozcagency.com
                </a>
                <a href="https://instagram.com/ozcagency" target="_blank" rel="noopener noreferrer" className="text-white/35 hover:text-white text-sm transition-colors">
                  Instagram DM
                </a>
                <span className="text-white/20 text-xs mt-1">Replies within 24h</span>
              </div>

              {/* CTA pill */}
              <Link
                to="/onboarding"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15] text-white/60 hover:text-white text-xs font-medium transition-all duration-300 group"
              >
                Apply Now
                <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-5 border-t border-white/[0.04]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-white/20 text-xs flex items-center gap-1">
              © {year} Ozc Agency. Built with <Heart className="h-3 w-3 text-pink-500/60 fill-pink-500/60" /> for creators.
            </p>
            <div className="flex items-center gap-3 text-[11px] text-white/20">
              <span>GDPR</span>
              <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
              <span>CCPA</span>
              <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
              <span>CPRA</span>
              <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
              <span>18+</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

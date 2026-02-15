import { Link } from "react-router-dom";
import { Instagram, Mail, ExternalLink } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-[hsl(222,35%,7%)] border-t border-white/10">
      {/* Subtle top glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <img src="/lovable-uploads/ozc-agency-logo.jpg" alt="Ozc Agency" className="w-8 h-8 rounded-full" />
              <span className="text-white font-bold text-lg">Ozc Agency</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              Premium content creator management. We handle the business so you can focus on creating.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a href="https://instagram.com/ozcagency" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="mailto:liam@ozcagency.com" className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-white/40 hover:text-white text-sm transition-colors">Home</Link>
              <Link to="/services" className="text-white/40 hover:text-white text-sm transition-colors">Services</Link>
              <Link to="/onboarding" className="text-white/40 hover:text-white text-sm transition-colors">Apply Now</Link>
              <Link to="/faq" className="text-white/40 hover:text-white text-sm transition-colors">FAQ</Link>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider">Legal</h4>
            <div className="flex flex-col gap-2">
              <Link to="/privacy" className="text-white/40 hover:text-white text-sm transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="text-white/40 hover:text-white text-sm transition-colors">Terms & Conditions</Link>
              <a href="https://gdpr.eu" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white text-sm transition-colors inline-flex items-center gap-1">
                GDPR Compliance <ExternalLink className="h-3 w-3" />
              </a>
              <a href="https://oag.ca.gov/privacy/ccpa" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white text-sm transition-colors inline-flex items-center gap-1">
                CCPA Notice <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-white/80 text-sm font-semibold uppercase tracking-wider">Contact</h4>
            <div className="flex flex-col gap-2">
              <a href="mailto:liam@ozcagency.com" className="text-white/40 hover:text-white text-sm transition-colors">liam@ozcagency.com</a>
              <a href="https://instagram.com/ozcagency" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white text-sm transition-colors inline-flex items-center gap-1">
                @ozcagency <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-white/30 text-xs mt-1">Response within 24 hours</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-xs">© {year} Ozc Agency. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-white/30">
            <span>GDPR · CCPA · CPRA Compliant</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">18+ Only</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

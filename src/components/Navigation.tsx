import { useState, useEffect } from "react";
import { Menu, X, LogIn, LogOut, Shield, Home, Briefcase, HelpCircle, User, CreditCard, LayoutDashboard } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import CreditsDisplay from "./CreditsDisplay";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type MenuItem = {
  name: string;
  href: string;
  icon?: typeof Shield;
};

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, loading, isAdmin, logout } = useAuth();
  const { settings: siteSettings } = useSiteSettings();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate("/");
    } catch {
      toast.error("Failed to log out");
    }
  };

  const menuItems: MenuItem[] = [
    { name: "Home", href: "/", icon: Home },
    { name: "Services", href: "/services", icon: Briefcase },
    ...(!siteSettings.hide_pricing || isAdmin ? [{ name: "Pricing", href: "/pricing", icon: CreditCard }] : []),
    { name: "FAQ", href: "/faq", icon: HelpCircle },
  ];

  const finalMenuItems: MenuItem[] = [
    ...menuItems,
    ...(user ? [{ name: "Platform", href: "/platform", icon: LayoutDashboard }] : []),
    ...(isAdmin ? [{ name: "Admin", href: "/admin", icon: Shield }] : []),
  ];

  const userInitial = profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className="w-full fixed top-0 z-50">
      <nav className="transition-all duration-300 bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center ml-36 lg:ml-52">
              <Link to="/" className="flex items-center group transition-all duration-300 hover:scale-105">
                <div className="w-16 h-16">
                  <img src="/lovable-uploads/uplyze-logo.png" alt="Uplyze Logo" className="w-full h-full object-contain rounded-full" />
                </div>
              </Link>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center bg-white/5 backdrop-blur-sm border border-white/10 p-1 rounded-xl">
                {finalMenuItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2 ${
                      location.pathname === item.href
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/80 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* Auth buttons */}
              <div className="flex items-center gap-1 ml-2">
                <CreditsDisplay />
                {user ? (
                  <>
                    <Link to="/profile">
                      <button
                        className="w-9 h-9 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-sm font-bold hover:bg-white/30 transition-colors"
                        title={`@${profile?.username || 'profile'}`}
                      >
                        {userInitial}
                      </button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="transition-colors duration-200 hover:bg-white/10 text-white/60 hover:text-white rounded-lg"
                      title="Log out"
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </>
                ) : (
                  <Link to="/auth">
                    <Button
                      variant="ghost"
                      className="transition-colors duration-200 hover:bg-white/10 text-white/80 hover:text-white rounded-lg gap-2"
                    >
                      <LogIn className="h-4 w-4" />
                      Login
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              {user && (
                <Link to="/profile">
                  <button className="w-8 h-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white text-xs font-bold">
                    {userInitial}
                  </button>
                </Link>
              )}
              <button onClick={() => setIsOpen(!isOpen)} className="text-white hover:text-white/80">
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isOpen && (
            <div className="md:hidden bg-white/10 backdrop-blur-xl rounded-b-xl border-t border-white/10">
              <div className="pt-2 pb-3 space-y-1">
                {finalMenuItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`block w-full text-left px-3 py-2 ${
                      location.pathname === item.href ? "text-white font-medium" : "text-white/90 hover:text-white"
                    } flex items-center gap-2`}
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.name}
                  </Link>
                ))}
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setIsOpen(false)} className="block w-full text-left px-3 py-2 text-white/90 hover:text-white flex items-center gap-2">
                      <User className="h-4 w-4" /> My Profile (@{profile?.username || "..."})
                    </Link>
                    <Button variant="ghost" onClick={() => { handleLogout(); setIsOpen(false); }}
                      className="w-full justify-start text-white/90 hover:text-white hover:bg-transparent">
                      <LogOut className="mr-2 h-4 w-4" /> Logout
                    </Button>
                  </>
                ) : (
                  <Link to="/auth" className="block" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-white/90 hover:text-white hover:bg-transparent">
                      <LogIn className="mr-2 h-4 w-4" /> Login
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navigation;

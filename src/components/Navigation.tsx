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
      <nav
        className="transition-all duration-500"
        style={{
          background: isScrolled
            ? "linear-gradient(180deg, hsl(222 47% 5% / 0.92) 0%, hsl(222 47% 4% / 0.88) 100%)"
            : "linear-gradient(180deg, hsl(222 47% 6% / 0.8) 0%, hsl(222 47% 4% / 0.6) 100%)",
          backdropFilter: "blur(32px) saturate(1.6)",
          borderBottom: "1px solid hsl(217 91% 60% / 0.06)",
          boxShadow: isScrolled
            ? "0 8px 40px hsl(222 47% 4% / 0.5), 0 1px 0 hsl(217 91% 60% / 0.04) inset"
            : "0 4px 24px hsl(222 47% 4% / 0.3)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 pl-4 lg:pl-8">
            <div className="flex-shrink-0 w-[180px]">
              <Link to="/" className="flex items-center group transition-all duration-300 hover:scale-105">
                <img src="/lovable-uploads/uplyze-logo.png" alt="Uplyze Logo" className="h-[70px] w-auto object-contain" />
              </Link>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-3">
              <div
                className="flex items-center p-1 rounded-2xl gap-0.5"
                style={{
                  background: "hsl(222 47% 10% / 0.5)",
                  border: "1px solid hsl(217 91% 60% / 0.08)",
                  boxShadow: "0 2px 12px hsl(222 47% 4% / 0.3), 0 1px 0 hsl(217 91% 60% / 0.03) inset",
                }}
              >
                {finalMenuItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="relative px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-300 flex items-center gap-2 group"
                      style={{
                        color: isActive ? "white" : "hsl(215 25% 70%)",
                        background: isActive
                          ? "linear-gradient(135deg, hsl(217 91% 55% / 0.2), hsl(262 83% 58% / 0.12))"
                          : "transparent",
                        boxShadow: isActive
                          ? "0 0 12px hsl(217 91% 60% / 0.15), 0 1px 0 hsl(217 91% 60% / 0.1) inset"
                          : "none",
                      }}
                    >
                      {/* Active glow dot */}
                      {isActive && (
                        <div
                          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full"
                          style={{ background: "linear-gradient(90deg, transparent, hsl(217 91% 60%), transparent)" }}
                        />
                      )}
                      {item.icon && (
                        <item.icon
                          className="h-3.5 w-3.5 transition-colors duration-300"
                          style={{
                            color: isActive ? "hsl(217 91% 65%)" : undefined,
                          }}
                        />
                      )}
                      <span className="group-hover:text-white transition-colors duration-200">{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Auth buttons */}
              <div className="flex items-center gap-1.5 ml-1">
                <CreditsDisplay />
                {user ? (
                  <>
                    <Link to="/profile">
                      <button
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold transition-all duration-300 hover:scale-105"
                        title={`@${profile?.username || 'profile'}`}
                        style={{
                          background: "linear-gradient(135deg, hsl(217 91% 55% / 0.3), hsl(262 83% 58% / 0.2))",
                          border: "1px solid hsl(217 91% 60% / 0.15)",
                          boxShadow: "0 0 12px hsl(217 91% 60% / 0.1)",
                        }}
                      >
                        {userInitial}
                      </button>
                    </Link>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="transition-all duration-200 hover:bg-white/[0.06] text-white/40 hover:text-white/80 rounded-xl h-9 w-9 p-0"
                      title="Log out"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Link to="/auth">
                    <Button
                      variant="ghost"
                      className="rounded-xl gap-2 text-[13px] font-medium transition-all duration-300 h-9 px-4"
                      style={{
                        color: "hsl(215 25% 80%)",
                        background: "hsl(217 91% 55% / 0.08)",
                        border: "1px solid hsl(217 91% 60% / 0.1)",
                      }}
                    >
                      <LogIn className="h-3.5 w-3.5" />
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
                  <button
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      background: "linear-gradient(135deg, hsl(217 91% 55% / 0.3), hsl(262 83% 58% / 0.2))",
                      border: "1px solid hsl(217 91% 60% / 0.15)",
                    }}
                  >
                    {userInitial}
                  </button>
                </Link>
              )}
              <button onClick={() => setIsOpen(!isOpen)} className="text-white/70 hover:text-white transition-colors">
                {isOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isOpen && (
            <div
              className="md:hidden rounded-b-2xl"
              style={{
                background: "linear-gradient(180deg, hsl(222 47% 8% / 0.95) 0%, hsl(222 47% 6% / 0.98) 100%)",
                borderTop: "1px solid hsl(217 91% 60% / 0.06)",
                backdropFilter: "blur(24px)",
              }}
            >
              <div className="pt-2 pb-3 space-y-0.5 px-2">
                {finalMenuItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className="block w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 flex items-center gap-3"
                      style={{
                        color: isActive ? "white" : "hsl(215 25% 70%)",
                        background: isActive ? "hsl(217 91% 55% / 0.1)" : "transparent",
                      }}
                    >
                      {item.icon && (
                        <item.icon
                          className="h-4 w-4"
                          style={{ color: isActive ? "hsl(217 91% 65%)" : "hsl(215 25% 50%)" }}
                        />
                      )}
                      {item.name}
                    </Link>
                  );
                })}
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setIsOpen(false)} className="block w-full text-left px-4 py-2.5 rounded-xl text-[13px] font-medium flex items-center gap-3" style={{ color: "hsl(215 25% 70%)" }}>
                      <User className="h-4 w-4" style={{ color: "hsl(215 25% 50%)" }} /> My Profile (@{profile?.username || "..."})
                    </Link>
                    <Button variant="ghost" onClick={() => { handleLogout(); setIsOpen(false); }}
                      className="w-full justify-start text-[13px] font-medium rounded-xl px-4" style={{ color: "hsl(215 25% 70%)" }}>
                      <LogOut className="mr-3 h-4 w-4" style={{ color: "hsl(215 25% 50%)" }} /> Logout
                    </Button>
                  </>
                ) : (
                  <Link to="/auth" className="block" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-[13px] font-medium rounded-xl px-4" style={{ color: "hsl(215 25% 70%)" }}>
                      <LogIn className="mr-3 h-4 w-4" style={{ color: "hsl(215 25% 50%)" }} /> Login
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

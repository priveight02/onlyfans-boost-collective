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
  const [searchFocused, setSearchFocused] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, loading, isAdmin, logout } = useAuth();
  const { settings: siteSettings } = useSiteSettings();
  const isPlatform = location.pathname.startsWith("/platform");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isPlatform) return;
    const handler = (e: Event) => setSearchFocused((e as CustomEvent).detail);
    window.addEventListener('platform-search-focus', handler);
    return () => window.removeEventListener('platform-search-focus', handler);
  }, [isPlatform]);

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

  // On /platform pages, hide Services and FAQ from navbar
  const platformFilteredItems: MenuItem[] = isPlatform
    ? [
        { name: "Home", href: "/", icon: Home },
        ...(!siteSettings.hide_pricing || isAdmin ? [{ name: "Pricing", href: "/pricing", icon: CreditCard }] : []),
      ]
    : menuItems;

  const finalMenuItems: MenuItem[] = [
    ...platformFilteredItems,
    ...(user ? [{ name: "Platform", href: "/platform", icon: LayoutDashboard }] : []),
    ...(isAdmin ? [{ name: "Admin", href: "/admin", icon: Shield }] : []),
  ];

  const userInitial = profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <div className={`fixed top-0 ${isPlatform ? 'flex justify-end items-center pointer-events-none' : 'w-full flex justify-center pt-4 px-4'}`} style={isPlatform ? { left: '240px', right: searchFocused ? '490px' : '410px', zIndex: 40, transition: 'right 0.3s ease', height: '56px' } : { zIndex: 50 }}>
      <nav
        className={`transition-all duration-500 pointer-events-auto ${isPlatform ? 'rounded-xl rounded-r-none' : 'w-full max-w-4xl rounded-2xl'}`}
        style={{
          background: isScrolled
            ? "hsl(222 47% 10% / 0.75)"
            : "hsl(222 47% 12% / 0.55)",
          backdropFilter: "blur(24px) saturate(1.4)",
          border: "1px solid hsl(215 25% 40% / 0.12)",
          boxShadow: isScrolled
            ? "0 8px 32px hsl(222 47% 4% / 0.4), 0 0 0 1px hsl(215 25% 50% / 0.05) inset"
            : "0 4px 20px hsl(222 47% 4% / 0.25), 0 0 0 1px hsl(215 25% 50% / 0.04) inset",
        }}
      >
        <div className={isPlatform ? "px-2" : "px-4 sm:px-5"}>
          <div className={`flex items-center ${isPlatform ? 'h-10 gap-0' : 'justify-between h-14'}`}>
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center group transition-all duration-300 hover:scale-105">
                <img src="/lovable-uploads/uplyze-logo.png" alt="Uplyze Logo" className={`${isPlatform ? 'h-[38px]' : 'h-[55px]'} w-auto object-contain`} />
              </Link>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-1">
              {finalMenuItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`relative ${isPlatform ? 'px-1.5' : 'px-3.5'} py-2 rounded-xl text-[13px] font-medium transition-all duration-300 group`}
                    style={{
                      color: isActive ? "white" : "hsl(215 25% 65%)",
                    }}
                  >
                    {isActive && (
                      <div
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: "hsl(217 91% 55% / 0.1)",
                        }}
                      />
                    )}
                    <span className="relative group-hover:text-white transition-colors duration-200">{item.name}</span>
                  </Link>
                );
              })}

              {/* Auth buttons - hidden on platform */}
              {!isPlatform && (
                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/10">
                  <CreditsDisplay />
                  {user ? (
                    <>
                      <Link to="/profile">
                        <button
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold transition-all duration-300 hover:scale-105"
                          title={`@${profile?.username || 'profile'}`}
                          style={{
                            background: "linear-gradient(135deg, hsl(217 91% 55% / 0.3), hsl(262 83% 58% / 0.2))",
                            border: "1px solid hsl(217 91% 60% / 0.15)",
                          }}
                        >
                          {userInitial}
                        </button>
                      </Link>
                      <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className="transition-all duration-200 hover:bg-white/[0.06] text-white/40 hover:text-white/80 rounded-xl h-8 w-8 p-0"
                        title="Log out"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <Link to="/auth">
                      <Button
                        variant="ghost"
                        className="rounded-xl gap-2 text-[13px] font-medium transition-all duration-300 h-8 px-3.5"
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
              )}
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
            <div className="md:hidden pb-3 pt-1">
              <div className="space-y-0.5">
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
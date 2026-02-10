import { useState, useEffect } from "react";
import { Menu, X, LogIn, LogOut, Shield } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import TopBanner from "./TopBanner";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type MenuItem = {
  name: string;
  href: string;
  icon?: typeof Shield;
  onClick?: () => void;
};

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, isAdmin, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
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
    { name: "Home", href: "/" },
    { name: "Onboarding", href: "/onboarding" },
    { name: "Services", href: "/services" },
    { name: "FAQ", href: "/faq" },
  ];

  // Only show admin link if user is verified admin
  const finalMenuItems: MenuItem[] = isAdmin
    ? [...menuItems, {
        name: "Admin",
        href: "/admin",
        icon: Shield,
      }]
    : menuItems;

  // Don't hide nav while loading - just hide auth-dependent buttons

  return (
    <div className="w-full fixed top-0 z-50">
      <nav className="transition-all duration-300 bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center ml-36 lg:ml-52">
              <Link
                to="/"
                className="flex items-center group transition-all duration-300 hover:scale-105"
              >
                <div className="w-16 h-16">
                  <img
                    src="/lovable-uploads/ozc-agency-logo.jpg"
                    alt="OZC Agency Logo"
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
              </Link>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-8">
              {finalMenuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`transition-colors duration-200 flex items-center gap-2 ${
                    location.pathname === item.href
                      ? 'font-medium text-white'
                      : 'text-white hover:text-white/80'
                  }`}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.name}
                </Link>
              ))}
              {!loading && user ? (
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="transition-colors duration-200 hover:bg-transparent text-white hover:text-white/80"
                  title="Log out"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              ) : !loading ? (
                <Link to="/auth">
                  <Button
                    variant="ghost"
                    className="transition-colors duration-200 hover:bg-transparent text-white hover:text-white/80"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </Link>
              ) : null}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="transition-colors duration-200 text-white hover:text-white/80"
              >
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
                      location.pathname === item.href
                        ? "text-white font-medium"
                        : "text-white/90 hover:text-white"
                    } flex items-center gap-2`}
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.name}
                  </Link>
                ))}
                {!loading && user ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="w-full justify-start text-white/90 hover:text-white hover:bg-transparent"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                ) : !loading ? (
                  <Link to="/auth" className="block" onClick={() => setIsOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-white/90 hover:text-white hover:bg-transparent"
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </Button>
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navigation;

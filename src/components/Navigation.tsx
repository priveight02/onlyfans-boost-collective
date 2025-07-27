import { useState, useEffect } from "react";
import { Menu, X, LogIn, LogOut, Shield } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import TopBanner from "./TopBanner";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ADMIN_EMAIL = "laflare18@protonmail.com";

type MenuItem = {
  name: string;
  href: string;
  icon?: typeof Shield;
  onClick?: () => void;
};

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const isAdmin = user?.email === ADMIN_EMAIL;
  console.log("Navigation - Current user email:", user?.email);
  console.log("Navigation - Is admin:", isAdmin);
  console.log("Navigation - Auth loading:", loading);

  const handleAdminAccess = () => {
    console.log("Admin access requested by:", user?.email);
    if (isAdmin) {
      navigate("/admin-passphrase");
    } else {
      toast.error("You don't have permission to access the admin panel");
    }
  };

  // Define menu items based on user authorization
  const menuItems: MenuItem[] = [
    { name: "Home", href: "/" },
    { name: "Onboarding", href: "/onboarding" },
    { name: "Services", href: "/services" },
    { name: "FAQ", href: "/faq" },
  ];

  // Only add admin link if user is authorized
  const finalMenuItems: MenuItem[] = isAdmin 
    ? [...menuItems, { 
        name: "Admin", 
        href: "#",  // Changed to # to prevent default navigation
        icon: Shield,
        onClick: handleAdminAccess 
      }]
    : menuItems;

  if (loading) {
    return null; // Don't render navigation while auth is loading
  }

  return (
    <div className="w-full">
      <nav className="bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center ml-32 lg:ml-48">
              <Link 
                to="/" 
                className="flex items-center group transition-all duration-300 hover:scale-105"
              >
                <div className="w-32 h-32">
                  <img 
                    src="/lovable-uploads/2b707af2-312e-43cc-8558-a55f308c47c9.png" 
                    alt="OZ Agency Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </Link>
            </div>
            
            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-8">
              {finalMenuItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => {
                    if (item.onClick) {
                      item.onClick();
                    } else {
                      navigate(item.href);
                    }
                    setIsOpen(false);
                  }}
                  className={`transition-colors duration-200 flex items-center gap-2 ${
                    location.pathname === item.href
                      ? "text-primary-accent font-medium"
                      : "text-gray-700 hover:text-primary-accent"
                  }`}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.name}
                </button>
              ))}
              {user ? (
                <Button
                  variant="ghost"
                  onClick={logout}
                  className="text-gray-700 hover:text-primary-accent hover:bg-transparent"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              ) : (
                <Link to="/auth">
                  <Button
                    variant="ghost"
                    className="text-gray-700 hover:text-primary-accent hover:bg-transparent"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-700 hover:text-primary-accent"
              >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {isOpen && (
            <div className="md:hidden">
              <div className="pt-2 pb-3 space-y-1">
                {finalMenuItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => {
                      if (item.onClick) {
                        item.onClick();
                      } else {
                        navigate(item.href);
                      }
                      setIsOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 ${
                      location.pathname === item.href
                        ? "text-primary-accent font-medium"
                        : "text-gray-700 hover:text-primary-accent"
                    } flex items-center gap-2`}
                  >
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.name}
                  </button>
                ))}
                {user ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                    className="w-full justify-start text-gray-700 hover:text-primary-accent hover:bg-transparent"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                ) : (
                  <Link to="/auth" className="block" onClick={() => setIsOpen(false)}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-gray-700 hover:text-primary-accent hover:bg-transparent"
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
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
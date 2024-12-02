import { useState } from "react";
import { Menu, X, LogIn, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import TopBanner from "./TopBanner";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/useAuth";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Services", href: "/services" },
    { name: "Models", href: "/models" },
    { name: "Join", href: "/join" },
    { name: "Contact", href: "/contact" },
    { name: "FAQ", href: "/faq" },
  ];

  // Only apply fixed positioning on the main page
  const isMainPage = location.pathname === "/";
  const navigationClass = isMainPage ? "fixed w-full z-50" : "w-full z-50";

  return (
    <div className={navigationClass}>
      <TopBanner />
      <nav className="bg-white/90 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="text-xl font-heading font-bold text-primary">
                OFM AGENCY
              </Link>
            </div>
            
            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-8">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`transition-colors duration-200 ${
                    location.pathname === item.href
                      ? "text-primary-accent font-medium"
                      : "text-gray-700 hover:text-primary-accent"
                  }`}
                >
                  {item.name}
                </Link>
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
                {menuItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`block px-3 py-2 ${
                      location.pathname === item.href
                        ? "text-primary-accent font-medium"
                        : "text-gray-700 hover:text-primary-accent"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
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
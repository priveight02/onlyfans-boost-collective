import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache admin status in memory to avoid re-checking
const adminCache = new Map<string, boolean>();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const resolveUser = async (currentUser: User | null) => {
      if (!mounted) return;

      if (!currentUser) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Use cache if available
      if (adminCache.has(currentUser.id)) {
        setIsAdmin(adminCache.get(currentUser.id)!);
        setLoading(false);
        return;
      }

      // Quick parallel check
      const { data } = await supabase.rpc('is_admin', { _user_id: currentUser.id });
      const admin = !!data;
      adminCache.set(currentUser.id, admin);
      if (mounted) {
        setIsAdmin(admin);
        setLoading(false);
      }
    };

    // Set up listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveUser(session?.user ?? null);
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    adminCache.clear();
    setIsAdmin(false);
    setUser(null);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

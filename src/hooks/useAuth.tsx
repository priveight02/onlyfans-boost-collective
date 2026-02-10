import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    // Listen for auth changes — this fires for initial session too
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      // Stop loading immediately — don't wait for admin check
      setLoading(false);

      if (currentUser) {
        // Admin check runs in background, UI updates when ready
        const { data } = await supabase.rpc('is_admin', { _user_id: currentUser.id });
        if (mounted) setIsAdmin(!!data);
      } else {
        setIsAdmin(false);
      }
    });

    // Kick off initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted || initializedRef.current) return;
      initializedRef.current = true;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        const { data } = await supabase.rpc('is_admin', { _user_id: currentUser.id });
        if (mounted) setIsAdmin(!!data);
      }
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
    setIsAdmin(false);
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

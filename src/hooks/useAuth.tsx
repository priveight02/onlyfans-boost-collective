import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  company: string | null;
  original_email: string | null;
  email_change_count: number;
  follower_count: number;
  following_count: number;
  post_count: number;
  is_private: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<any>;
  signUp: (email: string, password: string, username?: string, displayName?: string) => Promise<any>;
  signInWithMagicLink: (email: string) => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  updatePassword: (newPassword: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const adminCache = new Map<string, boolean>();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let mounted = true;

    const resolveUser = async (currentUser: User | null) => {
      if (!mounted) return;

      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setUser(currentUser);
      fetchProfile(currentUser.id);

      if (adminCache.has(currentUser.id)) {
        setIsAdmin(adminCache.get(currentUser.id)!);
        setLoading(false);
        return;
      }

      const { data } = await supabase.rpc('is_admin', { _user_id: currentUser.id });
      const admin = !!data;
      adminCache.set(currentUser.id, admin);
      if (mounted) {
        setIsAdmin(admin);
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      resolveUser(session?.user ?? null);
      // Log login activity on sign in (only if activity logging is enabled)
      if (event === 'SIGNED_IN' && session?.user) {
        // Check if activity logging is enabled for this user
        supabase.from('user_settings').select('activity_logging_enabled').eq('user_id', session.user.id).single()
          .then(({ data }) => {
            if (!(data as any)?.activity_logging_enabled) return; // Skip if disabled
            const provider = session.user.app_metadata?.provider || 'email';
            const ua = navigator.userAgent;
            const device = /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop';
            // Fetch real IP via ipify then log
            fetch('https://api.ipify.org?format=json')
              .then(r => r.json())
              .then(ipData => {
                supabase.from('login_activity').insert({
                  user_id: session.user.id,
                  login_type: provider,
                  device,
                  user_agent: ua.substring(0, 200),
                  ip_address: ipData.ip || null,
                } as any).then(() => {});
              })
              .catch(() => {
                supabase.from('login_activity').insert({
                  user_id: session.user.id,
                  login_type: provider,
                  device,
                  user_agent: ua.substring(0, 200),
                } as any).then(() => {});
              });
          });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveUser(session?.user ?? null);
    });

    // Check remember me on load
    const newRememberKey = 'uplyze_remember_me';
    const oldRememberKey = 'ozc_remember_me';
    const remembered = localStorage.getItem(newRememberKey) || localStorage.getItem(oldRememberKey);
    if (remembered) {
      const parsed = JSON.parse(remembered);
      if (new Date(parsed.until) < new Date()) {
        localStorage.removeItem(newRememberKey);
        localStorage.removeItem(oldRememberKey);
      } else if (!localStorage.getItem(newRememberKey) && localStorage.getItem(oldRememberKey)) {
        localStorage.setItem(newRememberKey, remembered);
        localStorage.removeItem(oldRememberKey);
      }
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string, rememberMe = false) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    if (rememberMe) {
      const until = new Date();
      until.setDate(until.getDate() + 30);
      localStorage.setItem('uplyze_remember_me', JSON.stringify({ until: until.toISOString() }));
      // Update profile
      if (data.user) {
        await supabase.from('profiles').update({ 
          remember_me: true, 
          remember_until: until.toISOString() 
        }).eq('user_id', data.user.id);
      }
    } else {
      localStorage.removeItem('uplyze_remember_me');
      localStorage.removeItem('ozc_remember_me');
    }
    
    return data;
  };

  const signUp = async (email: string, password: string, username?: string, displayName?: string) => {
    const redirectUrl = window.location.hostname === 'localhost'
      ? window.location.origin
      : 'https://uplyze.ai';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: displayName || email.split('@')[0],
          username: username,
        }
      }
    });
    if (error) throw error;
    return data;
  };

  const signInWithMagicLink = async (email: string) => {
    const redirectUrl = window.location.hostname === 'localhost'
      ? window.location.origin
      : 'https://uplyze.ai';
    const { data, error } = await supabase.functions.invoke('custom-auth-email', {
      body: { email, type: 'magiclink', redirectTo: redirectUrl },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = window.location.hostname === 'localhost' 
      ? `${window.location.origin}/auth/reset-password`
      : `https://uplyze.ai/auth/reset-password`;
    const { data, error } = await supabase.functions.invoke('custom-auth-email', {
      body: { email, type: 'recovery', redirectTo: redirectUrl },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const logout = async () => {
    adminCache.clear();
    setIsAdmin(false);
    setUser(null);
    setProfile(null);
    localStorage.removeItem('uplyze_remember_me');
    localStorage.removeItem('ozc_remember_me');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, signIn, signUp, signInWithMagicLink, resetPassword, updatePassword, logout, refreshProfile }}>
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

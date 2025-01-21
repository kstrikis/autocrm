import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  logger.methodEntry('AuthProvider');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to handle session updates
  const handleSession = async (newSession: Session | null): Promise<void> => {
    logger.methodEntry('handleSession', { hasSession: !!newSession });
    try {
      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
      } else {
        // If no session, try to refresh it
        const { data: { session: refreshedSession }, error } = await supabase.auth.getSession();
        if (error) {
          logger.error('Error refreshing session', { error });
          throw error;
        }
        if (refreshedSession) {
          setSession(refreshedSession);
          setUser(refreshedSession.user);
        } else {
          setSession(null);
          setUser(null);
        }
      }
    } catch (error) {
      logger.error('Error handling session', { error });
      setSession(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
    logger.methodExit('handleSession');
  };

  useEffect((): (() => void) => {
    logger.methodEntry('AuthProvider.useEffect');
    let mounted = true;
    let loadingTimeout: NodeJS.Timeout;

    // Set a maximum loading time
    loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        logger.warn('Auth loading timed out, resetting state');
        setLoading(false);
        setSession(null);
        setUser(null);
      }
    }, 10000); // 10 second timeout

    // Get initial session
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      logger.info('Initial session loaded', { 
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        userRole: session?.user?.user_metadata?.role,
        accessToken: session?.access_token ? 'present' : 'missing',
        expiresAt: session?.expires_at
      });
      void handleSession(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      logger.info('Auth state changed', { 
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        userRole: session?.user?.user_metadata?.role,
        accessToken: session?.access_token ? 'present' : 'missing',
        expiresAt: session?.expires_at
      });
      void handleSession(session);
    });

    return (): void => {
      logger.methodExit('AuthProvider.useEffect');
      mounted = false;
      clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    logger.methodEntry('signIn', { email });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error(error, 'signIn');
        throw error;
      }

      await handleSession(data.session);
      logger.methodExit('signIn', { success: true });
    } catch (error) {
      logger.error(error as Error, 'signIn');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<void> => {
    logger.methodEntry('signUp', { email, fullName });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            display_name: fullName.split(' ')[0],
            role: 'customer',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        },
      });

      if (error) {
        logger.error(error, 'signUp');
        throw error;
      }

      await handleSession(data.session);
      logger.methodExit('signUp', { success: true });
    } catch (error) {
      logger.error(error as Error, 'signUp');
      throw error;
    }
  };

  const signOut = async (): Promise<void> => {
    logger.methodEntry('signOut');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error(error, 'signOut');
        throw error;
      }

      // Clear session and user immediately
      setSession(null);
      setUser(null);
      
      // Clear any local storage
      window.localStorage.removeItem('supabase.auth.token');
      
      logger.methodExit('signOut', { success: true });
    } catch (error) {
      logger.error(error as Error, 'signOut');
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    logger.methodEntry('resetPassword', { email });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) {
        logger.error(error, 'resetPassword');
        throw error;
      }
      logger.methodExit('resetPassword', { success: true });
    } catch (error) {
      logger.error(error as Error, 'resetPassword');
      throw error;
    }
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  const result = (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );

  logger.methodExit('AuthProvider');
  return result;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Session } from '@supabase/supabase-js';

import type { AppPhase, UserRole } from '../types/app';
import { supabase } from '../utils/supabaseClient';

interface UseAuthBootstrapOptions {
  authLoading: boolean;
  appPhase: AppPhase;
  setSession: (session: Session | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setUserRole: (role: UserRole) => void;
  setAppPhase: (phase: AppPhase) => void;
}

interface UseAuthBootstrapResult {
  handleLogout: () => Promise<void>;
  resolveSessionAfterLogin: () => Promise<void>;
  waitAuthEnteredAtRef: MutableRefObject<number>;
}

export function useAuthBootstrap({
  authLoading,
  appPhase,
  setSession,
  setAuthLoading,
  setUserRole,
  setAppPhase,
}: UseAuthBootstrapOptions): UseAuthBootstrapResult {
  const fetchedUserIds = useRef<Set<string>>(new Set());
  const roleFetchInFlight = useRef<Set<string>>(new Set());
  const authInitStarted = useRef(false);
  const waitAuthEnteredAtRef = useRef<number>(0);

  const fetchUserRole = async (userId: string) => {
    if (fetchedUserIds.current.has(userId)) return;
    if (roleFetchInFlight.current.has(userId)) return;
    roleFetchInFlight.current.add(userId);

    console.log('[AUTH] Fetching user role from database for:', userId);
    try {
      const normalizeRole = (rawRole: unknown): UserRole => {
        const role = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : '';
        if (role === 'admin' || role === 'superadmin') return 'admin';
        return 'user';
      };

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 5000),
      );

      const queryPromise = supabase.from('profiles').select('role').eq('id', userId).single();
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email?.toLowerCase() || '';
      const metaRole = userData.user?.app_metadata?.role ?? userData.user?.user_metadata?.role ?? null;
      const isAdminEmail =
        userEmail === 'superadmin@palkamtm.pl' ||
        userEmail === 'admin@lexmind.local' ||
        userEmail.startsWith('admin@') ||
        userEmail.startsWith('admin') ||
        metaRole === 'admin';

      if (!error && data && data.role) {
        const norm = normalizeRole(data.role);
        setUserRole(norm === 'admin' || isAdminEmail ? 'admin' : norm);
        fetchedUserIds.current.add(userId);
      } else {
        const normalized = normalizeRole(metaRole);

        if (normalized === 'admin' || isAdminEmail) {
          console.log('[AUTH] Using admin role for user:', userEmail);
          setUserRole('admin');
          fetchedUserIds.current.add(userId);
        } else {
          console.log('[AUTH] Using default role "user" due to error or no data');
          setUserRole('user');
        }
      }
    } catch (err) {
      console.log('[AUTH] Exception in fetchUserRole:', err);
      setUserRole('user');
    } finally {
      roleFetchInFlight.current.delete(userId);
    }
  };

  const applyResolvedSession = (resolvedSession: Session | null) => {
    setSession(resolvedSession);
    setAuthLoading(false);

    if (resolvedSession) {
      console.log('[AUTH] Applying resolved session for:', resolvedSession.user.id);
      void fetchUserRole(resolvedSession.user.id);
      return;
    }

    setUserRole('user');
  };

  const resolveSessionAfterLogin = async () => {
    try {
      const {
        data: { session: resolvedSession },
      } = await supabase.auth.getSession();
      applyResolvedSession(resolvedSession);
    } catch (err) {
      console.warn('[AUTH] Post-login session resolve failed:', err);
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (localErr) {
        console.warn('[AUTH] Logout failed (global + local):', err, localErr);
      }
    } finally {
      fetchedUserIds.current.clear();
      roleFetchInFlight.current.clear();
      applyResolvedSession(null);
      setTimeout(() => setAppPhase('landing'), 0);
    }
  };

  useEffect(() => {
    if (authInitStarted.current) return;
    authInitStarted.current = true;

    console.log('[AUTH] Starting auth initialization...');
    let subscription: { unsubscribe: () => void } | null = null;
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log('[AUTH] Setting up onAuthStateChange listener...');
        const { data } = supabase.auth.onAuthStateChange((event: string, newSession: Session | null) => {
          if (!isMounted) return;
          console.log(`[AUTH] Event: ${event}`, newSession?.user?.id);
          applyResolvedSession(newSession);
        });
        subscription = data.subscription;
        console.log('[AUTH] Auth state change listener registered');

        console.log('[AUTH] Getting current session...');
        let activeSession: Session | null = null;
        try {
          const sessionTimeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Session fetch timeout')), 5000),
          );
          const sessionResult = (await Promise.race([
            supabase.auth.getSession(),
            sessionTimeout,
          ])) as { data: { session: Session | null } };
          activeSession = sessionResult?.data?.session ?? null;
        } catch (sessionErr) {
          console.warn('[AUTH] Session fetch fallback:', sessionErr);
        }

        if (!activeSession) {
          try {
            const rawMock = localStorage.getItem('lexmind_mock_session');
            if (rawMock && rawMock !== 'none') {
              activeSession = JSON.parse(rawMock) as Session;
            }
          } catch {
            /* ignore */
          }
        }

        if (isMounted) {
          applyResolvedSession(activeSession);
          console.log('[AUTH] Auth initialization complete');
        }
      } catch (err) {
        console.warn('[AUTH] Initial session check failed:', err);
        if (isMounted) setAuthLoading(false);
      }
    };

    void initializeAuth();

    return () => {
      isMounted = false;
      authInitStarted.current = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [setAuthLoading]);

  useEffect(() => {
    if (appPhase !== 'wait-auth' || !authLoading) return;

    const timer = setTimeout(() => {
      console.warn('[AUTH] wait-auth timeout reached, forcing authLoading=false');
      setAuthLoading(false);
    }, 8000);

    return () => clearTimeout(timer);
  }, [appPhase, authLoading, setAuthLoading]);

  useEffect(() => {
    if (appPhase === 'wait-auth') {
      waitAuthEnteredAtRef.current = Date.now();
    }
  }, [appPhase]);

  return {
    handleLogout,
    resolveSessionAfterLogin,
    waitAuthEnteredAtRef,
  };
}

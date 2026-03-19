'use client';
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const AuthContext = createContext(null);

async function safeFetch(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    return text ? JSON.parse(text) : { success: false };
  } catch (e) { return { success: false, error: e.message }; }
}

export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [pendingApproval, setPending]   = useState(false);
  const [pendingUser, setPendingUser]   = useState(null);
  const router   = useRouter();
  const pathname = usePathname();
  const processed = useRef(false); // prevent double-processing

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    // ── Google OAuth session ──────────────────────────────────
    if (status === 'authenticated' && session?.user && !processed.current) {
      const u = session.user;

      // Always re-check approval from DB (token might be stale)
      const token = session.appToken;
      if (token) {
        localStorage.setItem('exame_token', token);
        safeFetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
          .then(res => {
            if (res.success) {
              const dbUser = res.data.user;
              // Re-fetch approval status from DB
              safeFetch('/api/students/check-approval', {
                headers: { Authorization: `Bearer ${token}` }
              }).then(approvalRes => {
                const approvalStatus = approvalRes.success
                  ? approvalRes.data.approvalStatus
                  : u.approvalStatus;

                if (approvalStatus === 'pending' || approvalStatus === 'rejected') {
                  setPending(true);
                  setPendingUser(u);
                  setLoading(false);
                } else {
                  processed.current = true;
                  setUser(dbUser);
                  setLoading(false);
                }
              });
            } else {
              // Fallback to session data
              if (u.approvalStatus === 'pending' || u.approvalStatus === 'rejected') {
                setPending(true);
                setPendingUser(u);
              } else {
                processed.current = true;
                setUser(u);
              }
              setLoading(false);
            }
          });
      } else {
        if (u.approvalStatus === 'pending' || u.approvalStatus === 'rejected') {
          setPending(true);
          setPendingUser(u);
        }
        setLoading(false);
      }
      return;
    }

    if (status === 'unauthenticated' && !processed.current) {
      // Try manual JWT
      const token = localStorage.getItem('exame_token');
      if (!token) { setLoading(false); return; }

      safeFetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          if (res.success) { processed.current = true; setUser(res.data.user); }
          else localStorage.removeItem('exame_token');
        })
        .catch(() => localStorage.removeItem('exame_token'))
        .finally(() => setLoading(false));
    }
  }, [session, status]);

  const login = async (email, password) => {
    try {
      const res = await safeFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.success) return { error: res.error };
      localStorage.setItem('exame_token', res.data.token);
      processed.current = true;
      setUser(res.data.user);
      return { success: true };
    } catch (e) { return { error: e.message }; }
  };

  const logout = async () => {
    processed.current = false;
    localStorage.removeItem('exame_token');
    setUser(null);
    setPending(false);
    setPendingUser(null);
    await signOut({ redirect: false });
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading, pendingApproval, pendingUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }

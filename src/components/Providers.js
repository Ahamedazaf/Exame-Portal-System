'use client';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/context/AuthContext';
import { PortalProvider } from '@/context/PortalContext';

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <PortalProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </PortalProvider>
    </SessionProvider>
  );
}

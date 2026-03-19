'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const PortalContext = createContext({
  portalName:    'Exame Portal',
  portalLogoText: 'EP',
  portalTagline: 'Online Examination System',
  portalLogoUrl: '',
  refresh: () => {},
});

export function PortalProvider({ children }) {
  const [settings, setSettings] = useState({
    portalName:    'Exame Portal',
    portalLogoText: 'EP',
    portalTagline: 'Online Examination System',
    portalLogoUrl: '',
  });

  const refresh = async () => {
    try {
      const res  = await fetch('/api/portal');
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      if (json?.success && json.data) {
        setSettings({
          portalName:     json.data.portal_name      || 'Exame Portal',
          portalLogoText: json.data.portal_logo_text || 'EP',
          portalTagline:  json.data.portal_tagline   || '',
          portalLogoUrl:  json.data.portal_logo_url  || '',
        });
      }
    } catch {}
  };

  useEffect(() => { refresh(); }, []);

  return (
    <PortalContext.Provider value={{ ...settings, refresh }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() { return useContext(PortalContext); }

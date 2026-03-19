'use client';
import { useAuth } from '@/context/AuthContext';
import { usePortal } from '@/context/PortalContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Settings, LogOut, Menu, X } from 'lucide-react';

export default function StudentLayout({ children }) {
  const { user, logout, loading } = useAuth();
  const { portalName, portalLogoText, portalLogoUrl } = usePortal();
  const router   = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const redirected = useRef(false);

  const NAV = [
    { href: '/student/dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
    { href: '/student/settings',  icon: Settings,        label: 'Settings'     },
  ];

  useEffect(() => {
    if (loading || redirected.current) return;
    if (!user || user.role !== 'student') { redirected.current = true; router.replace('/login'); }
  }, [user, loading, router]);

  useEffect(() => { setOpen(false); }, [pathname]);

  if (pathname.includes('/student/exam/')) return <>{children}</>;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#f5f3ff'}}>
      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user || user.role !== 'student') return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{background:'var(--page-bg)'}}>
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col
        transition-transform duration-300 shadow-2xl lg:shadow-none
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} style={{background:'var(--sidebar-bg)'}}>

        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shrink-0"
            style={{background:'linear-gradient(135deg,#7c3aed,#a855f7)'}}>
            {portalLogoUrl
              ? <img src={portalLogoUrl} alt="logo" className="w-full h-full object-cover" />
              : <span className="text-white font-extrabold text-xs">{portalLogoText}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-extrabold text-white leading-none truncate">{portalName}</div>
            <div className="text-xs mt-0.5" style={{color:'var(--sidebar-text)'}}>Student Portal</div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1 text-purple-300"><X size={19} /></button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`sidebar-link ${active ? 'active' : ''}`}>
                <item.icon size={16} style={active?{color:'white'}:{color:'var(--sidebar-text)'}} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 text-white"
              style={{background:'linear-gradient(135deg,#7c3aed,#a855f7)'}}>
              {user.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user.name}</div>
              <div className="text-xs truncate" style={{color:'var(--sidebar-text)'}}>{user.email}</div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors"
            style={{color:'#f87171'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="px-4 py-3 flex items-center gap-3 lg:hidden border-b border-purple-100 bg-white">
          <button onClick={() => setOpen(true)} className="text-purple-600 p-1 shrink-0"><Menu size={21} /></button>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden shrink-0"
            style={{background:'linear-gradient(135deg,#7c3aed,#a855f7)'}}>
            {portalLogoUrl
              ? <img src={portalLogoUrl} alt="logo" className="w-full h-full object-cover" />
              : <span className="text-white font-extrabold text-xs">{portalLogoText}</span>}
          </div>
          <span className="font-bold text-slate-800 text-sm flex-1 truncate">{portalName}</span>
          <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
            style={{background:'linear-gradient(135deg,#7c3aed,#a855f7)'}}>
            {user.name?.[0]}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

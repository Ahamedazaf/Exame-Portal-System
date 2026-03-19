'use client';
import { usePortal } from '@/context/PortalContext';

export default function PortalLogo({ size = 'md' }) {
  const { portalLogoText, portalLogoUrl } = usePortal();
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-xs';

  return (
    <div className={`${dim} bg-blue-600 rounded-xl flex items-center justify-center overflow-hidden shrink-0`}>
      {portalLogoUrl
        ? <img src={portalLogoUrl} alt="logo" className="w-full h-full object-cover" />
        : <span className="text-white font-extrabold">{portalLogoText}</span>}
    </div>
  );
}

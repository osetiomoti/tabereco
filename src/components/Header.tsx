'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, ChevronLeft, Bell, ChevronDown, Check } from 'lucide-react';
import { useMyProfile } from '@/hooks/useAppData';
import { useUnreadNotifications } from '@/hooks/useNotifications';
import { useAppType, type AppType } from '@/contexts/AppTypeContext';
import { useState, useRef, useEffect } from 'react';

function NotificationBadge() {
  const { count } = useUnreadNotifications();
  if (count === 0) return null;
  return (
    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border-2 border-white shadow-sm">
      {count > 9 ? '9+' : count}
    </div>
  );
}

const APP_OPTIONS: { type: AppType; label: string; icon: string; desc: string }[] = [
  { type: 'tabereco', label: '食べレコ', icon: '/icon-192.png',    desc: '食事の記録' },
  { type: 'tabireco', label: '旅レコ',   icon: '/tabireco-192.png', desc: '旅の記録' },
];

function AppSwitcher() {
  const { appType, setAppType } = useAppType();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = APP_OPTIONS.find(o => o.type === appType) ?? APP_OPTIONS[0];

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (type: AppType) => {
    setOpen(false);
    if (type !== appType) {
      setAppType(type);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        id="app-switcher-btn"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 group"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {/* ロゴアイコン */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-all duration-300 overflow-hidden"
          style={{ boxShadow: `0 4px 12px var(--color-primary-shadow)` }}
        >
          <img src={current.icon} alt={`${current.label} ロゴ`} className="w-full h-full object-cover" />
        </div>
        {/* アプリ名 + チェブロン */}
        <span className="hidden xs:flex items-center gap-1">
          <span className="font-black text-gray-900 text-[18px] tracking-tighter">{current.label}</span>
          <ChevronDown
            size={14}
            className="text-gray-400 transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </span>
      </button>

      {/* ドロップダウン */}
      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in"
          role="listbox"
          aria-label="アプリ切り替え"
        >
          {APP_OPTIONS.map(opt => (
            <button
              key={opt.type}
              role="option"
              aria-selected={opt.type === appType}
              id={`app-option-${opt.type}`}
              onClick={() => handleSelect(opt.type)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <img src={opt.icon} alt={opt.label} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-900">{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.desc}</div>
              </div>
              {opt.type === appType && (
                <Check size={14} className="flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type HeaderProps = {
  children?: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  hideSettings?: boolean;
};

export function Header({ children, title, showBackButton, hideSettings }: HeaderProps) {
  const router = useRouter();
  const { profile: user, isLoading } = useMyProfile();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100/50 h-14 transition-all duration-300">
      <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between relative">
        {/* Left Side: Logo/AppSwitcher or Back Button */}
        <div className="flex items-center z-10">
          {showBackButton ? (
            <button
              onClick={() => router.back()}
              className="w-9 h-9 bg-gray-100/80 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-900" />
            </button>
          ) : (
            <AppSwitcher />
          )}
        </div>

        {/* Center Title */}
        {title && (
          <div className="absolute inset-0 flex justify-center items-center pointer-events-none px-24">
            <h1 className="font-bold text-gray-900 tracking-wide text-[16px] truncate">
              {title}
            </h1>
          </div>
        )}

        {/* Right Side: Actions/Settings */}
        <div className="flex items-center gap-2 z-10">
          {children}

          {!isLoading && user && !hideSettings ? (
            <div className="flex items-center gap-2">
              <Link
                href="/notifications"
                className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 transition-all"
                style={{'--hover-bg': 'var(--color-primary-50)', '--hover-color': 'var(--color-primary)'} as React.CSSProperties}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-primary-50)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                  (e.currentTarget as HTMLElement).style.color = '';
                }}
              >
                <Bell size={18} />
                <NotificationBadge />
              </Link>
              <Link
                href="/settings"
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 transition-all"
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-primary-50)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                  (e.currentTarget as HTMLElement).style.color = '';
                }}
              >
                <Settings size={18} />
              </Link>
            </div>
          ) : !isLoading && !user && !hideSettings && (
            <Link
              href="/login"
              className="font-bold text-sm px-3 py-1.5 rounded-full hover:opacity-90 transition-colors"
              style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-50)' }}
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HelpProvider } from '../context/HelpContext';
import { cn } from '../lib/cn';
import { BranchSelector } from './BranchSelector';
import { HelpPanel, HelpToolbarButton } from './help/HelpPanel';
import { LanguageSwitcher } from './LanguageSwitcher';
import { OrgBranchHighlight } from './OrgBranchHighlight';
import { Sidebar } from './Sidebar';

const STORAGE_KEY = 'pawn-erp-sidebar-collapsed';

function TopToolbar() {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <HelpToolbarButton />
      <BranchSelector />
      <LanguageSwitcher />
    </div>
  );
}

export function Layout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);
  const userInitial = user?.name?.charAt(0)?.toUpperCase() ?? 'U';

  return (
    <HelpProvider>
    <div className="flex min-h-screen bg-zinc-100/80">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        className="sticky top-0 hidden h-screen shrink-0 lg:flex"
      />

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-zinc-950/30 lg:hidden"
          onClick={closeMobile}
        />
      )}
      <Sidebar
        collapsed={false}
        onToggle={() => setCollapsed((c) => !c)}
        onNavigate={closeMobile}
        className={cn(
          'fixed inset-y-0 left-0 z-50 h-screen shadow-xl transition-transform duration-300 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-50"
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-zinc-950">Pawn ERP</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-600">
            {userInitial}
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col bg-white lg:min-h-screen lg:rounded-tl-2xl lg:shadow-sm">
          <div className="sticky top-0 z-20 hidden border-b border-zinc-100 bg-white/95 backdrop-blur-sm lg:flex lg:h-14 lg:items-center lg:justify-between lg:gap-4 lg:px-10">
            <OrgBranchHighlight />
            <TopToolbar />
          </div>

          <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-3 lg:hidden">
            <OrgBranchHighlight />
            <TopToolbar />
          </div>

          <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <HelpPanel />
    </div>
    </HelpProvider>
  );
}

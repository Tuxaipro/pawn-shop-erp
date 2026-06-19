import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { helpPageIdForPath } from '../lib/pageHelpRoutes';

interface HelpContextValue {
  isOpen: boolean;
  activePageId: string | null;
  openHelp: (pageId?: string) => void;
  closeHelp: () => void;
  setActivePageId: (id: string) => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [overridePageId, setOverridePageId] = useState<string | null>(null);

  const routePageId = helpPageIdForPath(pathname);
  const activePageId = overridePageId ?? routePageId;

  useEffect(() => {
    setOverridePageId(null);
  }, [pathname]);

  const openHelp = useCallback(
    (pageId?: string) => {
      setOverridePageId(pageId ?? null);
      setIsOpen(true);
    },
    []
  );

  const closeHelp = useCallback(() => {
    setIsOpen(false);
    setOverridePageId(null);
  }, []);

  const setActivePageId = useCallback((id: string) => {
    setOverridePageId(id);
  }, []);

  const value = useMemo(
    () => ({ isOpen, activePageId, openHelp, closeHelp, setActivePageId }),
    [isOpen, activePageId, openHelp, closeHelp, setActivePageId]
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error('useHelp must be used within HelpProvider');
  return ctx;
}

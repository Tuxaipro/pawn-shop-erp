import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HELP_TOPICS } from '../../lib/pageHelpRoutes';
import { useHelp } from '../../context/HelpContext';
import { cn } from '../../lib/cn';

function HelpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
      />
    </svg>
  );
}

export function HelpToolbarButton() {
  const { openHelp } = useHelp();
  const { t } = useTranslation('help');

  return (
    <button
      type="button"
      onClick={() => openHelp()}
      data-testid="toolbar-help"
      className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
      title={t('panel_title')}
    >
      <HelpIcon className="h-4 w-4 text-zinc-500" />
      <span className="hidden sm:inline">{t('help_button')}</span>
    </button>
  );
}

function HelpContent({ pageId }: { pageId: string }) {
  const { t } = useTranslation('help');
  const base = `pages.${pageId}`;
  const steps = t(`${base}.steps`, { returnObjects: true, defaultValue: [] }) as string[];
  const tips = t(`${base}.tips`, { returnObjects: true, defaultValue: [] }) as string[];

  return (
    <article className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-zinc-950">{t(`${base}.title`)}</h2>
        <p className="mt-2 text-sm/6 text-zinc-600">{t(`${base}.purpose`)}</p>
      </header>

      {steps.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {t('section_steps')}
          </h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm/6 text-zinc-700">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {t(`${base}.example`, { defaultValue: '' }) && (
        <section className="rounded-xl border border-blue-200 bg-blue-50/80 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-blue-800">
            {t('section_example')}
          </h3>
          <p className="mt-1 text-sm font-medium text-blue-950">
            {t(`${base}.example_title`, { defaultValue: t('section_example') })}
          </p>
          <p className="mt-2 text-sm/6 text-blue-900">{t(`${base}.example`)}</p>
        </section>
      )}

      {tips.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {t('section_tips')}
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm/6 text-zinc-700">
            {tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export function HelpPanel() {
  const { isOpen, activePageId, closeHelp, setActivePageId } = useHelp();
  const { t } = useTranslation('help');
  const [view, setView] = useState<'page' | 'topics'>('page');

  useEffect(() => {
    if (isOpen) setView('page');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeHelp();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeHelp]);

  if (!isOpen || !activePageId) return null;

  const groups = ['core', 'operations', 'finance', 'admin', 'masters'] as const;

  return (
    <>
      <button
        type="button"
        aria-label={t('close')}
        className="fixed inset-0 z-40 bg-zinc-950/25 backdrop-blur-[1px]"
        onClick={closeHelp}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-panel-title"
        data-testid="help-panel"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl sm:max-w-lg"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-4">
          <h2 id="help-panel-title" className="text-base font-semibold text-zinc-950">
            {t('panel_title')}
          </h2>
          <button
            type="button"
            onClick={closeHelp}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
            aria-label={t('close')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex shrink-0 gap-1 border-b border-zinc-100 px-5 py-2">
          <button
            type="button"
            onClick={() => setView('page')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition',
              view === 'page' ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            )}
          >
            {t('tab_this_page')}
          </button>
          <button
            type="button"
            onClick={() => setView('topics')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition',
              view === 'topics' ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:bg-zinc-100'
            )}
          >
            {t('tab_all_topics')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {view === 'page' ? (
            <HelpContent pageId={activePageId} />
          ) : (
            <nav className="space-y-6">
              {groups.map((group) => {
                const items = HELP_TOPICS.filter((topic) => topic.group === group);
                if (!items.length) return null;
                return (
                  <div key={group}>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      {t(`groups.${group}`)}
                    </h3>
                    <ul className="mt-2 space-y-1">
                      {items.map((topic) => (
                        <li key={topic.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setActivePageId(topic.id);
                              setView('page');
                            }}
                            className={cn(
                              'w-full rounded-lg px-3 py-2 text-left text-sm/6 transition',
                              activePageId === topic.id
                                ? 'bg-zinc-100 font-medium text-zinc-950'
                                : 'text-zinc-600 hover:bg-zinc-50'
                            )}
                          >
                            {t(`pages.${topic.id}.title`)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </nav>
          )}
        </div>
      </aside>
    </>
  );
}

export function SupportSidebarButton({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { openHelp } = useHelp();
  const { t } = useTranslation('help');

  return (
    <button
      type="button"
      data-testid="nav-support"
      title={collapsed ? t('panel_title') : undefined}
      onClick={() => {
        openHelp();
        onNavigate?.();
      }}
      className={cn(
        'flex w-full items-center rounded-lg text-sm/6 font-medium text-zinc-600 transition hover:bg-white/70 hover:text-zinc-950',
        collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
      )}
    >
      <HelpIcon className="h-5 w-5 shrink-0 text-zinc-500" />
      {!collapsed && <span>{t('support_menu')}</span>}
    </button>
  );
}

import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5 text-xs font-medium shadow-sm">
      {(['en', 'ta'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => i18n.changeLanguage(lang)}
          className={
            i18n.language.startsWith(lang)
              ? 'rounded-md bg-zinc-950 px-2.5 py-1 text-white'
              : 'rounded-md px-2.5 py-1 text-zinc-600 hover:text-zinc-950'
          }
        >
          {lang === 'en' ? 'EN' : 'தமிழ்'}
        </button>
      ))}
    </div>
  );
}

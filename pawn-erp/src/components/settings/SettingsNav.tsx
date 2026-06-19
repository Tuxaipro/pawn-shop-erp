import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

const links = [
  { to: '/settings/organization', labelKey: 'nav.organization' },
  { to: '/settings/branches', labelKey: 'nav.branches' },
  { to: '/settings/preferences', labelKey: 'nav.preferences' },
  { to: '/settings/security/users', labelKey: 'nav.security' },
] as const;

export function SettingsNav() {
  const { t } = useTranslation('settings');

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-zinc-100 pb-4">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium no-underline transition',
              isActive
                ? 'bg-zinc-950 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950'
            )
          }
        >
          {t(link.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}

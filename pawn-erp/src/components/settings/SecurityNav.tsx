import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

const links = [
  { to: '/settings/security/users', labelKey: 'security.nav.users' },
  { to: '/settings/security/roles', labelKey: 'security.nav.roles' },
  { to: '/settings/security/audit', labelKey: 'security.nav.audit' },
] as const;

export function SecurityNav() {
  const { t } = useTranslation('settings');

  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium no-underline transition',
              isActive
                ? 'bg-zinc-800 text-white'
                : 'bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100'
            )
          }
        >
          {t(link.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}

import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

const links = [
  { to: '/masters/categories', labelKey: 'nav.categories' },
  { to: '/masters/sub-categories', labelKey: 'nav.sub_categories' },
  { to: '/masters/sub-items', labelKey: 'nav.sub_items' },
  { to: '/masters/interest-declarations', labelKey: 'nav.interest' },
  { to: '/masters/employees', labelKey: 'nav.employees' },
] as const;

export function MasterNav() {
  const { t } = useTranslation('masters');

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-zinc-100 pb-4">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          data-testid={`master-nav-${link.to.split('/').pop()}`}
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

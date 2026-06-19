import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

const links = [
  { to: '/bank-loans', labelKey: 'nav.list', end: true },
  { to: '/bank-loans/record', labelKey: 'nav.record', end: false },
  { to: '/bank-loans/batch', labelKey: 'nav.batch', end: false },
] as const;

export function BankLoanNav() {
  const { t } = useTranslation('bankLoan');

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-zinc-100 pb-4">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
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

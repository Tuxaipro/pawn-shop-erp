import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { LoanListItem } from '../../api/loans';
import { useModuleSettings } from '../../context/ModuleSettingsContext';
import { cn } from '../../lib/cn';
import { BankIcon, CloseLoanIcon, PaymentIcon, PrintIcon, RenewIcon, ViewIcon } from '../ui/icons';

const iconClass =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-950/5 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:pointer-events-none disabled:opacity-40';

type Props = {
  loan: LoanListItem;
};

export function LoanRowActions({ loan }: Props) {
  const { t } = useTranslation('loan');
  const { isModuleEnabled } = useModuleSettings();
  const perms = loan.permissions;
  const isOpen = loan.settlementStatus === 0;

  return (
    <div className="flex items-center gap-0.5">
      <Link to={`/loans/${loan.id}`} className={iconClass} title={t('list_actions.view')} aria-label={t('list_actions.view')}>
        <ViewIcon />
      </Link>
      <a
        href={`/loans/${loan.id}/print`}
        target="_blank"
        rel="noopener noreferrer"
        className={iconClass}
        title={t('detail.print')}
        aria-label={t('detail.print')}
      >
        <PrintIcon />
      </a>
      {isOpen && perms?.canBankLoan && isModuleEnabled('bankLoans') && (
        <Link
          to={`/bank-loans/record?loanId=${loan.id}`}
          className={iconClass}
          title={t('list_actions.bank_loan')}
          aria-label={t('list_actions.bank_loan')}
        >
          <BankIcon />
        </Link>
      )}
      {isOpen && perms?.canRenew && (
        <Link
          to={`/renewals/record?loanId=${loan.id}`}
          className={iconClass}
          title={t('list_actions.renew')}
          aria-label={t('list_actions.renew')}
        >
          <RenewIcon />
        </Link>
      )}
      {isOpen && perms?.canClose && (
        <Link
          to={`/loans/${loan.id}/close`}
          className={iconClass}
          title={t('list_actions.close')}
          aria-label={t('list_actions.close')}
        >
          <CloseLoanIcon />
        </Link>
      )}
      {isOpen && perms?.canPartialPay && (
        <Link
          to={`/part-payments/record?loanId=${loan.id}`}
          className={cn(iconClass, loan.bankDepositStatus ? 'pointer-events-none opacity-40' : '')}
          title={t('list_actions.part_payment')}
          aria-label={t('list_actions.part_payment')}
        >
          <PaymentIcon />
        </Link>
      )}
    </div>
  );
}

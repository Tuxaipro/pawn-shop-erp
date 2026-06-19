import type { TFunction } from 'i18next';

const TIME_CODES: Record<number, 'week' | 'month' | 'year' | 'days'> = {
  1: 'week',
  2: 'month',
  3: 'year',
  4: 'days',
};

/** Format loan condition agreement text (legacy show/print parity). */
export function formatLoanConditionText(
  loan: {
    loanCondition: number;
    loanConditionDeadlineMonth?: number;
    conditionTimeType?: number;
  },
  t: TFunction<'loan'>
): string {
  if (loan.loanCondition === 2) {
    return t('condition.agreement_general');
  }

  const deadline = loan.loanConditionDeadlineMonth ?? '';
  const timeCode = loan.conditionTimeType ? TIME_CODES[loan.conditionTimeType] : undefined;
  const timeLabel = timeCode ? t(`condition.time_${timeCode}`) : '';
  return `${t('condition.mortgaged_prefix')} ${deadline} ${timeLabel} ${t('condition.agreement_personal')}`.trim();
}

/** Legacy interestCalculationAmt() — pure calculation with optional part payments */

export function calculateInterestMonths(loanDate: Date, asOf: Date = new Date()) {
  const start = new Date(loanDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(asOf);
  end.setHours(0, 0, 0, 0);

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    days += new Date(end.getFullYear(), end.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  let totMonth = years * 12 + months;
  if (days > 0) {
    totMonth += days <= 3 ? 0.5 : 1;
  } else if (days === 0 && totMonth === 0) {
    totMonth = 0.5;
  }

  return { years, months, days, totMonth };
}

export function calculateInterestAmount(
  loanAmount: number,
  interestRate: number,
  loanDate: Date,
  partPaymentTotal = 0,
  asOf: Date = new Date()
) {
  if (loanAmount <= 0) {
    return { status: 0 as const, error: 'Invalid loan amount' };
  }

  const { years, months, days, totMonth } = calculateInterestMonths(loanDate, asOf);

  if (totMonth <= 0) {
    return { status: 0 as const, error: 'Invalid total amount' };
  }

  const perMonthInterest = (loanAmount * interestRate) / 100;
  const interestAmount = Math.round(totMonth * perMonthInterest);
  const totalPayable = Math.round(loanAmount + interestAmount);
  const netPayable = Math.max(0, totalPayable - partPaymentTotal);

  return {
    status: 1 as const,
    loanAmount,
    interestAmount,
    totalPayable,
    netPayable,
    totalMonths: totMonth,
    partPaymentTotal,
    dateBreakdown: `years = ${years}, months = ${months}, days = ${days}`,
    halfMonthInterest: Math.round(perMonthInterest / 2),
  };
}

export function calculatePartPaymentRemaining(
  loanAmount: number,
  interestRate: number,
  loanDate: Date,
  existingPayments: number[],
  asOf: Date = new Date()
) {
  const partPaymentTotal = existingPayments.reduce((s, a) => s + a, 0);
  const calc = calculateInterestAmount(loanAmount, interestRate, loanDate, partPaymentTotal, asOf);
  if (calc.status === 0) return calc;
  return {
    ...calc,
    remainingPayable: calc.netPayable,
  };
}

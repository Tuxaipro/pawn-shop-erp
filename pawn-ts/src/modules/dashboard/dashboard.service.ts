import { prisma } from '../../lib/prisma.js';
import { dec } from '../../lib/loan-helper.js';
import {
  formatDateOnly,
  parseDateOnly,
  localCalendarDate,
  utcDayRangeFromCalendarDate,
  localTimestampDayRange,
  addCalendarDays,
} from '../../lib/loan-dates.js';
import * as accountsService from '../accounts/accounts.service.js';

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

async function collectionsInRange(branchId: number, start: Date, end: Date) {
  const [partAgg, settledLoans] = await Promise.all([
    prisma.loanPartPayment.aggregate({
      where: { payDate: { gte: start, lt: end }, loan: { branchId } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.loan.findMany({
      where: {
        branchId,
        isSettled: { in: [1, 2] },
        loanSettledDate: { gte: start, lt: end },
      },
      include: { topUpDetails: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
  ]);

  let settlementAmount = 0;
  for (const loan of settledLoans) {
    const topUp = loan.topUpDetails[0];
    settlementAmount += topUp ? dec(topUp.totPayAmt) : dec(loan.settledAmount);
  }

  const partAmount = dec(partAgg._sum.amount ?? 0);
  return {
    amount: partAmount + settlementAmount,
    count: partAgg._count + settledLoans.length,
  };
}

async function partPaymentsInRange(branchId: number, start: Date, end: Date) {
  const agg = await prisma.loanPartPayment.aggregate({
    where: { payDate: { gte: start, lt: end }, loan: { branchId } },
    _sum: { amount: true },
    _count: true,
  });
  return { amount: dec(agg._sum.amount ?? 0), count: agg._count };
}

async function settlementInterestInRange(branchId: number, start: Date, end: Date) {
  const loans = await prisma.loan.findMany({
    where: {
      branchId,
      isSettled: { in: [1, 2] },
      loanSettledDate: { gte: start, lt: end },
    },
    include: { topUpDetails: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  let total = 0;
  for (const loan of loans) {
    const topUp = loan.topUpDetails[0];
    if (topUp) total += dec(topUp.interestAmt);
  }
  return total;
}

async function interestCollectedInRange(branchId: number, start: Date, end: Date) {
  const [part, settlementInterest] = await Promise.all([
    partPaymentsInRange(branchId, start, end),
    settlementInterestInRange(branchId, start, end),
  ]);
  return { amount: part.amount + settlementInterest, count: part.count };
}

async function releasedLoansInRange(branchId: number, start: Date, end: Date) {
  const loans = await prisma.loan.findMany({
    where: { branchId, isSettled: 1, loanSettledDate: { gte: start, lt: end } },
    include: { topUpDetails: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  let amount = 0;
  for (const loan of loans) {
    const topUp = loan.topUpDetails[0];
    amount += topUp ? dec(topUp.totPayAmt) : dec(loan.settledAmount);
  }
  return { count: loans.length, amount };
}

async function expensesInRange(branchId: number, start: Date, end: Date) {
  const agg = await prisma.incomeExpense.aggregate({
    where: { branchId, category: { in: [2, 3] }, entryDate: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return dec(agg._sum.amount ?? 0);
}

async function branchEnterpriseMetrics(branchId: number, refDate = new Date()) {
  const todayStr = localCalendarDate(refDate);
  const yesterdayStr = addCalendarDays(todayStr, -1);
  const { start: dateStart, end: dateEnd } = utcDayRangeFromCalendarDate(todayStr);
  const { start: yesterdayStart, end: yesterdayEnd } = utcDayRangeFromCalendarDate(yesterdayStr);
  const { start: tsStart, end: tsEnd } = localTimestampDayRange(refDate);
  const yesterdayRef = new Date(refDate);
  yesterdayRef.setDate(yesterdayRef.getDate() - 1);
  const { start: tsYesterdayStart, end: tsYesterdayEnd } = localTimestampDayRange(yesterdayRef);

  const monthStart = startOfMonth(refDate);
  const monthEnd = endOfMonth(refDate);
  const weekAheadStr = addCalendarDays(todayStr, 7);
  const { start: weekAheadEnd } = utcDayRangeFromCalendarDate(weekAheadStr);

  const openWhere = { branchId, isSettled: 0 };
  const overdueWhere = { ...openWhere, renewalDate: { lt: dateStart } };
  const dueTodayWhere = { ...openWhere, renewalDate: { gte: dateStart, lt: dateEnd } };
  const renewalDueWhere = { ...openWhere, renewalDate: { gte: dateStart, lt: weekAheadEnd } };
  const npaWhere = { ...openWhere, defaultStatus: true };

  const [
    newCustomersToday,
    newCustomersYesterday,
    newLoansToday,
    newLoansTodayAgg,
    newLoansYesterday,
    openCount,
    overdueCount,
    dueTodayCount,
    renewalDueCount,
    npaCount,
    auctionEligibleCount,
    openLoansAgg,
    goldAgg,
    silverAgg,
    bankPledgedAgg,
    auctionStockAgg,
    releasedWeightAgg,
    releasedToday,
    bankOpen,
    bankDepositsOpen,
    bankDistinct,
    bankMaturityAgg,
    bankOverdueCount,
    auctionNotices,
    auctionLegalWaiting,
    auctionScheduled,
    auctionCompleted,
    auctionUpcoming,
    todayIncomeAgg,
    todayExpense,
    monthIncomeAgg,
    monthExpenseAgg,
    interestToday,
    interestYesterday,
    partialToday,
    partialYesterday,
    investmentSummary,
    recentOverdue,
    openDeposits,
    loansMonthCount,
    interestMonthAgg,
    openByStatus,
    renewedCount,
    closedCount,
    auctionedCount,
    recentLoans,
    recentPayments,
    recentDeposits,
    recentRenewals,
  ] = await Promise.all([
    prisma.customer.count({
      where: {
        isDeleted: false,
        createdOn: { gte: tsStart, lt: tsEnd },
        loans: { some: { branchId } },
      },
    }),
    prisma.customer.count({
      where: {
        isDeleted: false,
        createdOn: { gte: tsYesterdayStart, lt: tsYesterdayEnd },
        loans: { some: { branchId } },
      },
    }),
    prisma.loan.count({ where: { branchId, loanDate: { gte: dateStart, lt: dateEnd } } }),
    prisma.loan.aggregate({
      where: { branchId, loanDate: { gte: dateStart, lt: dateEnd } },
      _sum: { loanAmount: true },
    }),
    prisma.loan.count({ where: { branchId, loanDate: { gte: yesterdayStart, lt: yesterdayEnd } } }),
    prisma.loan.count({ where: openWhere }),
    prisma.loan.count({ where: overdueWhere }),
    prisma.loan.count({ where: dueTodayWhere }),
    prisma.loan.count({ where: renewalDueWhere }),
    prisma.loan.count({ where: npaWhere }),
    prisma.loan.count({
      where: { ...overdueWhere, auctionNotice: null },
    }),
    prisma.loan.aggregate({ where: openWhere, _sum: { loanAmount: true } }),
    prisma.loan.aggregate({
      where: { ...openWhere, commodityTypeId: 1 },
      _sum: { netWeightGold: true },
      _count: true,
    }),
    prisma.loan.aggregate({
      where: { ...openWhere, commodityTypeId: 2 },
      _sum: { netWeightSilver: true },
      _count: true,
    }),
    prisma.loan.aggregate({
      where: { ...openWhere, bankDeposits: { some: { isBankSettled: false } } },
      _sum: { netWeightGold: true, netWeightSilver: true },
      _count: true,
    }),
    prisma.loan.aggregate({
      where: {
        branchId,
        isSettled: 0,
        auctionNotice: { status: { in: ['pending', 'notified', 'sold'] } },
      },
      _sum: { netWeightGold: true, netWeightSilver: true },
      _count: true,
    }),
    prisma.loan.aggregate({
      where: { branchId, isSettled: 1, loanSettledDate: { gte: monthStart, lt: dateEnd } },
      _sum: { netWeightGold: true, netWeightSilver: true },
    }),
    releasedLoansInRange(branchId, dateStart, dateEnd),
    prisma.bankDeposit.count({ where: { isBankSettled: false, loan: { branchId } } }),
    prisma.bankDeposit.aggregate({
      where: { isBankSettled: false, loan: { branchId } },
      _sum: { depositAmount: true },
    }),
    prisma.bankDeposit.groupBy({
      by: ['bankName'],
      where: { isBankSettled: false, loan: { branchId } },
    }),
    prisma.bankDeposit.aggregate({
      where: {
        isBankSettled: false,
        loan: { branchId },
        closingDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { depositAmount: true },
    }),
    prisma.bankDeposit.count({
      where: {
        isBankSettled: false,
        loan: { branchId },
        closingDate: { lt: dateStart },
      },
    }),
    prisma.auctionNotice.count({
      where: { status: { in: ['pending', 'notified'] }, loan: { branchId } },
    }),
    prisma.auctionNotice.count({
      where: { legalNoticeSent: false, status: { not: 'completed' }, loan: { branchId } },
    }),
    prisma.auctionNotice.count({
      where: { auctionDate: { gte: dateStart }, status: { in: ['notified', 'sold'] }, loan: { branchId } },
    }),
    prisma.auctionNotice.count({
      where: { status: 'completed', loan: { branchId } },
    }),
    prisma.auctionNotice.findMany({
      where: { status: { in: ['pending', 'notified'] }, loan: { branchId } },
      include: {
        loan: { select: { invoiceNo: true, customer: { select: { name: true } } } },
      },
      orderBy: { auctionDate: 'asc' },
      take: 5,
    }),
    prisma.incomeExpense.aggregate({
      where: { branchId, category: 1, entryDate: { gte: dateStart, lt: dateEnd } },
      _sum: { amount: true },
    }),
    expensesInRange(branchId, dateStart, dateEnd),
    prisma.incomeExpense.aggregate({
      where: { branchId, category: 1, entryDate: { gte: monthStart, lt: dateEnd } },
      _sum: { amount: true },
    }),
    prisma.incomeExpense.aggregate({
      where: { branchId, category: { in: [2, 3] }, entryDate: { gte: monthStart, lt: dateEnd } },
      _sum: { amount: true },
    }),
    interestCollectedInRange(branchId, dateStart, dateEnd),
    interestCollectedInRange(branchId, yesterdayStart, yesterdayEnd),
    partPaymentsInRange(branchId, dateStart, dateEnd),
    partPaymentsInRange(branchId, yesterdayStart, yesterdayEnd),
    prisma.investment.aggregate({ where: { branchId, status: 'active' }, _sum: { amount: true } }),
    prisma.loan.findMany({
      where: overdueWhere,
      include: { customer: { select: { name: true } } },
      orderBy: { renewalDate: 'asc' },
      take: 5,
    }),
    prisma.bankDeposit.findMany({
      where: { isBankSettled: false, loan: { branchId } },
      include: { loan: { select: { invoiceNo: true, customer: { select: { name: true } } } } },
      orderBy: { depositDate: 'desc' },
      take: 5,
    }),
    prisma.loan.count({ where: { branchId, loanDate: { gte: monthStart, lt: dateEnd } } }),
    prisma.loanPartPayment.aggregate({
      where: { payDate: { gte: monthStart, lt: dateEnd }, loan: { branchId } },
      _sum: { amount: true },
    }),
    prisma.loan.count({ where: { branchId, isSettled: 0 } }),
    prisma.loan.count({ where: { branchId, isSettled: 2 } }),
    prisma.loan.count({ where: { branchId, isSettled: 1 } }),
    prisma.loan.count({
      where: { branchId, auctionNotice: { status: 'completed' } },
    }),
    prisma.loan.findMany({
      where: { branchId, loanDate: { gte: dateStart, lt: dateEnd } },
      include: { customer: { select: { name: true } } },
      orderBy: { createdOn: 'desc' },
      take: 5,
    }),
    prisma.loanPartPayment.findMany({
      where: { payDate: { gte: dateStart, lt: dateEnd }, loan: { branchId } },
      include: { loan: { select: { invoiceNo: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.bankDeposit.findMany({
      where: { createdOn: { gte: tsStart, lt: tsEnd }, loan: { branchId } },
      orderBy: { createdOn: 'desc' },
      take: 5,
    }),
    prisma.loan.findMany({
      where: { branchId, isSettled: 2, loanSettledDate: { gte: dateStart, lt: dateEnd } },
      orderBy: { loanSettledDate: 'desc' },
      take: 5,
    }),
  ]);

  const todayIncome = dec(todayIncomeAgg._sum.amount ?? 0);
  const monthIncome = dec(monthIncomeAgg._sum.amount ?? 0);
  const monthExpense = dec(monthExpenseAgg._sum.amount ?? 0);
  const monthInterest = dec(interestMonthAgg._sum.amount ?? 0);

  const cashPosition = await accountsService.getDailyBalance(todayStr, branchId);

  const bankPledgedWeight =
    dec(bankPledgedAgg._sum.netWeightGold ?? 0) + dec(bankPledgedAgg._sum.netWeightSilver ?? 0);
  const auctionWeight =
    dec(auctionStockAgg._sum.netWeightGold ?? 0) + dec(auctionStockAgg._sum.netWeightSilver ?? 0);
  const releasedWeight =
    dec(releasedWeightAgg._sum.netWeightGold ?? 0) + dec(releasedWeightAgg._sum.netWeightSilver ?? 0);

  const totalLoansStatus = openByStatus + renewedCount + closedCount;
  const loanStatusPie = [
    { label: 'open', count: openByStatus, pct: totalLoansStatus ? Math.round((openByStatus / totalLoansStatus) * 100) : 0 },
    { label: 'renewed', count: renewedCount, pct: totalLoansStatus ? Math.round((renewedCount / totalLoansStatus) * 100) : 0 },
    { label: 'auction', count: auctionedCount, pct: totalLoansStatus ? Math.round((auctionedCount / totalLoansStatus) * 100) : 0 },
    { label: 'closed', count: closedCount, pct: totalLoansStatus ? Math.round((closedCount / totalLoansStatus) * 100) : 0 },
  ];

  const goldW = dec(goldAgg._sum.netWeightGold ?? 0);
  const silverW = dec(silverAgg._sum.netWeightSilver ?? 0);
  const totalMetal = goldW + silverW || 1;
  const itemDistribution = [
    { label: 'gold', pct: Math.round((goldW / totalMetal) * 100) },
    { label: 'silver', pct: Math.round((silverW / totalMetal) * 100) },
    { label: 'diamond', pct: 0 },
    { label: 'others', pct: Math.max(0, 100 - Math.round((goldW / totalMetal) * 100) - Math.round((silverW / totalMetal) * 100)) },
  ];

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyCollections: { label: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dStr = addCalendarDays(todayStr, -i);
    const { start, end } = utcDayRangeFromCalendarDate(dStr);
    const col = await collectionsInRange(branchId, start, end);
    const d = parseDateOnly(dStr);
    dailyCollections.push({ label: dayLabels[d.getUTCDay()], amount: col.amount });
  }

  const loanTrend: { label: string; count: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const count = await prisma.loan.count({
      where: { branchId, loanDate: { gte: d, lte: end } },
    });
    loanTrend.push({
      label: d.toLocaleString('en-IN', { month: 'short' }),
      count,
    });
  }

  const activity: { time: string; message: string }[] = [];
  for (const l of recentLoans) {
    activity.push({
      time: l.createdOn.toISOString().slice(11, 16),
      message: `Loan #${l.invoiceNo} created — ${l.customer.name}`,
    });
  }
  for (const p of recentPayments) {
    activity.push({
      time: p.createdAt.toISOString().slice(11, 16),
      message: `Interest ${dec(p.amount).toLocaleString('en-IN')} collected — #${p.loan.invoiceNo}`,
    });
  }
  for (const d of recentDeposits) {
    activity.push({
      time: d.createdOn.toISOString().slice(11, 16),
      message: `Bank deposit ${dec(d.depositAmount).toLocaleString('en-IN')} — ${d.bankName}`,
    });
  }
  for (const r of recentRenewals) {
    activity.push({
      time: r.loanSettledDate?.toISOString().slice(11, 16) ?? '',
      message: `Loan #${r.invoiceNo} renewed`,
    });
  }
  activity.sort((a, b) => b.time.localeCompare(a.time));

  const insights: string[] = [];
  const custDelta = pctChange(newCustomersToday, newCustomersYesterday);
  if (custDelta != null && custDelta > 0) insights.push(`${custDelta}% more customers than yesterday.`);
  if (dueTodayCount > 0) insights.push(`${dueTodayCount} loans are due today.`);
  if (renewalDueCount > 0) insights.push(`${renewalDueCount} renewals due within 7 days.`);
  if (bankOverdueCount > 0) insights.push(`${bankOverdueCount} bank deposit(s) past maturity.`);
  if (auctionNotices > 0) {
    const risk = dec(openLoansAgg._sum.loanAmount ?? 0) * 0.03;
    insights.push(`Auction risk approx ${Math.round(risk).toLocaleString('en-IN')}.`);
  }
  const loanTarget = Math.max(loansMonthCount, 10);
  const interestTarget = Math.max(monthInterest, 10000);
  const profitTarget = Math.max(monthIncome - monthExpense, 10000);

  const alerts = [
    ...(auctionNotices > 0
      ? [{ level: 'critical' as const, message: 'Auction notices', count: auctionNotices, href: '/auctions' }]
      : []),
    ...(renewalDueCount > 0
      ? [{ level: 'warning' as const, message: 'Renewals due', count: renewalDueCount, href: '/renewals' }]
      : []),
    ...(bankMaturityAgg._sum.depositAmount
      ? [{
          level: 'caution' as const,
          message: 'Bank maturities this month',
          count: bankOverdueCount || 1,
          href: '/bank-loans',
        }]
      : []),
    ...(bankOverdueCount > 0
      ? [{ level: 'warning' as const, message: 'Overdue bank deposits', count: bankOverdueCount, href: '/bank-loans' }]
      : []),
    ...(overdueCount > 0
      ? [{ level: 'info' as const, message: 'Overdue loans', count: overdueCount, href: '/renewals' }]
      : []),
  ];

  return {
    branchId,
    daily: {
      newCustomers: newCustomersToday,
      newLoans: newLoansToday,
      todayIncome,
      todayExpense,
      todayNet: todayIncome - todayExpense,
      interestCollection: interestToday.amount,
      cashInHand: cashPosition.cashInHand,
      auctionAlerts: auctionNotices,
    },
    monthly: {
      revenue: monthIncome,
      expense: monthExpense,
      profit: monthIncome - monthExpense,
      outstanding: dec(openLoansAgg._sum.loanAmount ?? 0),
      investments: dec(investmentSummary._sum.amount ?? 0),
    },
    stock: {
      goldWeight: goldW,
      silverWeight: silverW,
      goldLoans: goldAgg._count,
      silverLoans: silverAgg._count,
    },
    counts: {
      openLoans: openCount,
      overdueLoans: overdueCount,
      openBankDeposits: bankOpen,
      pendingAuctions: auctionNotices,
    },
    widgets: {
      pendingRenewals: overdueCount,
      openBankDeposits: bankOpen,
      pendingAuctions: auctionNotices,
      auctionNotices: auctionUpcoming.map((a) => ({
        id: Number(a.id),
        loanId: Number(a.loanId),
        invoiceNo: Number(a.loan.invoiceNo),
        customerName: a.loan.customer.name,
        auctionDate: a.auctionDate ? formatDateOnly(a.auctionDate) : null,
        status: a.status,
      })),
      recentOverdue: recentOverdue.map((r) => ({
        id: Number(r.id),
        invoiceNo: Number(r.invoiceNo),
        customerName: r.customer.name,
        renewalDate: formatDateOnly(r.renewalDate),
        loanAmount: dec(r.loanAmount),
      })),
      openBankDepositsList: openDeposits.map((d) => ({
        id: Number(d.id),
        invoiceNo: Number(d.loan.invoiceNo),
        customerName: d.loan.customer?.name ?? '',
        bankName: d.bankName,
        depositAmount: dec(d.depositAmount),
        depositDate: d.depositDate ? formatDateOnly(d.depositDate) : null,
      })),
    },
    openLoans: openCount,
    overdueLoans: overdueCount,
    totalOutstanding: dec(openLoansAgg._sum.loanAmount ?? 0),
    openBankDeposits: bankOpen,
    pendingAuctions: auctionNotices,
    todayIncome,
    enterprise: {
      today: {
        newCustomers: newCustomersToday,
        newCustomersDeltaPct: pctChange(newCustomersToday, newCustomersYesterday),
        newLoans: newLoansToday,
        newLoansAmount: dec(newLoansTodayAgg._sum.loanAmount ?? 0),
        newLoansDeltaPct: pctChange(newLoansToday, newLoansYesterday),
        interestCollected: interestToday.amount,
        interestDeltaPct: pctChange(interestToday.amount, interestYesterday.amount),
        partialPayments: partialToday.count,
        partialPaymentsAmount: partialToday.amount,
        releasedLoans: releasedToday.count,
        releasedAmount: releasedToday.amount,
        expenses: todayExpense,
      },
      financial: {
        cashInHand: cashPosition.cashInHand,
        cashChange: cashPosition.cashInHand - cashPosition.openingBalance,
        bankBalance: dec(bankDepositsOpen._sum.depositAmount ?? 0),
        outstandingLoans: dec(openLoansAgg._sum.loanAmount ?? 0),
        investments: dec(investmentSummary._sum.amount ?? 0),
        monthlyProfit: monthIncome - monthExpense,
        todayNet: todayIncome - todayExpense,
      },
      inventory: {
        gold: { weight: goldW, loans: goldAgg._count },
        silver: { weight: silverW, loans: silverAgg._count },
        bankPledged: { weight: bankPledgedWeight, loans: bankPledgedAgg._count },
        auctionStock: { weight: auctionWeight, loans: auctionStockAgg._count },
        released: { weight: releasedWeight },
      },
      portfolio: {
        openLoans: openCount,
        dueToday: dueTodayCount,
        overdue: overdueCount,
        renewalDue: renewalDueCount,
        npa: npaCount,
        auctionEligible: auctionEligibleCount,
      },
      bankRepledge: {
        activeBanks: bankDistinct.length,
        batches: bankOpen,
        outstanding: dec(bankDepositsOpen._sum.depositAmount ?? 0),
        maturityThisMonth: dec(bankMaturityAgg._sum.depositAmount ?? 0),
        overdue: bankOverdueCount,
      },
      auction: {
        notices: auctionNotices,
        legalWaiting: auctionLegalWaiting,
        scheduled: auctionScheduled,
        completed: auctionCompleted,
      },
      charts: {
        dailyCollections,
        loanTrend,
        goldVsSilver: { gold: goldW, silver: silverW },
        incomeVsExpense: { income: monthIncome, expense: monthExpense },
        loanStatus: loanStatusPie,
        itemDistribution,
      },
      alerts,
      insights,
      activity: activity.slice(0, 10),
      kpi: [
        { label: 'loans', pct: Math.min(100, Math.round((loansMonthCount / loanTarget) * 100)) },
        { label: 'interest', pct: Math.min(100, Math.round((monthInterest / interestTarget) * 100)) },
        { label: 'profit', pct: Math.min(100, Math.round(((monthIncome - monthExpense) / profitTarget) * 100)) },
      ],
      interestToday: interestToday.amount,
      loansToday: newLoansToday,
    },
  };
}

export async function getDashboardSummary(
  branchId: number,
  options?: { includeAllBranches?: boolean; includeBranchRow?: boolean }
) {
  const summary = await branchEnterpriseMetrics(branchId);

  let branchPerformance: Array<{
    branchId: number;
    branchName: string;
    branchCode: string;
    openLoans: number;
    overdueLoans: number;
    outstanding: number;
    todayNet: number;
    monthProfit: number;
    loansToday: number;
    interestToday: number;
    cashInHand: number;
  }> = [];

  if (options?.includeAllBranches) {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    branchPerformance = await Promise.all(
      branches.map(async (b) => {
        const m = await branchEnterpriseMetrics(b.id);
        return {
          branchId: b.id,
          branchName: b.name,
          branchCode: b.code,
          openLoans: m.counts.openLoans,
          overdueLoans: m.counts.overdueLoans,
          outstanding: m.monthly.outstanding,
          todayNet: m.daily.todayNet,
          monthProfit: m.monthly.profit,
          loansToday: m.enterprise.today.newLoans,
          interestToday: m.enterprise.interestToday,
          cashInHand: m.daily.cashInHand,
        };
      })
    );
  } else if (options?.includeBranchRow) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (branch) {
      branchPerformance = [
        {
          branchId: branch.id,
          branchName: branch.name,
          branchCode: branch.code,
          openLoans: summary.counts.openLoans,
          overdueLoans: summary.counts.overdueLoans,
          outstanding: summary.monthly.outstanding,
          todayNet: summary.daily.todayNet,
          monthProfit: summary.monthly.profit,
          loansToday: summary.enterprise.today.newLoans,
          interestToday: summary.enterprise.interestToday,
          cashInHand: summary.daily.cashInHand,
        },
      ];
    }
  }

  const branchComparison = branchPerformance.map((b) => ({
    name: b.branchName,
    value: b.interestToday,
  }));

  const branchMap = branchPerformance.map((b) => ({
    name: b.branchName,
    outstanding: b.outstanding,
  }));

  return {
    ...summary,
    branchPerformance: branchPerformance.length > 0 ? branchPerformance : undefined,
    enterprise: {
      ...summary.enterprise,
      charts: {
        ...summary.enterprise.charts,
        branchComparison,
      },
      branchMap,
    },
  };
}

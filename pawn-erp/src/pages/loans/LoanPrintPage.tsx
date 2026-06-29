import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { loansApi } from '../../api/loans';
import { LoanItemQr } from '../../components/LoanItemQr';
import { useBranch } from '../../context/BranchContext';
import { useModuleSettings } from '../../context/ModuleSettingsContext';
import { formatAmountInWords } from '../../lib/amountInWords';
import { formatLoanConditionText } from '../../lib/loanConditionText';
import { localizedCommodity, localizedItemNames } from '../../lib/localizedItem';

type LoanPrintData = NonNullable<Awaited<ReturnType<typeof loansApi.get>>>;

function formatPrintDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-');
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}

function formatMoney(value: number) {
  return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function branchContactLines(branch: LoanPrintData['branch'], t: TFunction<'loan'>) {
  const lines: string[] = [];
  const contacts: string[] = [];
  if (branch.landline) contacts.push(`${t('print.landline')}: ${branch.landline}`);
  if (branch.phone) contacts.push(`${t('print.cell')}: ${branch.phone}`);
  if (branch.whatsapp) contacts.push(`${t('print.whatsapp')}: ${branch.whatsapp}`);
  if (contacts.length) lines.push(contacts.join(', '));
  return lines;
}

function LabelBox({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`border border-black text-[12px] leading-tight ${className}`}>
      <span className="inline-block bg-black px-1 py-px text-white">{label}</span>
      <span className="inline-block whitespace-nowrap px-1 py-px font-semibold">{value}</span>
    </div>
  );
}

function PrintCopy({
  loan,
  copyLabel,
  t,
  language,
  pageBreakAfter = false,
}: {
  loan: LoanPrintData;
  copyLabel: string;
  t: TFunction<'loan'>;
  language: string | undefined;
  pageBreakAfter?: boolean;
}) {
  const conditionText = formatLoanConditionText(loan, t);
  const isClosed = loan.settlementStatus === 1;
  const branch = loan.branch;
  const org = loan.organization;
  const qrEnabled = org.qrCodesEnabled ?? false;
  const contactLines = branchContactLines(branch, t);

  return (
    <section
      className={`loan-print-copy mb-4 border border-zinc-200 p-2 last:mb-0${pageBreakAfter ? ' print-page-break' : ''}`}
    >
      <table className="mb-2 w-full border-collapse text-[12px] leading-tight">
        <tbody>
          <tr>
            <td className="w-[24%] align-top">
              <LabelBox label={t('print.loan_date')} value={formatPrintDate(loan.loanDate)} className="mb-1" />
              <div className="border border-black text-[17px] font-bold leading-tight">
                <span className="inline-block bg-black px-1 py-px text-[12px] text-white">
                  {t('print.receipt_no')}
                </span>
                <span className="inline-block px-1">{loan.invoiceNo}</span>
              </div>
            </td>
            <td className="px-2 text-center align-top">
              <p className="text-[15px] font-bold leading-tight">
                {isClosed ? t('print.close_title') : t('print.title')}
              </p>
              <p className="mt-0.5 text-[15px] font-bold leading-tight">{org.companyName}</p>
              {branch.address && (
                <p className="text-[12px] font-semibold leading-4">{branch.address}</p>
              )}
              {org.proprietor && (
                <p className="text-[12px] font-semibold leading-4">{org.proprietor}</p>
              )}
              {contactLines.map((line) => (
                <p key={line} className="text-[12px] font-semibold leading-4">
                  {line}
                </p>
              ))}
            </td>
            <td className="w-[24%] align-top text-right">
              <LabelBox
                label={t('print.rupees')}
                value={formatMoney(loan.loanAmount)}
                className="ml-auto inline-block text-right"
              />
              <p className="mt-1 text-[12px] font-bold">{copyLabel}</p>
              {qrEnabled && loan.qrCode && (
                <div className="mt-2 flex justify-end">
                  <LoanItemQr value={loan.qrCode} size={72} />
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="mb-2 w-full border-collapse border border-zinc-200 text-[12px] leading-tight">
        <thead>
          <tr>
            <th colSpan={3} className="border border-zinc-300 bg-zinc-50 px-1 py-1 text-center font-bold">
              {t('print.pledge_heading')}
            </th>
          </tr>
          <tr>
            <td className="w-6 border border-zinc-300 px-1 py-0.5">1</td>
            <td className="w-40 border border-zinc-300 px-1 py-0.5">{t('print.name_mobile')}</td>
            <th className="border border-zinc-300 px-1 py-0.5 text-left font-bold">
              {loan.customer.name} / {loan.customer.mobileNo || '—'}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-zinc-300 px-1 py-0.5">2</td>
            <td className="border border-zinc-300 px-1 py-0.5">
              {t('print.father_address')}
              <br />
              {t('print.address')}
            </td>
            <td className="border border-zinc-300 px-1 py-0.5 font-bold">
              {loan.customer.fatherHusbandName}
              <br />
              {loan.customer.address1}
            </td>
          </tr>
          <tr>
            <td className="border border-zinc-300 px-1 py-0.5">3</td>
            <td className="border border-zinc-300 px-1 py-0.5">{t('print.date')}</td>
            <td className="border border-zinc-300 px-1 py-0.5 font-bold">
              {formatPrintDate(loan.loanDate)}
            </td>
          </tr>
          <tr>
            <td className="border border-zinc-300 px-1 py-0.5">5</td>
            <td className="border border-zinc-300 px-1 py-0.5">{t('print.capital_amount')}</td>
            <td className="border border-zinc-300 px-1 py-0.5 font-bold">
              {t('print.rupees_prefix')} {formatMoney(loan.loanAmount)}
              {loan.loanAmountWords ? ` (${formatAmountInWords(loan.loanAmountWords)})` : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="mb-1 text-center text-[12px] font-bold">{t('print.jewel_details')}</h2>
      <table className="w-full border-collapse border border-zinc-300 text-[11px] leading-tight">
        <thead>
          <tr className="bg-zinc-50">
            <th className="border border-zinc-300 px-0.5 py-0.5">{t('print.sl_no')}</th>
            <th className="border border-zinc-300 px-0.5 py-0.5">{t('print.commodity_type')}</th>
            <th className="border border-zinc-300 px-0.5 py-0.5">{t('print.commodity_sub_type')}</th>
            <th className="border border-zinc-300 px-0.5 py-0.5">{t('print.item_division')}</th>
            <th className="border border-zinc-300 px-0.5 py-0.5">{t('print.purity')}</th>
            <th className="border border-zinc-300 px-0.5 py-0.5">{t('print.qty')}</th>
            <th className="border border-zinc-300 px-0.5 py-0.5">{t('print.net_weight')}</th>
          </tr>
        </thead>
        <tbody>
          {loan.items.map((item, index) => {
            const names = localizedItemNames(item, language);
            return (
            <tr key={item.id}>
              <td className="border border-zinc-300 px-0.5 py-0.5 text-center">{index + 1}</td>
              <td className="border border-zinc-300 px-0.5 py-0.5">
                {localizedCommodity(loan.commodityTypeCode, loan.commodityTypeLabel, language)}
              </td>
              <td className="border border-zinc-300 px-0.5 py-0.5">{names.subCategory}</td>
              <td className="border border-zinc-300 px-0.5 py-0.5">{names.item}</td>
              <td className="border border-zinc-300 px-0.5 py-0.5">
                {loan.commodityTypeCode === 'silver' ? t('collateral.purity_na') : names.purity}
              </td>
              <td className="border border-zinc-300 px-0.5 py-0.5 text-center">{item.noOfItems}</td>
              <td className="border border-zinc-300 px-0.5 py-0.5 text-center">{item.netWeight}</td>
            </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-2 text-[11px] leading-3.5 font-bold text-fuchsia-900">{conditionText}</p>
      <p className="mt-4 text-right text-[12px] font-bold">{t('print.signature')}</p>
    </section>
  );
}

export function LoanPrintPage() {
  const { t, i18n } = useTranslation('loan');
  const { branchId } = useBranch();
  const { receiptLanguage } = useModuleSettings();
  // Receipts always print in the configured receipt language, not the UI language.
  const printT = i18n.getFixedT(receiptLanguage, 'loan');
  const { id } = useParams<{ id: string }>();
  const loanId = Number(id);

  const { data: loan, isLoading, error } = useQuery({
    queryKey: ['loans', branchId, loanId],
    queryFn: () => loansApi.get(loanId, branchId),
    enabled: !Number.isNaN(loanId),
  });

  useEffect(() => {
    if (loan) {
      const timer = window.setTimeout(() => window.print(), 300);
      return () => window.clearTimeout(timer);
    }
  }, [loan]);

  if (isLoading) return <p className="p-6 text-sm text-zinc-500">{t('loading')}</p>;
  if (error || !loan) {
    return <p className="p-6 text-red-600">{(error as Error)?.message ?? t('not_found')}</p>;
  }

  return (
    <div className="loan-print-root loan-print-page mx-auto max-w-[1170px] bg-white p-3 text-zinc-950">
      <div className="mb-3 flex items-center justify-between print:hidden">
        <Link to={`/loans/${loan.id}`} className="text-sm font-medium text-zinc-600 no-underline hover:underline">
          ← {t('detail.back')}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          {t('detail.print')}
        </button>
      </div>

      <PrintCopy
        loan={loan}
        copyLabel={printT('print.customer_copy')}
        t={printT}
        language={receiptLanguage}
        pageBreakAfter
      />
      <PrintCopy
        loan={loan}
        copyLabel={printT('print.company_copy')}
        t={printT}
        language={receiptLanguage}
      />

      <style>{`
        @media print {
          @page { margin: 8mm; size: auto; }
          html, body { height: auto !important; margin: 0; padding: 0; background: white; }
          body * { visibility: hidden; }
          .loan-print-root, .loan-print-root * { visibility: visible; }
          .loan-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .loan-print-page { max-width: none; padding: 0; }
          .loan-print-copy { padding: 0; border: none; margin-bottom: 0; }
          .print-page-break { break-after: page; page-break-after: always; }
          .loan-print-copy:last-child { break-after: avoid; page-break-after: avoid; }
        }
      `}</style>
    </div>
  );
}

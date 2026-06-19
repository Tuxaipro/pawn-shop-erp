import { FormEvent, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { customersApi, type Customer } from '../../api/customers';
import { loansApi, type LoanFormData, type LoanItemInput } from '../../api/loans';
import { useBranch } from '../../context/BranchContext';
import { useToast } from '../../context/ToastContext';
import { amountInWords, formatAmountInWords } from '../../lib/amountInWords';
import { cn } from '../../lib/cn';
import { localizedName } from '../../lib/localizedName';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Field, Input, Label, RequiredLabel, Select } from '../../components/ui/Input';

function CustomerSummary({
  customer,
  onChange,
}: {
  customer: Customer;
  onChange?: () => void;
}) {
  const { t } = useTranslation(['customer', 'loan']);
  return (
    <div className="flex items-start gap-3 rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-950/5">
      {customer.photoUrl ? (
        <img
          src={customer.photoUrl}
          alt={customer.name}
          className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-zinc-950/10"
        />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-lg font-semibold text-zinc-600">
          {customer.name.charAt(0)}
        </span>
      )}
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium text-zinc-950">
          {customer.name}
          <span className="font-normal text-zinc-500"> · #{customer.customerId}</span>
        </p>
        <p className="text-zinc-600">{customer.fatherHusbandName}</p>
        <p className="text-zinc-600">{customer.mobileNo || '—'}</p>
        {customer.isBlacklisted && (
          <p className="mt-1 text-xs font-medium text-amber-700">{t('fields.blacklisted_status')}</p>
        )}
        {onChange && (
          <button
            type="button"
            className="mt-1 text-xs font-medium text-zinc-500 underline hover:text-zinc-950"
            onClick={onChange}
          >
            {t('change')}
          </button>
        )}
      </div>
    </div>
  );
}

const emptyItem = (commodityType: LoanFormData['commodityType'] = 'gold'): LoanItemInput => ({
  subCategoryId: 0,
  itemId: 0,
  purityId: commodityType === 'gold' ? 1 : 0,
  noOfItems: 1,
  netWeight: 0,
});

function isItemRowComplete(
  item: LoanItemInput,
  commodityType: LoanFormData['commodityType']
): boolean {
  const base =
    item.subCategoryId > 0 && item.itemId > 0 && item.noOfItems > 0 && item.netWeight > 0;
  if (commodityType === 'silver') return base;
  return base && item.purityId > 0;
}

interface LoanFormProps {
  initial?: Partial<LoanFormData> & { interest?: number };
  submitLabel: string;
  requirePin?: boolean;
  onSubmit: (data: LoanFormData & { securityPin?: string; interest?: number }) => Promise<void>;
  onCancel: () => void;
}

export function LoanForm({ initial, submitLabel, requirePin, onSubmit, onCancel }: LoanFormProps) {
  const { t, i18n } = useTranslation(['loan', 'customer', 'common']);
  const toast = useToast();
  const { branchId } = useBranch();
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    initial?.customerId ?? null
  );
  const [form, setForm] = useState<LoanFormData>({
    customerId: initial?.customerId ?? 0,
    invoiceNo: initial?.invoiceNo ?? 0,
    loanDate: initial?.loanDate ?? new Date().toISOString().slice(0, 10),
    commodityType: initial?.commodityType ?? 'gold',
    loanCondition: initial?.loanCondition ?? 'general',
    loanConditionDeadlineMonth: initial?.loanConditionDeadlineMonth,
    conditionTimeType: initial?.conditionTimeType,
    loanCustomerType: initial?.loanCustomerType ?? 'general',
    loanAmount: initial?.loanAmount ?? 0,
    loanAmountWords:
      initial?.loanAmount && initial.loanAmount > 0
        ? amountInWords(initial.loanAmount)
        : initial?.loanAmountWords
          ? formatAmountInWords(initial.loanAmountWords)
          : '',
    items: initial?.items?.length ? initial.items : [emptyItem(initial?.commodityType ?? 'gold')],
  });
  const [interest, setInterest] = useState(initial?.interest ?? 0);
  const [securityPin, setSecurityPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [itemOptions, setItemOptions] = useState<
    Record<number, Array<{ id: number; name: string; nameEn: string; nameTa?: string }>>
  >({});

  const { data: options } = useQuery({
    queryKey: ['loans', 'form-options', form.commodityType],
    queryFn: () => loansApi.formOptions(form.commodityType),
  });

  const trimmedQuery = customerQuery.trim();
  const canSearch =
    trimmedQuery.length >= 2 || (/^\d+$/.test(trimmedQuery) && trimmedQuery.length >= 1);

  const { data: customerResults } = useQuery({
    queryKey: ['customers', 'search', trimmedQuery],
    queryFn: () => customersApi.search(trimmedQuery),
    enabled: canSearch && !initial?.customerId,
  });

  const { data: selectedCustomer } = useQuery({
    queryKey: ['customers', selectedCustomerId],
    queryFn: () => customersApi.get(selectedCustomerId!),
    enabled: !!selectedCustomerId,
  });

  const update = <K extends keyof LoanFormData>(field: K, value: LoanFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setLoanCondition = (loanCondition: LoanFormData['loanCondition']) => {
    setForm((prev) => ({
      ...prev,
      loanCondition,
      loanConditionDeadlineMonth: undefined,
      conditionTimeType: undefined,
    }));
  };

  const timeTypeLabel = (code: string) =>
    t(`condition.time_${code}` as 'condition.time_week');

  const setLoanAmount = (loanAmount: number) => {
    setForm((prev) => ({
      ...prev,
      loanAmount,
      loanAmountWords: loanAmount > 0 ? amountInWords(loanAmount) : '',
    }));
  };

  const updateItem = (index: number, patch: Partial<LoanItemInput>) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], ...patch };
      return { ...prev, items };
    });
  };

  const loadSubItems = async (
    index: number,
    subCategoryId: number,
    commodityType: LoanFormData['commodityType'] = form.commodityType
  ) => {
    if (!subCategoryId) return;
    const items = await loansApi.subItems(subCategoryId, commodityType);
    setItemOptions((prev) => ({ ...prev, [index]: items }));
    if (items.length > 0) {
      setForm((prev) => {
        const next = [...prev.items];
        const current = next[index];
        if (!current.itemId) {
          next[index] = { ...current, itemId: items[0].id };
        }
        return { ...prev, items: next };
      });
    }
  };

  useEffect(() => {
    initial?.items?.forEach((item, index) => {
      if (item.subCategoryId) loadSubItems(index, item.subCategoryId);
    });
  }, [initial?.items, form.commodityType]);

  const { data: calculatedInterest } = useQuery({
    queryKey: [
      'loans',
      'interest',
      branchId,
      form.loanAmount,
      form.commodityType,
      form.loanCustomerType,
    ],
    queryFn: () =>
      loansApi.calculateInterest(branchId, {
        loanAmount: form.loanAmount,
        commodityType: form.commodityType,
        loanCustomerType: form.loanCustomerType,
      }),
    enabled: form.loanAmount > 0,
    staleTime: 0,
  });

  useEffect(() => {
    if (form.loanAmount <= 0) {
      setInterest(0);
      return;
    }
    if (calculatedInterest != null) {
      setInterest(calculatedInterest.interestRate);
    }
  }, [form.loanAmount, calculatedInterest]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedCustomerId) {
      setError(t('errors.select_customer'));
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        customerId: selectedCustomerId,
        items: form.items.map((item) => ({
          ...item,
          purityId: form.commodityType === 'silver' ? 0 : item.purityId,
        })),
        securityPin: requirePin ? securityPin : undefined,
        interest: requirePin ? interest : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common:errors.save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const subCategories =
    options?.subCategories.filter((s) =>
      form.commodityType === 'gold' ? s.commodityTypeId === 1 : s.commodityTypeId === 2
    ) ?? [];

  const goldNetWt =
    form.commodityType === 'gold'
      ? form.items.reduce((sum, item) => sum + (Number(item.netWeight) || 0), 0)
      : 0;
  const silverNetWt =
    form.commodityType === 'silver'
      ? form.items.reduce((sum, item) => sum + (Number(item.netWeight) || 0), 0)
      : 0;

  const isGold = form.commodityType === 'gold';
  const collateralGrid = isGold
    ? form.items.length > 1
      ? 'grid grid-cols-[minmax(0,1.35fr)_minmax(0,1.35fr)_minmax(0,1fr)_4.25rem_4.75rem_auto] gap-3'
      : 'grid grid-cols-[minmax(0,1.35fr)_minmax(0,1.35fr)_minmax(0,1fr)_4.25rem_4.75rem] gap-3'
    : form.items.length > 1
      ? 'grid grid-cols-[minmax(0,1.35fr)_minmax(0,1.35fr)_4.25rem_4.75rem_auto] gap-3'
      : 'grid grid-cols-[minmax(0,1.35fr)_minmax(0,1.35fr)_4.25rem_4.75rem] gap-3';

  const handleAddRow = () => {
    const incomplete = form.items.some((item) => !isItemRowComplete(item, form.commodityType));
    if (incomplete) {
      toast(t('errors.complete_collateral_row'), 'error');
      return;
    }
    update('items', [...form.items, emptyItem(form.commodityType)]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)] xl:items-start">
      <Card className="h-fit self-start p-4">
        <CardTitle>{t('sections.customer')}</CardTitle>
        <div className="mt-3 space-y-2">
          {!initial?.customerId && !selectedCustomerId && (
            <>
              <Input
                placeholder={t('placeholders.search_customer')}
                value={customerQuery}
                onChange={(e) => setCustomerQuery(e.target.value)}
              />
              {canSearch && customerResults && customerResults.length > 0 && (
                <ul className="overflow-hidden rounded-xl ring-1 ring-zinc-950/10">
                  {customerResults.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-50"
                        onClick={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerQuery('');
                        }}
                      >
                        {c.photoUrl ? (
                          <img
                            src={c.photoUrl}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-zinc-950/10"
                          />
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-200 text-sm font-semibold text-zinc-600">
                            {c.name.charAt(0)}
                          </span>
                        )}
                        <span>
                          <span className="font-medium text-zinc-950">{c.name}</span>
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            {c.fatherHusbandName}
                            {c.mobileNo ? ` · ${c.mobileNo}` : ''} · #{c.customerId}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {canSearch && customerResults && customerResults.length === 0 && (
                <p className="text-sm text-zinc-500">{t('placeholders.no_customers')}</p>
              )}
            </>
          )}
          {selectedCustomer && (
            <CustomerSummary
              customer={selectedCustomer}
              onChange={
                initial?.customerId
                  ? undefined
                  : () => {
                      setSelectedCustomerId(null);
                      setCustomerQuery('');
                    }
              }
            />
          )}
        </div>
      </Card>

      <Card className="p-4">
        <CardTitle>{t('sections.loan_details')}</CardTitle>
        <div className="mt-3 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('fields.receipt_no')} required>
              <Input
                type="number"
                value={form.invoiceNo || ''}
                onChange={(e) => update('invoiceNo', Number(e.target.value))}
                required
              />
            </Field>
            <Field label={t('fields.loan_date')} required>
              <Input
                type="date"
                value={form.loanDate}
                max={options?.maxLoanDate}
                onChange={(e) => update('loanDate', e.target.value)}
                required
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('fields.commodity')} required>
              <Select
                value={form.commodityType}
                onChange={(e) =>
                  update('commodityType', e.target.value as LoanFormData['commodityType'])
                }
              >
                <option value="gold">{t('commodity.gold')}</option>
                <option value="silver">{t('commodity.silver')}</option>
              </Select>
            </Field>
            <Field label={t('fields.customer_type')} required>
              <Select
                value={form.loanCustomerType}
                onChange={(e) =>
                  update('loanCustomerType', e.target.value as LoanFormData['loanCustomerType'])
                }
              >
                <option value="general">{t('customer_type.general')}</option>
                <option value="other">{t('customer_type.other')}</option>
              </Select>
            </Field>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
              <div className="space-y-2">
                <Label>
                  <RequiredLabel required>{t('fields.condition')}</RequiredLabel>
                </Label>
                <div className="flex flex-wrap items-center gap-5">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-950">
                    <input
                      type="radio"
                      name="loanCondition"
                      value="personal"
                      checked={form.loanCondition === 'personal'}
                      onChange={() => setLoanCondition('personal')}
                      className="h-4 w-4 border-zinc-300 text-amber-700 focus:ring-amber-600"
                    />
                    {t('condition.personal')}
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-zinc-950">
                    <input
                      type="radio"
                      name="loanCondition"
                      value="general"
                      checked={form.loanCondition === 'general'}
                      onChange={() => setLoanCondition('general')}
                      className="h-4 w-4 border-zinc-300 text-amber-700 focus:ring-amber-600"
                    />
                    {t('condition.general')}
                  </label>
                </div>
              </div>
              {form.loanCondition === 'personal' && (
                <>
                  <Field label={t('fields.duration')} required className="w-25">
                    <Input
                      type="number"
                      min={1}
                      value={form.loanConditionDeadlineMonth ?? ''}
                      onChange={(e) =>
                        update('loanConditionDeadlineMonth', Number(e.target.value))
                      }
                      required
                    />
                  </Field>
                  <Field label={t('fields.time_unit')} required className="w-48">
                    <Select
                      value={form.conditionTimeType ?? ''}
                      onChange={(e) => update('conditionTimeType', Number(e.target.value))}
                      required
                    >
                      <option value="">{t('condition.select_time')}</option>
                      {options?.conditionTimeTypes.map((timeType) => (
                        <option key={timeType.id} value={timeType.id}>
                          {timeTypeLabel(timeType.code)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </>
              )}
            </div>
            {form.loanCondition === 'general' && (
              <p className="text-sm font-semibold text-fuchsia-700">
                {t('condition.agreement_general')}
              </p>
            )}
            {form.loanCondition === 'personal' && (
              <p className="text-sm font-semibold text-fuchsia-700">
                {t('condition.mortgaged_prefix')}{' '}
                {t('condition.agreement_personal')}
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('fields.loan_amount')} required>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.loanAmount || ''}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                required
              />
            </Field>
            <Field label={t('fields.interest_rate')}>
              <Input
                type="text"
                value={form.loanAmount > 0 ? interest : ''}
                readOnly
                className="bg-zinc-50"
                placeholder={t('placeholders.enter_loan_amount')}
              />
            </Field>
          </div>
          <Field label={t('fields.amount_words')}>
            <Input
              value={form.loanAmountWords}
              readOnly
              className="bg-zinc-50 text-sm"
              placeholder={t('placeholders.amount_words')}
            />
          </Field>
        </div>
      </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <CardTitle>{t('sections.collateral')}</CardTitle>
          <Button type="button" variant="secondary" onClick={handleAddRow}>
            + {t('collateral.add_row')}
          </Button>
        </div>
        <div>
          <div className={cn(collateralGrid, 'mb-1.5 text-xs font-medium text-zinc-500')}>
            <span>
              <RequiredLabel required>{t('collateral.sub_category')}</RequiredLabel>
            </span>
            <span>
              <RequiredLabel required>{t('collateral.item')}</RequiredLabel>
            </span>
            {isGold && (
              <span>
                <RequiredLabel required>{t('collateral.purity')}</RequiredLabel>
              </span>
            )}
            <span>
              <RequiredLabel required>{t('collateral.qty')}</RequiredLabel>
            </span>
            <span>
              <RequiredLabel required>{t('collateral.net_wt')}</RequiredLabel>
            </span>
            {form.items.length > 1 && <span />}
          </div>
          {form.items.map((item, index) => (
            <div
              key={index}
              className={cn(
                collateralGrid,
                'items-start',
                index > 0 && 'border-t border-zinc-100 pt-2'
              )}
            >
              <Select
                className="min-w-0"
                value={item.subCategoryId || ''}
                onChange={(e) => {
                  const subCategoryId = Number(e.target.value);
                  updateItem(index, { subCategoryId, itemId: 0 });
                  void loadSubItems(index, subCategoryId);
                }}
                required
              >
                <option value="">{t('common:select')}</option>
                {subCategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {localizedName(s, i18n.language)}
                  </option>
                ))}
              </Select>
              <Select
                className="min-w-0"
                value={item.itemId || ''}
                onChange={(e) => updateItem(index, { itemId: Number(e.target.value) })}
                required
              >
                <option value="">{t('common:select')}</option>
                {(itemOptions[index] ?? []).map((i) => (
                  <option key={i.id} value={i.id}>
                    {localizedName(i, i18n.language)}
                  </option>
                ))}
              </Select>
              {isGold && (
                <Select
                  className="min-w-0"
                  value={item.purityId || ''}
                  onChange={(e) => updateItem(index, { purityId: Number(e.target.value) })}
                  required
                >
                  <option value="">{t('common:select')}</option>
                  {options?.purities.map((p) => (
                    <option key={p.id} value={p.id}>
                      {i18n.language.startsWith('ta') ? p.nameTn || p.nameEn : p.nameEn}
                    </option>
                  ))}
                </Select>
              )}
              <Input
                type="number"
                min={1}
                value={item.noOfItems}
                onChange={(e) => updateItem(index, { noOfItems: Number(e.target.value) })}
                required
              />
              <Input
                type="number"
                step="0.001"
                min="0.001"
                value={item.netWeight || ''}
                onChange={(e) => updateItem(index, { netWeight: Number(e.target.value) })}
                required
              />
              {form.items.length > 1 && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => update('items', form.items.filter((_, i) => i !== index))}
                >
                  {t('collateral.remove')}
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-3 border-t border-zinc-100 pt-4">
          {form.commodityType === 'gold' && (
            <Field label={t('fields.gold_net_wt')} className="w-48">
              <Input
                type="text"
                readOnly
                className="bg-zinc-50"
                value={goldNetWt > 0 ? goldNetWt.toFixed(3) : ''}
                placeholder="—"
              />
            </Field>
          )}
          {form.commodityType === 'silver' && (
            <Field label={t('fields.silver_net_wt')} className="w-48">
              <Input
                type="text"
                readOnly
                className="bg-zinc-50"
                value={silverNetWt > 0 ? silverNetWt.toFixed(3) : ''}
                placeholder="—"
              />
            </Field>
          )}
        </div>
      </Card>

      {requirePin && (
        <Card className="p-4">
          <CardTitle>{t('sections.security')}</CardTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t('fields.security_pin')} required>
              <Input
                type="password"
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-zinc-500">{t('fields.security_pin_hint')}</p>
            </Field>
            <Field label={t('fields.interest_editable')}>
              <Input
                type="number"
                step="0.01"
                value={interest}
                onChange={(e) => setInterest(Number(e.target.value))}
                required
              />
            </Field>
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t('common:actions.cancel')}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t('saving') : submitLabel}
        </Button>
      </div>
    </form>
  );
}

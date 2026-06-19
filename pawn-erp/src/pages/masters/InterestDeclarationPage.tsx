import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { mastersApi } from '../../api/masters';
import { useBranch } from '../../context/BranchContext';
import { localizedName } from '../../lib/localizedName';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { EditAction } from '../../components/ui/RowActions';
import { Field, Input, Select } from '../../components/ui/Input';
import { Section } from '../../components/ui/Section';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

export function InterestDeclarationPage() {
  const { t, i18n } = useTranslation('masters');
  const { branchId, currentBranch } = useBranch();
  const queryClient = useQueryClient();
  const [commodityTypeId, setCommodityTypeId] = useState<number | ''>('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [genRate, setGenRate] = useState('');
  const [otherRate, setOtherRate] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editGen, setEditGen] = useState('');
  const [editOther, setEditOther] = useState('');
  const [error, setError] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['masters', 'categories'],
    queryFn: () => mastersApi.categories.list(),
  });

  const { data: slabs = [], isLoading } = useQuery({
    queryKey: ['masters', 'interest-declarations', branchId, commodityTypeId],
    queryFn: () => mastersApi.interestDeclarations.list(branchId, Number(commodityTypeId)),
    enabled: !!commodityTypeId,
  });

  const { data: nextMin } = useQuery({
    queryKey: ['masters', 'interest-next-min', branchId, commodityTypeId],
    queryFn: () => mastersApi.interestDeclarations.nextMin(branchId, Number(commodityTypeId)),
    enabled: !!commodityTypeId,
  });

  useEffect(() => {
    if (nextMin && commodityTypeId && !editId) {
      setMinAmount(String(nextMin.minAmount));
    }
  }, [nextMin, commodityTypeId, editId]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['masters', 'interest-declarations'] });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof mastersApi.interestDeclarations.create>[1]) =>
      mastersApi.interestDeclarations.create(branchId, data),
    onSuccess: () => {
      setMaxAmount('');
      setGenRate('');
      setOtherRate('');
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['masters', 'interest-next-min'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, gen, other }: { id: number; gen: number; other: number }) =>
      mastersApi.interestDeclarations.update(id, branchId, {
        taxPercentageGenCus: gen,
        taxPercentageOtherShop: other,
      }),
    onSuccess: () => {
      setEditId(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!commodityTypeId) return;
    createMutation.mutate({
      commodityTypeId: Number(commodityTypeId),
      minAmount: Number(minAmount),
      maxAmount: Number(maxAmount),
      taxPercentageGenCus: Number(genRate),
      taxPercentageOtherShop: Number(otherRate),
    });
  };

  return (
    <div data-testid="master-interest-page">
      {currentBranch && (
        <p className="mb-4 text-sm text-zinc-600">
          {t('interest.branch_hint', { branch: currentBranch.name })}
        </p>
      )}
      <Section title={t('interest.add_title')}>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5" data-testid="interest-add-form">
          <Field label={t('fields.category')} required>
            <Select
              data-testid="interest-category-select"
              value={commodityTypeId}
              onChange={(e) => setCommodityTypeId(e.target.value ? Number(e.target.value) : '')}
              required
            >
              <option value="">{t('fields.select_category')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {localizedName(c, i18n.language)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('fields.min_amount')} required>
            <Input
              data-testid="interest-min-input"
              type="number"
              min={0}
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              required
              readOnly
            />
          </Field>
          <Field label={t('fields.max_amount')} required>
            <Input
              data-testid="interest-max-input"
              type="number"
              min={1}
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              required
            />
          </Field>
          <Field label={t('fields.general_rate')} required>
            <Input
              data-testid="interest-gen-rate-input"
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={genRate}
              onChange={(e) => setGenRate(e.target.value)}
              required
            />
          </Field>
          <Field label={t('fields.other_shop_rate')} required>
            <Input
              data-testid="interest-other-rate-input"
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              value={otherRate}
              onChange={(e) => setOtherRate(e.target.value)}
              required
            />
          </Field>
          <div className="flex items-end sm:col-span-2 lg:col-span-5">
            <Button type="submit" disabled={!commodityTypeId || createMutation.isPending} data-testid="interest-add-btn">
              {t('actions.add_slab')}
            </Button>
          </div>
        </form>
        {error && <div className="mt-3"><Alert>{error}</Alert></div>}
        <p className="mt-2 text-xs text-zinc-500">{t('interest.hint')}</p>
      </Section>

      <div className="mt-8">
        <Section title={t('interest.list_title')}>
          {!commodityTypeId ? (
            <p className="text-sm text-zinc-500">{t('interest.select_category_first')}</p>
          ) : isLoading ? (
            <p className="text-sm text-zinc-500">{t('common:loading', { ns: 'common' })}</p>
          ) : (
            <TableCard data-testid="interest-table">
              <DataTable>
                <THead>
                  <tr>
                    <TH>{t('fields.min_amount')}</TH>
                    <TH>{t('fields.max_amount')}</TH>
                    <TH>{t('fields.general_rate')} %</TH>
                    <TH>{t('fields.other_shop_rate')} %</TH>
                    <TH></TH>
                  </tr>
                </THead>
                <TBody>
                  {slabs.map((row) => (
                    <tr key={row.id}>
                      <TD>₹{row.minAmount.toLocaleString()}</TD>
                      <TD>₹{row.maxAmount.toLocaleString()}</TD>
                      <TD>
                        {editId === row.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editGen}
                            onChange={(e) => setEditGen(e.target.value)}
                            className="w-24"
                          />
                        ) : (
                          `${row.taxPercentageGenCus}%`
                        )}
                      </TD>
                      <TD>
                        {editId === row.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editOther}
                            onChange={(e) => setEditOther(e.target.value)}
                            className="w-24"
                          />
                        ) : (
                          `${row.taxPercentageOtherShop}%`
                        )}
                      </TD>
                      <TD>
                        {editId === row.id ? (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              onClick={() =>
                                updateMutation.mutate({
                                  id: row.id,
                                  gen: Number(editGen),
                                  other: Number(editOther),
                                })
                              }
                            >
                              {t('actions.save')}
                            </Button>
                            <Button type="button" variant="secondary" onClick={() => setEditId(null)}>
                              {t('actions.cancel')}
                            </Button>
                          </div>
                        ) : (
                          <EditAction
                            label={t('actions.edit_rates')}
                            onEdit={() => {
                              setEditId(row.id);
                              setEditGen(String(row.taxPercentageGenCus));
                              setEditOther(String(row.taxPercentageOtherShop));
                            }}
                          />
                        )}
                      </TD>
                    </tr>
                  ))}
                </TBody>
              </DataTable>
            </TableCard>
          )}
        </Section>
      </div>
    </div>
  );
}

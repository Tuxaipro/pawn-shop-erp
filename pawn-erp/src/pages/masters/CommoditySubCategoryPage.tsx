import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { mastersApi, BilingualNameInput } from '../../api/masters';
import { localizedName } from '../../lib/localizedName';
import { StatusToggle } from '../../components/masters/StatusToggle';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { RowActions } from '../../components/ui/RowActions';
import { Field, Input, Select } from '../../components/ui/Input';
import { Section } from '../../components/ui/Section';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

const emptyNames = (): BilingualNameInput => ({ nameEn: '', nameTa: '' });

export function CommoditySubCategoryPage() {
  const { t, i18n } = useTranslation('masters');
  const queryClient = useQueryClient();
  const [filterCategoryId, setFilterCategoryId] = useState<number | ''>('');
  const [commodityTypeId, setCommodityTypeId] = useState<number | ''>('');
  const [names, setNames] = useState(emptyNames);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNames, setEditNames] = useState(emptyNames);
  const [error, setError] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['masters', 'categories'],
    queryFn: () => mastersApi.categories.list(),
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['masters', 'sub-categories', filterCategoryId],
    queryFn: () =>
      mastersApi.subCategories.list(filterCategoryId ? Number(filterCategoryId) : undefined),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['masters', 'sub-categories'] });

  const createMutation = useMutation({
    mutationFn: (data: BilingualNameInput & { commodityTypeId: number }) =>
      mastersApi.subCategories.create(data),
    onSuccess: () => {
      setNames(emptyNames());
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BilingualNameInput }) =>
      mastersApi.subCategories.update(id, data),
    onSuccess: () => {
      setEditId(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => mastersApi.subCategories.toggleStatus(id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mastersApi.subCategories.delete(id),
    onSuccess: invalidate,
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!commodityTypeId) return;
    createMutation.mutate({
      commodityTypeId: Number(commodityTypeId),
      nameEn: names.nameEn.trim(),
      nameTa: (names.nameTa ?? '').trim(),
    });
  };

  return (
    <div data-testid="master-sub-category-page">
      <Section title={t('sub_categories.add_title')}>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="sub-category-add-form">
          <Field label={t('fields.category')} required>
            <Select
              data-testid="sub-category-category-select"
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
          <Field label={t('fields.name_en')} required>
            <Input
              data-testid="sub-category-name-en-input"
              value={names.nameEn}
              onChange={(e) => setNames((n) => ({ ...n, nameEn: e.target.value }))}
              required
              maxLength={200}
            />
          </Field>
          <Field label={t('fields.name_ta')}>
            <Input
              data-testid="sub-category-name-ta-input"
              value={names.nameTa}
              onChange={(e) => setNames((n) => ({ ...n, nameTa: e.target.value }))}
              maxLength={200}
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={createMutation.isPending} data-testid="sub-category-add-btn">
              {t('actions.add')}
            </Button>
          </div>
        </form>
        {error && <div className="mt-3"><Alert>{error}</Alert></div>}
      </Section>

      <div className="mt-8">
        <Section
          title={t('sub_categories.list_title')}
          action={
            <Select
              value={filterCategoryId}
              onChange={(e) => setFilterCategoryId(e.target.value ? Number(e.target.value) : '')}
              className="!w-44 shrink-0"
            >
              <option value="">{t('fields.all_categories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {localizedName(c, i18n.language)}
                </option>
              ))}
            </Select>
          }
        >
          {isLoading ? (
            <p className="text-sm text-zinc-500">{t('common:loading', { ns: 'common' })}</p>
          ) : (
            <TableCard data-testid="sub-category-table">
              <DataTable>
                <THead>
                  <tr>
                    <TH>{t('fields.category')}</TH>
                    <TH>{t('fields.name_en')}</TH>
                    <TH>{t('fields.name_ta')}</TH>
                    <TH>{t('fields.status')}</TH>
                    <TH></TH>
                  </tr>
                </THead>
                <TBody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <TD>{row.commodityTypeNameEn || row.commodityTypeName}</TD>
                      <TD>
                        {editId === row.id ? (
                          <Input
                            value={editNames.nameEn}
                            onChange={(e) => setEditNames((n) => ({ ...n, nameEn: e.target.value }))}
                            className="max-w-xs"
                          />
                        ) : (
                          row.nameEn
                        )}
                      </TD>
                      <TD>
                        {editId === row.id ? (
                          <Input
                            value={editNames.nameTa}
                            onChange={(e) => setEditNames((n) => ({ ...n, nameTa: e.target.value }))}
                            className="max-w-xs"
                          />
                        ) : (
                          row.nameTa || '—'
                        )}
                      </TD>
                      <TD>
                        <StatusToggle
                          active={row.status}
                          onToggle={() => toggleMutation.mutate(row.id)}
                        />
                      </TD>
                      <TD>
                        <div className="flex gap-2">
                          {editId === row.id ? (
                            <>
                              <Button
                                type="button"
                                onClick={() =>
                                  updateMutation.mutate({
                                    id: row.id,
                                    data: {
                                      nameEn: editNames.nameEn.trim(),
                                      nameTa: (editNames.nameTa ?? '').trim(),
                                    },
                                  })
                                }
                              >
                                {t('actions.save')}
                              </Button>
                              <Button type="button" variant="secondary" onClick={() => setEditId(null)}>
                                {t('actions.cancel')}
                              </Button>
                            </>
                          ) : (
                            <RowActions
                              onEdit={() => {
                                setEditId(row.id);
                                setEditNames({ nameEn: row.nameEn, nameTa: row.nameTa ?? '' });
                              }}
                              onDelete={() => deleteMutation.mutate(row.id)}
                              deleteMessage={t('confirm.delete')}
                              editLabel={t('actions.edit')}
                              deleteLabel={t('actions.delete')}
                            />
                          )}
                        </div>
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

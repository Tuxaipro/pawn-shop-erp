import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { mastersApi, BilingualNameInput } from '../../api/masters';
import { StatusToggle } from '../../components/masters/StatusToggle';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { RowActions } from '../../components/ui/RowActions';
import { Field, Input } from '../../components/ui/Input';
import { Section } from '../../components/ui/Section';
import { DataTable, TableCard, TBody, TD, TH, THead } from '../../components/ui/Table';

const emptyNames = (): BilingualNameInput => ({ nameEn: '', nameTa: '' });

export function CommodityCategoryPage() {
  const { t } = useTranslation('masters');
  const queryClient = useQueryClient();
  const [names, setNames] = useState(emptyNames);
  const [editId, setEditId] = useState<number | null>(null);
  const [editNames, setEditNames] = useState(emptyNames);
  const [error, setError] = useState('');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['masters', 'categories'],
    queryFn: () => mastersApi.categories.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['masters', 'categories'] });

  const createMutation = useMutation({
    mutationFn: (data: BilingualNameInput) => mastersApi.categories.create(data),
    onSuccess: () => {
      setNames(emptyNames());
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BilingualNameInput }) =>
      mastersApi.categories.update(id, data),
    onSuccess: () => {
      setEditId(null);
      invalidate();
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => mastersApi.categories.toggleStatus(id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => mastersApi.categories.delete(id),
    onSuccess: invalidate,
  });

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    createMutation.mutate({ nameEn: names.nameEn.trim(), nameTa: (names.nameTa ?? '').trim() });
  };

  return (
    <div data-testid="master-category-page">
      <Section title={t('categories.add_title')}>
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3" data-testid="category-add-form">
          <Field label={t('fields.name_en')} className="min-w-[200px] flex-1" required>
            <Input
              data-testid="category-name-en-input"
              value={names.nameEn}
              onChange={(e) => setNames((n) => ({ ...n, nameEn: e.target.value }))}
              required
              maxLength={50}
            />
          </Field>
          <Field label={t('fields.name_ta')} className="min-w-[200px] flex-1">
            <Input
              data-testid="category-name-ta-input"
              value={names.nameTa}
              onChange={(e) => setNames((n) => ({ ...n, nameTa: e.target.value }))}
              maxLength={50}
            />
          </Field>
          <Button type="submit" disabled={createMutation.isPending} data-testid="category-add-btn">
            {t('actions.add')}
          </Button>
        </form>
        {error && <div className="mt-3"><Alert>{error}</Alert></div>}
      </Section>

      <div className="mt-8">
      <Section title={t('categories.list_title')}>
        {isLoading ? (
          <p className="text-sm text-zinc-500">{t('common:loading', { ns: 'common' })}</p>
        ) : (
          <TableCard data-testid="category-table">
            <DataTable>
              <THead>
                <tr>
                  <TH>ID</TH>
                  <TH>{t('fields.name_en')}</TH>
                  <TH>{t('fields.name_ta')}</TH>
                  <TH>{t('fields.status')}</TH>
                  <TH></TH>
                </tr>
              </THead>
              <TBody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <TD>{row.id}</TD>
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
                        disabled={toggleMutation.isPending}
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
                              disabled={updateMutation.isPending}
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

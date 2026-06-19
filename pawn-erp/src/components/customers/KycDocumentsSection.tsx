import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { KycDocument, KycDocumentType } from '../../api/customers';
import { Button } from '../ui/Button';
import { DeleteAction } from '../ui/RowActions';
import { Field, Select } from '../ui/Input';

const DOC_TYPES: KycDocumentType[] = ['aadhaar', 'pan', 'address_proof', 'photo_id', 'other'];

interface KycDocumentsSectionProps {
  documents: KycDocument[];
  pendingFiles: Array<{ type: KycDocumentType; file: File }>;
  onAddPending: (type: KycDocumentType, file: File) => void;
  onRemovePending: (index: number) => void;
  onDeleteExisting?: (docId: number) => void;
  readOnly?: boolean;
}

export function KycDocumentsSection({
  documents,
  pendingFiles,
  onAddPending,
  onRemovePending,
  onDeleteExisting,
  readOnly,
}: KycDocumentsSectionProps) {
  const { t } = useTranslation('customer');
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<KycDocumentType>('aadhaar');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onAddPending(docType, file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex flex-wrap items-end gap-3">
          <Field label={t('kyc.type')}>
            <Select value={docType} onChange={(e) => setDocType(e.target.value as KycDocumentType)}>
              {DOC_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`kyc.types.${type}`)}
                </option>
              ))}
            </Select>
          </Field>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFile}
          />
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
            {t('kyc.upload')}
          </Button>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <ul className="space-y-2 text-sm">
          {pendingFiles.map((p, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
              <span>
                {t(`kyc.types.${p.type}`)} — {p.file.name} (pending)
              </span>
              {!readOnly && (
                <button type="button" className="text-red-600" onClick={() => onRemovePending(i)}>
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {documents.length === 0 && pendingFiles.length === 0 ? (
        <p className="text-sm text-zinc-500">{t('kyc.no_documents')}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2">
              <a href={d.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-zinc-950">
                {t(`kyc.types.${d.documentType as KycDocumentType}`, d.documentType)} — {d.fileName}
              </a>
              {!readOnly && onDeleteExisting && (
                <DeleteAction
                  onDelete={() => onDeleteExisting(d.id)}
                  deleteMessage={t('kyc.confirm_delete')}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

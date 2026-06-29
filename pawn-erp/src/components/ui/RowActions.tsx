import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import { cn } from '../../lib/cn';
import { DeleteIcon, EditIcon } from './icons';

const iconBase =
  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 disabled:cursor-not-allowed disabled:opacity-50';

const editClass = cn(iconBase, 'text-zinc-500 hover:bg-zinc-950/5 hover:text-zinc-950');
const deleteClass = cn(iconBase, 'text-zinc-500 hover:bg-red-50 hover:text-red-600');

type RowActionsProps = {
  onEdit?: () => void;
  editTo?: string;
  onDelete?: () => void;
  deleteMessage?: string;
  deleteTitle?: string;
  editLabel?: string;
  deleteLabel?: string;
  showEdit?: boolean;
  showDelete?: boolean;
};

export function RowActions({
  onEdit,
  editTo,
  onDelete,
  deleteMessage,
  deleteTitle,
  editLabel,
  deleteLabel,
  showEdit = true,
  showDelete = true,
}: RowActionsProps) {
  const { t } = useTranslation('common');
  const confirm = useConfirm();

  const editAriaLabel = editLabel ?? t('actions.edit');
  const deleteAriaLabel = deleteLabel ?? t('actions.delete');

  const handleDelete = async () => {
    if (!onDelete) return;
    const ok = await confirm({
      title: deleteTitle ?? t('confirm.delete_title'),
      message: deleteMessage ?? t('confirm.delete_message'),
      confirmLabel: t('actions.delete'),
      cancelLabel: t('actions.cancel'),
    });
    if (ok) onDelete();
  };

  return (
    <div className="flex items-center gap-0.5">
      {showEdit &&
        (editTo ? (
          <Link to={editTo} className={editClass} title={editAriaLabel} aria-label={editAriaLabel}>
            <EditIcon />
          </Link>
        ) : onEdit ? (
          <button type="button" className={editClass} onClick={onEdit} title={editAriaLabel} aria-label={editAriaLabel}>
            <EditIcon />
          </button>
        ) : null)}
      {showDelete && onDelete && (
        <button
          type="button"
          className={deleteClass}
          onClick={() => void handleDelete()}
          title={deleteAriaLabel}
          aria-label={deleteAriaLabel}
        >
          <DeleteIcon />
        </button>
      )}
    </div>
  );
}

/** Delete-only icon action with confirmation (e.g. KYC documents). */
export function DeleteAction({
  onDelete,
  deleteMessage,
  label,
}: {
  onDelete: () => void;
  deleteMessage?: string;
  label?: string;
}) {
  const { t } = useTranslation('common');
  const confirm = useConfirm();
  const deleteTitle = label ?? t('actions.delete');

  const handleDelete = async () => {
    const ok = await confirm({
      title: t('confirm.delete_title'),
      message: deleteMessage ?? t('confirm.delete_message'),
      confirmLabel: t('actions.delete'),
      cancelLabel: t('actions.cancel'),
    });
    if (ok) onDelete();
  };

  return (
    <button
      type="button"
      className={deleteClass}
      onClick={() => void handleDelete()}
      title={deleteTitle}
      aria-label={deleteTitle}
    >
      <DeleteIcon />
    </button>
  );
}

/** Edit-only icon action (e.g. inline rate edit). */
export function EditAction({ onEdit, label }: { onEdit: () => void; label?: string }) {
  const { t } = useTranslation('common');
  const editTitle = label ?? t('actions.edit');

  return (
    <button type="button" className={editClass} onClick={onEdit} title={editTitle} aria-label={editTitle}>
      <EditIcon />
    </button>
  );
}

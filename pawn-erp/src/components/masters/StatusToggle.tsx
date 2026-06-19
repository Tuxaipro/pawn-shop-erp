import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/Badge';

export function StatusToggle({
  active,
  onToggle,
  disabled,
}: {
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('masters');

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className="disabled:opacity-50"
      title={active ? t('actions.deactivate') : t('actions.activate')}
    >
      <Badge variant={active ? 'open' : 'closed'}>
        {active ? t('status.active') : t('status.inactive')}
      </Badge>
    </button>
  );
}

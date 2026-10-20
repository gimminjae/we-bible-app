import { Button } from '@/components/ui/button';
import { AppIcon } from '@/components/ui/feature';
import { useAppSettings } from '@/contexts/app-settings';

type DetailActionButtonProps = {
  action: 'edit' | 'delete';
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'solid' | 'outline';
  className?: string;
};

export function DetailActionButton({
  action,
  label,
  onPress,
  disabled = false,
  variant = 'solid',
  className = '',
}: DetailActionButtonProps) {
  const { theme } = useAppSettings();
  const isDelete = action === 'delete';

  return (
    <Button
      accessibilityLabel={label}
      onPress={onPress}
      isDisabled={disabled}
      action={isDelete ? 'negative' : 'primary'}
      variant={variant}
      className={`h-11 w-11 shrink-0 rounded-2xl p-0 ${className}`}
    >
      <AppIcon
        name={isDelete ? 'trash-outline' : 'create-outline'}
        size={20}
        onPrimary={!isDelete && variant === 'solid'}
        color={isDelete
          ? variant === 'solid' ? '#FFFFFF' : theme === 'dark' ? '#F87171' : '#EF4444'
          : undefined}
      />
    </Button>
  );
}

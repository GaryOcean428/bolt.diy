import { memo } from 'react';
import { IconButton } from '~/components/ui/IconButton';

interface SettingsButtonProps {
  onClick: () => void;
}

export const SettingsButton = memo(({ onClick }: SettingsButtonProps) => {
  return (
    <IconButton
      onClick={onClick}
      icon="i-ph:gear"
      size="xl"
      title="Settings"
      className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-button-secondary-backgroundHover rounded-md transition-all"
    />
  );
});

import React from 'react';
import { IconButton } from '~/components/ui/IconButton';
import WithTooltip from '~/components/ui/Tooltip';

export const ExportChatButton = ({ exportChat }: { exportChat?: () => void }) => {
  return (
    <WithTooltip tooltip="Export Chat">
      <IconButton title="Export Chat" onClick={() => exportChat?.()}>
        <div className="i-ph:download-simple text-xl"></div>
      </IconButton>
    </WithTooltip>
  );
};

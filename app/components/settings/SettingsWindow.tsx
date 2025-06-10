import * as RadixDialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { useState, type ReactElement } from 'react';
import styles from './Settings.module.scss';
import ConnectionsTab from './connections/ConnectionsTab';
import DataTab from './data/DataTab';
import DebugTab from './debug/DebugTab';
import EventLogsTab from './event-logs/EventLogsTab';
import FeaturesTab from './features/FeaturesTab';
import ProvidersTab from './providers/ProvidersTab';
import { DialogTitle, dialogVariants, dialogBackdropVariants } from '~/components/ui/Dialog';
import { IconButton } from '~/components/ui/IconButton';
import { useSettings } from '~/lib/hooks/useSettings';
import { classNames } from '~/utils/classNames';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
}

type TabType = 'features' | 'providers' | 'connections' | 'data' | 'debug' | 'event-logs' | 'connection';

export const SettingsWindow = ({ open, onClose }: SettingsProps) => {
  const { debug, eventLogs } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>('data');

  const getTabClassName = (isActive: boolean) => classNames(styles.tab, { [styles.active]: isActive });

  const tabs: { id: TabType; label: string; icon: string; component?: ReactElement }[] = [
    { id: 'features', label: 'Features', icon: 'i-ph:flag', component: <FeaturesTab /> },
    { id: 'providers', label: 'Providers', icon: 'i-ph:plug', component: <ProvidersTab /> },
    { id: 'connections', label: 'Connections', icon: 'i-ph:link', component: <ConnectionsTab /> },
    { id: 'data', label: 'Data', icon: 'i-ph:database', component: <DataTab /> },
    ...(debug ? [{ id: 'debug' as const, label: 'Debug', icon: 'i-ph:bug', component: <DebugTab /> }] : []),
    ...(eventLogs
      ? [{ id: 'event-logs' as const, label: 'Event Logs', icon: 'i-ph:list', component: <EventLogsTab /> }]
      : []),
  ];

  return (
    <RadixDialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay asChild>
          <motion.div
            className={styles.overlay}
            variants={dialogBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          />
        </RadixDialog.Overlay>
        <RadixDialog.Content asChild>
          <motion.div
            className={styles.content}
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className={styles.header}>
              <DialogTitle>Settings</DialogTitle>
              <IconButton icon="i-ph:x" onClick={onClose} className={styles.closeButton} aria-label="Close settings" />
            </div>
            <div className={styles.body}>
              <div className={styles.tabs}>
                {tabs.map(({ id, label, icon }) => (
                  <button key={id} onClick={() => setActiveTab(id)} className={getTabClassName(activeTab === id)}>
                    <i className={icon} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <div className={styles.tabContent}>{tabs.find((tab) => tab.id === activeTab)?.component}</div>
            </div>
          </motion.div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
};

import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { dialogBackdropVariants, dialogVariants } from '~/components/ui/Dialog';
import { IconButton } from '~/components/ui/IconButton';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  url?: string;
}

export const ShareModal = ({ open, onClose, url }: ShareModalProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[var(--z-dialog)]"
            variants={dialogBackdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-[500px] bg-bolt-elements-bg-depth-1 border border-bolt-elements-borderColor rounded-lg shadow-lg z-[var(--z-dialog)] p-6"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-xl font-semibold text-bolt-elements-textPrimary">Share</Dialog.Title>
              <IconButton
                icon="i-ph:x"
                onClick={onClose}
                className="text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-bg-depth-3 rounded-md transition-all"
                aria-label="Close dialog"
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label htmlFor="share-url" className="sr-only">
                  Share URL
                </label>
                <input
                  id="share-url"
                  type="text"
                  value={url}
                  readOnly
                  aria-label="Share URL"
                  title="Share URL"
                  className="w-full px-3 py-2 bg-bolt-elements-bg-depth-2 text-bolt-elements-textPrimary border border-bolt-elements-borderColor rounded-md focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text rounded-md hover:bg-bolt-elements-button-primary-backgroundHover transition-colors"
                aria-label={copied ? 'URL copied to clipboard' : 'Copy URL to clipboard'}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

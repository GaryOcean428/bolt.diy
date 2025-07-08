import { lazy } from 'react';
import React from 'react';
import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';

const HeaderActionButtons = lazy(() =>
  import('./HeaderActionButtons.client').then((m) => ({ default: m.HeaderActionButtons })),
);
const ChatDescription = lazy(() =>
  import('~/lib/persistence/ChatDescription.client').then((m) => ({ default: m.ChatDescription })),
);
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header
      className={classNames('flex items-center p-5 border-b h-[var(--header-height)]', {
        'border-transparent': !chat.started,
        'border-bolt-elements-borderColor': chat.started,
      })}
    >
      <div className="flex items-center gap-2 z-logo text-bolt-elements-textPrimary cursor-pointer">
        <div className="i-ph:sidebar-simple-duotone text-xl" />
        <a href="/" className="text-2xl font-semibold text-accent flex items-center">
          {/* <span className="i-bolt:logo-text?mask w-[46px] inline-block" /> */}
          <img src="/logo-light-styled.png" alt="logo" className="w-[90px] inline-block dark:hidden" />
          <img src="/logo-dark-styled.png" alt="logo" className="w-[90px] inline-block hidden dark:block" />
        </a>
      </div>
      {chat.started && ( // Display ChatDescription and HeaderActionButtons only when the chat has started.
        <>
          <span className="flex-1 px-4 truncate text-center text-bolt-elements-textPrimary">
            <ClientOnly>
              {() => (
                <React.Suspense fallback={<div>Loading...</div>}>
                  <ChatDescription />
                </React.Suspense>
              )}
            </ClientOnly>
          </span>
          <ClientOnly>
            {() => (
              <div className="mr-1">
                <React.Suspense fallback={<div>Loading...</div>}>
                  <HeaderActionButtons />
                </React.Suspense>
              </div>
            )}
          </ClientOnly>
        </>
      )}
    </header>
  );
}

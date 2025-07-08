import { json, type MetaFunction } from '@remix-run/node';
import { lazy } from 'react';
import React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';

const Chat = lazy(() =>
  import('~/components/chat/Chat.client').then((m) => ({ default: m.Chat })),
);
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export const loader = () => json({});

export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>
        {() => (
          <React.Suspense fallback={<BaseChat />}>
            <Chat />
          </React.Suspense>
        )}
      </ClientOnly>
    </div>
  );
}

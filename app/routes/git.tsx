import type { LoaderFunctionArgs } from '@remix-run/node';
import { json, type MetaFunction } from '@remix-run/node';
import { lazy } from 'react';
import React from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';

const GitUrlImport = lazy(() =>
  import('~/components/git/GitUrlImport.client').then((m) => ({ default: m.GitUrlImport })),
);
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [{ title: 'Bolt' }, { name: 'description', content: 'Talk with Bolt, an AI assistant from StackBlitz' }];
};

export async function loader(args: LoaderFunctionArgs) {
  return json({ url: args.params.url });
}

export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>
        {() => (
          <React.Suspense fallback={<BaseChat />}>
            <GitUrlImport />
          </React.Suspense>
        )}
      </ClientOnly>
    </div>
  );
}

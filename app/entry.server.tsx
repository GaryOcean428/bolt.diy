import type { AppLoadContext, EntryContext } from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { isbot } from 'isbot';
import { renderHeadToString } from 'remix-island';
import { Head } from './root';

// import { LLMManager } from '~/lib/modules/llm/manager';
import { themeStore } from '~/lib/stores/theme';

// Force Node.js rendering for Railway deployment
// The build process polyfills some globals which can interfere with runtime detection
// Since Railway is always Node.js, we can safely force the Node.js path
const isNode = true;

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  /*
   * Skip LLM manager initialization during SSR to avoid server errors
   * const manager = LLMManager.getInstance();
   * await manager.updateModelList({});
   */

  const head = renderHeadToString({ request, remixContext, Head });

  // For Node.js runtime (Railway)
  if (isNode) {
    const { renderToPipeableStream } = await import('react-dom/server');
    const { PassThrough } = await import('node:stream');

    const ABORT_DELAY = 5_000;

    return new Promise((resolve, reject) => {
      let shellRendered = false;
      const { pipe, abort } = renderToPipeableStream(<RemixServer context={remixContext} url={request.url} />, {
        onShellReady() {
          shellRendered = true;

          const body = new PassThrough();

          responseHeaders.set('Content-Type', 'text/html');
          responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
          responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

          // Create a web standards Response
          const stream = new ReadableStream({
            start(controller) {
              // Write the initial HTML
              const encoder = new TextEncoder();
              controller.enqueue(
                encoder.encode(
                  `<!DOCTYPE html><html lang="en" data-theme="${themeStore.value}"><head>${head}</head><body><div id="root" class="w-full h-full">`,
                ),
              );

              body.on('data', (chunk) => {
                controller.enqueue(new Uint8Array(chunk));
              });

              body.on('end', () => {
                controller.enqueue(encoder.encode('</div></body></html>'));
                controller.close();
              });

              body.on('error', (error) => {
                controller.error(error);
              });

              pipe(body);
            },
          });

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;

          if (shellRendered) {
            console.error(error);
          }
        },
      });

      setTimeout(abort, ABORT_DELAY);
    });
  } else {
    // For Web Streams runtime (Cloudflare Workers)
    const { renderToReadableStream } = await import('react-dom/server');

    const readable = await renderToReadableStream(<RemixServer context={remixContext} url={request.url} />, {
      signal: request.signal,
      onError(error: unknown) {
        console.error(error);
        responseStatusCode = 500;
      },
    });

    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new Uint8Array(
            new TextEncoder().encode(
              `<!DOCTYPE html><html lang="en" data-theme="${themeStore.value}"><head>${head}</head><body><div id="root" class="w-full h-full">`,
            ),
          ),
        );

        const reader = readable.getReader();

        function read() {
          reader
            .read()
            .then(({ done, value }) => {
              if (done) {
                controller.enqueue(new Uint8Array(new TextEncoder().encode('</div></body></html>')));
                controller.close();

                return;
              }

              controller.enqueue(value);
              read();
            })
            .catch((error) => {
              controller.error(error);
              readable.cancel();
            });
        }
        read();
      },

      cancel() {
        readable.cancel();
      },
    });

    if (isbot(request.headers.get('user-agent') || '')) {
      await readable.allReady;
    }

    responseHeaders.set('Content-Type', 'text/html');
    responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
    responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

    return new Response(body, {
      headers: responseHeaders,
      status: responseStatusCode,
    });
  }
}

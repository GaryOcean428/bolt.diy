import { renderToPipeableStream } from 'react-dom/server';
import type { ReactElement } from 'react';

export async function renderApp(App: ReactElement) {
    return new Promise((resolve, reject) => {
        const chunks: Array<Buffer> = [];
        const stream = renderToPipeableStream(App, {
            onAllReady() {
                stream.pipe({
                    write(chunk) {
                        chunks.push(Buffer.from(chunk));
                    },
                    end() {
                        resolve(Buffer.concat(chunks).toString());
                    },
                    on() { },
                    once() { },
                    emit() { return true; },
                });
            },
            onError(error) {
                reject(error);
            },
        });
    });
}

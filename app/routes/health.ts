import { json } from '@remix-run/cloudflare';

export const loader = () => {
  return json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
};

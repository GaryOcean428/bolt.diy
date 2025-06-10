import type { LoaderFunction } from '@remix-run/node';
import { providerBaseUrlEnvKeys } from '~/utils/constants';

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const provider = url.searchParams.get('provider');

  if (!provider || !providerBaseUrlEnvKeys[provider].apiTokenKey) {
    return Response.json({ isSet: false });
  }

  const envVarName = providerBaseUrlEnvKeys[provider].apiTokenKey;
  const isSet = !!process.env[envVarName];

  return Response.json({ isSet });
};

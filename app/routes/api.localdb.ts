import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { getLocalDb, setProviderApiKey } from '~/lib/.server/file-db';

export async function loader(_args: LoaderFunctionArgs) {
  const db = await getLocalDb();

  return json({
    storage: 'file',
    path: 'data/local-db.json',
    updatedAt: db.updatedAt,
    providerCount: Object.keys(db.apiKeys).length,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { provider, key } = await request.json<{ provider?: string; key?: string }>();

  if (!provider || typeof provider !== 'string') {
    throw new Response('provider is required', { status: 400 });
  }

  if (typeof key !== 'string') {
    throw new Response('key is required', { status: 400 });
  }

  const db = await setProviderApiKey(provider, key);

  return json({ ok: true, updatedAt: db.updatedAt, provider });
}

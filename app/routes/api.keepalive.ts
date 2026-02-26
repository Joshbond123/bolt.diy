import { json, type LoaderFunctionArgs } from '@remix-run/cloudflare';

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
  const envToken = context.cloudflare?.env?.KEEPALIVE_TOKEN as string | undefined;

  if (envToken) {
    const url = new URL(request.url);
    const tokenFromQuery = url.searchParams.get('token');
    const tokenFromHeader = request.headers.get('x-keepalive-token');

    if (tokenFromQuery !== envToken && tokenFromHeader !== envToken) {
      throw new Response('Unauthorized', { status: 401 });
    }
  }

  return json(
    {
      ok: true,
      service: 'bolt-diy',
      now: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
};

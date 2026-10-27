import { getAdmin } from '@/lib/auth/admin';
import { SAMPLE_IMPORT } from '@/lib/content/sample';

export async function GET() {
  if (!(await getAdmin())) return new Response('Unauthorized', { status: 401 });
  return new Response(JSON.stringify(SAMPLE_IMPORT, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

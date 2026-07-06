import { NextResponse } from 'next/server';
import { runIngest } from '@/lib/ingest/run';
import { makeSupabaseIngestDeps } from '@/lib/ingest/supabase-deps';

export const maxDuration = 300;

async function handle(request: Request) {
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const summary = await runIngest(makeSupabaseIngestDeps());
    console.error('[ingest]', JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error('[ingest] fatal', error);
    return NextResponse.json({ error }, { status: 500 });
  }
}

export { handle as GET, handle as POST };

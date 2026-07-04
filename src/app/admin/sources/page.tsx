import { listSources } from '@/lib/admin/queries';
import { addSource } from './actions';
import { SourceRowActions } from './source-row-actions';

export const dynamic = 'force-dynamic';

async function addSourceAction(formData: FormData) {
  'use server';
  await addSource(formData);
}

export default async function AdminSourcesPage() {
  const sources = await listSources();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-4 text-base font-semibold">Add source</h2>
        <form action={addSourceAction} className="flex flex-wrap gap-3">
          <input
            type="text"
            name="name"
            placeholder="Name"
            required
            className="min-w-40 flex-1 rounded-lg border p-2 text-sm"
          />
          <input
            type="url"
            name="site_url"
            placeholder="https://example.com"
            required
            className="min-w-48 flex-1 rounded-lg border p-2 text-sm"
          />
          <input
            type="url"
            name="feed_url"
            placeholder="https://example.com/feed"
            required
            className="min-w-48 flex-1 rounded-lg border p-2 text-sm"
          />
          <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-neutral-900">
            Add
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold">Sources</h2>
        {sources.length === 0 ? (
          <p className="text-neutral-500">No sources yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-neutral-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Feed</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Last fetched</th>
                  <th className="py-2 pr-4">Failures</th>
                  <th className="py-2 pr-4">Last error</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4">
                      <a
                        href={source.site_url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium hover:underline"
                      >
                        {source.name}
                      </a>
                    </td>
                    <td className="max-w-48 truncate py-2 pr-4 text-neutral-500" title={source.feed_url}>
                      {source.feed_url}
                    </td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          source.status === 'paused'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}
                      >
                        {source.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-neutral-500">
                      {source.last_fetched_at
                        ? new Date(source.last_fetched_at).toLocaleString()
                        : '—'}
                    </td>
                    <td
                      className={`py-2 pr-4 ${
                        source.consecutive_failures > 0 ? 'font-semibold text-red-600' : ''
                      }`}
                    >
                      {source.consecutive_failures}
                    </td>
                    <td
                      className="max-w-48 truncate py-2 pr-4 text-neutral-500"
                      title={source.last_error ?? undefined}
                    >
                      {source.last_error ?? '—'}
                    </td>
                    <td className="py-2">
                      <SourceRowActions id={source.id} status={source.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

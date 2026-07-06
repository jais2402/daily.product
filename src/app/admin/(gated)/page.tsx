import { listPending, listTopics } from '@/lib/admin/queries';
import { QueueCard } from '../queue-card';

export const dynamic = 'force-dynamic';

export default async function AdminQueuePage() {
  const [articles, topics] = await Promise.all([listPending(), listTopics()]);

  return (
    <div>
      <h2 className="mb-4 text-base font-semibold">Approval queue</h2>
      {articles.length === 0 ? (
        <p className="text-neutral-500">Queue is clear 🎉</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {articles.map((article) => (
            <QueueCard key={article.id} article={article} topics={topics} />
          ))}
        </ul>
      )}
    </div>
  );
}

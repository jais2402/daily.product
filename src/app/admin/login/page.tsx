import { adminLogin } from './actions';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Admin</h1>
      {error && <p className="text-red-600">Wrong key.</p>}
      <form action={adminLogin} className="flex flex-col gap-3">
        <input
          type="password"
          name="key"
          placeholder="Admin key"
          className="rounded-lg border p-3"
          autoFocus
        />
        <button className="rounded-lg bg-neutral-900 p-3 text-white dark:bg-white dark:text-neutral-900">
          Enter
        </button>
      </form>
    </main>
  );
}

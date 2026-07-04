import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-4xl p-6">
      <header className="mb-6 flex items-center gap-4 border-b pb-4">
        <h1 className="text-lg font-bold">Admin</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin" className="hover:underline">
            Queue
          </Link>
          <Link href="/admin/sources" className="hover:underline">
            Sources
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}

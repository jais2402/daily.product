import Link from "next/link";

// Public-surface layout: carries the site wordmark header. Admin pages have
// their own header via src/app/admin/layout.tsx, so this must not wrap them.
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header className="border-b p-4">
        <Link href="/" className="text-lg font-bold hover:underline">
          Daily.Product
        </Link>
      </header>
      {children}
    </>
  );
}

"use client";

import "./globals.css";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6">
          {!isLoginPage && (
            <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-200 pb-4">
              <h1 className="text-2xl font-extrabold tracking-tight">
                🅿️ Otopark Abonelik Paneli
              </h1>
              <nav className="flex flex-wrap gap-2 text-base font-bold">
                <NavLink href="/" label="Ana Sayfa" />
                <NavLink href="/subscribers" label="Aboneler" />
                <NavLink href="/nasil-kullanilir" label="Yardım" />
                <button
                  onClick={async () => {
                    await fetch("/api/auth/logout", { method: "POST" });
                    window.location.href = "/login";
                  }}
                  className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-red-700 transition-colors hover:bg-red-100"
                >
                  Çıkış
                </button>
              </nav>
            </header>
          )}
          <main className="flex-1">{children}</main>
          {!isLoginPage && (
            <footer className="mt-8 border-t-2 border-slate-200 pt-4 text-xs text-slate-500">
              Otopark Yönetim Sistemi · BTS Garage
            </footer>
          )}
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-xl bg-slate-100 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-200 hover:text-slate-900"
    >
      {label}
    </a>
  );
}

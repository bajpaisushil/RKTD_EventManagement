import Link from "next/link";

export function Footer() {
  return (
    <footer className="no-print border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Sharad Utsav 2026 · Radha Krishna Temple, Allen, Texas · 10–14 November 2026</p>
        <nav aria-label="More" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/tour" className="underline underline-offset-4 hover:text-white">
            3D tour of the temple
          </Link>
          <Link href="/admin" className="underline underline-offset-4 hover:text-white">
            Festival team: admin
          </Link>
        </nav>
      </div>
    </footer>
  );
}

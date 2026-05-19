import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="text-3xl font-semibold text-slate-900">Not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        We couldn&apos;t find that page. It may have moved or the link is wrong.
      </p>
      <Link
        href="/search"
        className="mt-4 inline-block rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
      >
        Find a flight
      </Link>
    </div>
  );
}

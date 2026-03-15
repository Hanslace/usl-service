export default function SessionExpiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md border border-black p-8 text-center">

        {/* header badge */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-black" />
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary2">
            Session error
          </span>
        </div>

        <h1 className="font-heading text-2xl font-bold leading-tight">
          Session expired
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-secondary1">
          Your authentication session has expired.
          This flow can no longer continue.
        </p>

        <a
          href="/start"
          className="mt-8 flex h-11 w-full items-center justify-center bg-black text-sm font-semibold text-white transition-colors hover:bg-neutral-800"
        >
          Start again
        </a>
      </div>
    </main>
  );
}

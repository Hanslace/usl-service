export default function SessionExpiredPage() {
  
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-gray-900">
          Session expired
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Your authentication session has expired.
          This flow can no longer continue.
        </p>

        <a
          href="/start"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-black text-sm font-medium text-white"
        >
          Start again
        </a>
      </div>
    </main>
  );
}

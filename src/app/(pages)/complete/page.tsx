'use client';
import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function AuthComplete() {
  const params = useSearchParams();

  useEffect(() => {
    const redirectTo = params.get('redirectTo');
    if (typeof redirectTo === 'string' && redirectTo.length > 0) {
      window.location.href = redirectTo;
    }
  }, [params]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="h-2 w-2 animate-pulse rounded-full bg-black" />
        <p className="text-sm text-secondary1">Completing sign in…</p>
      </div>
    </main>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white px-4">
          <p className="text-sm text-secondary1">Loading…</p>
        </main>
      }
    >
      <AuthComplete />
    </Suspense>
  );
}

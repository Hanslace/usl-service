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
    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <span>Completing sign in...</span>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={<span>Loading...</span>}>
      <AuthComplete />
    </Suspense>
  );
}
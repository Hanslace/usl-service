// app/(pages)/auth/complete/page.tsx
'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AuthCompletePage() {
  const params = useSearchParams();

  useEffect(() => {
    const redirectTo = params.get('redirectTo');
    if (typeof redirectTo === 'string' && redirectTo.length > 0) {
      window.location.href = redirectTo; // triggers openAuthSessionAsync completion
    }
  }, []);

  return (
    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <span>Completing sign in...</span>
    </div>
  );
}
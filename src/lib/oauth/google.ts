// lib/oauth/google.ts
import { Google } from 'arctic';
import { ENV } from '@/config/env';

export const google = new Google(
  ENV.GOOGLE_CLIENT_ID,
  ENV.GOOGLE_CLIENT_SECRET,
  ENV.GOOGLE_REDIRECT_URI,
);
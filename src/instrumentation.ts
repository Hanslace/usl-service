export async function register() {
  const { ENV } = await import('@/config');

  // Access every required field — throws at startup if any env var is missing
  void ENV.NODE_ENV;
  void ENV.SERVICE_ID;
  void ENV.REDIS_URL;
  void ENV.OTP_TTL_MS;
  void ENV.OTP_COOLDOWN_MS;
  void ENV.MAIL_FROM;
  void ENV.MAIL_PASS;
  void ENV.MAIL_USER;
  void ENV.MAIL_PORT;
  void ENV.MAIL_HOST;
}

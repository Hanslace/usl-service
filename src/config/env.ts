function required(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optional(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    return '';
  }
  return value;
}

export const SECRET_ENV = {
  get NODE_ENV() {
    return required('NODE_ENV');
  },

  get REDIS_URL() {
    return required('REDIS_URL');
  }, // default to 5 minutes

  get MAIL_FROM() {
    return required('MAIL_FROM');
  },
  get MAIL_PASS() {
    return required('MAIL_PASS');
  },
  get MAIL_USER() {
    return required('MAIL_USER');
  },
  get MAIL_PORT() {
    return parseInt(required('MAIL_PORT'));
  },
  get MAIL_HOST() {
    return required('MAIL_HOST');
  },
  get GOOGLE_CLIENT_ID() {
    return optional('GOOGLE_CLIENT_ID');
  },
  get GOOGLE_CLIENT_SECRET() {
    return optional('GOOGLE_CLIENT_SECRET');
  },
  get GOOGLE_REDIRECT_URI() {
    return optional('GOOGLE_REDIRECT_URI');
  },

};
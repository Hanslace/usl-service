import { SECRET_ENV } from './env';
import { APP_ENV } from './app';

export const ENV = {
  ...APP_ENV,
  ...SECRET_ENV,
};

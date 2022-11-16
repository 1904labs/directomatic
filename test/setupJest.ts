import fetchMock from 'jest-fetch-mock';
import makeServiceWorkerEnv from 'service-worker-mock';

declare let global: any;
const localeStack: string[] = [];
fetchMock.enableMocks();

const setupGlobal = () => {
  Object.assign(global, makeServiceWorkerEnv());

  global.CF_API_ENDPOINT = 'https://example.org';
  global.CF_ACCT_ID = 'keymaster';
  global.CF_LIST_ID = 'gozar';
  global.CF_API_TOKEN = 'gatekeeper';

  global.GSHEETS_API_ENDPOINT = 'https://example.org';
  global.GSHEETS_ID = 'keymaster';
  global.GSHEETS_API_KEY = 'gozarian';

  global.DEFAULT_DEST_DOMAIN = 'https://any.org';

  global.AUTH_TOKEN = 'zot';
  pushLocale('en-US');
};

const pushLocale = (newLocale: string | null): string => {
  const currentLocale: string = global.DEFAULT_LOCALE;
  localeStack.push(currentLocale);
  global.DEFAULT_LOCALE = newLocale;
  return currentLocale;
};

const popLocale = (): string => {
  const previousLocale: string = localeStack.pop() || '';
  global.DEFAULT_LOCALE = previousLocale;
  return previousLocale;
};

export { fetchMock, setupGlobal, pushLocale, popLocale };

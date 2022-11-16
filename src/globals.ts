declare global {
  // In wrangler.toml
  const GSHEETS_API_ENDPOINT: string;
  const CF_API_ENDPOINT: string;
  const DEFAULT_DEST_DOMAIN: string;
  const DEFAULT_LOCALE: string;

  // In secrets
  const AUTH_TOKEN: string;
  const GSHEETS_ID: string;
  const GSHEETS_API_KEY: string;
  const CF_ACCT_ID: string; // Really, account TAG
  const CF_LIST_ID: string;
  const CF_API_TOKEN: string;
}

// @TODO: Full listing for cf.com but this should be configurable. Move to env var?
export const Locales = [
  'de-de',
  'en-au',
  'en-ca',
  'en-gb',
  'en-in',
  'en-us',
  'es-es',
  'fr-fr',
  'id-id',
  'it-it',
  'ja-jp',
  'ko-kr',
  'nl-nl',
  'pt-br',
  'ru-ru',
  'sv-se',
  'th-th',
  'tr-tr',
  'vi-vn',
  'zh-cn',
  'zh-hans-cn',
  'zh-tw',
];

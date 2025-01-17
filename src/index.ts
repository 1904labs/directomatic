/* istanbul ignore file */
import { Router } from 'itty-router';

import { authCheck } from './auth';
import { hello, status, list, diff, publish } from './controller';

const router = Router();

/**
 * GET /
 *
 * Hello World!
 */
router.get('/', hello);

// Require a bearer token for any other request.
router.all('*', authCheck);

/**
 * GET /status
 *
 * Confirm that we can read the Google Sheet and the Rules Lists.
 */
router.get('/status', status);

/**
 * GET /list
 *
 * Show a list of all the redirects that would be generated by the spreadsheet
 * and report a list of any that fail OUR validation, returning the raw data.
 */
router.get('/list', list);

/**
 * GET /diff
 *
 * Pull and process the redirects from the spreadsheet to report on what will be
 * added and what will be removed on a subsequent /publish.
 */
router.get('/diff', diff);

/**
 * GET /publish
 *
 * Fetch redirects from the Google Sheet, sanitize/validate, prep the "good" ones
 * for the Cloudflare Ruleset API, and replace the list with the new set. Report
 * on any errors from Cloudflare and note any redirects that the API rejected.
 */
router.get('/publish', publish);

addEventListener('fetch', (event: any) => {
  event.respondWith(router.handle(event.request));
});

export {};

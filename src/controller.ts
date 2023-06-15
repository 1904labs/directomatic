import { name, version } from '../package.json';
import { RawRedirectProps } from './types';
import './globals';
import { checkSpreadsheetStatus, fetchRedirectRows } from './inputs';
import { processSheetRow, ruleInList } from './processing';
import {
  getBulkListContents,
  getBulkListStatus,
  makeBulkList,
  uploadBulkList,
} from './outputs';
import { validateBoolean } from './validators';

export const hello = async (): Promise<Response> => {
  return new Response(
    JSON.stringify({
      messages: [`${name} ${version} says hello.`],
    }),
    {
      headers: { 'content-type': 'application/json' },
    }
  );
};

export const status = async (): Promise<Response> => {
  const sheet = await checkSpreadsheetStatus();
  const cflist = await getBulkListStatus();

  return new Response(
    JSON.stringify({
      success: sheet.success && cflist.success,
      errors: [sheet.errors, cflist.errors].flat(),
      messages: [sheet.messages, cflist.messages].flat(),
    }),
    {
      headers: { 'content-type': 'application/json' },
    }
  );
};

export const list = async (): Promise<Response> => {
  // Source the unprocessed redirects list from the Google Sheet.
  const inputRows = await fetchRedirectRows();

  // Sanitize, validate, and clean up the input; skim off the bad rows to report.
  const badRows: RawRedirectProps[] = [];
  const redirectsList = inputRows.flatMap((row) => {
    const output = processSheetRow(row);
    if (output) {
      return output;
    } else {
      // If the row was skipped because it was _deleted_, don't include it in
      // the error report output.
      if (!validateBoolean(row.deleted, false)) {
        badRows.push(row);
      }

      // Return empty, which will :magic: away in flatMap() and won't be uploaded.
      return [];
    }
  });

  return new Response(
    JSON.stringify({
      messages: [
        `Google sheet contains ${redirectsList.length} valid rules and ${badRows.length} rows with errors.`,
      ],
      inputRows: redirectsList,
      invalidRules: badRows,
    }),
    {
      headers: { 'content-type': 'application/json' },
    }
  );
};

export const diff = async (): Promise<Response> => {
  // Source the unprocessed redirects list from the Google Sheet.
  const inputRows = await fetchRedirectRows();

  // Sanitize, validate, to make the final list
  const redirectsList = inputRows.flatMap((row) => {
    return processSheetRow(row) ?? [];
  });

  // Format as needed for the Cloudflare Ruleset API
  const spreadsheetList = makeBulkList(redirectsList);

  // Get the current list
  const cloudflareList = await getBulkListContents();

  // We need to see what cloudflareList rules aren't in spreadsheetList
  const removedRules = cloudflareList.filter((rule) => {
    return !ruleInList(rule, spreadsheetList);
  });

  // We need to see what spreadsheetList rules aren't in cloudflareList
  const addedRules = spreadsheetList.filter((rule) => {
    return !ruleInList(rule, cloudflareList);
  });

  return new Response(
    JSON.stringify({
      messages: [
        `There are ${addedRules.length} rules to add (in spreadsheet but not published).`,
        `There are ${removedRules.length} rules to remove (published but not in spreadsheet).`,
      ],
      addedRules: addedRules,
      removedRules: removedRules,
    }),
    {
      headers: { 'content-type': 'application/json' },
    }
  );
};

export const publish = async (): Promise<Response> => {
  // Source the unprocessed redirects list from the Google Sheet.
  const inputRows = await fetchRedirectRows();

  // Sanitize, validate, to make the final list
  const redirectsList = inputRows.flatMap((row) => {
    return processSheetRow(row) ?? [];
  });

  // Format as needed for the Cloudflare Ruleset API
  const bulkList = makeBulkList(redirectsList);

  // Send the processed list to CF
  const uploadResponse = await uploadBulkList(bulkList);

  return new Response(JSON.stringify(uploadResponse), {
    headers: { 'content-type': 'application/json' },
  });
};

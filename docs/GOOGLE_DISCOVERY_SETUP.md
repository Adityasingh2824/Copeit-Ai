# Google Evidence Discovery setup

This test-user feature searches Google Drive file metadata and Gmail attachment metadata after an individual user explicitly consents. It ranks likely product-evidence candidates in the browser. It does **not** download attachments, store files, store OAuth tokens, send Google data to Gemini, or add anything to the RAG.

## Required Google Cloud configuration

1. Select Copeit's Google Cloud project and record its numeric **project number**.
2. Under **APIs & Services → Library**, enable:
   - Google Drive API
   - Gmail API
   - Google Sheets API
   - Google Picker API (kept only for compatibility with the existing browser key)
3. Under **Google Auth Platform**, set accurate branding, a support contact, and an **External / Testing** audience. Add every pilot Google account as a test user.
4. Under **Data Access**, add the scopes below and save:

   ```text
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/gmail.readonly
   ```

   These are broader than the old selected-file-only `drive.file` scope. Google users must see and approve the consent request before each browser-private discovery session.
5. Under **Clients**, create an OAuth client of type **Web application**. Add exact JavaScript origins:

   ```text
   https://copeit-ai.vercel.app
   http://127.0.0.1:4174
   ```

   Record the client ID. Never put the OAuth client secret in frontend code, Git, Vercel `VITE_` variables, or chat.
6. Under **Credentials**, keep the browser API key restricted to the production and local referrers. It is not used for Gmail/Drive discovery requests, which use the temporary OAuth access token, but it remains needed if Google Picker is used elsewhere.
7. Set these public build variables in the appropriate Vercel environments:

   ```text
   VITE_GOOGLE_CLIENT_ID
   VITE_GOOGLE_PICKER_API_KEY
   VITE_GOOGLE_PROJECT_NUMBER
   ```

   Production and Preview require their own scopes. Rebuild each environment after changing variables.

## Test boundaries

- Use synthetic test files and a test inbox first.
- Verify Drive-only degradation when Gmail API is disabled or denied.
- Confirm that only filenames, MIME types, timestamps, email sender/subject, and attachment filenames appear in the browser queue.
- Do not call discovery output approved evidence. A reviewer must add and approve a source through the normal quarantine workflow.
- The Gmail scope is **restricted**. External production access requires Google verification; if restricted-scope data is stored or transmitted to a server, Google may also require a security assessment. This browser-private test implementation deliberately avoids storing or transmitting that data.

Official references: [Google OAuth token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Drive search](https://developers.google.com/workspace/drive/api/guides/search-files), and [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes).

# Resume Reviewer

Good experience. Better on paper. A Next.js application that compares a resume with a job description and returns honest, specific Claude-powered feedback. Built by Louis, with the original personality intact.

## Features

- Responsive workspace with light/dark themes, keyboard navigation, and progress indicators.
- Paste documents or import a text-based PDF/TXT resume (5 MB, 15 PDF pages, 20,000 characters maximum). PDF text extraction happens locally in the browser; scanned/image-only PDFs need OCR separately.
- Four formatted feedback sections: priorities, missing evidence, bullet rewrites, and keyword alignment.
- Copy and Markdown download; explicit sample review requiring no API key or paid request.
- Consent before sending documents, recoverable errors, cancellation, timeouts, and no document persistence.
- Server-only Anthropic key, validated inputs, bounded request body, access-code gate in production, and conservative per-process rate limits.

## Run locally

Requires Node.js 22.13+ (Node.js 24 recommended).

```bash
npm ci
```

Create `.env.local` in the project root. On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

If `.env.local` already exists, edit it instead of overwriting it.

```dotenv
ANTHROPIC_API_KEY=your_real_key
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
REVIEW_ACCESS_CODE=
```

Never put the Anthropic key into the browser, screenshots, or Git. The SDK uses the server-only key as described in the [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript). Environment files belong at the project root as documented by [Next.js](https://nextjs.org/docs/app/guides/environment-variables).

```bash
npm run dev
```

Open the Local URL printed by Next.js. The app checks whether live reviews are available. The sample works with no API key.

## Production deployment

This is a full-stack Next.js app. Use a Node-capable Next.js host, not a static-only host, for live AI reviews.

1. Add `ANTHROPIC_API_KEY` to your host's server environment.
2. Add a long, random `REVIEW_ACCESS_CODE`. Do not use your API key as the access code.
3. Optionally set `ANTHROPIC_MODEL`.
4. Build with `npm run build` and start with `npm start`, or use your host's Next.js preset.
5. Enter the private access code in the UI to run live reviews. Share it only with people authorized to use your API budget.

**Production fails closed without an access code.** There is deliberately no public bypass environment variable. The local `npm run dev` environment can run without this code.

The access code is a small private-beta safeguard, not full user authentication. Rate limits are in memory: 12 attempts per minute, 6 reviews per minute per trusted IP bucket, and 30 reviews per minute per process. On non-Vercel hosts, all clients share a conservative bucket. On Vercel, the code reads its platform-controlled forwarded IP header. These limits reset on restart and are not shared between instances. Before unrestricted public use, implement real authentication, a shared rate-limit store, and provider spend controls. A public GitHub repository does not require a publicly spendable API endpoint.

## Privacy and safety

- No database, local storage, session storage, analytics, or saved document history is implemented.
- Inputs, results, and access code live in browser memory; refresh/clear discards them.
- Imported files are parsed locally. Only extracted/pasted text is sent to the server after consent.
- Live reviews send the two documents to Anthropic, which has its own data policies. Do not interpret “no app storage” as a guarantee about provider retention or hosting infrastructure.
- Application logs contain provider status codes, not document content or key values.
- Model Markdown is rendered without raw HTML, images, or active links.
- Cancellation stops waiting and signals the provider request; it does not guarantee that work already performed will not be billed.
- The sample output is hand-written and explicitly labeled. It is never presented as an analysis of arbitrary user input.
- Feedback cannot predict an ATS decision. Suggested bullets must remain truthful.

## Quality checks

```bash
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

Unit tests cover validation, body limits, access-code handling, production gating, rate limits, and mocked provider success/error responses. Browser tests exercise consent, imports, sample mode, safe Markdown, feedback tabs, error recovery, clearing, responsive layout, and theme switching. Tests mock provider responses; they do not spend API credits.

The PDF worker is copied from the installed `pdfjs-dist` version during installation and before builds. Do not replace it with an unrelated CDN version.

## Structure

```text
src/app/page.tsx               Interactive workspace
src/app/globals.css            Responsive design tokens and styles
src/app/api/review/route.ts    Server-only Claude integration
src/lib/review.ts              Shared validation and review parsing
src/lib/server-guards.ts       Body limits, access-code checks, rate limiter
src/lib/import-resume.ts       Lazy-loaded browser PDF/TXT extraction
src/lib/sample.ts              Fictional documents and labeled sample review
tests/                        Unit and browser regression tests
```

## License

All rights reserved to the extent held. Public visibility is for portfolio review, not a general open-source grant. See `LICENSE`; dependencies retain their own licenses.

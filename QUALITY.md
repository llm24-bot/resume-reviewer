# Quality and verification

## Checked in this upgrade

- Production Next.js build and TypeScript compilation.
- ESLint with no errors or warnings in maintained source.
- 17 unit/API tests: input boundaries, whitespace, Unicode JSON, body-size limits, section parsing, constant-time access-code comparison, rate-limit windows, production fail-closed behavior, missing key, mocked Claude success, truncated output, and sanitized provider errors.
- 18 browser tests across desktop and mobile Chromium: consent, input readiness, mocked end-to-end reviews, tab navigation, stale-result clearing, sample labeling, preservation of original wording, clear confirmation, safe Markdown, TXT/PDF import, unsupported file recovery, download content, clipboard action, loading/cancellation, theme switching, and viewport overflow.
- Axe automated WCAG A/AA checks for empty, sample, help-dialog, and dark-theme states in both viewport configurations. This is automated coverage, not a claim of complete accessibility certification.
- Dependency audit: no known vulnerabilities reported at verification time.
- Repository checks: no committed `.env.local`; no matching Anthropic-key patterns found in the fetched original history. Pattern scanning is not a guarantee that every possible secret format is absent.

## Intentional limitations

- No paid live Claude call was made during this upgrade. API tests replace the provider response; a live smoke test with the owner's local key remains necessary.
- Scanned PDFs are not OCR'd. Password-protected, oversized, unreadable, or too-short documents produce a recoverable message.
- Document inputs and feedback do not survive refresh. This avoids quietly persisting sensitive resume text.
- The production access code is a private-beta control, not user accounts. In-memory rate limits do not provide distributed enforcement. A wider public launch needs shared limits and real authentication.
- The interactive static preview is sample-only. The full-stack GitHub version supports real reviews when its server environment is configured.
- The original ATS joke is preserved, while help text and review instructions make clear that the app cannot predict ATS decisions.

## Preserved wording

- “AKA, How to get past the ATS and into the hands of a human recruiter. :P”
- “Louis is checking your resume O.O”
- “(AKA Don't be dumb)”
- The original humorous missing-key, incomplete-review, and generic-failure messages.

Visible interface and generated-feedback instructions use “resume” without accents.

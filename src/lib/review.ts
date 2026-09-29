export const MIN_TEXT_LENGTH = 100;
export const MAX_TEXT_LENGTH = 20_000;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_REQUEST_BYTES = 256_000;

export type ReviewInput = { resume: string; jobDescription: string };

export function validateReviewInput(
  value: unknown,
): { ok: true; data: ReviewInput } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Provide resume and job-description text." };
  }
  const input = value as Record<string, unknown>;
  if (
    typeof input.resume !== "string" ||
    typeof input.jobDescription !== "string"
  ) {
    return { ok: false, error: "Provide resume and job-description text." };
  }
  const resume = input.resume.trim();
  const jobDescription = input.jobDescription.trim();
  if (
    resume.length < MIN_TEXT_LENGTH ||
    jobDescription.length < MIN_TEXT_LENGTH
  ) {
    return {
      ok: false,
      error:
        "Add at least 100 characters to each document so there is enough context to review.",
    };
  }
  if (
    resume.length > MAX_TEXT_LENGTH ||
    jobDescription.length > MAX_TEXT_LENGTH
  ) {
    return {
      ok: false,
      error: "Keep each document at or below 20,000 characters.",
    };
  }
  return { ok: true, data: { resume, jobDescription } };
}

export type ReviewSection = { title: string; content: string };

export function splitReview(markdown: string): ReviewSection[] {
  const sections: ReviewSection[] = [];
  let current: ReviewSection = { title: "Overview", content: "" };
  for (const line of markdown.split("\n")) {
    const heading = line.match(/^##\s+(.+?)\s*#*\s*$/);
    if (heading) {
      if (current.content.trim())
        sections.push({ ...current, content: current.content.trim() });
      current = { title: heading[1], content: "" };
    } else {
      current.content += `${line}\n`;
    }
  }
  if (current.content.trim())
    sections.push({ ...current, content: current.content.trim() });
  return sections;
}

export function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}

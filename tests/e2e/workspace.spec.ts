import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { SAMPLE_JOB, SAMPLE_RESUME, SAMPLE_REVIEW } from "../../src/lib/sample";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/review", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { available: true, accessRequired: false } });
    } else {
      await route.fulfill({ json: { review: SAMPLE_REVIEW } });
    }
  });
  await page.goto("/");
});

test("input readiness, consent, mocked review, formatting and stale result reset", async ({
  page,
}) => {
  const submit = page.getByRole("button", {
    name: "Louis is checking your resume O.O",
  });
  await expect(submit).toBeDisabled();
  await page
    .getByRole("textbox", { name: "Your resume", exact: true })
    .fill(SAMPLE_RESUME);
  await page
    .getByRole("textbox", { name: "The job description", exact: true })
    .fill(SAMPLE_JOB);
  await expect(submit).toBeDisabled();
  await page.getByRole("checkbox").check();
  await submit.click();
  await expect(
    page.getByRole("tab", { name: "Top three improvements" }),
  ).toBeVisible();
  await expect(page.locator(".markdown ol")).toBeVisible();
  await page.getByRole("tab", { name: "Bullet improvements" }).click();
  await expect(
    page.getByRole("tabpanel", { name: "Bullet improvements" }),
  ).toContainText("Made a task management app");
  await page
    .getByRole("textbox", { name: "Your resume", exact: true })
    .fill(`${SAMPLE_RESUME}\nNew line`);
  await expect(page.getByRole("tab")).toHaveCount(0);
});

test("sample is labeled, funny copy is preserved, clear requires confirmation", async ({
  page,
}) => {
  await expect(
    page.getByText(
      "AKA, How to get past the ATS and into the hands of a human recruiter. :P",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Try a sample" }).click();
  await expect(
    page.getByText("Hand-written feedback on fictional sample documents", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("(AKA Don't be dumb)", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByRole("button", { name: "Keep my work" }).click();
  await expect(
    page.getByRole("textbox", { name: "Your resume", exact: true }),
  ).not.toHaveValue("");
  await page.getByRole("button", { name: "Clear all" }).click();
  await page
    .getByRole("button", { name: "Clear workspace", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your resume", exact: true }),
  ).toHaveValue("");
});

test("safe Markdown does not execute HTML or load external images", async ({
  page,
}) => {
  await page.route("**/api/review", async (route) =>
    route.fulfill({
      json:
        route.request().method() === "GET"
          ? { available: true, accessRequired: false }
          : {
              review:
                "## Top three improvements\n<script>window.hacked=true</script>\n\n![tracker](https://invalid.example/tracker.png)\n\n**Safe text**",
            },
    }),
  );
  await page.reload();
  await page
    .getByRole("textbox", { name: "Your resume", exact: true })
    .fill(SAMPLE_RESUME);
  await page
    .getByRole("textbox", { name: "The job description", exact: true })
    .fill(SAMPLE_JOB);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Louis is checking your resume O.O" })
    .click();
  await expect(page.locator(".markdown")).toContainText("Safe text");
  await expect(page.locator(".markdown img, .markdown script")).toHaveCount(0);
});

test("imports TXT locally and preserves content on an unsupported file error", async ({
  page,
}) => {
  await page
    .locator("#resume-file")
    .setInputFiles({
      name: "resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(SAMPLE_RESUME),
    });
  await expect(
    page.getByRole("textbox", { name: "Your resume", exact: true }),
  ).toHaveValue(SAMPLE_RESUME);
  await page
    .locator("#resume-file")
    .setInputFiles({
      name: "resume.docx",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("unsupported"),
    });
  await expect(page.locator(".error-message")).toContainText(
    "Choose a PDF or TXT",
  );
  await expect(
    page.getByRole("textbox", { name: "Your resume", exact: true }),
  ).toHaveValue(SAMPLE_RESUME);
});

test("error keeps documents, theme toggles, and page has no horizontal overflow", async ({
  page,
}) => {
  await page.route("**/api/review", async (route) =>
    route.fulfill({
      status: route.request().method() === "GET" ? 200 : 429,
      json:
        route.request().method() === "GET"
          ? { available: true, accessRequired: false }
          : { error: "Try again in a minute." },
    }),
  );
  await page.reload();
  await page
    .getByRole("textbox", { name: "Your resume", exact: true })
    .fill(SAMPLE_RESUME);
  await page
    .getByRole("textbox", { name: "The job description", exact: true })
    .fill(SAMPLE_JOB);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Louis is checking your resume O.O" })
    .click();
  await expect(page.locator(".error-message")).toContainText(
    "Try again in a minute.",
  );
  await expect(
    page.getByRole("textbox", { name: "Your resume", exact: true }),
  ).toHaveValue(SAMPLE_RESUME);
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("PDF text is extracted locally, with no live review request", async ({
  page,
}) => {
  let liveCalls = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/review") && request.method() === "POST")
      liveCalls++;
  });
  const generator = await page.context().newPage();
  await generator.setContent("<html lang='en'><body><p></p></body></html>");
  await generator.locator("p").evaluate((element, text) => {
    element.textContent = text;
  }, SAMPLE_RESUME);
  const pdf = await generator.pdf();
  await generator.close();
  await page
    .locator("#resume-file")
    .setInputFiles({
      name: "sample-resume.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    });
  await expect(
    page.getByRole("textbox", { name: "Your resume", exact: true }),
  ).toHaveValue(/Alex Morgan/, { timeout: 15_000 });
  await expect(
    page.getByText("File imported in your browser.", { exact: false }),
  ).toBeVisible();
  expect(liveCalls).toBe(0);
});

test("sample downloads are labeled, tabs support keys, and copy works", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Try a sample" }).click();
  const firstTab = page.getByRole("tab").first();
  await firstTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Skills not demonstrated" }),
  ).toBeFocused();
  await expect(
    page.getByRole("tabpanel", { name: "Skills not demonstrated" }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Copied", exact: true }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("sample-resume-review.md");
  const path = await download.path();
  expect(path).not.toBeNull();
  expect(await readFile(path!, "utf8")).toContain(
    "Illustrative sample, not a live AI review.",
  );
});

test("loading disables duplicate submission and can be canceled without losing text", async ({
  page,
}) => {
  await page.route("**/api/review", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: { available: true, accessRequired: false },
      });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fulfill({ json: { review: SAMPLE_REVIEW } }).catch(() => {});
  });
  await page.reload();
  await page
    .getByRole("textbox", { name: "Your resume", exact: true })
    .fill(SAMPLE_RESUME);
  await page
    .getByRole("textbox", { name: "The job description", exact: true })
    .fill(SAMPLE_JOB);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Louis is checking your resume O.O" })
    .click();
  await expect(
    page.getByRole("button", { name: "Reviewing your story..." }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel review" }).click();
  await expect(page.locator(".error-message")).toContainText("Review canceled");
  await expect(
    page.getByRole("textbox", { name: "Your resume", exact: true }),
  ).toHaveValue(SAMPLE_RESUME);
});

test("empty, sample, help dialog, and dark theme pass automated accessibility checks", async ({
  page,
}) => {
  const audit = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  };
  await audit();
  await page.getByRole("button", { name: "Try a sample" }).click();
  await audit();
  await page.getByRole("button", { name: "A little transparency" }).click();
  await audit();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await audit();
});

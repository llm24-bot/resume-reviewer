"use client";

import { useState } from "react";

export default function Home() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [status, setStatus] = useState("");
  const [review, setReview] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canReview =
    resume.trim().length >= 100 &&
    jobDescription.trim().length >= 100 &&
    !isLoading;

  async function handleReview() {
    if (!canReview) return;

     setIsLoading(true);
    setReview("");
    setStatus("Reviewing your résumé. This may take a moment.");

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        resume,
        jobDescription,
      }),
    });

    const data: {
      review?: string;
      error?: string;
    } = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "The review request failed.");
    }

    if (typeof data.review !== "string" || !data.review.trim()) {
      throw new Error("No review was returned. Please try again.");
    }

    setReview(data.review);
    setStatus("Review complete. Your feedback is below.");
  } catch (error) {
    setStatus(
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again."
    );
  } finally {
    setIsLoading(false);
  }
}

  return (
    <main className="min-h-screen bg-stone-50 px-6 py-12 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="mb-3 text-sm font-medium text-emerald-700">
            BUILT FOR YOUR NEXT OPPORTUNITY
          </p>

          <h1 className="text-xl font-semibold tracking-tight">
            AI Resume Reviewer
          </h1>

          <p className="mt-3 max-w-2xl text-base text-stone-600">
            Compare your resume with a job description and discover
            how to make your experience clearer and more relevant.
            AKA, How to get past the ATS and into the hands of a human recruiter. :P
          </p>
        </header>

        <section
          aria-label="Review inputs"
          className="grid gap-6 md:grid-cols-2"
        >
          <div>
            <label
              htmlFor="resume"
              className="mb-2 block text-sm font-semibold"
            >
              Your resume
            </label>

            <textarea
              id="resume"
              name="resume"
              value={resume}
              maxLength={20000}
              disabled={isLoading}
                onChange={(event) => {
                  setResume(event.target.value);
                  setStatus("");
                  setReview("");
                  }
                }
              placeholder="Paste your resume text here..."
              className="min-h-80 w-full resize-y rounded-xl border border-stone-300 bg-white p-4 text-base placeholder:text-stone-500 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div>
            <label
              htmlFor="job-description"
              className="mb-2 block text-sm font-semibold"
            >
              Job description
            </label>

            <textarea
              id="job-description"
              name="jobDescription"
              value={jobDescription}
              maxLength={20000}
              disabled={isLoading}
                onChange={(event) => {
                  setJobDescription(event.target.value);
                  setStatus("");
                  setReview("");
                  }
                }
              placeholder="Paste the job description here..."
              className="min-h-80 w-full resize-y rounded-xl border border-stone-300 bg-white p-4 text-base placeholder:text-stone-500 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>
        </section>

        <div className="mt-6">
          <button
            type="button"
            disabled={!canReview}
            onClick={handleReview}
            aria-describedby="review-status"
            className="rounded-lg bg-emerald-800 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Reviewing..." : "Louis is checking your resume O.O"}
          </button>

          <p className="mt-3 text-sm text-stone-600">
  Clicking review sends both texts to Anthropic for AI analysis
  and uses your API account. Remove contact details or other
  sensitive information before submitting.
</p>

<p
  id="review-status"
  role="status"
  className="mt-3 text-sm text-stone-600"
>
  {status || "Enter at least 100 characters in each field to begin."}
</p>

{review && (
  <section
    aria-labelledby="review-heading"
    className="mt-8 rounded-xl border border-stone-300 bg-white p-6"
  >
    <h2
      id="review-heading"
      className="mb-4 text-lg font-semibold"
    >
      Your résumé feedback
    </h2>

    <div className="whitespace-pre-wrap text-base leading-7 text-stone-700">
      {review}
    </div>

    <p className="mt-6 border-t border-stone-200 pt-4 text-sm text-stone-600">
      AI feedback can be wrong. Verify every suggestion and only
      include claims that accurately reflect your experience. (AKA Don't be dumb)
    </p>
  </section>
)}
        </div>
      </div>
    </main>
  );
}
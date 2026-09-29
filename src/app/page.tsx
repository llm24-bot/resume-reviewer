"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  FileText,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  Moon,
  PanelLeftClose,
  ScanText,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MAX_TEXT_LENGTH,
  MIN_TEXT_LENGTH,
  splitReview,
  wordCount,
} from "@/lib/review";
import { SAMPLE_JOB, SAMPLE_RESUME, SAMPLE_REVIEW } from "@/lib/sample";

const PREVIEW = process.env.NEXT_PUBLIC_PREVIEW_MODE === "true";
const sectionIcons = [Lightbulb, Target, ScanText, CheckCheck];

function Mark({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "brand-mark small" : "brand-mark"}
      viewBox="0 0 32 32"
      fill="none"
      aria-label="Resume Reviewer logo"
      role="img"
    >
      <path
        d="M8 5h11l5 5v17H8V5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M18 5v7h6M12 16h8M12 21h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="m21 22 3 3 5-6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [review, setReview] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [consent, setConsent] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [service, setService] = useState<{
    available: boolean;
    accessRequired: boolean;
  } | null>(null);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  const [activeSection, setActiveSection] = useState(0);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [modal, setModal] = useState<"help" | "clear" | "sample">("help");
  const [elapsed, setElapsed] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = isLoading || isImporting;
  const resumeReady = resume.trim().length >= MIN_TEXT_LENGTH;
  const jobReady = jobDescription.trim().length >= MIN_TEXT_LENGTH;
  const ready = resumeReady && jobReady;
  const sections = splitReview(review);
  const hasDocuments = Boolean(resume || jobDescription);
  const liveAvailable = !PREVIEW && service?.available === true;

  useEffect(() => {
    if (PREVIEW) return;
    const controller = new AbortController();
    fetch("/api/review", { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) =>
        setService({
          available: data.available === true,
          accessRequired: data.accessRequired === true,
        }),
      )
      .catch(() => {
        if (!controller.signal.aborted)
          setService({ available: false, accessRequired: false });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => clearInterval(timer);
  }, [isLoading]);

  useEffect(
    () => () => {
      requestRef.current?.abort();
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  function invalidateReview() {
    setReview("");
    setStatus("");
    setError("");
    setIsDemo(false);
    setCopied(false);
    setActiveSection(0);
  }

  function showModal(kind: typeof modal) {
    setModal(kind);
    dialogRef.current?.showModal();
  }

  function loadSample() {
    invalidateReview();
    setResume(SAMPLE_RESUME);
    setJobDescription(SAMPLE_JOB);
    setFileName("");
    setConsent(false);
    setReview(SAMPLE_REVIEW);
    setIsDemo(true);
    setStatus(
      "Sample loaded. This is a hand-written example, not a live AI review.",
    );
    dialogRef.current?.close();
    setTimeout(
      () =>
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      80,
    );
  }

  function trySample() {
    if (busy) return;
    if (hasDocuments) showModal("sample");
    else loadSample();
  }

  function clearWorkspace() {
    invalidateReview();
    setResume("");
    setJobDescription("");
    setFileName("");
    setConsent(false);
    setAccessCode("");
    dialogRef.current?.close();
    document.getElementById("resume")?.focus();
  }

  async function handleFile(file?: File) {
    if (!file || busy) return;
    setIsImporting(true);
    setError("");
    try {
      const { importResume } = await import("@/lib/import-resume");
      const text = await importResume(file);
      invalidateReview();
      setResume(text);
      setFileName(file.name);
      setConsent(false);
      setStatus(
        "File imported in your browser. Check the extracted text before reviewing.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not read that file. Please paste the text.",
      );
    } finally {
      setIsImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || busy || !consent || !liveAvailable || requestRef.current)
      return;
    invalidateReview();
    setIsLoading(true);
    setElapsed(0);
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 55_000);
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessCode ? { "x-review-access-code": accessCode } : {}),
        },
        body: JSON.stringify({ resume, jobDescription }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "The server could not complete the review. Your documents are still here.",
        );
      }
      if (typeof data?.review !== "string" || !data.review.trim())
        throw new Error("No feedback came back. Please try again.");
      setReview(data.review);
      setStatus("Review complete. Your feedback is ready.");
      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        80,
      );
    } catch (caught) {
      if (controller.signal.aborted) {
        setError(
          controller.signal.reason === "timeout"
            ? "That took too long. Your documents are still here; please try again."
            : "Review canceled. Processing may already have used API credits.",
        );
      } else
        setError(
          caught instanceof Error
            ? caught.message
            : "Something went wrong. Please try again.",
        );
    } finally {
      clearTimeout(timeout);
      requestRef.current = null;
      setIsLoading(false);
    }
  }

  async function copyReview() {
    try {
      await navigator.clipboard.writeText(
        `${isDemo ? "SAMPLE REVIEW (illustrative, not a live AI analysis)\n\n" : ""}${review}`,
      );
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(
        "Clipboard access is unavailable. Download the feedback or select the text to copy it.",
      );
    }
  }

  function downloadReview() {
    const content = `# Resume review${isDemo ? " (sample)" : ""}\n\n${isDemo ? "> Illustrative sample, not a live AI review.\n\n" : ""}${review}\n\n---\nVerify every suggestion. Only include truthful claims.\n`;
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/markdown;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = isDemo ? "sample-resume-review.md" : "resume-review.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div
      className={`app-shell${sidebarCollapsed ? " collapsed" : ""}`}
      data-theme={theme ?? undefined}
    >
      <a href="#workspace" className="skip-link">
        Skip to workspace
      </a>
      <aside className="sidebar" aria-label="App navigation">
        <a className="brand" href="#workspace">
          <Mark />
          <span>
            resume
            <span className="brand-second">
              reviewer<span className="brand-dot">.</span>
            </span>
          </span>
        </a>
        <div className="sidebar-label">YOUR WORKSPACE</div>
        <nav>
          <a className="nav-item selected" href="#workspace">
            <ScanText size={18} />
            Resume review
            <span className="nav-dot" />
          </a>
          <button className="nav-item" onClick={trySample} disabled={busy}>
            <FileText size={18} />
            Sample review
            <ArrowUpRight size={15} />
          </button>
          <button className="nav-item" onClick={() => showModal("help")}>
            <Lightbulb size={18} />
            How it works
          </button>
        </nav>
        <div className="sidebar-note">
          <div className="note-spark">
            <Sparkles size={20} />
          </div>
          <h2>You bring the experience.</h2>
          <p>
            We help you find the words.
            <br />
            No made-up achievements.
            <br />
            No keyword confetti.
          </p>
          <span className="note-signature">a little help from Louis :P</span>
        </div>
        <div className="sidebar-bottom">
          <span className="avatar">L</span>
          <div>
            <strong>Built by Louis</strong>
            <span>For your next chapter.</span>
          </div>
          <span className="version">v1.0</span>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button sidebar-toggle"
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <PanelLeftClose size={18} />
            </button>
            <span className="mobile-brand">
              <Mark small />
            </span>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>Resume review</strong>
          </div>
          <div className="topbar-actions">
            <span className="claude-badge">
              <span />
              Powered by Claude
            </span>
            <button
              className="icon-button"
              aria-label="Toggle color theme"
              onClick={() => {
                const current =
                  theme ??
                  (window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light");
                setTheme(current === "dark" ? "light" : "dark");
              }}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main id="workspace" className="workspace">
          <div className="intro">
            <div>
              <div className="eyebrow">
                <span /> BUILT FOR YOUR NEXT OPPORTUNITY
              </div>
              <h1>
                Good experience.
                <br />
                <span>Better on paper.</span>
              </h1>
              <p className="intro-description">
                Compare your resume with a job description and discover how to
                make your experience clearer and more relevant.
              </p>
              <p className="your-words">
                AKA, How to get past the ATS and into the hands of a human
                recruiter. :P
              </p>
            </div>
            <button
              className="button secondary sample-top"
              onClick={trySample}
              disabled={busy}
            >
              <FileText size={16} />
              Try a sample
              <ArrowUpRight size={16} />
            </button>
          </div>

          {PREVIEW && (
            <div className="preview-notice">
              <Lightbulb size={16} />
              <span>
                <strong>Interactive preview.</strong> Try the sample, imports,
                and feedback tools. Live AI is only available in your configured
                app.
              </span>
            </div>
          )}

          <div className="workflow" aria-label="Review progress">
            <div
              className={`workflow-step ${resumeReady ? "complete" : "current"}`}
            >
              <span>{resumeReady ? <Check size={13} /> : "1"}</span>Add your
              resume
            </div>
            <div className="workflow-line" />
            <div
              className={`workflow-step ${jobReady ? "complete" : resumeReady ? "current" : ""}`}
            >
              <span>{jobReady ? <Check size={13} /> : "2"}</span>Add the role
            </div>
            <div className="workflow-line" />
            <div
              className={`workflow-step ${review ? "complete" : ready ? "current" : ""}`}
            >
              <span>{review ? <Check size={13} /> : "3"}</span>Get a clearer
              story
            </div>
          </div>

          <form onSubmit={handleReview}>
            <div className="section-heading">
              <h2>
                <span>01</span>Your documents
              </h2>
              <button
                type="button"
                className="text-button"
                onClick={() => showModal("clear")}
                disabled={!hasDocuments || busy}
              >
                <Trash2 size={14} />
                Clear all
              </button>
            </div>
            <div className="document-grid">
              <section
                className={`document-card ${dragging ? "dragging" : ""}`}
                aria-labelledby="resume-label"
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!busy) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  void handleFile(event.dataTransfer.files[0]);
                }}
              >
                <div className="card-heading">
                  <div className="card-icon">
                    <FileText size={19} />
                  </div>
                  <div>
                    <label id="resume-label" htmlFor="resume">
                      Your resume
                    </label>
                    <p>The experience you bring to the table.</p>
                  </div>
                  <span className="required-label">Required</span>
                </div>
                <div className="upload-area">
                  <input
                    ref={fileInput}
                    id="resume-file"
                    type="file"
                    accept=".pdf,.txt"
                    aria-label="Upload a PDF or text resume"
                    className="sr-only"
                    tabIndex={-1}
                    onChange={(event) =>
                      void handleFile(event.target.files?.[0])
                    }
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="upload-button"
                    onClick={() => fileInput.current?.click()}
                    disabled={busy}
                  >
                    {isImporting ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Upload size={16} />
                    )}
                    {isImporting
                      ? "Reading your file..."
                      : fileName
                        ? "Replace file"
                        : "Upload resume"}
                  </button>
                  <span className="upload-hint" title={fileName || undefined}>
                    {fileName || "or drop a PDF / TXT · max 5 MB"}
                  </span>
                </div>
                <textarea
                  id="resume"
                  name="resume"
                  value={resume}
                  disabled={busy}
                  maxLength={MAX_TEXT_LENGTH}
                  aria-describedby="resume-hint"
                  placeholder={
                    "Or paste your resume here...\n\nYour projects, experience, education, and skills.\nGood stories start with the real stuff."
                  }
                  onChange={(event) => {
                    setResume(event.target.value);
                    setFileName("");
                    invalidateReview();
                  }}
                />
                <div className="document-footer" id="resume-hint">
                  <span className={resumeReady ? "ready-text" : ""}>
                    {resumeReady ? (
                      <Check size={13} />
                    ) : (
                      <span className="tiny-dot" />
                    )}
                    {resumeReady
                      ? `${wordCount(resume)} words · ready`
                      : "At least 100 characters"}
                  </span>
                  <span>{resume.length.toLocaleString()} / 20,000</span>
                </div>
              </section>

              <section className="document-card" aria-labelledby="job-label">
                <div className="card-heading">
                  <div className="card-icon">
                    <Target size={19} />
                  </div>
                  <div>
                    <label id="job-label" htmlFor="job-description">
                      The job description
                    </label>
                    <p>The opportunity you have your eye on.</p>
                  </div>
                  <span className="required-label">Required</span>
                </div>
                <div className="job-tip">
                  <Lightbulb size={15} />
                  <span>
                    Include responsibilities and qualifications for a better
                    review.
                  </span>
                </div>
                <textarea
                  id="job-description"
                  name="jobDescription"
                  value={jobDescription}
                  disabled={busy}
                  maxLength={MAX_TEXT_LENGTH}
                  aria-describedby="job-hint"
                  placeholder={
                    "Paste the job description here...\n\nWhat will you do? What are they looking for?\nInclude the must-haves and nice-to-haves."
                  }
                  onChange={(event) => {
                    setJobDescription(event.target.value);
                    invalidateReview();
                  }}
                />
                <div className="document-footer" id="job-hint">
                  <span className={jobReady ? "ready-text" : ""}>
                    {jobReady ? (
                      <Check size={13} />
                    ) : (
                      <span className="tiny-dot" />
                    )}
                    {jobReady
                      ? `${wordCount(jobDescription)} words · ready`
                      : "At least 100 characters"}
                  </span>
                  <span>{jobDescription.length.toLocaleString()} / 20,000</span>
                </div>
              </section>
            </div>

            {service?.accessRequired && (
              <div className="access-field">
                <LockKeyhole size={16} />
                <label htmlFor="access-code">Private review access</label>
                <input
                  id="access-code"
                  type="password"
                  autoComplete="off"
                  placeholder="Owner-provided access code"
                  maxLength={256}
                  value={accessCode}
                  disabled={busy}
                  onChange={(event) => setAccessCode(event.target.value)}
                />
                <span>Not your API key.</span>
              </div>
            )}
            <div className="review-action">
              <div className="consent-area">
                <label className="consent-label">
                  <input
                    type="checkbox"
                    checked={consent}
                    disabled={busy || !liveAvailable}
                    onChange={(event) => setConsent(event.target.checked)}
                  />
                  <span>
                    I agree to send both texts to Anthropic for this review.
                  </span>
                </label>
                <p>
                  Remove sensitive details first. API usage is billed to the app
                  owner.
                </p>
              </div>
              <button
                type="submit"
                className="button primary"
                disabled={
                  !ready ||
                  busy ||
                  !consent ||
                  !liveAvailable ||
                  Boolean(service?.accessRequired && !accessCode)
                }
              >
                {isLoading ? (
                  <LoaderCircle size={17} className="spin" />
                ) : (
                  <Sparkles size={17} />
                )}
                {isLoading
                  ? "Reviewing your story..."
                  : "Louis is checking your resume O.O"}
                {!isLoading && <ArrowRight size={17} />}
              </button>
            </div>
            <div className="status-row" aria-live="polite">
              <span>
                {isLoading
                  ? `Looking for useful, honest improvements · ${elapsed}s`
                  : status ||
                    (!liveAvailable && (PREVIEW || service)
                      ? "Live reviews aren't configured here. Explore the sample review instead."
                      : ready
                        ? consent
                          ? "Ready when you are."
                          : "Your documents are ready. Confirm consent to continue."
                        : "Add at least 100 characters to each document to begin.")}
              </span>
              {isLoading && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => requestRef.current?.abort("user")}
                >
                  Cancel review
                </button>
              )}
            </div>
          </form>

          {error && (
            <div className="error-message" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <section
            className="feedback-section"
            ref={resultRef}
            aria-labelledby="feedback-heading"
            aria-busy={isLoading}
          >
            <div className="section-heading">
              <h2 id="feedback-heading">
                <span>02</span>Your feedback
                {isDemo && <span className="sample-label">Sample</span>}
              </h2>
              {review && (
                <div className="result-actions">
                  <button className="text-button" onClick={copyReview}>
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button className="text-button" onClick={downloadReview}>
                    <Download size={15} />
                    Download
                  </button>
                </div>
              )}
            </div>
            {isLoading ? (
              <div className="loading-review">
                <div className="loading-heading">
                  <LoaderCircle className="spin" size={22} />
                  <div>
                    <h3>Finding the story in your experience.</h3>
                    <p>
                      Checking requirements, tightening bullets, connecting the
                      dots.
                    </p>
                  </div>
                </div>
                <div className="skeleton wide" />
                <div className="skeleton" />
                <div className="skeleton medium" />
                <p className="loading-footnote">
                  No fake scores. Just feedback you can actually use.
                </p>
              </div>
            ) : review ? (
              <div className="review-output">
                {isDemo && (
                  <div className="sample-banner">
                    <FileText size={16} />
                    <span>
                      <strong>A peek at the finished review.</strong>{" "}
                      Hand-written feedback on fictional sample documents, not a
                      live AI analysis.
                    </span>
                  </div>
                )}
                <div className="review-layout">
                  <div
                    className="review-tabs"
                    role="tablist"
                    aria-label="Feedback sections"
                  >
                    {sections.map((section, index) => {
                      const Icon = sectionIcons[index % sectionIcons.length];
                      return (
                        <button
                          key={index}
                          id={`review-tab-${index}`}
                          role="tab"
                          aria-selected={index === activeSection}
                          aria-controls={`review-panel-${index}`}
                          tabIndex={index === activeSection ? 0 : -1}
                          onClick={() => setActiveSection(index)}
                          onKeyDown={(event) => {
                            let next = index;
                            if (
                              event.key === "ArrowDown" ||
                              event.key === "ArrowRight"
                            )
                              next = (index + 1) % sections.length;
                            else if (
                              event.key === "ArrowUp" ||
                              event.key === "ArrowLeft"
                            )
                              next =
                                (index - 1 + sections.length) % sections.length;
                            else if (event.key === "Home") next = 0;
                            else if (event.key === "End")
                              next = sections.length - 1;
                            else return;
                            event.preventDefault();
                            setActiveSection(next);
                            document
                              .getElementById(`review-tab-${next}`)
                              ?.focus();
                          }}
                        >
                          <Icon size={17} />
                          <span>{section.title}</span>
                          <ChevronRight size={14} />
                        </button>
                      );
                    })}
                    <div className="review-reminder">
                      <ShieldCheck size={18} />
                      <p>
                        Better wording.
                        <br />
                        Same real you.
                      </p>
                    </div>
                  </div>
                  {sections.map((section, index) => (
                    <div
                      key={index}
                      id={`review-panel-${index}`}
                      role="tabpanel"
                      aria-labelledby={`review-tab-${index}`}
                      hidden={index !== activeSection}
                      tabIndex={0}
                      className="review-panel"
                    >
                      <div className="review-panel-eyebrow">
                        YOUR NEXT MOVE / {String(index + 1).padStart(2, "0")}
                      </div>
                      <h3>{section.title}</h3>
                      <div className="markdown">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          skipHtml
                          components={{
                            a: ({ children }) => <span>{children}</span>,
                            img: () => null,
                          }}
                        >
                          {section.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="review-disclaimer">
                  <ShieldCheck size={15} />
                  <p>
                    AI feedback can be wrong. Verify every suggestion and only
                    include claims that accurately reflect your experience.{" "}
                    <strong>(AKA Don&apos;t be dumb)</strong>
                  </p>
                </div>
              </div>
            ) : (
              <div className="empty-feedback">
                <div className="empty-intro">
                  <div className="empty-icon">
                    <ClipboardCheck size={25} />
                  </div>
                  <div>
                    <h3>A second pair of eyes. A stronger first impression.</h3>
                    <p>
                      Your review will turn into four focused, actionable
                      sections.
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={trySample}
                    disabled={busy}
                  >
                    See an example
                    <ArrowRight size={15} />
                  </button>
                </div>
                <div className="feature-grid">
                  {[
                    {
                      Icon: Lightbulb,
                      title: "What to fix first",
                      text: "Three changes worth your time.",
                    },
                    {
                      Icon: Target,
                      title: "Missing evidence",
                      text: "Skills the role asks for.",
                    },
                    {
                      Icon: ScanText,
                      title: "Stronger bullets",
                      text: "Your work, better explained.",
                    },
                    {
                      Icon: CheckCheck,
                      title: "Keyword alignment",
                      text: "Relevant words. No stuffing.",
                    },
                  ].map(({ Icon, title, text }) => (
                    <div key={title}>
                      <Icon size={17} />
                      <h4>{title}</h4>
                      <p>{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <footer className="workspace-footer">
            <span>
              <LockKeyhole size={13} />
              No saved document history. Refreshing clears this workspace.
            </span>
            <button className="text-button" onClick={() => showModal("help")}>
              A little transparency
              <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>

      <dialog
        ref={dialogRef}
        className="app-dialog"
        aria-label={
          modal === "help"
            ? "How Resume Reviewer works"
            : modal === "clear"
              ? "Clear workspace confirmation"
              : "Load sample confirmation"
        }
      >
        <div className="dialog-heading">
          <Mark small />
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        {modal === "help" ? (
          <>
            <div className="eyebrow">THE SHORT VERSION</div>
            <h2>Good feedback. No magic promises.</h2>
            <div className="help-steps">
              <p>
                <strong>01 / Bring the context.</strong> Paste a resume and job
                description, or import a text-based PDF or TXT file. File text
                is extracted in your browser. Scanned PDFs need OCR elsewhere
                first.
              </p>
              <p>
                <strong>02 / Stay in control.</strong> Review the extracted
                text, remove sensitive details, and consent before submitting.
                Both texts go to Anthropic only when you request a live review.
              </p>
              <p>
                <strong>03 / Make it yours.</strong> Read the four feedback
                sections, then copy or download the review. Only use suggestions
                that are true.
              </p>
            </div>
            <div className="privacy-note">
              <ShieldCheck size={20} />
              <p>
                This app does not save document history or log document
                contents. Text stays in memory until you refresh or clear it.
                Anthropic processes live requests under its own data policies.
                This is not an ATS simulator, a hiring prediction, or a
                guarantee.
              </p>
            </div>
            <button
              className="button primary"
              onClick={() => dialogRef.current?.close()}
            >
              Back to my next chapter
              <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <h2>
              {modal === "clear"
                ? "A clean slate?"
                : "Take a look at an example?"}
            </h2>
            <p>
              {modal === "clear"
                ? "This clears both documents, the feedback, and the access code from this workspace. There is no saved copy here."
                : "This replaces the current documents and feedback with fictional examples. Nothing will be sent to Claude."}
            </p>
            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => dialogRef.current?.close()}
              >
                Keep my work
              </button>
              <button
                className="button primary"
                onClick={modal === "clear" ? clearWorkspace : loadSample}
              >
                {modal === "clear" ? "Clear workspace" : "Load sample"}
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}

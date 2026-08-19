"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "searching" | "error";

export default function SearchForm() {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = title.trim();
    if (!query || status === "searching") return;

    setStatus("searching");
    try {
      const res = await fetch(`/api/jobs?title=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        console.error("[career-explorer] /api/jobs error:", data);
        setStatus("error");
        return;
      }
      // Results view arrives in a later chunk; for now, log the payload.
      console.log("[career-explorer] /api/jobs response:", data);
      setStatus("idle");
    } catch (error) {
      console.error("[career-explorer] /api/jobs request failed:", error);
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="relative">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Enter a job title..."
          aria-label="Job title"
          className="w-full rounded-xl border border-teal-tint bg-white py-3.5 pl-5 pr-14 text-base text-ink placeholder:text-slate outline-none focus-visible:border-teal focus-visible:ring-2 focus-visible:ring-teal"
        />
        <button
          type="submit"
          aria-label="Search"
          disabled={status === "searching"}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-teal outline-none hover:bg-teal-tint focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </div>
      <p className="mt-3 h-5 text-center text-sm text-slate" role="status">
        {status === "searching" && "Searching..."}
        {status === "error" &&
          "Job data is temporarily unavailable. Try again shortly."}
      </p>
    </form>
  );
}

"use client";

import { useState, type FormEvent } from "react";

interface SearchFormProps {
  onSearch: (title: string) => void;
  busy: boolean;
}

export default function SearchForm({ onSearch, busy }: SearchFormProps) {
  const [title, setTitle] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = title.trim();
    if (!query || busy) return;
    onSearch(query);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
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
          disabled={busy}
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
    </form>
  );
}

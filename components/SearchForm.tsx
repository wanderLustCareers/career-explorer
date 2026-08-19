"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { displayTitle } from "@/components/AdjacentTitles";

interface SearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (title: string) => void;
  busy: boolean;
  recent: string[];
  onRemoveRecent: (title: string) => void;
}

/** Keep titles whose words start with the typed tokens, in order. "sof" → software… */
function matchesRecent(title: string, query: string) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const words = title.toLowerCase().split(/\s+/);
  let wordIndex = 0;
  for (const token of tokens) {
    while (wordIndex < words.length && !words[wordIndex].startsWith(token)) {
      wordIndex += 1;
    }
    if (wordIndex >= words.length) return false;
    wordIndex += 1;
  }
  return true;
}

export default function SearchForm({
  value,
  onChange,
  onSearch,
  busy,
  recent,
  onRemoveRecent,
}: SearchFormProps) {
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = recent.filter((title) => matchesRecent(title, value));
  const showList = open && !busy && suggestions.length > 0;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function submitTitle(title: string) {
    const query = title.trim();
    if (!query || busy) return;
    setOpen(false);
    setActiveIndex(-1);
    onSearch(query);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (showList && activeIndex >= 0 && suggestions[activeIndex]) {
      submitTitle(suggestions[activeIndex]);
      return;
    }
    submitTitle(value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showList) {
      if (event.key === "ArrowDown" && suggestions.length > 0) {
        event.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        index < suggestions.length - 1 ? index + 1 : 0
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1
      );
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <form ref={rootRef} onSubmit={handleSubmit} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a job title..."
          aria-label="Job title"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={
            showList && activeIndex >= 0
              ? `${listId}-option-${activeIndex}`
              : undefined
          }
          role="combobox"
          className="w-full rounded-xl border border-teal-tint bg-white py-3.5 pl-5 pr-14 text-base text-ink placeholder:text-slate outline-none focus-visible:border-teal focus-visible:ring-2 focus-visible:ring-teal"
        />
        <button
          type="submit"
          aria-label="Search"
          disabled={busy}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-lg p-2 text-teal outline-none hover:bg-teal-tint focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-50"
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

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Recent searches"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-teal-tint bg-white py-1"
        >
          {suggestions.map((title, index) => {
            const active = index === activeIndex;
            const label = displayTitle(title);
            return (
              <li
                key={title}
                role="option"
                aria-selected={active}
                id={`${listId}-option-${index}`}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex items-center ${active ? "bg-teal-tint" : ""}`}
              >
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => submitTitle(title)}
                  className="min-w-0 flex-1 truncate px-4 py-2.5 text-left text-sm text-ink outline-none"
                >
                  {label}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${label} from recent searches`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveRecent(title);
                    setActiveIndex(-1);
                  }}
                  className="mr-2 rounded-md p-1.5 text-slate outline-none hover:bg-white hover:text-ink focus-visible:ring-2 focus-visible:ring-teal"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
}

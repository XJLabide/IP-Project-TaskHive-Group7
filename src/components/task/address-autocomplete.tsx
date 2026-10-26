"use client";

import { useEffect, useId, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { MapPin } from "lucide-react";

type AddressSuggestion = { id: string; label: string };
type SearchState = "idle" | "loading" | "ready" | "empty" | "error";

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-normal outline-none placeholder:text-zinc-400 focus:border-[#D19300] focus:ring-2 focus:ring-[#FFC800]/25 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFD50D]";

export function AddressAutocomplete({
  value,
  onChange,
  describedBy,
  invalid = false,
}: {
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
  invalid?: boolean;
}) {
  const listboxId = useId();
  const [selectedValue, setSelectedValue] = useState(value);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 4 || query === selectedValue) return;

    const controller = new AbortController();

    const timeout = window.setTimeout(() => {
      void fetch("/api/locations/search", {
        body: JSON.stringify({ query }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Address search failed.");
          return (await response.json()) as { suggestions?: AddressSuggestion[] };
        })
        .then(({ suggestions: nextSuggestions = [] }) => {
          setSuggestions(nextSuggestions);
          setSearchState(nextSuggestions.length ? "ready" : "empty");
          setOpen(true);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setSearchState("error");
          setOpen(true);
        });
    }, 450);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedValue, value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedValue("");
    setSuggestions([]);
    setActiveIndex(-1);
    setOpen(true);
    setSearchState(event.target.value.trim().length >= 4 ? "loading" : "idle");
    onChange(event.target.value);
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    setSelectedValue(suggestion.label);
    setSuggestions([]);
    setSearchState("idle");
    setActiveIndex(-1);
    setOpen(false);
    onChange(suggestion.label);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      if (activeIndex >= 0) {
        event.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      } else if (open && searchState !== "idle") {
        event.preventDefault();
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const statusText =
    searchState === "loading"
      ? "Searching addresses…"
      : searchState === "empty"
        ? "No matching addresses found. You can keep typing your address."
        : searchState === "error"
          ? "Address suggestions are unavailable right now. You can still enter the address manually."
          : "";

  return (
    <div className="relative">
      <input
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        aria-autocomplete="list"
        aria-controls={suggestions.length ? listboxId : undefined}
        aria-describedby={describedBy}
        aria-expanded={open && suggestions.length > 0}
        aria-haspopup="listbox"
        aria-invalid={invalid || undefined}
        autoComplete="off"
        className={inputClass}
        id="task-exact-address"
        maxLength={160}
        onBlur={() => setOpen(false)}
        onChange={handleChange}
        onFocus={() => {
          if (suggestions.length) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="House number, street, barangay"
        role="combobox"
        value={value}
      />
      {open && suggestions.length > 0 ? (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 dark:border-zinc-700 dark:bg-zinc-900"
          id={listboxId}
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <button
              aria-selected={activeIndex === index}
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm font-normal text-zinc-800 hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:bg-zinc-800"
              id={`${listboxId}-option-${index}`}
              key={`${suggestion.id}-${suggestion.label}`}
              onClick={() => selectSuggestion(suggestion)}
              onMouseDown={(event) => event.preventDefault()}
              role="option"
              tabIndex={-1}
              type="button"
            >
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />
              <span>{suggestion.label}</span>
            </button>
          ))}
        </div>
      ) : null}
      {open && !suggestions.length && statusText ? (
        <div
          aria-live="polite"
          className="absolute left-0 right-0 top-full z-30 mt-1 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-xs font-normal text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          role="status"
        >
          {statusText}
        </div>
      ) : null}
    </div>
  );
}

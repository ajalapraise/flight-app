"use client";

import { useEffect, useRef, useState } from "react";

export interface AirportOption {
  code: string;
  label: string; // "City Name (CODE)"
}

interface Props {
  options: AirportOption[];
  value: string; // IATA code
  onChange: (code: string) => void;
  disabledCode?: string; // disable this option (e.g. same as the other field)
  placeholder?: string;
}

export function LocationComboBox({
  options,
  value,
  onChange,
  disabledCode,
  placeholder = "Type to search…",
}: Props) {
  const selected = options.find((o) => o.code === value);
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep display in sync when the parent changes the value
  useEffect(() => {
    setQuery(options.find((o) => o.code === value)?.label ?? "");
  }, [value, options]);

  const filtered = options.filter(
    (o) =>
      o.code !== disabledCode &&
      (o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.code.toLowerCase().includes(query.toLowerCase())),
  );

  // Close and reset text when clicking outside
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery(options.find((o) => o.code === value)?.label ?? "");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [value, options]);

  function handleSelect(opt: AirportOption) {
    onChange(opt.code);
    setQuery(opt.label);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery(options.find((o) => o.code === value)?.label ?? "");
      inputRef.current?.blur();
    }
    if (e.key === "Enter" && filtered.length === 1) {
      handleSelect(filtered[0]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
      />

      {open && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded border border-slate-200 bg-white text-sm shadow-lg">
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <li
                key={opt.code}
                onMouseDown={() => handleSelect(opt)}
                className="flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-slate-50"
              >
                <span className="text-slate-900">{opt.label.replace(/ \(\w+\)$/, "")}</span>
                <span className="ml-3 font-mono text-xs text-slate-400">
                  {opt.code}
                </span>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-slate-500">No airports match</li>
          )}
        </ul>
      )}
    </div>
  );
}

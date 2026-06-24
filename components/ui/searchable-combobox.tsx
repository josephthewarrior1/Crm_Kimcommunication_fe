"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "./utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface SearchableComboboxProps {
  options: ComboboxOption[];
  value: string;
  displayValue: string;
  onSelect: (value: string, label: string) => void;
  onInputChange: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  allowFreeText?: boolean;
  onBlur?: (text: string) => void;
  className?: string;
}

export function SearchableCombobox({
  options,
  value,
  displayValue,
  onSelect,
  onInputChange,
  placeholder = "Search...",
  disabled = false,
  allowFreeText = true,
  onBlur,
  className,
}: SearchableComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(displayValue || "");
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Sync inputValue with displayValue from parent when it changes externally
  React.useEffect(() => {
    setInputValue(displayValue || "");
  }, [displayValue]);

  // Filter options based on typed input
  const filtered = React.useMemo(() => {
    if (!inputValue.trim()) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, inputValue]);

  // Reset highlight when filtered list changes
  React.useEffect(() => {
    setHighlightedIndex(-1);
  }, [filtered.length]);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (open) {
          setOpen(false);
          // Trigger blur fuzzy-match if free text and no selection
          if (allowFreeText && inputValue.trim() && !value) {
            onBlur?.(inputValue.trim());
          }
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, inputValue, value, allowFreeText, onBlur]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);
    setOpen(true);
    if (allowFreeText) {
      onInputChange(text);
    }
  };

  const handleFocus = () => {
    setInputValue("");
    setOpen(true);
  };

  const handleSelect = (option: ComboboxOption) => {
    onSelect(option.value, option.label);
    setInputValue(option.label);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          handleSelect(filtered[highlightedIndex]);
        } else if (allowFreeText && inputValue.trim()) {
          // Accept free text
          setOpen(false);
          onBlur?.(inputValue.trim());
        }
        break;
      case "Escape":
        setOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-combobox-item]");
      items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 pr-8 text-sm shadow-sm transition-[color,box-shadow] outline-none",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-neutral-900 dark:border-gray-700",
          )}
        />
        <ChevronsUpDown
          className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40 pointer-events-none"
        />
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-[200px] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              {allowFreeText && inputValue.trim()
                ? `No match — "${inputValue}" will be used as new entry`
                : "No results found."}
            </div>
          ) : (
            filtered.map((option, idx) => (
              <div
                key={option.value}
                data-combobox-item
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before select
                  handleSelect(option);
                }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer select-none",
                  highlightedIndex === idx && "bg-accent text-accent-foreground",
                  value === option.value && "font-medium",
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

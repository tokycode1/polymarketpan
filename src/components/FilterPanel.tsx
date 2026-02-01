"use client";

import { FilterState } from "@/types/market";
import { useState } from "react";

interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  loading: boolean;
}

/* Reusable tiny input wrapper */
function FilterInput({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] text-poly-muted mb-1 uppercase tracking-wider font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-poly-dark border border-poly-border rounded-lg px-3 py-2 text-sm text-poly-text placeholder-poly-muted/50 focus:outline-none focus:border-poly-accent focus:ring-1 focus:ring-poly-accent/30 transition-all";

const selectClass =
  "w-full bg-poly-dark border border-poly-border rounded-lg px-3 py-2 text-sm text-poly-text focus:outline-none focus:border-poly-accent focus:ring-1 focus:ring-poly-accent/30 transition-all";

export default function FilterPanel({
  filters,
  onFilterChange,
  onReset,
  loading,
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const updateFilter = (key: keyof FilterState, value: string | number) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const activeFilterCount = [
    filters.minPrice !== 0.9,
    filters.maxPrice !== 1,
    filters.minLiquidity !== 10000,
    filters.maxLiquidity !== 999999999,
    filters.minVolume24h !== 10000,
    filters.maxVolume24h !== 999999999,
    filters.startDateFrom !== "",
    filters.startDateTo !== "",
    filters.endDateFrom !== "",
    filters.endDateTo !== "",
    filters.search !== "",
  ].filter(Boolean).length;

  return (
    <div className="bg-poly-card border border-poly-border rounded-xl mb-6 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-poly-border/50">
        <div className="flex items-center gap-2.5">
          <svg
            className="w-4 h-4 text-poly-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          <span className="text-poly-text font-semibold text-sm">Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-poly-accent/15 text-poly-accent rounded-full min-w-[18px] text-center">
              {activeFilterCount}
            </span>
          )}
          {loading && (
            <svg
              className="animate-spin h-3.5 w-3.5 text-poly-muted ml-1"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              onClick={onReset}
              className="text-xs text-poly-muted hover:text-poly-red transition-colors flex items-center gap-1"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Reset
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-poly-accent hover:text-blue-400 transition-colors flex items-center gap-1 ml-2"
          >
            {expanded ? "Less" : "More"}
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Row 1: Search + Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <FilterInput label="Search">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-poly-muted/60"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search markets..."
                  value={filters.search}
                  onChange={(e) => updateFilter("search", e.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>
            </FilterInput>
          </div>
          <div className="sm:col-span-4">
            <FilterInput label="Sort By">
              <select
                value={filters.sortBy}
                onChange={(e) => updateFilter("sortBy", e.target.value)}
                className={selectClass}
              >
                <option value="volume24hr">24h Volume</option>
                <option value="lastTradePrice">Price</option>
                <option value="liquidity">Liquidity</option>
                <option value="volume">Total Volume</option>
                <option value="endDate">End Date</option>
                <option value="startDate">Start Date</option>
              </select>
            </FilterInput>
          </div>
          <div className="sm:col-span-3">
            <FilterInput label="Order">
              <select
                value={filters.sortOrder}
                onChange={(e) =>
                  updateFilter("sortOrder", e.target.value as "asc" | "desc")
                }
                className={selectClass}
              >
                <option value="desc">High → Low</option>
                <option value="asc">Low → High</option>
              </select>
            </FilterInput>
          </div>
        </div>

        {/* Row 2: Price + Liquidity (always visible) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <FilterInput label="Min Price">
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={filters.minPrice}
              onChange={(e) =>
                updateFilter("minPrice", parseFloat(e.target.value) || 0)
              }
              className={inputClass}
            />
          </FilterInput>
          <FilterInput label="Max Price">
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={filters.maxPrice}
              onChange={(e) =>
                updateFilter("maxPrice", parseFloat(e.target.value) || 1)
              }
              className={inputClass}
            />
          </FilterInput>
          <FilterInput label="Min Liquidity">
            <input
              type="number"
              step="1000"
              min="0"
              value={filters.minLiquidity}
              onChange={(e) =>
                updateFilter("minLiquidity", parseFloat(e.target.value) || 0)
              }
              className={inputClass}
            />
          </FilterInput>
          <FilterInput label="Max Liquidity">
            <input
              type="number"
              step="1000"
              min="0"
              value={filters.maxLiquidity}
              onChange={(e) =>
                updateFilter(
                  "maxLiquidity",
                  parseFloat(e.target.value) || 999999999
                )
              }
              className={inputClass}
            />
          </FilterInput>
        </div>

        {/* Expanded: Date Range + Volume */}
        {expanded && (
          <div className="space-y-4 pt-3 border-t border-poly-border/40">
            {/* 24h Volume */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FilterInput label="Min 24h Volume">
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={filters.minVolume24h}
                  onChange={(e) =>
                    updateFilter(
                      "minVolume24h",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className={inputClass}
                />
              </FilterInput>
              <FilterInput label="Max 24h Volume">
                <input
                  type="number"
                  step="1000"
                  min="0"
                  value={filters.maxVolume24h}
                  onChange={(e) =>
                    updateFilter(
                      "maxVolume24h",
                      parseFloat(e.target.value) || 999999999
                    )
                  }
                  className={inputClass}
                />
              </FilterInput>
            </div>

            {/* Start Date Range */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FilterInput label="Start Date From">
                <input
                  type="date"
                  value={filters.startDateFrom}
                  onChange={(e) =>
                    updateFilter("startDateFrom", e.target.value)
                  }
                  className={inputClass}
                />
              </FilterInput>
              <FilterInput label="Start Date To">
                <input
                  type="date"
                  value={filters.startDateTo}
                  onChange={(e) => updateFilter("startDateTo", e.target.value)}
                  className={inputClass}
                />
              </FilterInput>
              <FilterInput label="End Date From">
                <input
                  type="date"
                  value={filters.endDateFrom}
                  onChange={(e) => updateFilter("endDateFrom", e.target.value)}
                  className={inputClass}
                />
              </FilterInput>
              <FilterInput label="End Date To">
                <input
                  type="date"
                  value={filters.endDateTo}
                  onChange={(e) => updateFilter("endDateTo", e.target.value)}
                  className={inputClass}
                />
              </FilterInput>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  PolymarketMarket,
  FilterState,
} from "@/types/market";
import FilterPanel from "@/components/FilterPanel";
import MarketTable from "@/components/MarketTable";
import MarketDetailModal from "@/components/MarketDetailModal";
import Pagination from "@/components/Pagination";

const DEFAULT_FILTERS: FilterState = {
  minPrice: 0.9,
  maxPrice: 1,
  minLiquidity: 10000,
  maxLiquidity: 999999999,
  startDateFrom: "",
  startDateTo: "",
  endDateFrom: "",
  endDateTo: "",
  minVolume24h: 10000,
  maxVolume24h: 999999999,
  search: "",
  sortBy: "endDate",
  sortOrder: "asc",
};

const PAGE_SIZE = 20;

export default function HomePage() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  // allMarkets = data returned by API (filtered by numeric/date + sorted)
  const [allMarkets, setAllMarkets] = useState<PolymarketMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedMarket, setSelectedMarket] =
    useState<PolymarketMarket | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Debounce ref — only for API calls (numeric/date/sort changes)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  // Track which filter keys actually need an API refetch
  const prevApiFiltersRef = useRef<string>("");
  // Always hold latest filters for auto-refresh to read
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  /** Build the query params that go to the API (everything EXCEPT search) */
  const buildApiParams = useCallback((f: FilterState) => {
    const params = new URLSearchParams({
      minPrice: String(f.minPrice),
      maxPrice: String(f.maxPrice),
      minLiquidity: String(f.minLiquidity),
      maxLiquidity: String(f.maxLiquidity),
      minVolume24h: String(f.minVolume24h),
      maxVolume24h: String(f.maxVolume24h),
      sortBy: f.sortBy,
      sortOrder: f.sortOrder,
    });
    if (f.startDateFrom) params.set("startDateFrom", f.startDateFrom);
    if (f.startDateTo) params.set("startDateTo", f.startDateTo);
    if (f.endDateFrom) params.set("endDateFrom", f.endDateFrom);
    if (f.endDateTo) params.set("endDateTo", f.endDateTo);
    return params.toString();
  }, []);

  /** Fetch filtered+sorted data from API */
  const fetchMarkets = useCallback(
    async (f: FilterState) => {
      setLoading(true);
      try {
        const qs = buildApiParams(f);
        const res = await fetch(`/api/markets?${qs}`);
        const json = await res.json();
        setAllMarkets(json.data ?? []);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to fetch markets:", err);
      } finally {
        setLoading(false);
      }
    },
    [buildApiParams]
  );

  /**
   * Client-side fuzzy search on the already-filtered results.
   * Matches against question, description, and groupItemTitle.
   */
  const searchedMarkets = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return allMarkets;
    return allMarkets.filter((m) => {
      const haystack = [
        m.question,
        m.groupItemTitle,
        m.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      // Support multi-word: every word must appear somewhere
      const words = q.split(/\s+/);
      return words.every((w) => haystack.includes(w));
    });
  }, [allMarkets, filters.search]);

  /** Paginated slice of searched results */
  const totalFiltered = searchedMarkets.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedMarkets = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return searchedMarkets.slice(start, start + PAGE_SIZE);
  }, [searchedMarkets, safePage]);

  /**
   * When filters change:
   * - search change → no API call, instant client filter
   * - anything else → debounced API call
   */
  useEffect(() => {
    const apiKey = buildApiParams(filters);
    if (apiKey === prevApiFiltersRef.current) return; // only search changed
    prevApiFiltersRef.current = apiKey;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMarkets(filters);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, fetchMarkets, buildApiParams]);

  // Initial fetch
  useEffect(() => {
    fetchMarkets(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 5 min (only when enabled)
  // Uses filtersRef so the interval always reads the latest filter values
  // without restarting the timer on every filter change.
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMarkets(filtersRef.current);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMarkets]);

  // Reset page to 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [filters.search]);

  const handleFilterChange = (newFilters: FilterState) => {
    // If only search changed, don't reset page (the useEffect above handles it)
    const searchOnly =
      buildApiParams(newFilters) === buildApiParams(filters) &&
      newFilters.search !== filters.search;
    setFilters(newFilters);
    if (!searchOnly) setPage(1);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-poly-dark">
      {/* Header */}
      <header className="border-b border-poly-border bg-poly-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-poly-accent to-purple-500 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-poly-text font-bold text-lg">
                  PolyScanner
                </h1>
                <p className="text-poly-muted text-xs hidden sm:block">
                  Polymarket Tail-End Market Scanner
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-poly-muted hidden sm:block">
                  Updated{" "}
                  {lastUpdated.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefresh((v) => !v)}
                className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-poly-dark border border-poly-border text-xs transition-colors"
                title={autoRefresh ? "Auto-refresh ON (5 min)" : "Auto-refresh OFF"}
              >
                <div
                  className={`relative w-7 h-4 rounded-full transition-colors ${
                    autoRefresh ? "bg-poly-green" : "bg-poly-border"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                      autoRefresh ? "translate-x-3.5" : "translate-x-0.5"
                    }`}
                  />
                </div>
                <span className={autoRefresh ? "text-poly-green" : "text-poly-muted"}>
                  Auto
                </span>
              </button>
              <button
                onClick={() => fetchMarkets(filters)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-poly-dark border border-poly-border text-poly-muted hover:text-poly-accent hover:border-poly-accent transition-colors text-sm disabled:opacity-50"
              >
                <svg
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-poly-green/10 border border-poly-green/20">
                <div className="w-2 h-2 bg-poly-green rounded-full animate-pulse" />
                <span className="text-poly-green text-xs font-medium">
                  {totalFiltered} Markets
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          loading={loading}
        />

        <MarketTable
          markets={pagedMarkets}
          page={safePage}
          pageSize={PAGE_SIZE}
          onSelectMarket={setSelectedMarket}
        />

        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={totalFiltered}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>

      {/* Modal */}
      <MarketDetailModal
        market={selectedMarket}
        onClose={() => setSelectedMarket(null)}
      />
    </main>
  );
}

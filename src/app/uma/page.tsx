"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { UmaVote, VoteStatus } from "@/types/uma";
import UmaVoteTable from "@/components/UmaVoteTable";
import UmaVoteDetailModal from "@/components/UmaVoteDetailModal";

// SWR fetcher function
const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to fetch votes");
  }
  return json;
};

type FilterStatus = "all" | VoteStatus;

export default function UmaVotesPage() {
  const [selectedVote, setSelectedVote] = useState<UmaVote | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [includeAll, setIncludeAll] = useState(false);

  // List API URL: when statusFilter is set, pass it so API returns only that status (server-side filter)
  const listParams = new URLSearchParams();
  if (includeAll) listParams.set("includeAll", "true");
  if (statusFilter !== "all") listParams.set("status", statusFilter);
  const listUrl = `/api/uma/votes${listParams.toString() ? `?${listParams.toString()}` : ""}`;

  // When includeAll is on and a status tab is selected, we need full list for tab counts; fetch it separately
  const countUrl =
    includeAll && statusFilter !== "all"
      ? "/api/uma/votes?includeAll=true"
      : null;

  const swrOpts = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
    refreshInterval: autoRefresh ? 2 * 60 * 1000 : 0,
  };

  const { data, error, isLoading, mutate } = useSWR(listUrl, fetcher, swrOpts);
  const { data: countData } = useSWR(countUrl, fetcher, swrOpts);

  const votes: UmaVote[] = data?.data ?? [];
  const votesForCount: UmaVote[] = countUrl ? (countData?.data ?? []) : votes;
  const loading = isLoading;
  const lastUpdated = data ? new Date() : null;

  // List is already filtered by API when statusFilter !== "all"
  const filteredVotes = useMemo(
    () =>
      statusFilter === "all"
        ? votes
        : votes.filter((v) => v.status === statusFilter),
    [votes, statusFilter]
  );

  // Counts from full list when we have it (for correct tab numbers)
  const statusCounts = useMemo(
    () => ({
      all: votesForCount.length,
      revealing: votesForCount.filter((v) => v.status === "revealing").length,
      committing: votesForCount.filter((v) => v.status === "committing").length,
      upcoming: votesForCount.filter((v) => v.status === "upcoming").length,
    }),
    [votesForCount]
  );

  return (
    <main className="min-h-screen bg-poly-dark">
      {/* Header */}
      <header className="border-b border-poly-border bg-poly-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Logo linking back to home */}
              <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <span className="text-white font-black text-sm tracking-tighter">1M</span>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-md flex items-center justify-center shadow-md">
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"
                      />
                    </svg>
                  </div>
                </div>
                <div>
                  <h1 className="text-poly-text font-bold text-xl tracking-tight">
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">OneM</span>
                    <span className="text-poly-muted">-</span>
                    <span className="text-amber-400">Tools</span>
                  </h1>
                  <p className="text-poly-muted text-xs hidden sm:block">
                    UMA Voting Analysis
                  </p>
                </div>
              </Link>
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
                title={autoRefresh ? "Auto-refresh ON (2 min)" : "Auto-refresh OFF"}
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
                onClick={() => mutate()}
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
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-poly-accent/10 border border-poly-accent/20">
                <div className="w-2 h-2 bg-poly-accent rounded-full animate-pulse" />
                <span className="text-poly-accent text-xs font-medium">
                  {filteredVotes.length} Votes
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="border-b border-poly-border bg-poly-card/50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-6 overflow-x-auto">
            <Link
              href="/"
              className="py-3 text-sm text-poly-muted hover:text-poly-text transition-colors whitespace-nowrap"
            >
              Market Scanner
            </Link>
            <span className="py-3 text-sm text-poly-accent border-b-2 border-poly-accent whitespace-nowrap">
              UMA Votes
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Filter Bar */}
        <div className="bg-poly-card border border-poly-border rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-poly-dark/50 p-1 rounded-lg">
              {(["all", "revealing", "committing", "upcoming"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    statusFilter === status
                      ? "bg-poly-accent text-white"
                      : "text-poly-muted hover:text-poly-text"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  <span className="ml-1.5 text-xs opacity-75">
                    ({statusCounts[status]})
                  </span>
                </button>
              ))}
            </div>

            {/* Options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-poly-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAll}
                  onChange={(e) => setIncludeAll(e.target.checked)}
                  className="w-4 h-4 rounded border-poly-border bg-poly-dark text-poly-accent focus:ring-poly-accent focus:ring-offset-poly-dark"
                />
                <span>Include votes without reveals</span>
              </label>
              <a
                href="https://vote.uma.xyz/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-poly-muted hover:text-poly-accent transition-colors"
              >
                <span>UMA Vote Portal</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-poly-accent/10 border border-poly-accent/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-poly-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="text-poly-text font-medium mb-1">Polymarket UMA Voting Analysis</p>
              <p className="text-poly-muted">
                This page shows active UMA votes related to Polymarket resolutions. 
                Votes in the <span className="text-poly-accent font-medium">Revealing</span> phase have visible vote distributions. 
                Click on any vote to see detailed information, market data, and order book.
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && votes.length === 0 && (
          <div className="bg-poly-card border border-poly-border rounded-xl p-12 text-center">
            <svg className="animate-spin h-8 w-8 text-poly-accent mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-poly-muted">Loading UMA votes...</p>
            <p className="text-poly-muted/60 text-sm mt-1">This may take a moment</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-poly-red/10 border border-poly-red/20 rounded-xl p-6 text-center mb-6">
            <svg className="w-8 h-8 text-poly-red mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-poly-red font-medium">{error.message}</p>
            <button
              onClick={() => mutate()}
              className="mt-3 px-4 py-2 text-sm bg-poly-red/20 text-poly-red hover:bg-poly-red/30 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Vote Table */}
        {!loading || votes.length > 0 ? (
          <UmaVoteTable votes={filteredVotes} onSelectVote={setSelectedVote} />
        ) : null}
      </div>

      {/* Vote Detail Modal */}
      <UmaVoteDetailModal vote={selectedVote} onClose={() => setSelectedVote(null)} />
    </main>
  );
}

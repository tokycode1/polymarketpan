"use client";

import { UmaVote, calculateVoteStats, VOTE_PRICES } from "@/types/uma";
import VotingProgress from "./VotingProgress";

interface UmaVoteTableProps {
  votes: UmaVote[];
  onSelectVote: (vote: UmaVote) => void;
}

function formatNumber(n: number | undefined | null): string {
  const v = Number(n);
  if (!isFinite(v)) return "$0";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function formatPercent(p: number | undefined | null): string {
  const v = Number(p);
  if (!isFinite(v)) return "0.0%";
  return `${(v * 100).toFixed(1)}%`;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(parseInt(timestamp) * 1000);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    upcoming: "bg-poly-muted/20 text-poly-muted",
    committing: "bg-poly-yellow/20 text-poly-yellow",
    revealing: "bg-poly-accent/20 text-poly-accent",
    resolved: "bg-poly-green/20 text-poly-green",
  };

  const labels: Record<string, string> = {
    upcoming: "Upcoming",
    committing: "Committing",
    revealing: "Revealing",
    resolved: "Resolved",
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.upcoming}`}>
      {labels[status] || status}
    </span>
  );
}

function getLeadingOutcome(vote: UmaVote): { label: string; color: string } | null {
  const stats = calculateVoteStats(vote.latestRound);
  if (!stats.leadingOption) return null;

  const price = stats.leadingOption.price;
  const outcomes = vote.resolvedData?.outcomes;

  if (price === VOTE_PRICES.P1) {
    return { label: outcomes?.p1Label || "No", color: "text-poly-red" };
  }
  if (price === VOTE_PRICES.P2) {
    return { label: outcomes?.p2Label || "Yes", color: "text-poly-green" };
  }
  if (price === VOTE_PRICES.P3) {
    return { label: outcomes?.p3Label || "50-50", color: "text-poly-yellow" };
  }
  return null;
}

export default function UmaVoteTable({ votes, onSelectVote }: UmaVoteTableProps) {
  if (votes.length === 0) {
    return (
      <div className="bg-poly-card border border-poly-border rounded-xl p-12 text-center">
        <svg
          className="w-16 h-16 text-poly-muted mx-auto mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-poly-muted text-lg">No active votes found</p>
        <p className="text-poly-muted/60 text-sm mt-1">
          Check back later for new UMA votes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {votes.map((vote) => {
        const stats = calculateVoteStats(vote.latestRound);
        const leadingOutcome = getLeadingOutcome(vote);
        const market = vote.market;
        const title = vote.resolvedData?.title || market?.question || "Unknown Market";
        const marketUrl = market?.events?.[0]?.slug
          ? `https://polymarket.com/event/${market.events[0].slug}`
          : null;

        // Parse market prices
        let yesPrice = 0.5;
        let noPrice = 0.5;
        if (market?.outcomePrices) {
          try {
            const prices = JSON.parse(market.outcomePrices);
            yesPrice = parseFloat(prices[0] || "0.5");
            noPrice = parseFloat(prices[1] || "0.5");
          } catch {
            // Use defaults
          }
        }

        return (
          <div
            key={`${vote.time}-${vote.ancillaryData.slice(0, 20)}`}
            className="bg-poly-card border border-poly-border rounded-xl overflow-hidden hover:border-poly-accent/50 transition-colors cursor-pointer"
            onClick={() => onSelectVote(vote)}
          >
            {/* Header */}
            <div className="p-4 border-b border-poly-border/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {market?.image && (
                    <img
                      src={market.image}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-poly-text font-medium line-clamp-2">
                      {title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-poly-muted">
                      <span>Request Time: {formatTimestamp(vote.time)}</span>
                      {vote.rollCount !== "0" && (
                        <span className="text-poly-yellow">
                          Roll #{vote.rollCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getStatusBadge(vote.status)}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Voting Progress */}
              <div>
                <div className="text-xs text-poly-muted uppercase tracking-wider mb-2">
                  Vote Distribution
                </div>
                <VotingProgress
                  groups={vote.latestRound.groups}
                  outcomes={vote.resolvedData?.outcomes}
                  compact
                />
                {stats.leadingPercentage !== null && leadingOutcome && (
                  <div className="mt-2 text-sm">
                    <span className="text-poly-muted">Leading: </span>
                    <span className={`font-medium ${leadingOutcome.color}`}>
                      {leadingOutcome.label}
                    </span>
                    <span className="text-poly-muted ml-1">
                      ({stats.leadingPercentage.toFixed(1)}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Market Info */}
              <div>
                <div className="text-xs text-poly-muted uppercase tracking-wider mb-2">
                  Market Data
                </div>
                {market ? (
                  <div className="space-y-2">
                    {/* Price bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-poly-dark rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-poly-green"
                          style={{ width: `${yesPrice * 100}%` }}
                        />
                        <div
                          className="h-full bg-poly-red"
                          style={{ width: `${noPrice * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-poly-muted whitespace-nowrap">
                        <span className="text-poly-green">{formatPercent(yesPrice)}</span>
                        {" / "}
                        <span className="text-poly-red">{formatPercent(noPrice)}</span>
                      </span>
                    </div>
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-xs text-poly-muted">
                      <span>Vol: {formatNumber(market.volumeNum ?? parseFloat(market.volume))}</span>
                      <span>24h: {formatNumber(market.volume24hr)}</span>
                      <span>Liq: {formatNumber(market.liquidityNum ?? parseFloat(market.liquidity))}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-poly-muted italic">
                    Market data not available
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-poly-dark/30 border-t border-poly-border/50 flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-poly-muted">
                <span>
                  Commits: {vote.latestRound.committedVotes.length}
                </span>
                <span>
                  Reveals: {vote.latestRound.revealedVotes.length}
                </span>
                {vote.resolvedData?.marketId && (
                  <span>
                    Market ID: {vote.resolvedData.marketId}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {marketUrl && (
                  <a
                    href={marketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-poly-accent hover:text-poly-accent/80 bg-poly-accent/10 hover:bg-poly-accent/20 rounded transition-colors"
                  >
                    <span>Polymarket</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectVote(vote);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-poly-text hover:text-white bg-poly-border/50 hover:bg-poly-border rounded transition-colors"
                >
                  <span>Details</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { VoteGroup, VOTE_PRICES } from "@/types/uma";

interface VotingProgressProps {
  groups: VoteGroup[];
  outcomes?: {
    p1Label: string;
    p2Label: string;
    p3Label: string;
  } | null;
  totalRevealed?: number;
  minParticipation?: number | null;
  showLegend?: boolean;
  compact?: boolean;
}

function formatVoteAmount(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

function getOptionColor(price: string): string {
  if (price === VOTE_PRICES.P1) return "bg-poly-red"; // No / p1
  if (price === VOTE_PRICES.P2) return "bg-poly-green"; // Yes / p2
  if (price === VOTE_PRICES.P3) return "bg-poly-yellow"; // 50-50 / p3
  return "bg-poly-muted"; // Unknown
}

function getOptionTextColor(price: string): string {
  if (price === VOTE_PRICES.P1) return "text-poly-red";
  if (price === VOTE_PRICES.P2) return "text-poly-green";
  if (price === VOTE_PRICES.P3) return "text-poly-yellow";
  return "text-poly-muted";
}

function getOptionLabel(
  price: string,
  outcomes?: { p1Label: string; p2Label: string; p3Label: string } | null
): string {
  if (price === VOTE_PRICES.P1) return outcomes?.p1Label || "No / p1";
  if (price === VOTE_PRICES.P2) return outcomes?.p2Label || "Yes / p2";
  if (price === VOTE_PRICES.P3) return outcomes?.p3Label || "50-50";
  return "Unknown";
}

export default function VotingProgress({
  groups,
  outcomes,
  totalRevealed,
  minParticipation,
  showLegend = true,
  compact = false,
}: VotingProgressProps) {
  if (!groups || groups.length === 0) {
    return (
      <div className="text-sm text-poly-muted italic">
        No votes revealed yet
      </div>
    );
  }

  // Calculate total and percentages
  const total = groups.reduce((sum, g) => sum + parseFloat(g.totalVoteAmount), 0);
  
  // Sort groups by vote amount (descending)
  const sortedGroups = [...groups].sort(
    (a, b) => parseFloat(b.totalVoteAmount) - parseFloat(a.totalVoteAmount)
  );

  const leading = sortedGroups[0];
  const leadingPercent = total > 0 ? (parseFloat(leading.totalVoteAmount) / total) * 100 : 0;

  if (compact) {
    return (
      <div className="space-y-1">
        {/* Compact progress bar */}
        <div className="flex h-2 rounded-full overflow-hidden bg-poly-dark">
          {sortedGroups.map((group, idx) => {
            const percent = total > 0 ? (parseFloat(group.totalVoteAmount) / total) * 100 : 0;
            return (
              <div
                key={idx}
                className={`${getOptionColor(group.price)} transition-all`}
                style={{ width: `${Math.max(percent, 0.5)}%` }}
                title={`${getOptionLabel(group.price, outcomes)}: ${percent.toFixed(1)}%`}
              />
            );
          })}
        </div>
        {/* Leading option indicator */}
        <div className="flex items-center justify-between text-xs">
          <span className={getOptionTextColor(leading.price)}>
            {getOptionLabel(leading.price, outcomes)}
          </span>
          <span className="text-poly-muted">
            {leadingPercent.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex h-4 rounded-lg overflow-hidden bg-poly-dark">
        {sortedGroups.map((group, idx) => {
          const percent = total > 0 ? (parseFloat(group.totalVoteAmount) / total) * 100 : 0;
          return (
            <div
              key={idx}
              className={`${getOptionColor(group.price)} transition-all relative group`}
              style={{ width: `${Math.max(percent, 1)}%` }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-poly-card border border-poly-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {getOptionLabel(group.price, outcomes)}: {formatVoteAmount(group.totalVoteAmount)} ({percent.toFixed(1)}%)
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="space-y-2">
          {sortedGroups.map((group, idx) => {
            const percent = total > 0 ? (parseFloat(group.totalVoteAmount) / total) * 100 : 0;
            const isLeading = idx === 0;
            
            return (
              <div
                key={idx}
                className={`flex items-center justify-between text-sm ${
                  isLeading ? "font-medium" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${getOptionColor(group.price)}`} />
                  <span className={getOptionTextColor(group.price)}>
                    {getOptionLabel(group.price, outcomes)}
                    {isLeading && (
                      <span className="ml-2 text-xs bg-poly-accent/20 text-poly-accent px-1.5 py-0.5 rounded">
                        Leading
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-poly-muted">
                  <span>{formatVoteAmount(group.totalVoteAmount)} UMA</span>
                  <span className="font-mono">{percent.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Participation info */}
      {(totalRevealed !== undefined || minParticipation) && (
        <div className="pt-2 border-t border-poly-border/50 text-xs text-poly-muted">
          <div className="flex justify-between">
            <span>Total Revealed</span>
            <span>{formatVoteAmount(totalRevealed || total)} UMA</span>
          </div>
          {minParticipation && (
            <div className="flex justify-between mt-1">
              <span>Min Participation Required</span>
              <span>{formatVoteAmount(minParticipation)} UMA</span>
            </div>
          )}
          {minParticipation && (
            <div className="mt-2">
              <div className="flex justify-between mb-1">
                <span>Participation Progress</span>
                <span>
                  {(((totalRevealed || total) / minParticipation) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 bg-poly-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-poly-accent transition-all"
                  style={{
                    width: `${Math.min(((totalRevealed || total) / minParticipation) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

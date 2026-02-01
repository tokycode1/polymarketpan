"use client";

import { PolymarketMarket } from "@/types/market";

interface MarketDetailModalProps {
  market: PolymarketMarket | null;
  onClose: () => void;
}

function formatNumber(n: number | undefined | null): string {
  const v = Number(n);
  if (!isFinite(v)) return "$0";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function formatDate(d: string | undefined | null): string {
  if (!d) return "N/A";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPercent(p: number | undefined | null): string {
  const v = Number(p);
  if (!isFinite(v)) return "0.0%";
  return `${(v * 100).toFixed(1)}%`;
}

export default function MarketDetailModal({
  market,
  onClose,
}: MarketDetailModalProps) {
  if (!market) return null;

  const outcomes: string[] = JSON.parse(market.outcomes || '["Yes","No"]');
  const prices: string[] = JSON.parse(
    market.outcomePrices || '["0.5","0.5"]'
  );
  const priceChange = market.oneDayPriceChange ?? 0;
  const isPositive = priceChange >= 0;
  const polymarketUrl = `https://polymarket.com/event/${market.events?.[0]?.slug || market.slug}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-poly-card border border-poly-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-poly-card border-b border-poly-border rounded-t-2xl px-6 py-4 flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {market.image && (
              <img
                src={market.image}
                alt=""
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0">
              <h2 className="text-poly-text font-bold text-lg leading-tight pr-4">
                {market.question}
              </h2>
              {market.groupItemTitle && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-poly-accent/10 text-poly-accent text-xs rounded-full">
                  {market.groupItemTitle}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-poly-muted hover:text-poly-text transition-colors flex-shrink-0 ml-2"
          >
            <svg
              className="w-6 h-6"
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
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price + Outcomes */}
          <div className="grid grid-cols-2 gap-4">
            {outcomes.map((outcome, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 border ${
                  i === 0
                    ? "bg-poly-green/5 border-poly-green/20"
                    : "bg-poly-red/5 border-poly-red/20"
                }`}
              >
                <div className="text-sm text-poly-muted mb-1">{outcome}</div>
                <div
                  className={`text-2xl font-bold ${i === 0 ? "text-poly-green" : "text-poly-red"}`}
                >
                  {formatPercent(parseFloat(prices[i] || "0"))}
                </div>
              </div>
            ))}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-poly-dark rounded-lg p-3">
              <div className="text-xs text-poly-muted uppercase tracking-wider mb-1">
                Last Price
              </div>
              <div className="text-poly-text font-semibold">
                {formatPercent(market.lastTradePrice)}
              </div>
              <div
                className={`text-xs mt-0.5 ${isPositive ? "text-poly-green" : "text-poly-red"}`}
              >
                {isPositive ? "+" : ""}
                {formatPercent(priceChange)} 24h
              </div>
            </div>
            <div className="bg-poly-dark rounded-lg p-3">
              <div className="text-xs text-poly-muted uppercase tracking-wider mb-1">
                Spread
              </div>
              <div className="text-poly-text font-semibold">
                {market.bestBid ?? "N/A"} / {market.bestAsk ?? "N/A"}
              </div>
              <div className="text-xs text-poly-muted mt-0.5">Bid / Ask</div>
            </div>
            <div className="bg-poly-dark rounded-lg p-3">
              <div className="text-xs text-poly-muted uppercase tracking-wider mb-1">
                Liquidity
              </div>
              <div className="text-poly-text font-semibold">
                {formatNumber(
                  market.liquidityNum ?? parseFloat(market.liquidity)
                )}
              </div>
            </div>
            <div className="bg-poly-dark rounded-lg p-3">
              <div className="text-xs text-poly-muted uppercase tracking-wider mb-1">
                24h Volume
              </div>
              <div className="text-poly-text font-semibold">
                {formatNumber(market.volume24hr)}
              </div>
            </div>
            <div className="bg-poly-dark rounded-lg p-3">
              <div className="text-xs text-poly-muted uppercase tracking-wider mb-1">
                Total Volume
              </div>
              <div className="text-poly-text font-semibold">
                {formatNumber(market.volumeNum ?? parseFloat(market.volume))}
              </div>
            </div>
            <div className="bg-poly-dark rounded-lg p-3">
              <div className="text-xs text-poly-muted uppercase tracking-wider mb-1">
                1W Change
              </div>
              <div
                className={`font-semibold ${(market.oneWeekPriceChange ?? 0) >= 0 ? "text-poly-green" : "text-poly-red"}`}
              >
                {(market.oneWeekPriceChange ?? 0) >= 0 ? "+" : ""}
                {formatPercent(market.oneWeekPriceChange ?? 0)}
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-poly-muted">Start: </span>
              <span className="text-poly-text">
                {formatDate(market.startDate)}
              </span>
            </div>
            <div>
              <span className="text-poly-muted">End: </span>
              <span className="text-poly-text">
                {formatDate(market.endDate)}
              </span>
            </div>
          </div>

          {/* Description */}
          {market.description && (
            <div>
              <h3 className="text-poly-text font-semibold text-sm mb-2">
                Description
              </h3>
              <p className="text-poly-muted text-sm leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                {market.description}
              </p>
            </div>
          )}

          {/* Action */}
          <a
            href={polymarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-poly-accent hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Trade on Polymarket
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

import { PolymarketMarket } from "@/types/market";

interface MarketTableProps {
  markets: PolymarketMarket[];
  page: number;
  pageSize: number;
  onSelectMarket: (market: PolymarketMarket) => void;
  onOpenOrderBook: (market: PolymarketMarket) => void;
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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatPercent(p: number | undefined | null): string {
  const v = Number(p);
  if (!isFinite(v)) return "0.0%";
  return `${(v * 100).toFixed(1)}%`;
}

function PriceBar({ yesPrice, noPrice }: { yesPrice: number; noPrice: number }) {
  const yesWidth = Math.max(yesPrice * 100, 2);
  return (
    <div className="flex items-center gap-1.5 min-w-[120px]">
      <div className="flex-1 h-2 bg-poly-dark rounded-full overflow-hidden flex">
        <div
          className="h-full bg-poly-green rounded-l-full"
          style={{ width: `${yesWidth}%` }}
        />
        <div
          className="h-full bg-poly-red rounded-r-full"
          style={{ width: `${100 - yesWidth}%` }}
        />
      </div>
      <span className="text-xs text-poly-muted whitespace-nowrap w-20 text-right">
        <span className="text-poly-green">{formatPercent(yesPrice)}</span>
        {" / "}
        <span className="text-poly-red">{formatPercent(noPrice)}</span>
      </span>
    </div>
  );
}

export default function MarketTable({
  markets,
  page,
  pageSize,
  onSelectMarket,
  onOpenOrderBook,
}: MarketTableProps) {
  if (markets.length === 0) {
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
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-poly-muted text-lg">No markets found</p>
        <p className="text-poly-muted/60 text-sm mt-1">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  const prices = (m: PolymarketMarket) => {
    try {
      return JSON.parse(m.outcomePrices) as string[];
    } catch {
      return ["0.5", "0.5"];
    }
  };

  return (
    <div className="bg-poly-card border border-poly-border rounded-xl overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-poly-border">
              <th className="text-left text-xs text-poly-muted uppercase tracking-wider px-4 py-3 w-10">
                #
              </th>
              <th className="text-left text-xs text-poly-muted uppercase tracking-wider px-4 py-3">
                Market
              </th>
              <th className="text-left text-xs text-poly-muted uppercase tracking-wider px-4 py-3">
                End Date
              </th>
              <th className="text-right text-xs text-poly-muted uppercase tracking-wider px-4 py-3">
                Liquidity
              </th>
              <th className="text-right text-xs text-poly-muted uppercase tracking-wider px-4 py-3">
                Price
              </th>
              <th className="text-left text-xs text-poly-muted uppercase tracking-wider px-4 py-3 min-w-[200px]">
                Outcomes
              </th>
              <th className="text-right text-xs text-poly-muted uppercase tracking-wider px-4 py-3">
                24h Vol
              </th>
              <th className="text-right text-xs text-poly-muted uppercase tracking-wider px-4 py-3">
                Total Vol
              </th>
              <th className="text-center text-xs text-poly-muted uppercase tracking-wider px-4 py-3 w-16">
                Book
              </th>
              <th className="text-center text-xs text-poly-muted uppercase tracking-wider px-4 py-3 w-16">
                Link
              </th>
            </tr>
          </thead>
          <tbody>
            {markets.map((m, idx) => {
              const p = prices(m);
              const priceChange = m.oneDayPriceChange ?? 0;
              const isPositive = priceChange >= 0;
              const rowNum = (page - 1) * pageSize + idx + 1;
              const marketUrl = `https://polymarket.com/event/${m.events?.[0]?.slug || m.slug}`;

              return (
                <tr
                  key={m.id}
                  className="border-b border-poly-border/50 hover:bg-poly-dark/50 cursor-pointer transition-colors"
                  onClick={() => onSelectMarket(m)}
                >
                  <td className="px-4 py-3 text-sm text-poly-muted">
                    {rowNum}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {m.image && (
                        <img
                          src={m.image}
                          alt=""
                          className="w-8 h-8 rounded-md object-cover flex-shrink-0"
                        />
                      )}
                      <span className="text-sm text-poly-text font-medium line-clamp-2 max-w-xs">
                        {m.question}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-poly-muted whitespace-nowrap">
                    {formatDate(m.endDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-poly-text text-right whitespace-nowrap">
                    {formatNumber(
                      m.liquidityNum ?? parseFloat(m.liquidity)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="text-sm font-semibold text-poly-text">
                      {formatPercent(m.lastTradePrice)}
                    </div>
                    <div
                      className={`text-xs ${isPositive ? "text-poly-green" : "text-poly-red"}`}
                    >
                      {isPositive ? "+" : ""}
                      {formatPercent(priceChange)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <PriceBar
                      yesPrice={parseFloat(p[0] || "0.5")}
                      noPrice={parseFloat(p[1] || "0.5")}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-poly-text text-right whitespace-nowrap">
                    {formatNumber(m.volume24hr)}
                  </td>
                  <td className="px-4 py-3 text-sm text-poly-text text-right whitespace-nowrap">
                    {formatNumber(m.volumeNum ?? parseFloat(m.volume))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenOrderBook(m);
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-poly-dark hover:bg-poly-yellow/20 text-poly-muted hover:text-poly-yellow transition-colors"
                      title="View Order Book"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <a
                      href={marketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-poly-dark hover:bg-poly-accent/20 text-poly-muted hover:text-poly-accent transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden divide-y divide-poly-border/50">
        {markets.map((m, idx) => {
          const p = prices(m);
          const priceChange = m.oneDayPriceChange ?? 0;
          const isPositive = priceChange >= 0;
          const rowNum = (page - 1) * pageSize + idx + 1;
          const marketUrl = `https://polymarket.com/event/${m.events?.[0]?.slug || m.slug}`;

          return (
            <div
              key={m.id}
              className="p-4 hover:bg-poly-dark/50 cursor-pointer transition-colors"
              onClick={() => onSelectMarket(m)}
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xs text-poly-muted mt-1">{rowNum}</span>
                {m.image && (
                  <img
                    src={m.image}
                    alt=""
                    className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-poly-text font-medium line-clamp-2">
                    {m.question}
                  </p>
                  <p className="text-xs text-poly-muted mt-1">
                    Ends {formatDate(m.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenOrderBook(m);
                    }}
                    className="text-poly-muted hover:text-poly-yellow"
                    title="View Order Book"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </button>
                  <a
                    href={marketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-poly-muted hover:text-poly-accent"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="ml-6">
                <PriceBar
                  yesPrice={parseFloat(p[0] || "0.5")}
                  noPrice={parseFloat(p[1] || "0.5")}
                />
              </div>
              <div className="flex items-center justify-between mt-3 ml-6 text-xs">
                <div>
                  <span className="text-poly-text font-semibold">
                    {formatPercent(m.lastTradePrice)}
                  </span>
                  <span
                    className={`ml-1.5 ${isPositive ? "text-poly-green" : "text-poly-red"}`}
                  >
                    {isPositive ? "+" : ""}
                    {formatPercent(priceChange)}
                  </span>
                </div>
                <div className="flex gap-4 text-poly-muted">
                  <span>Liq: {formatNumber(m.liquidityNum ?? parseFloat(m.liquidity))}</span>
                  <span>24h: {formatNumber(m.volume24hr)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

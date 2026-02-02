"use client";

import { useState, useEffect } from "react";
import { PolymarketMarket, OrderBookData, OrderBookEntry } from "@/types/market";

interface OrderBookModalProps {
  market: PolymarketMarket | null;
  onClose: () => void;
}

function getTokenId(market: PolymarketMarket): string | null {
  try {
    const ids: string[] = JSON.parse(market.clobTokenIds || "[]");
    return ids[0] || null;
  } catch {
    return null;
  }
}

export default function OrderBookModal({ market, onClose }: OrderBookModalProps) {
  const [bookData, setBookData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!market) {
      setBookData(null);
      setError("");
      return;
    }

    const tokenId = getTokenId(market);
    if (!tokenId) {
      setError("No token ID available for this market.");
      return;
    }

    const fetchBook = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/orderbook?token_id=${encodeURIComponent(tokenId)}`);
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Request failed");

        // API returns an array, take the first item
        const book: OrderBookData = Array.isArray(json) ? json[0] : json;
        setBookData(book);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load order book");
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [market]);

  if (!market) return null;

  // Top 5 asks (lowest price first) and top 5 bids (highest price first)
  const asks: OrderBookEntry[] = bookData?.asks
    ? [...bookData.asks]
        .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
        .slice(0, 5)
    : [];

  const bids: OrderBookEntry[] = bookData?.bids
    ? [...bookData.bids]
        .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
        .slice(0, 5)
    : [];

  // Max size for bar width calculation
  const allEntries = [...asks, ...bids];
  const maxSize = allEntries.reduce(
    (max, e) => Math.max(max, parseFloat(e.size)),
    1
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-poly-card border border-poly-border rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-poly-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg
              className="w-5 h-5 text-poly-accent flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="text-poly-text font-semibold text-sm truncate">
              Order Book
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-poly-muted hover:text-poly-text transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Market title */}
        <div className="px-5 py-3 border-b border-poly-border/50">
          <p className="text-xs text-poly-muted line-clamp-2">{market.question}</p>
          {bookData?.last_trade_price && (
            <p className="text-xs text-poly-muted mt-1">
              Last trade:{" "}
              <span className="text-poly-text font-medium">
                {(parseFloat(bookData.last_trade_price) * 100).toFixed(1)}%
              </span>
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          {loading && (
            <div className="flex items-center justify-center py-10 gap-2 text-poly-muted text-sm">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading order book...
            </div>
          )}

          {error && (
            <div className="text-center py-10 text-poly-red text-sm">{error}</div>
          )}

          {!loading && !error && bookData && (
            <div className="space-y-3">
              {/* Asks - sell side (red) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-poly-red uppercase tracking-wider font-semibold">
                    Asks (Sell)
                  </span>
                  <div className="flex gap-12 text-[11px] text-poly-muted uppercase tracking-wider">
                    <span>Price</span>
                    <span>Size</span>
                  </div>
                </div>
                <div className="space-y-0.5 flex flex-col-reverse">
                  {asks.map((entry, i) => {
                    const sizeRatio = parseFloat(entry.size) / maxSize;
                    return (
                      <div key={`ask-${i}`} className="relative flex items-center justify-between py-1.5 px-3 rounded">
                        <div
                          className="absolute inset-0 bg-poly-red/8 rounded"
                          style={{ width: `${sizeRatio * 100}%`, right: 0, left: "auto" }}
                        />
                        <span className="relative text-sm text-poly-red font-mono font-medium">
                          {(parseFloat(entry.price) * 100).toFixed(1)}%
                        </span>
                        <span className="relative text-sm text-poly-muted font-mono">
                          {parseFloat(entry.size).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Spread indicator */}
              {asks.length > 0 && bids.length > 0 && (
                <div className="flex items-center gap-2 py-1.5">
                  <div className="flex-1 h-px bg-poly-border" />
                  <span className="text-[11px] text-poly-yellow font-medium px-2">
                    Spread{" "}
                    {(
                      (parseFloat(asks[0].price) - parseFloat(bids[0].price)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                  <div className="flex-1 h-px bg-poly-border" />
                </div>
              )}

              {/* Bids - buy side (green) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-poly-green uppercase tracking-wider font-semibold">
                    Bids (Buy)
                  </span>
                  <div className="flex gap-12 text-[11px] text-poly-muted uppercase tracking-wider">
                    <span>Price</span>
                    <span>Size</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {bids.map((entry, i) => {
                    const sizeRatio = parseFloat(entry.size) / maxSize;
                    return (
                      <div key={`bid-${i}`} className="relative flex items-center justify-between py-1.5 px-3 rounded">
                        <div
                          className="absolute inset-0 bg-poly-green/8 rounded"
                          style={{ width: `${sizeRatio * 100}%`, right: 0, left: "auto" }}
                        />
                        <span className="relative text-sm text-poly-green font-mono font-medium">
                          {(parseFloat(entry.price) * 100).toFixed(1)}%
                        </span>
                        <span className="relative text-sm text-poly-muted font-mono">
                          {parseFloat(entry.size).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {asks.length === 0 && bids.length === 0 && (
                <p className="text-poly-muted text-sm text-center py-6">
                  No orders available
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

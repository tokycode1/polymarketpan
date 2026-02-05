"use client";

import { useState, useEffect } from "react";
import { UmaVote, calculateVoteStats, AugmentData, VOTE_PRICES } from "@/types/uma";
import { OrderBookData, OrderBookEntry } from "@/types/market";
import VotingProgress from "./VotingProgress";

interface UmaVoteDetailModalProps {
  vote: UmaVote | null;
  onClose: () => void;
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

function formatUmaAmount(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!isFinite(n)) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

function getTokenId(clobTokenIds: string | undefined): string | null {
  if (!clobTokenIds) return null;
  try {
    const ids: string[] = JSON.parse(clobTokenIds);
    return ids[0] || null;
  } catch {
    return null;
  }
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

function getPriceLabel(price: string, outcomes?: { p1Label: string; p2Label: string; p3Label: string } | null): string {
  if (price === VOTE_PRICES.P1) return outcomes?.p1Label || "No / p1";
  if (price === VOTE_PRICES.P2) return outcomes?.p2Label || "Yes / p2";
  if (price === VOTE_PRICES.P3) return outcomes?.p3Label || "50-50 / p3";
  return "Unknown";
}

export default function UmaVoteDetailModal({ vote, onClose }: UmaVoteDetailModalProps) {
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [augmentData, setAugmentData] = useState<AugmentData | null>(null);
  const [loadingBook, setLoadingBook] = useState(false);
  const [loadingAugment, setLoadingAugment] = useState(false);
  const [activeTab, setActiveTab] = useState<"vote" | "market" | "orderbook">("vote");

  // Fetch order book
  useEffect(() => {
    if (!vote?.market) {
      setOrderBook(null);
      return;
    }

    const tokenId = getTokenId(vote.market.clobTokenIds);
    if (!tokenId) return;

    const fetchBook = async () => {
      setLoadingBook(true);
      try {
        const res = await fetch(`/api/orderbook?token_id=${encodeURIComponent(tokenId)}`);
        const json = await res.json();
        if (res.ok) {
          const book: OrderBookData = Array.isArray(json) ? json[0] : json;
          setOrderBook(book);
        }
      } catch (err) {
        console.error("Failed to fetch order book:", err);
      } finally {
        setLoadingBook(false);
      }
    };

    fetchBook();
  }, [vote?.market]);

  // Fetch augment data (optional - provides oracle URL)
  useEffect(() => {
    // Need resolvedAncillaryDataHex to call augment API
    if (!vote?.resolvedData?.resolvedAncillaryDataHex) {
      setAugmentData(null);
      setLoadingAugment(false);
      return;
    }

    const fetchAugment = async () => {
      setLoadingAugment(true);
      try {
        const res = await fetch("/api/uma/augment-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: "YES_OR_NO_QUERY",
            time: parseInt(vote.time),
            ancillaryData: vote.resolvedData!.resolvedAncillaryDataHex,
          }),
        });
        const json = await res.json();
        // Only set if we got valid data with an oracle URL
        if (res.ok && json.polymarketOracleUrl) {
          setAugmentData(json);
        } else {
          // API returned but without valid oracle URL - this is expected for some votes
          setAugmentData(null);
        }
      } catch (err) {
        // Network error - log but don't show error to user
        console.error("Failed to fetch augment data:", err);
        setAugmentData(null);
      } finally {
        setLoadingAugment(false);
      }
    };

    fetchAugment();
  }, [vote]);

  if (!vote) return null;

  const stats = calculateVoteStats(vote.latestRound);
  const market = vote.market;
  const title = vote.resolvedData?.title || market?.question || "Unknown Market";
  const marketUrl = market?.events?.[0]?.slug
    ? `https://polymarket.com/event/${market.events[0].slug}`
    : null;

  // Order book processing
  const asks: OrderBookEntry[] = orderBook?.asks
    ? [...orderBook.asks].sort((a, b) => parseFloat(a.price) - parseFloat(b.price)).slice(0, 5)
    : [];
  const bids: OrderBookEntry[] = orderBook?.bids
    ? [...orderBook.bids].sort((a, b) => parseFloat(b.price) - parseFloat(a.price)).slice(0, 5)
    : [];
  const maxSize = [...asks, ...bids].reduce((max, e) => Math.max(max, parseFloat(e.size)), 1);

  // Market prices
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

  // Oracle URL - use the polymarketOracleUrl from API
  const oracleUrl = augmentData?.polymarketOracleUrl || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-poly-card border border-poly-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-poly-border flex-shrink-0">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {market?.image && (
              <img src={market.image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-poly-text font-semibold line-clamp-2">{title}</h2>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {getStatusBadge(vote.status)}
                <span className="text-xs text-poly-muted">
                  Request: {formatTimestamp(vote.time)}
                </span>
                {vote.rollCount !== "0" && (
                  <span className="text-xs text-poly-yellow">Roll #{vote.rollCount}</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-poly-muted hover:text-poly-text transition-colors flex-shrink-0 ml-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-poly-border flex-shrink-0">
          {(["vote", "market", "orderbook"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "text-poly-accent border-b-2 border-poly-accent"
                  : "text-poly-muted hover:text-poly-text"
              }`}
            >
              {tab === "vote" && "Vote Details"}
              {tab === "market" && "Market Info"}
              {tab === "orderbook" && "Order Book"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Vote Details Tab */}
          {activeTab === "vote" && (
            <div className="space-y-6">
              {/* Vote Distribution */}
              <div>
                <h3 className="text-sm font-medium text-poly-text mb-3">Vote Distribution</h3>
                <VotingProgress
                  groups={vote.latestRound.groups}
                  outcomes={vote.resolvedData?.outcomes}
                  totalRevealed={stats.totalRevealed}
                  minParticipation={stats.minParticipation}
                  showLegend
                />
              </div>

              {/* Resolution Data */}
              {vote.resolvedData?.resData && (
                <div>
                  <h3 className="text-sm font-medium text-poly-text mb-3">Resolution Mapping</h3>
                  <div className="bg-poly-dark/50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-poly-red">p1 ({vote.resolvedData.resData.p1}):</span>
                      <span className="text-poly-muted">{vote.resolvedData.outcomes?.p1Label || "No / First Option"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-poly-green">p2 ({vote.resolvedData.resData.p2}):</span>
                      <span className="text-poly-muted">{vote.resolvedData.outcomes?.p2Label || "Yes / Second Option"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-poly-yellow">p3 ({vote.resolvedData.resData.p3}):</span>
                      <span className="text-poly-muted">{vote.resolvedData.outcomes?.p3Label || "50-50 / Unknown"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Proposed Price (if available) */}
              {augmentData?.proposedPrice && (
                <div>
                  <h3 className="text-sm font-medium text-poly-text mb-3">Proposed Resolution</h3>
                  <div className="bg-poly-dark/50 rounded-lg p-4">
                    <span className="text-poly-muted">Proposed: </span>
                    <span className={`font-medium ${
                      augmentData.proposedPrice === VOTE_PRICES.P1 ? "text-poly-red" :
                      augmentData.proposedPrice === VOTE_PRICES.P2 ? "text-poly-green" :
                      "text-poly-yellow"
                    }`}>
                      {getPriceLabel(augmentData.proposedPrice, vote.resolvedData?.outcomes)}
                    </span>
                  </div>
                </div>
              )}

              {/* Vote Statistics */}
              <div>
                <h3 className="text-sm font-medium text-poly-text mb-3">Statistics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-poly-dark/50 rounded-lg p-3">
                    <div className="text-xs text-poly-muted">Commits</div>
                    <div className="text-lg font-semibold text-poly-text">
                      {vote.latestRound.committedVotes.length}
                    </div>
                  </div>
                  <div className="bg-poly-dark/50 rounded-lg p-3">
                    <div className="text-xs text-poly-muted">Reveals</div>
                    <div className="text-lg font-semibold text-poly-text">
                      {vote.latestRound.revealedVotes.length}
                    </div>
                  </div>
                  <div className="bg-poly-dark/50 rounded-lg p-3">
                    <div className="text-xs text-poly-muted">Total Committed</div>
                    <div className="text-lg font-semibold text-poly-text">
                      {formatUmaAmount(stats.totalCommitted)} UMA
                    </div>
                  </div>
                  <div className="bg-poly-dark/50 rounded-lg p-3">
                    <div className="text-xs text-poly-muted">Total Revealed</div>
                    <div className="text-lg font-semibold text-poly-text">
                      {formatUmaAmount(stats.totalRevealed)} UMA
                    </div>
                  </div>
                </div>
              </div>

              {/* External Links */}
              <div>
                <h3 className="text-sm font-medium text-poly-text mb-3">External Links</h3>
                <div className="flex flex-wrap gap-2">
                  {/* UMA Oracle - specific link if available, otherwise general Polymarket project page */}
                  <a
                    href={oracleUrl || "https://oracle.uma.xyz/?project=Polymarket"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-poly-accent/10 text-poly-accent hover:bg-poly-accent/20 rounded-lg transition-colors"
                  >
                    <span>UMA Oracle{oracleUrl ? "" : " (Polymarket)"}</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  {marketUrl && (
                    <a
                      href={marketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-poly-green/10 text-poly-green hover:bg-poly-green/20 rounded-lg transition-colors"
                    >
                      <span>Polymarket</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  <a
                    href="https://vote.uma.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-poly-muted/10 text-poly-muted hover:bg-poly-muted/20 rounded-lg transition-colors"
                  >
                    <span>UMA Vote</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Market Info Tab */}
          {activeTab === "market" && (
            <div className="space-y-6">
              {market ? (
                <>
                  {/* Price */}
                  <div>
                    <h3 className="text-sm font-medium text-poly-text mb-3">Current Price</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-3 bg-poly-dark rounded-full overflow-hidden flex">
                        <div className="h-full bg-poly-green" style={{ width: `${yesPrice * 100}%` }} />
                        <div className="h-full bg-poly-red" style={{ width: `${noPrice * 100}%` }} />
                      </div>
                      <div className="text-sm">
                        <span className="text-poly-green font-medium">{formatPercent(yesPrice)}</span>
                        <span className="text-poly-muted mx-1">/</span>
                        <span className="text-poly-red font-medium">{formatPercent(noPrice)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Market Stats */}
                  <div>
                    <h3 className="text-sm font-medium text-poly-text mb-3">Market Statistics</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-poly-dark/50 rounded-lg p-3">
                        <div className="text-xs text-poly-muted">Total Volume</div>
                        <div className="text-lg font-semibold text-poly-text">
                          {formatNumber(market.volumeNum ?? parseFloat(market.volume))}
                        </div>
                      </div>
                      <div className="bg-poly-dark/50 rounded-lg p-3">
                        <div className="text-xs text-poly-muted">24h Volume</div>
                        <div className="text-lg font-semibold text-poly-text">
                          {formatNumber(market.volume24hr)}
                        </div>
                      </div>
                      <div className="bg-poly-dark/50 rounded-lg p-3">
                        <div className="text-xs text-poly-muted">Liquidity</div>
                        <div className="text-lg font-semibold text-poly-text">
                          {formatNumber(market.liquidityNum ?? parseFloat(market.liquidity))}
                        </div>
                      </div>
                      <div className="bg-poly-dark/50 rounded-lg p-3">
                        <div className="text-xs text-poly-muted">Last Trade</div>
                        <div className="text-lg font-semibold text-poly-text">
                          {formatPercent(market.lastTradePrice)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {(vote.resolvedData?.description || market.description) && (
                    <div>
                      <h3 className="text-sm font-medium text-poly-text mb-3">Description</h3>
                      <div className="bg-poly-dark/50 rounded-lg p-4 text-sm text-poly-muted whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {vote.resolvedData?.description || market.description}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-poly-muted">
                  <svg className="w-12 h-12 mx-auto mb-3 text-poly-muted/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Market data not available</p>
                </div>
              )}
            </div>
          )}

          {/* Order Book Tab */}
          {activeTab === "orderbook" && (
            <div className="space-y-4">
              {loadingBook ? (
                <div className="flex items-center justify-center py-12 gap-2 text-poly-muted text-sm">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading order book...
                </div>
              ) : !market ? (
                <div className="text-center py-12 text-poly-muted">
                  Market data not available
                </div>
              ) : !orderBook ? (
                <div className="text-center py-12 text-poly-muted">
                  Order book not available for this market
                </div>
              ) : (
                <>
                  {/* Last Trade */}
                  {orderBook.last_trade_price && (
                    <div className="text-center pb-2">
                      <span className="text-sm text-poly-muted">Last Trade: </span>
                      <span className="text-sm font-medium text-poly-text">
                        {formatPercent(parseFloat(orderBook.last_trade_price))}
                      </span>
                    </div>
                  )}

                  {/* Asks */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-poly-red uppercase tracking-wider font-semibold">
                        Asks (Sell)
                      </span>
                      <div className="flex gap-12 text-xs text-poly-muted uppercase tracking-wider">
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
                              className="absolute inset-0 bg-poly-red/10 rounded"
                              style={{ width: `${sizeRatio * 100}%`, right: 0, left: "auto" }}
                            />
                            <span className="relative text-sm text-poly-red font-mono font-medium">
                              {formatPercent(parseFloat(entry.price))}
                            </span>
                            <span className="relative text-sm text-poly-muted font-mono">
                              {parseFloat(entry.size).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Spread */}
                  {asks.length > 0 && bids.length > 0 && (
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 h-px bg-poly-border" />
                      <span className="text-xs text-poly-yellow font-medium px-2">
                        Spread {((parseFloat(asks[0].price) - parseFloat(bids[0].price)) * 100).toFixed(2)}%
                      </span>
                      <div className="flex-1 h-px bg-poly-border" />
                    </div>
                  )}

                  {/* Bids */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-poly-green uppercase tracking-wider font-semibold">
                        Bids (Buy)
                      </span>
                      <div className="flex gap-12 text-xs text-poly-muted uppercase tracking-wider">
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
                              className="absolute inset-0 bg-poly-green/10 rounded"
                              style={{ width: `${sizeRatio * 100}%`, right: 0, left: "auto" }}
                            />
                            <span className="relative text-sm text-poly-green font-mono font-medium">
                              {formatPercent(parseFloat(entry.price))}
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
                    <p className="text-poly-muted text-sm text-center py-6">No orders available</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

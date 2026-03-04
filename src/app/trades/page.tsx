"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

const WS_URL = "ws://43.135.166.73:8889";
const RECONNECT_DELAY_INIT = 1000;
const RECONNECT_DELAY_MAX = 60000;

interface WsMessage {
  channel: string;
  date: string;
  message_id: number;
  text: string;
  has_media: boolean;
  views: number;
}

interface ParsedTrade {
  messageId: number;
  date: string;
  time: string;
  content: string;
  marketTitle: string;
  marketUrl: string;
  accountAddress: string;
  accountUrl: string;
}

function parseMessage(msg: WsMessage): ParsedTrade {
  const text = msg.text || "";
  const firstLine = text.split("\n")[0].trim();

  const marketRegex = /\[([^\]]+)\]\((https?:\/\/polymarket\.com\/event\/[^)]+)\)/;
  const marketMatch = text.match(marketRegex);
  const marketTitle = marketMatch?.[1] || "";
  const marketUrl = marketMatch?.[2]?.replace(/\?via=PolyBeats/, "") || "";

  const accountRegex = /\[(0x[a-fA-F0-9]{10,})\]\((https?:\/\/[^)]+)\)/;
  const accountMatch = text.match(accountRegex);
  const accountAddress = accountMatch?.[1] || "";
  const accountUrl = accountMatch?.[2] || "";

  const d = new Date(msg.date);
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });

  return {
    messageId: msg.message_id,
    date: msg.date,
    time,
    content: firstLine,
    marketTitle,
    marketUrl,
    accountAddress,
    accountUrl,
  };
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

type ConnectionStatus = "connecting" | "connected" | "disconnected";

export default function TradesPage() {
  const [trades, setTrades] = useState<ParsedTrade[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const seenIds = useRef(new Set<number>());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const delayRef = useRef(RECONNECT_DELAY_INIT);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      delayRef.current = RECONNECT_DELAY_INIT;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        if (msg.channel !== "PolyBeats") return;
        if (!isToday(msg.date)) return;
        if (seenIds.current.has(msg.message_id)) return;

        seenIds.current.add(msg.message_id);
        const parsed = parseMessage(msg);
        setTrades((prev) => [parsed, ...prev]);
      } catch {
        // ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      reconnectTimer.current = setTimeout(() => {
        delayRef.current = Math.min(delayRef.current * 2, RECONNECT_DELAY_MAX);
        connect();
      }, delayRef.current);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();

    const dailyClear = setInterval(() => {
      setTrades((prev) => {
        const filtered = prev.filter((t) => isToday(t.date));
        if (filtered.length !== prev.length) {
          seenIds.current = new Set(filtered.map((t) => t.messageId));
        }
        return filtered;
      });
    }, 60000);

    return () => {
      clearInterval(dailyClear);
      wsRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const statusColor = {
    connecting: "bg-poly-yellow",
    connected: "bg-poly-green",
    disconnected: "bg-poly-red",
  }[status];

  const statusText = {
    connecting: "Connecting...",
    connected: "Connected",
    disconnected: "Disconnected",
  }[status];

  return (
    <main className="min-h-screen bg-poly-dark">
      {/* Header */}
      <header className="border-b border-poly-border bg-poly-card/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
                    Insider Trades Monitor
                  </p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                status === "connected"
                  ? "bg-poly-green/10 border border-poly-green/20"
                  : status === "connecting"
                  ? "bg-poly-yellow/10 border border-poly-yellow/20"
                  : "bg-poly-red/10 border border-poly-red/20"
              }`}>
                <div className={`w-2 h-2 rounded-full ${statusColor} ${status === "connected" ? "animate-pulse" : ""}`} />
                <span className={`text-xs font-medium ${
                  status === "connected" ? "text-poly-green" : status === "connecting" ? "text-poly-yellow" : "text-poly-red"
                }`}>
                  {statusText}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-poly-accent/10 border border-poly-accent/20">
                <span className="text-poly-accent text-xs font-medium">
                  {trades.length} Trades
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
            <Link
              href="/uma"
              className="py-3 text-sm text-poly-muted hover:text-poly-text transition-colors whitespace-nowrap"
            >
              UMA Votes
            </Link>
            <span className="py-3 text-sm text-poly-accent border-b-2 border-poly-accent whitespace-nowrap">
              Insider Trades
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Info Banner */}
        <div className="bg-poly-accent/10 border border-poly-accent/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-poly-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="text-poly-text font-medium mb-1">Polymarket Insider Trades</p>
              <p className="text-poly-muted">
                Real-time insider trading signals from News. Only today&apos;s signals are shown, the list resets daily.
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        {trades.length === 0 && (
          <div className="bg-poly-card border border-poly-border rounded-xl p-12 text-center">
            {status === "connected" ? (
              <>
                <svg className="w-12 h-12 text-poly-muted/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-poly-muted">Waiting for trading signals...</p>
                <p className="text-poly-muted/60 text-sm mt-1">New signals will appear here in real-time</p>
              </>
            ) : status === "connecting" ? (
              <>
                <svg className="animate-spin h-8 w-8 text-poly-yellow mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-poly-muted">Connecting to signal source...</p>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 text-poly-red/40 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <p className="text-poly-red">Connection lost. Reconnecting...</p>
              </>
            )}
          </div>
        )}

        {/* Trade Cards */}
        <div className="space-y-3">
          {trades.map((trade) => (
            <div
              key={trade.messageId}
              className="bg-poly-card border border-poly-border rounded-xl p-5 hover:border-poly-accent/30 transition-colors"
            >
              {/* Time badge */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-poly-muted bg-poly-dark px-2.5 py-1 rounded-md">
                  {trade.time} UTC
                </span>
                <span className="text-xs text-poly-muted">
                  #{trade.messageId}
                </span>
              </div>

              
              {/* Content */}
              <div className="mb-3">
                <span className="text-xs text-poly-muted uppercase tracking-wider">Signal</span>
                <p className="mt-1 text-poly-text text-sm leading-relaxed">
                  {trade.content}
                </p>
              </div>

           {/* Polymarket Market */}
           { trade.marketTitle && (
                <div className="mb-3">
                  <span className="text-xs text-poly-muted uppercase tracking-wider">Market</span>
                  <div className="mt-1">
                    <a
                      href={trade.marketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-poly-accent hover:underline font-medium"
                    >
                      {trade.marketTitle}
                    </a>
                  </div>
                </div>
              )}


              {/* Account */}
              {trade.accountAddress && (
                <div>
                  <span className="text-xs text-poly-muted uppercase tracking-wider">Account</span>
                  <div className="mt-1">
                    <a
                      href={trade.accountUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-poly-accent hover:underline text-sm font-mono"
                    >
                      {trade.accountAddress.slice(0, 6)}...{trade.accountAddress.slice(-4)}
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

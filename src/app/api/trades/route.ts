import { NextResponse } from "next/server";
import WebSocket from "ws";

const WS_RAW_URL = process.env.NEXT_PUBLIC_WS_URL || "43.135.166.73:8889";

function getWsUrl(): string {
  if (WS_RAW_URL.startsWith("ws://") || WS_RAW_URL.startsWith("wss://")) {
    return WS_RAW_URL;
  }
  return `ws://${WS_RAW_URL}`;
}

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

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

function parseMessage(msg: WsMessage): ParsedTrade | null {
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

  if (!accountAddress) return null;

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

// --- Singleton server-side collector ---
// Module-level state persists for the lifetime of the Node.js server process.

let todaysTrades: ParsedTrade[] = [];
const seenIds = new Set<number>();
let wsInstance: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
const RECONNECT_DELAY_MAX = 60_000;
let collectorStarted = false;

function pruneStaleTrades() {
  const before = todaysTrades.length;
  todaysTrades = todaysTrades.filter((t) => isToday(t.date));
  if (todaysTrades.length !== before) {
    // Rebuild seenIds to match pruned list
    seenIds.clear();
    for (const t of todaysTrades) seenIds.add(t.messageId);
  }
}

function connectCollector() {
  if (wsInstance?.readyState === WebSocket.OPEN) return;

  const ws = new WebSocket(getWsUrl());
  wsInstance = ws;

  ws.on("open", () => {
    reconnectDelay = 1000;
  });

  ws.on("message", (data: Buffer) => {
    try {
      const msg: WsMessage = JSON.parse(data.toString());
      if (msg.channel !== "PolyBeats") return;
      if (!isToday(msg.date)) return;
      if (seenIds.has(msg.message_id)) return;

      const parsed = parseMessage(msg);
      if (!parsed) return;

      seenIds.add(msg.message_id);
      todaysTrades.unshift(parsed);
    } catch {
      // ignore parse errors
    }
  });

  ws.on("close", () => {
    wsInstance = null;
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_DELAY_MAX);
      connectCollector();
    }, reconnectDelay);
  });

  ws.on("error", () => {
    ws.terminate();
  });
}

function ensureCollector() {
  if (collectorStarted) return;
  collectorStarted = true;

  pruneStaleTrades();
  connectCollector();

  // Every minute, prune yesterday's messages
  setInterval(pruneStaleTrades, 60_000);
}

// GET /api/trades — returns all of today's cached trades
export async function GET() {
  ensureCollector();

  return NextResponse.json({
    trades: todaysTrades,
    connected: wsInstance?.readyState === WebSocket.OPEN,
  });
}

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

/** Polls /api/inventory/history at an interval. Returns array of "new since mount" events. */
export function useTransactionFeed(intervalMs = 4000) {
  const [events, setEvents] = useState([]);
  const seenIds = useRef(new Set());
  const isFirst = useRef(true);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const { data } = await api.get("/inventory/history", { params: { limit: 30 } });
        if (cancelled) return;
        if (isFirst.current) {
          data.forEach((e) => seenIds.current.add(e.id));
          isFirst.current = false;
          return;
        }
        const fresh = data.filter((e) => !seenIds.current.has(e.id));
        if (fresh.length === 0) return;
        fresh.forEach((e) => seenIds.current.add(e.id));
        // chronological: oldest fresh first
        const sorted = [...fresh].reverse();
        setEvents((prev) => [...prev, ...sorted].slice(-40));
      } catch (err) {
        console.error("Transaction feed fetch failed:", err);
      }
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs]);

  return events;
}

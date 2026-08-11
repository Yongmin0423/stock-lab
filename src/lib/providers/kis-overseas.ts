import type { Candle } from "./types";

type OverseasDailyRow = {
  xymd: string;
  open: string;
  high: string;
  low: string;
  clos: string;
  tvol: string;
};

export function parseOverseasDailyRows(rows: OverseasDailyRow[]): Candle[] {
  return rows
    .filter(
      (r) =>
        /^\d{8}$/.test(r.xymd) &&
        [r.open, r.high, r.low, r.clos].every((price) => Number.isFinite(Number(price))),
    )
    .map((r) => ({
      date: `${r.xymd.slice(0, 4)}-${r.xymd.slice(4, 6)}-${r.xymd.slice(6)}`,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.clos),
      volume: Number(r.tvol) || 0,
    }));
}

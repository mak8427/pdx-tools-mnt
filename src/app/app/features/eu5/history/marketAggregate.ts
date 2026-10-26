import type { Snapshot } from "./types";

/** Aggregate observed market records without inventing values for missing data. */
export function aggregateMarkets(markets: Snapshot["markets"]) {
  const sum = (field: "supply" | "demand") => {
    const values = markets
      .map((market) => market[field])
      .filter((v): v is number => v != null && Number.isFinite(v));
    return values.length ? values.reduce((a, b) => a + b, 0) : null;
  };
  let weighted = 0,
    traded = 0;
  for (const market of markets) {
    const amount = market.totalTaken;
    if (
      amount != null &&
      Number.isFinite(amount) &&
      amount > 0 &&
      market.price != null &&
      Number.isFinite(market.price)
    ) {
      traded += amount;
      weighted += amount * market.price;
    }
  }
  return {
    supply: sum("supply"),
    demand: sum("demand"),
    price: traded > 0 ? weighted / traded : null,
  };
}

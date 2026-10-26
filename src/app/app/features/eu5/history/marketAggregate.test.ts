import { expect, it } from "vitest";
import { aggregateMarkets } from "./marketAggregate";
import type { Snapshot } from "./types";

it("sums supply and demand and weights price by quantity traded", () => {
  const markets = [
    { supply: 2, demand: 4, price: 1, totalTaken: 2 },
    { supply: 6, demand: 8, price: 3, totalTaken: 6 },
    { supply: 0, demand: 0, price: 99, totalTaken: 0 },
  ] as Snapshot["markets"];
  expect(aggregateMarkets(markets)).toEqual({ supply: 8, demand: 12, price: 2.5 });
});

it("keeps prices unavailable when trade weights are absent", () => {
  const markets = [{ supply: 0, demand: 0, price: 5 }] as Snapshot["markets"];
  expect(aggregateMarkets(markets)).toEqual({ supply: 0, demand: 0, price: null });
  expect(aggregateMarkets([])).toEqual({ supply: null, demand: null, price: null });
});

import type { MapMode } from "@/wasm/wasm_eu5";

export type ModeConfig = {
  value: MapMode;
  label: string;
};

export const MAP_MODES: ModeConfig[] = [
  { value: "political", label: "Political" },
  { value: "control", label: "Control" },
  { value: "religion", label: "Religion" },
  { value: "markets", label: "Markets" },
  { value: "development", label: "Development" },
  { value: "wealth", label: "Wealth" },
  { value: "unrealizedTaxBase", label: "Tax Base Gap" },
  { value: "rgoLevel", label: "RGO Level" },
  { value: "buildingLevels", label: "Building Levels" },
  { value: "population", label: "Population" },
  { value: "populationGrowth", label: "Population Growth" },
  { value: "stateEfficacy", label: "Effective Development" },
  { value: "centerOverview", label: "Location Centers" },
];

export const CENTER_MODES: ModeConfig[] = [
  { value: "centerOverview", label: "All center types" },
  { value: "centerTrade", label: "Trade" },
  { value: "centerProduction", label: "Production" },
  { value: "centerCulture", label: "Culture" },
  { value: "centerEducation", label: "Education" },
];

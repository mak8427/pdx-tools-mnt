import { useMemo, useRef, useState } from "react";
import { EChart, type EChartsOption } from "@/components/viz";
import { chartTooltip, getEChartsTheme, seriesColors } from "@/components/viz/echartsTheme";
import type { MapMode } from "@/wasm/wasm_eu5";
import { GameSelect } from "../components/Select";
import { useHistory } from "./store";
import { useAnalysisHistory } from "./useAnalysisHistory";
import { comparisonPoints, importComparison, type ComparisonAxis } from "./compareCampaigns";
import { aggregateMarkets } from "./marketAggregate";
import { countryObservation } from "./observations";
import { metrics } from "./ContextGraphs";
import { exportHistoryCsv, historySeriesValues } from "./exportHistoryCsv";
import type { AnalysisDescriptor } from "./analysisTypes";
import type { Snapshot } from "./types";
import styles from "./Timeline.module.css";

type MarketMetric = "balance" | "price" | "supply" | "demand" | "stockpile";
type Trace = {
  name: string;
  unit: string;
  current: (number | null)[];
  comparison: (number | null)[];
};
const human = (s: string) => s.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function CampaignComparison({
  campaignId,
  dates,
  mode,
  country,
  countryName,
  good,
  metric,
  indexed,
  visible,
}: {
  campaignId: string;
  dates: Snapshot[];
  mode: MapMode;
  country: string;
  countryName?: string;
  good?: string;
  metric: string;
  indexed: boolean;
  visible: boolean;
}) {
  const history = useHistory();
  const picker = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [axis, setAxis] = useState<ComparisonAxis>("date");
  const [otherCountry, setOtherCountry] = useState("world");
  const [otherMarket, setOtherMarket] = useState("all");
  const [message, setMessage] = useState("");
  const campaigns = useMemo(() => {
    const groups = new Map<string, AnalysisDescriptor[]>();
    for (const snapshot of history.snapshots as AnalysisDescriptor[]) {
      if (snapshot.campaignId === campaignId) continue;
      const rows = groups.get(snapshot.campaignId) ?? [];
      rows.push(snapshot);
      groups.set(snapshot.campaignId, rows);
    }
    return [...groups].map(([id, rows]) => ({
      id,
      rows,
      name: `${rows[0].fileName.replace(/\.eu5$/i, "")} · ${rows[0].date} – ${rows.at(-1)!.date}`,
    }));
  }, [history.snapshots, campaignId]);
  const active = campaigns.find((c) => c.id === selected) ?? campaigns[0];
  const names = useMemo(
    () =>
      Object.assign({}, ...(active?.rows ?? []).map((r) => r.countryNames ?? {})) as Record<
        string,
        string
      >,
    [active],
  );
  const markets = useMemo(
    () =>
      Object.assign({}, ...(active?.rows ?? []).map((r) => r.marketLabels)) as Record<
        string,
        string
      >,
    [active],
  );
  const comparisonCountry = names[otherCountry.replace(/^id:/, "")] ? otherCountry : "world";
  const comparisonMarket = otherMarket in markets ? otherMarket : "all";
  const isMarket = mode === "markets";
  const query = useAnalysisHistory(
    {
      campaignId: active?.id ?? "",
      country: comparisonCountry,
      good: isMarket ? good : undefined,
      centers: comparisonMarket === "all" ? [] : [Number(comparisonMarket)],
    },
    visible && enabled && !!active,
  );
  const otherDates = query.dates;
  const traces = useMemo((): Trace[] => {
    if (!enabled) return [];
    if (isMarket) {
      const fields =
        metric === "balance"
          ? (["supply", "demand"] as const)
          : [metric as Exclude<MarketMetric, "balance">];
      const read = (snapshot: Snapshot, field: (typeof fields)[number]) => {
        if (field !== "stockpile") return aggregateMarkets(snapshot.markets)[field];
        const values = snapshot.markets
          .map((m) => m.stockpile)
          .filter((v): v is number => v != null && Number.isFinite(v));
        return values.length ? values.reduce((a, b) => a + b, 0) : null;
      };
      return fields.map((field) => ({
        name: human(field),
        unit: field === "price" ? "Quantity-weighted price" : "Saved market units",
        current: dates.map((s) => read(s, field)),
        comparison: otherDates.map((s) => read(s, field)),
      }));
    }
    return metrics[mode].map((m) => ({
      name: m.label,
      unit: m.unit,
      current: dates.map((s) => {
        const c = countryObservation(s, country);
        return c ? m.value(c) : null;
      }),
      comparison: otherDates.map((s) => {
        const c = countryObservation(s, comparisonCountry);
        return c ? m.value(c) : null;
      }),
    }));
  }, [dates, otherDates, mode, isMarket, metric, country, comparisonCountry, enabled]);
  const importFiles = async (files: File[]) => {
    setMessage("");
    try {
      const result = await importComparison(files, campaignId);
      if (result.campaigns.length) {
        setSelected(result.campaigns[0]);
        setEnabled(true);
      }
      setMessage(
        `${result.campaigns.length} comparison campaign(s) added. ${result.skipped} already analyzed or current-campaign save(s) skipped.${result.errors ? ` ${result.errors} file(s) failed; see analysis issues.` : ""}`,
      );
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "Comparison import stopped. Completed observations are kept."
          : String(error),
      );
    }
  };
  const currentLabel =
    country === "world" ? "Current campaign" : `Current · ${countryName ?? country}`;
  const otherLabel =
    comparisonCountry === "world"
      ? "Comparison campaign"
      : `Comparison · ${names[comparisonCountry.replace(/^id:/, "")]}`;
  return (
    <section className={`${styles.chart} ${styles.comparison}`} aria-label="Compare campaigns">
      <div className={styles.chartHeading}>
        <div>
          <span className={styles.eyebrow}>CROSS-CAMPAIGN ANALYSIS</span>
          <h2>Compare campaigns</h2>
        </div>
        <button
          type="button"
          disabled={history.progress !== null}
          onClick={() => picker.current?.click()}
        >
          Compare
        </button>
        <input
          ref={picker}
          type="file"
          accept=".eu5"
          multiple
          hidden
          aria-label="Select comparison saves"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            if (files.length) void importFiles(files);
          }}
        />
      </div>
      <p className={styles.help}>
        Choose saves from another campaign to overlay its traces. Already analyzed saves and saves
        from the current campaign are skipped. The open map stays unchanged.
      </p>
      {message && (
        <p role="status" className={styles.help}>
          {message}
        </p>
      )}
      {history.progress && (
        <p role="status" className={styles.help}>
          Analyzing {history.progress.completed} / {history.progress.total} saves…{" "}
          <button type="button" onClick={() => history.cancel?.()}>
            Stop analysis
          </button>
        </p>
      )}
      {!!campaigns.length && (
        <>
          <div className={styles.filterGrid}>
            <label className={styles.field}>
              <span>Comparison campaign</span>
              <GameSelect
                value={enabled ? active?.id : "none"}
                onValueChange={(id) => {
                  setEnabled(id !== "none");
                  setSelected(id);
                  setOtherCountry("world");
                  setOtherMarket("all");
                }}
              >
                <GameSelect.Trigger aria-label="Comparison campaign">
                  <GameSelect.Value />
                </GameSelect.Trigger>
                <GameSelect.Content>
                  <GameSelect.Item value="none">Hide comparison</GameSelect.Item>
                  {campaigns.map((c) => (
                    <GameSelect.Item key={c.id} value={c.id}>
                      {c.name}
                    </GameSelect.Item>
                  ))}
                </GameSelect.Content>
              </GameSelect>
            </label>
            <label className={styles.field}>
              <span>Align observations</span>
              <GameSelect value={axis} onValueChange={(v) => setAxis(v as ComparisonAxis)}>
                <GameSelect.Trigger aria-label="Align observations">
                  <GameSelect.Value />
                </GameSelect.Trigger>
                <GameSelect.Content>
                  <GameSelect.Item value="date">Calendar date</GameSelect.Item>
                  <GameSelect.Item value="elapsed">Years since first imported save</GameSelect.Item>
                </GameSelect.Content>
              </GameSelect>
            </label>
            <label className={styles.field}>
              <span>{isMarket ? "Comparison market scope" : "Comparison country"}</span>
              <GameSelect
                value={isMarket ? comparisonMarket : comparisonCountry}
                onValueChange={isMarket ? setOtherMarket : setOtherCountry}
              >
                <GameSelect.Trigger
                  aria-label={isMarket ? "Comparison market scope" : "Comparison country"}
                >
                  <GameSelect.Value />
                </GameSelect.Trigger>
                <GameSelect.Content>
                  <GameSelect.Item value={isMarket ? "all" : "world"}>
                    {isMarket ? "All markets" : "World · owned locations"}
                  </GameSelect.Item>
                  {Object.entries(isMarket ? markets : names)
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([id, name]) => (
                      <GameSelect.Item key={id} value={isMarket ? id : `id:${id}`}>
                        {human(name)}
                      </GameSelect.Item>
                    ))}
                </GameSelect.Content>
              </GameSelect>
            </label>
          </div>
          {enabled && (
            <>
              <p className={styles.help}>
                Solid lines: current campaign, using the filters below. Dashed lines: comparison
                campaign, using its scope above.{" "}
                {axis === "elapsed"
                  ? "Each campaign starts at its first imported observation, not the beginning of the game."
                  : "Campaigns with different date ranges remain on their actual dates."}{" "}
                {indexed
                  ? "Each trace is independently indexed to its first positive observation."
                  : "Values use their original units."}
              </p>
              {query.loading ? (
                <p role="status">Loading comparison…</p>
              ) : query.error ? (
                <p role="alert">{query.error}</p>
              ) : !otherDates.length ? (
                <p>No observations available for this comparison.</p>
              ) : (
                <>
                  {!traces.length && (
                    <p className={styles.help}>
                      This map section does not yet expose historical metrics.
                    </p>
                  )}
                  {traces.map((trace) => (
                    <ComparisonChart
                      key={trace.name}
                      trace={trace}
                      dates={dates}
                      otherDates={otherDates}
                      axis={axis}
                      indexed={indexed}
                      currentLabel={currentLabel}
                      otherLabel={otherLabel}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

function ComparisonChart({
  trace,
  dates,
  otherDates,
  axis,
  indexed,
  currentLabel,
  otherLabel,
}: {
  trace: Trace;
  dates: Snapshot[];
  otherDates: Snapshot[];
  axis: ComparisonAxis;
  indexed: boolean;
  currentLabel: string;
  otherLabel: string;
}) {
  const theme = getEChartsTheme();
  const option: EChartsOption = {
    useUTC: true,
    animation: false,
    textStyle: { color: theme.labelColor, fontFamily: theme.numFamily },
    tooltip: { ...chartTooltip, trigger: "axis", confine: true },
    legend: { top: 8, textStyle: { color: theme.labelColor } },
    grid: { left: 70, right: 24, top: 55, bottom: 60 },
    xAxis: {
      type: axis === "date" ? "time" : "value",
      name: axis === "elapsed" ? "Years" : undefined,
      axisLabel: {
        color: theme.tickColor,
        ...(axis === "date" ? { formatter: "{yyyy}-{MM}" } : {}),
      },
    },
    yAxis: {
      type: "value",
      scale: true,
      axisLabel: { color: theme.tickColor },
      splitLine: { lineStyle: { color: theme.gridLineColor } },
    },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 18, bottom: 5 }],
    series: [
      { name: currentLabel, dates, raw: trace.current },
      { name: otherLabel, dates: otherDates, raw: trace.comparison },
    ].map((line, index) => ({
      name: line.name,
      type: "line",
      showSymbol: true,
      symbolSize: 5,
      connectNulls: false,
      smooth: false,
      itemStyle: { color: seriesColors[index] },
      lineStyle: { type: index ? "dashed" : "solid", width: 2 },
      data: comparisonPoints(line.dates, historySeriesValues(line.raw, indexed), axis),
    })),
  };
  const exportCsv = () => {
    const options = { metric: trace.name, good: "", indexed };
    const first = exportHistoryCsv(dates, [{ name: currentLabel, raw: trace.current }], options);
    const second = exportHistoryCsv(
      otherDates,
      [{ name: otherLabel, raw: trace.comparison }],
      options,
    );
    const url = URL.createObjectURL(
      new Blob([first, "\n", second.split("\n").slice(1).join("\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "eu5-campaign-comparison.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className={styles.comparisonChart}>
      <div className={styles.chartHeading}>
        <h3>{trace.name}</h3>
        <button type="button" onClick={exportCsv}>
          Export comparison CSV
        </button>
      </div>
      <p className={styles.help}>{indexed ? "First observation = 100" : trace.unit}</p>
      <EChart option={option} style={{ width: "100%", height: 280 }} />
      {!trace.comparison.some((v) => v != null && Number.isFinite(v)) && (
        <p className={styles.help}>
          This metric or good is unavailable in the comparison saves; no values are estimated.
        </p>
      )}
    </div>
  );
}

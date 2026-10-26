import { useId } from "react";
import { SidebarNav } from "../components/SidebarNav";
import { useEu5Engine, useEu5MapMode, useEu5Timelapse, useEu5TimelineLive } from "../store";
import { isHistoricalMapMode } from "../ui-engine";
import { useMapHistory } from "../history/context";
import { CENTER_MODES, MAP_MODES } from "./modeConfig";
import type { ModeConfig } from "./modeConfig";
import type { MapMode } from "@/wasm/wasm_eu5";

export function MapModesSection() {
  const live = useEu5TimelineLive();
  // A recording drives the date from the campaign start to the save, so the
  // modes stand down until it is done rather than no-op under the pointer.
  const locked = useEu5Timelapse().status !== "idle";
  const engine = useEu5Engine();
  const currentMapMode = useEu5MapMode();
  const centerActive = CENTER_MODES.some((mode) => mode.value === currentMapMode);

  return (
    <SidebarNav aria-label="Map modes" className="border-b border-game-line">
      <SidebarNav.Section label="Map Modes">
        {MAP_MODES.map((mode) => (
          <ModeRow
            key={mode.value}
            mode={mode.value === "centerOverview" && centerActive
              ? { ...mode, value: currentMapMode }
              : mode}
            live={live}
            locked={locked}
          />
        ))}
        {centerActive && (
          <label className="flex flex-col gap-1 px-3.5 py-2 text-xs text-game-ink-500">
            Center category
            <select
              value={currentMapMode}
              disabled={locked}
              onChange={(event) => engine.trigger.selectMapMode(event.target.value as MapMode)}
              className="rounded border border-game-line bg-game-overlay px-2 py-1.5 text-game-ink-100 disabled:opacity-40"
            >
              {CENTER_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </label>
        )}
      </SidebarNav.Section>
    </SidebarNav>
  );
}

function ModeRow({ mode, live, locked }: { mode: ModeConfig; live: boolean; locked: boolean }) {
  const engine = useEu5Engine();
  const currentMapMode = useEu5MapMode();
  const isActive = currentMapMode === mode.value;
  const noteId = useId();
  const history = useMapHistory();
  // Imported observations supply non-political history independently of
  // the full save's ownership timeline.
  const resets = !live && !history?.frames && !isHistoricalMapMode(mode.value);
  const note = locked
    ? "A timelapse recording is using the map. Map modes come back when it finishes."
    : resets
      ? `Only borders have a history. ${mode.label} shows the save date, so choosing it returns the map there.`
      : null;

  return (
    <SidebarNav.Item
      active={isActive}
      disabled={locked}
      aria-describedby={note !== null ? noteId : undefined}
      onClick={() => engine.trigger.selectMapMode(mode.value as MapMode)}
    >
      {mode.label}
      {note !== null && (
        <span id={noteId} className="sr-only">
          {note}
        </span>
      )}
    </SidebarNav.Item>
  );
}

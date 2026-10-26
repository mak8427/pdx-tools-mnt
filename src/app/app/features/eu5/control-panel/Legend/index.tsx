import { useEu5MapMode, useEu5MapModeGradient } from "../../store";
import { useMapHistory } from "../../history/context";
import { GradientLegend } from "./GradientLegend";

export function Legend() {
  const mapMode = useEu5MapMode();
  const live = useEu5MapModeGradient();
  // A snapshot on the map has its own legend.
  const shown = useMapHistory()?.preview?.shown;
  const gradient = shown ? shown.gradient : live;

  if (mapMode.startsWith("center")) {
    const types = [
      ["centerTrade", "Trade", [69, 151, 214]],
      ["centerProduction", "Production", [67, 176, 113]],
      ["centerCulture", "Culture", [232, 172, 57]],
      ["centerEducation", "Education", [204, 92, 170]],
    ] as const;
    return (
      <div className="space-y-1 px-3.5 pb-2 text-[10px] text-game-ink-500">
        <div className="grid grid-cols-[70px_repeat(4,1fr)] gap-1">
          <span />{["Local", "Regional", "Cont.", "World"].map((level) => <span key={level} className="text-center">{level}</span>)}
          {types.filter(([mode]) => mapMode === "centerOverview" || mapMode === mode).map(([mode, name, rgb]) => (
            <div key={mode} className="contents">
              <span>{name}</span>
              {[0.35, 0.55, 0.78, 1].map((weight) => (
                <span key={weight} className="h-3 rounded-sm" style={{ backgroundColor: `rgb(${rgb.map((channel, index) => Math.round([12, 15, 20][index] * (1 - weight) + channel * weight)).join(",")})` }} />
              ))}
            </div>
          ))}
        </div>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-[#41454b]" />No center recorded / unavailable</span>
      </div>
    );
  }
  if (!gradient) return null;
  return <GradientLegend mode={mapMode} gradient={gradient} />;
}

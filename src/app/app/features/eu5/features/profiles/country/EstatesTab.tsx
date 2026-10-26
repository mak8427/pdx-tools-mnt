import { ArrowTrendingUpIcon, BanknotesIcon, BuildingLibraryIcon, FaceSmileIcon, ScaleIcon } from "@heroicons/react/24/outline";
import { Sprite, spriteDimension } from "@/components/Sprite";
import { formatFloat } from "@/lib/format";
import type { CountryProfile } from "@/wasm/wasm_eu5";
import { StatRail } from "../../../components";
import estateAtlas from "../../../components/icons/estates/estates.webp";
import estateIcons from "../../../components/icons/estates/estates.json";

const dimensions = spriteDimension({ data: estateIcons, spriteCell: { width: 64, height: 64 } });
const iconIndices: Record<string, number> = estateIcons;

// EU5's estate colors, resolved from main_menu/common/named_colors/02_map.txt.
const colors: Record<string, string> = {
  crown_estate: "#9d5ccc",
  nobles_estate: "#5474cc",
  clergy_estate: "#c8d3e6",
  burghers_estate: "#c98f1a",
  peasants_estate: "#687843",
  tribes_estate: "#785543",
  dhimmi_estate: "#d90d5a",
  cossacks_estate: "#c3c83c",
};
const number = (value: number | null | undefined) => value == null
  ? <span title="Not recorded in this save" aria-label="Not recorded">—</span>
  : formatFloat(value, 2);
const iconClass = "size-4 text-game-ink-500";

export function EstatesTab({ estates }: { estates: CountryProfile["estates"] }) {
  if (!estates?.length) {
    return <p className="text-sm text-game-ink-500">No active estate data is available in this save.</p>;
  }

  return (
    <div className="flex flex-col gap-3 font-game-ui text-game-ink-100">
      <p className="text-xs leading-relaxed text-game-ink-500">
        Estate finances at the save date. Taxes and trade income refer to the last
        recorded month. A dash means the save does not record that figure.
      </p>
      {estates.map((estate) => {
        const color = colors[estate.key] ?? "#9da7b4";
        return (
          <StatRail
            key={estate.key}
            title={
              <span className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-plate border"
                  style={{ backgroundColor: `${color}18`, borderColor: `${color}66` }}>
                  <Sprite src={estateAtlas} index={iconIndices[estate.key] ?? estateIcons._default}
                    dimensions={dimensions} scale={0.5} alt="" rendering="smooth" />
                </span>
                <span className="font-game-ui text-[13px] font-medium tracking-normal text-game-ink-100 normal-case">
                  {estate.name.replace(/ estate$/i, "").replace(/\b\w/g, (letter) => letter.toUpperCase())}
                </span>
              </span>
            }
          >
            <StatRail.Row label="Balance" icon={<BanknotesIcon className={iconClass} />}
              value={<span className={estate.balance == null ? "text-game-ink-500" : estate.balance < 0 ? "text-game-err" : estate.balance > 0 ? "text-game-good" : "text-game-ink-100"}>{number(estate.balance)}</span>} />
            <StatRail.Row label="Satisfaction" icon={<FaceSmileIcon className={iconClass} />}
              bar={estate.satisfaction ?? undefined}
              value={estate.satisfaction == null ? number(null) : `${formatFloat(estate.satisfaction * 100, 1)}%`} />
            <StatRail.Row label="Wealth impact" icon={<ScaleIcon className={iconClass} />}
              value={number(estate.wealthImpact)} />
            <StatRail.Row label="Taxes paid · last month" icon={<BuildingLibraryIcon className={iconClass} />}
              value={number(estate.paidTaxes)} />
            <StatRail.Row label="Trade income · last month" icon={<ArrowTrendingUpIcon className={iconClass} />}
              value={number(estate.tradeIncome)} />
          </StatRail>
        );
      })}
    </div>
  );
}

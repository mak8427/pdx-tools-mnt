import { GameSelect } from "./Select";
import { Eu5Icon } from "./icons/Eu5Icon";

type GoodOption = { key: string; name: string };

function GoodLabel({ good }: { good: GoodOption }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Eu5Icon family="goods" id={good.key} size="sm" alt="" className="shrink-0" />
      <span className="truncate">{good.name}</span>
    </span>
  );
}

/** One goods picker for current-save diagnostics and campaign history. */
export function GoodSelect({
  value,
  onValueChange,
  goods,
  label,
  className,
}: {
  value: string | undefined;
  onValueChange: (value: string) => void;
  goods: readonly GoodOption[];
  label: string;
  className?: string;
}) {
  const selected = goods.find((good) => good.key === value);
  return (
    <GameSelect value={value ?? ""} onValueChange={onValueChange} disabled={!goods.length}>
      <GameSelect.Trigger aria-label={label} className={className}>
        <GameSelect.Value placeholder="No goods available">
          {selected ? <GoodLabel good={selected} /> : "No goods available"}
        </GameSelect.Value>
      </GameSelect.Trigger>
      <GameSelect.Content className="max-h-72 overflow-y-auto">
        {goods.map((good) => (
          <GameSelect.Item key={good.key} value={good.key} textValue={good.name}>
            <GoodLabel good={good} />
          </GameSelect.Item>
        ))}
      </GameSelect.Content>
    </GameSelect>
  );
}

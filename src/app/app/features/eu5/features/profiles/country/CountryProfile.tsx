import { GameTabs } from "../../../components";
import { CountryOverviewTabContent } from "./EconomyTab";
import { ReligionTabContent } from "./ReligionTab";
import { CountryPopulationTabContent } from "./PopulationTab";
import { LocationsTabContent } from "./LocationsTab";
import { DiplomacyTabContent } from "./DiplomacyTab";
import { useEu5MapMode } from "../../../store";
import { useEu5Trigger } from "../useEu5Trigger";
import { ProfileSkeleton } from "../ProfileSkeleton";
import { useProfileTab } from "../PanelNavContext";

export function CountryProfile({ countryIdx }: { countryIdx: number }) {
  const mode = useEu5MapMode();
  const profileTab = useProfileTab("country");
  const { data: profile, loading } = useEu5Trigger(
    (engine) => engine.queries.getCountryProfile(countryIdx),
    [countryIdx],
  );

  if (loading && !profile) return <ProfileSkeleton />;
  if (!profile) return null;

  return (
    <div className="flex h-full flex-col">
      <GameTabs
        value={profileTab.value}
        onValueChange={profileTab.onValueChange}
        className="flex min-h-0 flex-1 flex-col"
      >
        <GameTabs.List className="shrink-0 px-2">
          <GameTabs.Trigger value="overview">Overview</GameTabs.Trigger>
          <GameTabs.Trigger value="religion">Religion</GameTabs.Trigger>
          <GameTabs.Trigger value="population">Population</GameTabs.Trigger>
          <GameTabs.Trigger value="locations">Locations</GameTabs.Trigger>
          <GameTabs.Trigger value="diplomacy">Diplomacy</GameTabs.Trigger>
          <GameTabs.Trigger value="estates">Estates</GameTabs.Trigger>
        </GameTabs.List>
        <GameTabs.Content
          value="overview"
          className="min-h-0 flex-1 basis-0 overflow-y-auto px-4 py-4"
        >
          <CountryOverviewTabContent
            data={profile.overview}
            locations={profile.locations.locations}
          />
        </GameTabs.Content>
        <GameTabs.Content
          value="religion"
          className="min-h-0 flex-1 basis-0 overflow-y-auto px-4 py-4"
        >
          <ReligionTabContent data={profile.religion} />
        </GameTabs.Content>
        <GameTabs.Content
          value="population"
          className="min-h-0 flex-1 basis-0 overflow-y-auto px-4 py-4"
        >
          <CountryPopulationTabContent
            countryIdx={countryIdx}
            locations={profile.locations.locations}
            historicalPopulation={profile.overview.historicalPopulation}
          />
        </GameTabs.Content>
        <GameTabs.Content
          value="locations"
          className="min-h-0 flex-1 basis-0 overflow-y-auto px-4 py-4"
        >
          <LocationsTabContent locations={profile.locations.locations} mode={mode} />
        </GameTabs.Content>
        <GameTabs.Content value="diplomacy" className="min-h-0 flex-1 basis-0 overflow-y-auto">
          <DiplomacyTabContent data={profile.diplomacy} backLabel={profile.header.name} />
        </GameTabs.Content>
        <GameTabs.Content value="estates" className="min-h-0 flex-1 basis-0 overflow-y-auto px-4 py-4">
          {!profile.estates?.length ? (
            <p className="text-sm text-game-ink-500">No active estate data is available in this save.</p>
          ) : (
            <div className="space-y-3">
              {profile.estates.map((estate) => (
                <div key={estate.name} className="rounded border border-game-line p-3">
                  <h3 className="mb-2 font-semibold capitalize">{estate.name}</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {[
                      ["Balance", estate.balance],
                      ["Satisfaction (%)", estate.satisfaction == null ? null : estate.satisfaction * 100],
                      ["Wealth impact", estate.wealthImpact],
                      ["Taxes paid last month", estate.paidTaxes],
                      ["Trade income last month", estate.tradeIncome],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="flex justify-between gap-2">
                        <dt>{label}</dt>
                        <dd className="tabular-nums">
                          {typeof value === "number" ? value.toFixed(2) : "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )}
        </GameTabs.Content>
      </GameTabs>
    </div>
  );
}

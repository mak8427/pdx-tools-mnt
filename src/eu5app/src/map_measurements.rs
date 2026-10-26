use eu5save::models::{Gamestate, LocationIndexedVec};

pub(crate) fn location_building_levels(game: &Gamestate<'_>) -> LocationIndexedVec<f64> {
    let mut levels = game.locations.create_index(0.0);
    for building in game.building_manager.database.iter() {
        if let Some(idx) = game.locations.get(building.location)
            && game.locations.index(idx).location().owner == building.owner
        {
            levels[idx] += building.level;
        }
    }
    levels
}

/// M&T represents RGOs as buildings. When present, use their levels instead
/// of the vanilla location field, including zero for locations without one.
pub(crate) fn location_rgo_levels(game: &Gamestate<'_>) -> LocationIndexedVec<f64> {
    let mut levels = game.locations.create_index(0.0);
    let mut has_mnt_rgos = false;
    for building in game.building_manager.database.iter() {
        if rgo_good(building.kind.to_str()).is_none() {
            continue;
        }
        has_mnt_rgos = true;
        if let Some(idx) = game.locations.get(building.location) {
            levels[idx] += building.level.max(0.0);
        }
    }
    if !has_mnt_rgos {
        for entry in game.locations.iter() {
            levels[entry.idx()] = entry.location().rgo_level;
        }
    }
    levels
}

/// Per-location resource levels, including multiple resources in M&T.
pub(crate) fn rgo_material_levels<'a>(
    game: &Gamestate<'a>,
) -> eu5save::hash::FxHashMap<(eu5save::models::LocationIdx, eu5save::models::GoodName<'a>), f64> {
    use eu5save::models::{BStr, GoodName};
    let mut result = eu5save::hash::FxHashMap::default();
    let mut has_mnt_rgos = false;
    for building in game.building_manager.database.iter() {
        let Some(good) = rgo_good(building.kind.to_str()) else {
            continue;
        };
        has_mnt_rgos = true;
        let Some(idx) = game.locations.get(building.location) else {
            continue;
        };
        *result
            .entry((idx, GoodName::new(BStr::new(good.as_bytes()))))
            .or_default() += building.level.max(0.0);
    }
    if !has_mnt_rgos {
        for entry in game.locations.iter() {
            let loc = entry.location();
            if let Some(good) = loc.raw_material {
                result.insert((entry.idx(), good), loc.rgo_level);
            }
        }
    }
    result
}

pub(crate) fn rgo_good(kind: &str) -> Option<&str> {
    kind.strip_prefix("RGO_building_")
        .map(|good| if good == "bad_sand" { "sand" } else { good })
}

#[cfg(test)]
mod rgo_tests {
    use super::rgo_good;
    #[test]
    fn recognizes_mnt_rgos_and_poor_quality_sand() {
        assert_eq!(rgo_good("RGO_building_goods_gold"), Some("goods_gold"));
        assert_eq!(rgo_good("RGO_building_bad_sand"), Some("sand"));
        assert_eq!(rgo_good("marketplace"), None);
    }
}

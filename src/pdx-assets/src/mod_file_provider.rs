use crate::{FileProvider, FsFile};
use anyhow::{Context, Result, ensure};
use std::{collections::BTreeMap, fs, io::Read, path::PathBuf};

/// EU5 virtual filesystem: vanilla first, then mods in user-supplied order.
/// Mod roots contain in_game/ and main_menu/, without vanilla's game/ prefix.
#[derive(Debug)]
pub struct ModFileProvider<P> {
    base: P,
    mods: Vec<PathBuf>,
}

impl<P: FileProvider> ModFileProvider<P> {
    pub fn new(base: P, mods: &[PathBuf]) -> Result<Self> {
        for path in mods {
            ensure!(
                path.is_dir() && (path.join("in_game").is_dir() || path.join("main_menu").is_dir()),
                "Invalid EU5 mod root: {} (expected in_game/ or main_menu/)",
                path.display()
            );
            let metadata = path.join(".metadata/metadata.json");
            if metadata.is_file() {
                let contents = fs::read_to_string(&metadata)?;
                let value: serde_json::Value =
                    serde_json::from_str(contents.trim_start_matches('\u{feff}'))
                        .with_context(|| format!("Reading mod metadata {}", metadata.display()))?;
                ensure!(
                    value
                        .get("replace_paths")
                        .is_none_or(|v| v.as_array().is_some_and(Vec::is_empty)),
                    "replace_paths is not yet supported: {}",
                    metadata.display()
                );
            }
        }
        Ok(Self {
            base,
            mods: mods.to_vec(),
        })
    }

    fn explicit_mod_path(&self, path: &str) -> Option<PathBuf> {
        let tail = path.strip_prefix("__mods__/")?;
        let (index, relative) = tail.split_once('/')?;
        self.mods
            .get(index.parse::<usize>().ok()?)
            .map(|root| root.join(relative))
    }

    fn mod_path(&self, path: &str) -> Option<PathBuf> {
        if let Some(path) = self.explicit_mod_path(path) {
            return Some(path);
        }
        let relative = path.strip_prefix("game/")?;
        self.mods
            .iter()
            .rev()
            .map(|root| root.join(relative))
            .find(|path| path.is_file())
    }

    fn mod_files(&self, directory: &str, suffixes: &[&str]) -> Result<Vec<(String, usize)>> {
        let Some(relative) = directory.strip_prefix("game/") else {
            return Ok(Vec::new());
        };
        let mut result = Vec::new();
        for (index, root) in self.mods.iter().enumerate() {
            let directory = root.join(relative);
            if !directory.is_dir() {
                continue;
            }
            let mut paths = Vec::new();
            for entry in walkdir::WalkDir::new(&directory) {
                let entry = entry?;
                if !entry.file_type().is_file() {
                    continue;
                }
                let path = entry
                    .path()
                    .strip_prefix(root)?
                    .to_string_lossy()
                    .replace('\\', "/");
                if suffixes.iter().any(|suffix| path.ends_with(suffix)) {
                    paths.push(path);
                }
            }
            paths.sort();
            result.extend(paths.into_iter().map(|path| (path, index)));
        }
        Ok(result)
    }
}

impl<P: FileProvider> FileProvider for ModFileProvider<P> {
    fn localization_overrides(&self) -> Result<Vec<String>> {
        let mut files = self.mod_files("game/main_menu/localization/english", &[".yml"])?;
        // Localization replace folders win over regular files within a mod.
        files.sort_by_key(|(path, index)| {
            (
                *index,
                path.split('/').any(|p| p == "replace"),
                path.clone(),
            )
        });
        Ok(files
            .into_iter()
            .map(|(path, index)| format!("__mods__/{index}/{path}"))
            .collect())
    }
    fn read_file(&self, path: &str) -> Result<Vec<u8>> {
        match self.mod_path(path) {
            Some(path) => {
                fs::read(&path).with_context(|| format!("Reading mod file {}", path.display()))
            }
            None => self.base.read_file(path),
        }
    }
    fn read_to_string(&self, path: &str) -> Result<String> {
        String::from_utf8(self.read_file(path)?).context("Game file is not UTF-8")
    }
    fn file_exists(&self, path: &str) -> bool {
        self.mod_path(path).is_some_and(|p| p.is_file()) || self.base.file_exists(path)
    }
    fn open_file(&self, path: &str) -> Result<Box<dyn Read>> {
        match self.mod_path(path) {
            Some(path) => Ok(Box::new(fs::File::open(path)?)),
            None => self.base.open_file(path),
        }
    }
    fn fs_file(&self, path: &str) -> Result<FsFile> {
        match self.mod_path(path) {
            Some(path) => Ok(FsFile { path }),
            None => self.base.fs_file(path),
        }
    }
    fn walk_directory(&self, path: &str, suffixes: &[&str]) -> Result<Vec<String>> {
        let mut files: BTreeMap<String, (usize, String)> = self
            .base
            .walk_directory(path, suffixes)?
            .into_iter()
            .map(|path| (path.clone(), (0, path)))
            .collect();
        for (relative, index) in self.mod_files(path, suffixes)? {
            files.insert(
                format!("game/{relative}"),
                (index + 1, format!("__mods__/{index}/{relative}")),
            );
        }
        let mut ordered: Vec<_> = files.into_values().collect();
        ordered.sort();
        Ok(ordered.into_iter().map(|(_, path)| path).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::DirectoryProvider;
    use std::path::Path;
    fn put(root: &Path, path: &str, text: &str) {
        let file = root.join(path);
        fs::create_dir_all(file.parent().unwrap()).unwrap();
        fs::write(file, text).unwrap();
    }
    #[test]
    fn later_mods_override_files_without_reordering_vanilla_definitions() {
        let root = tempfile::tempdir().unwrap();
        let base = root.path().join("base");
        let first = root.path().join("first");
        let second = root.path().join("second");
        put(&base, "game/in_game/common/goods/00_default.txt", "vanilla");
        put(&base, "game/in_game/common/goods/overridden.txt", "old");
        put(&first, "in_game/common/goods/overridden.txt", "first");
        put(&first, "in_game/common/goods/MnT.txt", "new good");
        put(&second, "in_game/common/goods/overridden.txt", "second");
        let provider =
            ModFileProvider::new(DirectoryProvider::new(base), &[first, second]).unwrap();
        let files = provider
            .walk_directory("game/in_game/common/goods", &[".txt"])
            .unwrap();
        assert_eq!(files.len(), 3);
        let contents: Vec<_> = files
            .iter()
            .map(|p| provider.read_to_string(p).unwrap())
            .collect();
        assert_eq!(contents, ["vanilla", "new good", "second"]);
        assert_eq!(
            provider
                .read_to_string("game/in_game/common/goods/overridden.txt")
                .unwrap(),
            "second"
        );
    }
    #[test]
    fn mod_localization_and_assets_are_loaded_without_exporting_game_files() {
        let root = tempfile::tempdir().unwrap();
        let base = root.path().join("base");
        let m = root.path().join("mnt");
        put(&base, "game/main_menu/gfx/base.dds", "base asset");
        put(
            &m,
            "main_menu/localization/english/MnT_goods_l_english.yml",
            "l_english:\n credit: \"Credit\"",
        );
        put(&m, "main_menu/gfx/credit.dds", "mod asset");
        put(&m, ".metadata/metadata.json", "\u{feff}{\"name\":\"M&T\"}");
        let provider = ModFileProvider::new(DirectoryProvider::new(base), &[m]).unwrap();
        let files = provider.localization_overrides().unwrap();
        assert_eq!(files.len(), 1);
        // The compiler wraps providers in references; they must forward mod files.
        assert_eq!(
            FileProvider::localization_overrides(&&provider).unwrap(),
            files
        );
        let boxed = Box::new(provider);
        assert_eq!(FileProvider::localization_overrides(&boxed).unwrap(), files);
        let provider = *boxed;
        assert!(
            provider
                .read_to_string(&files[0])
                .unwrap()
                .contains("Credit")
        );
        assert!(
            provider
                .fs_file("game/main_menu/gfx/credit.dds")
                .unwrap()
                .path
                .is_file()
        );
        assert_eq!(
            provider
                .read_to_string("game/main_menu/gfx/base.dds")
                .unwrap(),
            "base asset"
        );
    }
    #[test]
    fn rejects_invalid_mod_roots_and_unsupported_replace_paths() {
        let root = tempfile::tempdir().unwrap();
        assert!(
            ModFileProvider::new(
                DirectoryProvider::new(root.path()),
                &[root.path().join("missing")]
            )
            .is_err()
        );
        fs::create_dir(root.path().join("in_game")).unwrap();
        put(
            root.path(),
            ".metadata/metadata.json",
            r#"{"replace_paths":["in_game/common/goods"]}"#,
        );
        assert!(
            ModFileProvider::new(
                DirectoryProvider::new(root.path()),
                &[root.path().to_owned()]
            )
            .is_err()
        );
    }
}

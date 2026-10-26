import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "pages",
  base: process.env.PAGES_BASE_PATH || "/pdx-tools-mnt/",
  resolve: {
    alias: {
      "@/images/eu5": fileURLToPath(
        new URL("../../assets/game/eu5/common/images", import.meta.url),
      ),
      "@/images/eu4": fileURLToPath(
        new URL("../../assets/game/eu4/common/images", import.meta.url),
      ),
      "@": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  plugins: [
    // Shared homepage/campaign modules reference EU4 resources. They are not
    // part of this EU5-only deployment and must not require a second asset pack.
    {
      name: "eu5-only-resources",
      resolveId(source) {
        if (
          source.startsWith("@/images/eu4/") ||
          source.includes("/assets/game/eu4/common/images/")
        )
          return `\0legacy-image:${source}.js`;
        if (source === "@/lib/game_gen" || source.endsWith("/app/lib/game_gen"))
          return "\0eu4-unavailable";
      },
      load(id) {
        if (id.startsWith("\0legacy-image:")) {
          return id.endsWith(".json.js")
            ? "export default {}"
            : `export default ${JSON.stringify("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E")}`;
        }
        if (id === "\0eu4-unavailable")
          return `
          const unavailable = () => { throw new Error("Open EU4 saves on https://pdx.tools"); };
          export { unavailable as dataUrls, unavailable as gameVersion, unavailable as resources };
        `;
      },
    },
    tailwindcss(),
  ],
  build: { outDir: "../dist-pages", emptyOutDir: true },
  define: { "import.meta.env.VITE_STATIC_VIEWER": "true" },
});

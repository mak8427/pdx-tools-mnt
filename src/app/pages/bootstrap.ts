async function start() {
  if (!crossOriginIsolated) {
    if (!("serviceWorker" in navigator)) {
      throw new Error("This viewer requires a browser with service workers and WebGPU enabled.");
    }
    await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}isolation-worker.js`);
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
          once: true,
        });
      });
    }
    if (sessionStorage.getItem("mnt-isolation-reload")) {
      throw new Error(
        "Browser isolation could not start. Enable service workers and reload this page.",
      );
    }
    sessionStorage.setItem("mnt-isolation-reload", "1");
    location.reload();
    return;
  }
  sessionStorage.removeItem("mnt-isolation-reload");
  localStorage.setItem("developer", "1");
  const { mountViewer } = await import("./main");
  mountViewer();
}

void start().catch((error: unknown) => {
  document.getElementById("root")!.textContent = String(error);
});

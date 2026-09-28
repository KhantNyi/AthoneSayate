"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaExperience() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const isInstalled = () => standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    try { setDismissed(sessionStorage.getItem("install-dismissed") === "1"); } catch { setDismissed(false); }
    setIos(!isInstalled() && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)));
    const onInstall = (event: Event) => {
      event.preventDefault();
      if (!isInstalled()) setInstall(event as InstallEvent);
    };
    const installed = () => { setInstall(null); setIos(false); };
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", installed);
    standalone.addEventListener("change", installed);

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let worker: ServiceWorker | null = null;
    const check = () => {
      if (!disposed && registration?.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
    };
    const found = () => {
      worker?.removeEventListener("statechange", check);
      worker = registration?.installing ?? null;
      worker?.addEventListener("statechange", check);
      check();
    };
    const refresh = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void registration?.update().catch(() => {});
    };
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.ready.then((value) => {
        if (disposed) return;
        registration = value;
        registration.addEventListener("updatefound", found);
        found();
      });
      document.addEventListener("visibilitychange", refresh);
    }
    return () => {
      disposed = true;
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", installed);
      standalone.removeEventListener("change", installed);
      registration?.removeEventListener("updatefound", found);
      worker?.removeEventListener("statechange", check);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => {
    if (!updating) return;
    const reload = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", reload);
    waiting?.postMessage({ type: "SKIP_WAITING" });
    return () => navigator.serviceWorker.removeEventListener("controllerchange", reload);
  }, [updating, waiting]);

  async function installApp() {
    if (!install) return;
    try {
      await install.prompt();
      await install.userChoice;
    } finally { setInstall(null); }
  }

  const showInstall = !dismissed && (install || ios);
  if (!waiting && !showInstall) return null;

  return (
    <aside aria-label="App installation and updates" className="liquid-card mb-4 flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm">
      {waiting ? <RefreshCw size={20} className="shrink-0 text-river" /> : <Download size={20} className="shrink-0 text-river" />}
      <div className="min-w-0 flex-1 basis-40">
        <p className="font-semibold">{waiting ? "An update is ready" : "Keep Athonesayate close"}</p>
        <p className="mt-1 text-xs text-ink/60">{waiting ? "Finish your edits, then reload to use the latest version." : ios ? "Tap Share in your browser, then Add to Home Screen to install the app." : "Install for quick access from your home screen."}</p>
      </div>
      {waiting ? (
        <button type="button" disabled={updating} onClick={() => setUpdating(true)} className="min-h-11 rounded-lg bg-river px-4 font-semibold text-bright disabled:opacity-50">{updating ? "Updating…" : "Update now"}</button>
      ) : (
        <>
          {install ? <button type="button" onClick={() => void installApp().catch(() => {})} className="min-h-11 rounded-lg bg-river px-4 font-semibold text-bright">Install app</button> : null}
          <button type="button" aria-label="Dismiss install suggestion" className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-ink/5" onClick={() => { setDismissed(true); try { sessionStorage.setItem("install-dismissed", "1"); } catch {} }}><X size={18} /></button>
        </>
      )}
    </aside>
  );
}

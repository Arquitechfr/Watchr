import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "watchr-admin-pwa-dismissed";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (isIOS() && !isStandalone()) {
      const timer = setTimeout(() => {
        setShowIOS(true);
        setVisible(true);
      }, 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
      setDeferredPrompt(null);
      setVisible(false);
    }
  }

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-64 md:right-4 z-30 animate-in slide-in-from-bottom-4 duration-300 pb-safe">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-lg md:p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Download className="text-primary" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text">Install Watchr Admin</p>
          {showIOS ? (
            <p className="text-xs text-text-muted">
              Tap <Share size={12} className="inline" /> then "Add to Home Screen"
            </p>
          ) : (
            <p className="text-xs text-text-muted">
              Add a shortcut to your device for quick access
            </p>
          )}
        </div>
        {!showIOS && (
          <button
            onClick={handleInstall}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-background hover:bg-primary-dark transition-colors"
          >
            Install
          </button>
        )}
        <button
          onClick={handleDismiss}
          className="shrink-0 text-text-muted hover:text-text transition-colors"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

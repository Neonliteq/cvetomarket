import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
  return isIos && isSafari;
}

export function InstallPWA() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as NavigatorWithStandalone).standalone === true;
    setIsStandalone(standalone);

    if (!standalone && isIosSafari()) {
      setShowIosHint(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setInstallEvent(null);
      setInstalled(true);
    }
  };

  if (isStandalone || installed) return null;

  if (showIosHint && !installEvent) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
              data-testid="button-install-pwa-ios"
            >
              <Share className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Установить</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-56 text-center">
            Нажмите <Share className="w-3 h-3 inline mx-0.5" /> «Поделиться» в Safari, затем «На экран Домой»
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!installEvent) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstall}
      className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
      data-testid="button-install-pwa"
    >
      <Download className="w-3.5 h-3.5" />
      <span className="hidden xs:inline sm:inline">Установить</span>
    </Button>
  );
}

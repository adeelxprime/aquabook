import { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare, CheckCircle2, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone (installed) mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);

    // Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Listen for Android / Chrome install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if dismissed previously in session
    const wasDismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        setDismissed(true);
      }
    } else if (isIos) {
      setShowIosModal(true);
    } else {
      // General prompt or instructions
      setShowIosModal(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  // Don't show if already installed as PWA or dismissed
  if (isStandalone || dismissed) {
    return null;
  }

  return (
    <>
      {/* Sleek Floating Install Pill / Banner for Mobile & Desktop */}
      <div className="fixed bottom-20 lg:bottom-5 left-4 right-4 max-w-md mx-auto z-40 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-blue-600 text-white p-3.5 rounded-2xl shadow-xl shadow-sky-500/25 border border-sky-400/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs truncate">AquaBook Mobile App</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-1.5 py-0.2 rounded-sm">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-sky-100 truncate">
                Mobile screen par add karein (Fast 1-Tap Khatta)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-white text-sky-700 hover:bg-sky-50 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS & Manual Install Step-by-Step Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Mobile Screen Par Add Karein</h3>
                  <p className="text-[11px] text-gray-500">Play Store jesi app install ho jayegi</p>
                </div>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-1">
              <div className="flex items-start gap-3 p-3 bg-sky-50/60 rounded-2xl border border-sky-100">
                <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs text-gray-700">
                  {isIos ? (
                    <>
                      Safari browser me neeche <strong className="text-gray-900 font-bold inline-flex items-center gap-1">Share <Share2 className="w-3.5 h-3.5 inline text-sky-600" /></strong> button dabayein.
                    </>
                  ) : (
                    <>
                      Browser ke upar ya neeche <strong>3 Dots (Menu)</strong> dabayein.
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-sky-50/60 rounded-2xl border border-sky-100">
                <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs text-gray-700">
                  Menu me <strong className="text-gray-900 font-bold inline-flex items-center gap-1">"Add to Home Screen" <PlusSquare className="w-3.5 h-3.5 inline text-sky-600" /></strong> par click karein.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-xs text-emerald-950">
                  Upar <strong className="font-bold">"Add / Install"</strong> dabayein. AquaBook aapki mobile screen par save ho jayega!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              Theek Hai, Samajh Aa Gaya
            </button>
          </div>
        </div>
      )}
    </>
  );
}

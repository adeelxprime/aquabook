import { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare, CheckCircle2, MoreVertical, Sparkles } from 'lucide-react';
import { 
  isAppInstalled, 
  isIosDevice, 
  triggerDirectInstall, 
  subscribePwaState 
} from '../services/pwaInstallService';
import toast from 'react-hot-toast';

export default function PWAInstallBanner() {
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setInstalled(isAppInstalled());
    setIsIos(isIosDevice());

    const unsubscribe = subscribePwaState(() => {
      setInstalled(isAppInstalled());
    });

    const wasDismissed = sessionStorage.getItem('aquabook_pwa_dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }

    return () => unsubscribe();
  }, []);

  const handleInstallClick = async () => {
    const outcome = await triggerDirectInstall();

    if (outcome === 'accepted') {
      toast.success('AquaBook app successfully install ho gayi!');
      setDismissed(true);
    } else if (outcome === 'already_installed') {
      toast.success('AquaBook app pehle se aapke device par install hai!');
      setInstalled(true);
    } else if (outcome === 'ios_guide' || outcome === 'manual_guide') {
      setShowGuideModal(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('aquabook_pwa_dismissed', 'true');
  };

  // Agar app pehle se standalone install hai ya user ne dismiss kiya hai toh banner hide rahega
  if (installed || dismissed) {
    return null;
  }

  return (
    <>
      {/* Sleek Floating Install Banner for Mobile & Desktop */}
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
                  1-Click
                </span>
              </div>
              <p className="text-[11px] text-sky-100 truncate">
                Screen par direct install karein (Fast Offline App)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-1.5 bg-white text-sky-700 hover:bg-sky-50 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Guide Modal: Only when native browser prompt is unavailable (e.g. iOS Safari) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Mobile Par Add Karein</h3>
                  <p className="text-[11px] text-gray-500">Play Store jesi app screen par save ho jayegi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-1">
              {isIos ? (
                <>
                  <div className="flex items-start gap-3 p-3 bg-sky-50/60 rounded-2xl border border-sky-100">
                    <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="text-xs text-gray-700">
                      Safari browser me neeche <strong className="text-gray-900 font-bold inline-flex items-center gap-1">Share <Share2 className="w-3.5 h-3.5 inline text-sky-600" /></strong> button dabayein.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-sky-50/60 rounded-2xl border border-sky-100">
                    <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="text-xs text-gray-700">
                      Menu me <strong className="text-gray-900 font-bold inline-flex items-center gap-1">"Add to Home Screen" <PlusSquare className="w-3.5 h-3.5 inline text-sky-600" /></strong> select karein.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="text-xs text-emerald-950">
                      Upar <strong className="font-bold">"Add"</strong> dabayein. AquaBook direct mobile screen par install ho jayegi!
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 p-3 bg-sky-50/60 rounded-2xl border border-sky-100">
                    <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="text-xs text-gray-700">
                      Chrome browser ke upar ya neeche <strong className="text-gray-900 font-bold inline-flex items-center gap-0.5">3 Dots <MoreVertical className="w-3.5 h-3.5 inline text-sky-600" /></strong> dabayein.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-sky-50/60 rounded-2xl border border-sky-100">
                    <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="text-xs text-gray-700">
                      Menu me <strong className="text-gray-900 font-bold">"Install app"</strong> ya <strong className="text-gray-900 font-bold">"Add to Home Screen"</strong> par tap karein.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-100">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="text-xs text-emerald-950">
                      Popup me <strong className="font-bold">"Install"</strong> dabayein. App direct phone me add ho jayegi!
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Theek Hai, Samajh Aa Gaya
            </button>
          </div>
        </div>
      )}
    </>
  );
}

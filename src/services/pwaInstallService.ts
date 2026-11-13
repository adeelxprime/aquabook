// AquaBook Direct PWA Installation Service
// Provides instant 1-click native install across Mobile (Android/Chrome/Edge) & Desktop

export type InstallOutcome = 'accepted' | 'dismissed' | 'already_installed' | 'ios_guide' | 'manual_guide';

export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

export function hasNativeInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).__pwaPrompt);
}

export async function triggerDirectInstall(): Promise<InstallOutcome> {
  if (typeof window === 'undefined') return 'manual_guide';

  if (isAppInstalled()) {
    return 'already_installed';
  }

  const prompt = (window as any).__pwaPrompt;

  // Direct 1-Click Native Installation Prompt
  if (prompt && typeof prompt.prompt === 'function') {
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        (window as any).__pwaPrompt = null;
        window.dispatchEvent(new CustomEvent('aquabook-pwa-installed'));
        return 'accepted';
      } else {
        return 'dismissed';
      }
    } catch (err) {
      console.warn('[AquaBook PWA] Native prompt trigger error:', err);
    }
  }

  // Fallback: If on iOS Safari
  if (isIosDevice()) {
    return 'ios_guide';
  }

  // Fallback: Android/Chrome where prompt wasn't captured or already used
  return 'manual_guide';
}

export function subscribePwaState(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = () => callback();
  window.addEventListener('aquabook-pwa-ready', handler);
  window.addEventListener('aquabook-pwa-installed', handler);
  window.addEventListener('beforeinstallprompt', handler);
  window.addEventListener('appinstalled', handler);

  return () => {
    window.removeEventListener('aquabook-pwa-ready', handler);
    window.removeEventListener('aquabook-pwa-installed', handler);
    window.removeEventListener('beforeinstallprompt', handler);
    window.removeEventListener('appinstalled', handler);
  };
}

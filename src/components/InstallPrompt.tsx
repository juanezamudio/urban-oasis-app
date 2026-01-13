import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | null>(null);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIOS) {
      setPlatform('ios');
      // Show prompt after a short delay on iOS
      setTimeout(() => setShowPrompt(true), 2000);
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Listen for the beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <Modal isOpen={showPrompt} onClose={handleRemindLater} noBottomPadding>
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="font-display text-xl font-semibold text-stone-900 mb-2">
            Install Harvest Point™
          </h2>
          <p className="text-stone-600 text-sm">
            Install this app on your device for quick access and offline use.
          </p>
        </div>

        {platform === 'ios' && (
          <div className="bg-stone-100 rounded-xl p-4 mb-6">
            <p className="text-sm text-stone-700 mb-3 font-medium">To install on iOS:</p>
            <ol className="text-sm text-stone-600 space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-stone-300 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                <span>Tap the <strong>Share</strong> button <span className="inline-block w-5 h-5 align-middle">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 4v12m0-12l-4 4m4-4l4 4M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span> at the bottom of Safari</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-stone-300 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-stone-300 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                <span>Tap <strong>"Add"</strong> in the top right corner</span>
              </li>
            </ol>
          </div>
        )}

        {platform === 'android' && !deferredPrompt && (
          <div className="bg-stone-100 rounded-xl p-4 mb-6">
            <p className="text-sm text-stone-700 mb-3 font-medium">To install on Android:</p>
            <ol className="text-sm text-stone-600 space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-stone-300 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                <span>Tap the <strong>menu</strong> button <span className="inline-block w-5 h-5 align-middle">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2"/>
                    <circle cx="12" cy="12" r="2"/>
                    <circle cx="12" cy="19" r="2"/>
                  </svg>
                </span> in your browser</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-stone-300 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-stone-300 rounded-full flex items-center justify-center text-xs font-medium">3</span>
                <span>Tap <strong>"Install"</strong> to confirm</span>
              </li>
            </ol>
          </div>
        )}

        {platform === 'desktop' && !deferredPrompt && (
          <div className="bg-stone-100 rounded-xl p-4 mb-6">
            <p className="text-sm text-stone-700 mb-3 font-medium">To install on desktop:</p>
            <ol className="text-sm text-stone-600 space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-stone-300 rounded-full flex items-center justify-center text-xs font-medium">1</span>
                <span>Look for the <strong>install icon</strong> in the address bar</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-stone-300 rounded-full flex items-center justify-center text-xs font-medium">2</span>
                <span>Click <strong>"Install"</strong> when prompted</span>
              </li>
            </ol>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {deferredPrompt && (
            <Button variant="primary" size="lg" className="w-full" onClick={handleInstall}>
              Install Now
            </Button>
          )}
          <Button variant="outline" size="lg" className="w-full" onClick={handleRemindLater}>
            Maybe Later
          </Button>
          <button
            onClick={handleDismiss}
            className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            Don't show this again
          </button>
        </div>
      </div>
    </Modal>
  );
}

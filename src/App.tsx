import { useEffect, useState } from 'react';
import { SellerDashboardModal } from './components/SellerDashboardModal';
import { UserDashboard } from './components/UserDashboard';
import { PromoMuStateSnapshot, UserPreferences } from './types/promomu';

const PREFS_STORAGE_KEY = 'promomu_user_preferences_v1';

const DEFAULT_PREFERENCES: UserPreferences = {
  monthlyTarget: 300000,
  notifyWeb: true,
  notifyEmail: true,
  notifySms: false,
  notifyWeeklyDigest: true,
  notifyTanggalTua: true,
  notifyB1G1: true,
};

function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export default function App() {
  const [snapshot, setSnapshot] = useState<PromoMuStateSnapshot | null>(() =>
    window.PromoMuBridge ? window.PromoMuBridge.getSnapshot() : null
  );
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadPreferences());

  useEffect(() => {
    const syncSnapshot = () => {
      if (window.PromoMuBridge) {
        setSnapshot(window.PromoMuBridge.getSnapshot());
      }
    };

    syncSnapshot();
    window.addEventListener('promomu:state-change', syncSnapshot);
    return () => {
      window.removeEventListener('promomu:state-change', syncSnapshot);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const qrModal = document.getElementById('voucherQrModal');
      const qrOpen = qrModal && !qrModal.classList.contains('hidden');
      if (qrOpen || snapshot?.selectedSellerPromoId != null) return;

      if (snapshot?.dashboardOpen) {
        window.PromoMuBridge?.closeDashboard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [snapshot?.dashboardOpen, snapshot?.selectedSellerPromoId]);

  const handleUpdatePreferences = (next: UserPreferences) => {
    setPreferences(next);
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  };

  if (!snapshot) {
    return null;
  }

  const showUserDashboard = Boolean(snapshot.user && snapshot.dashboardOpen);
  const showSellerProfile = snapshot.selectedSellerPromoId != null;

  if (!showUserDashboard && !showSellerProfile) {
    return null;
  }

  return (
    <>
      {showUserDashboard && (
        <UserDashboard
          snapshot={snapshot}
          preferences={preferences}
          onUpdatePreferences={handleUpdatePreferences}
          onClose={() => window.PromoMuBridge?.closeDashboard()}
        />
      )}
      {showSellerProfile && snapshot.selectedSellerPromoId != null && (
        <SellerDashboardModal
          snapshot={snapshot}
          selectedPromoId={snapshot.selectedSellerPromoId}
          onClose={() => window.PromoMuBridge?.closeSellerProfile?.()}
        />
      )}
    </>
  );
}

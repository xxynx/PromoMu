import React, { useEffect, useState } from 'react';
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
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return DEFAULT_PREFERENCES;
    }
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

interface OverlayErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

interface OverlayErrorBoundaryState {
  hasError: boolean;
}

class OverlayErrorBoundary extends React.Component<
  OverlayErrorBoundaryProps,
  OverlayErrorBoundaryState
> {
  state: OverlayErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): OverlayErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    document.body.style.overflow = '';
  }

  handleRecover = () => {
    this.setState({ hasError: false });
    document.body.style.overflow = '';
    this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-black/10 p-6 shadow-2xl text-center">
            <h2 className="text-lg font-extrabold text-[#111111]">
              Tampilan Sedang Dipulihkan
            </h2>
            <p className="mt-2 text-sm text-[#5A5A60] leading-relaxed">
              Terjadi kendala sementara saat memuat tampilan ini. Data akun dan promo Anda tetap aman.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={this.handleRecover}
                className="px-4 py-2.5 rounded-xl bg-[#FF6B1A] hover:bg-[#E85D0E] text-white text-sm font-bold transition-colors"
              >
                Kembali ke Beranda
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-xl border border-black/15 text-[#111111] hover:bg-black/5 text-sm font-semibold transition-colors"
              >
                Muat Ulang
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
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
      if (qrOpen) return;

      if (snapshot?.selectedSellerPromoId != null) {
        window.PromoMuBridge?.closeSellerProfile?.();
        return;
      }

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
    <OverlayErrorBoundary
      onReset={() => {
        window.PromoMuBridge?.closeSellerProfile?.();
        window.PromoMuBridge?.closeDashboard();
      }}
    >
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
    </OverlayErrorBoundary>
  );
}

import { SubscriptionBillingCycle, SubscriptionPlanId } from '../types/promomu';

export const SUBSCRIPTION_STORAGE_KEY = 'promomu_subscription_plan_v1';

export interface StoredSubscriptionState {
  planId: SubscriptionPlanId;
  billingCycle: SubscriptionBillingCycle;
  updatedAt: string;
}

export interface SubscriptionPlanFeature {
  label: string;
  included: boolean;
  highlight?: boolean;
}

export interface SubscriptionPlanSpec {
  id: SubscriptionPlanId;
  name: string;
  shortLabel: string;
  tagline: string;
  audience: string;
  monthlyPrice: number;
  yearlyMonthlyPrice: number;
  dailyHint?: string;
  isPopular?: boolean;
  isFlagship?: boolean;
  maxPromos: number | null;
  maxQuotaPerPromo: number | null;
  hasBlueBadge: boolean;
  canExportCsv: boolean;
  priorityCatalog: boolean;
  featuredBoost: boolean;
  multiBranchSupport: boolean;
  ctaLabel: string;
  features: SubscriptionPlanFeature[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanSpec[] = [
  {
    id: 'free',
    name: 'Gratis',
    shortLabel: 'Gratis',
    tagline: 'Mulai kenalkan promo outlet Anda tanpa biaya awal.',
    audience: 'Cocok untuk UMKM rintisan & uji coba awal',
    monthlyPrice: 0,
    yearlyMonthlyPrice: 0,
    maxPromos: 5,
    maxQuotaPerPromo: 100,
    hasBlueBadge: false,
    canExportCsv: false,
    priorityCatalog: false,
    featuredBoost: false,
    multiBranchSupport: false,
    ctaLabel: 'Gunakan Paket Gratis',
    features: [
      { label: 'Upload maksimal 5 promo aktif', included: true },
      { label: 'Halaman profil bisnis publik dasar', included: true },
      { label: 'Verifikasi kode voucher manual di kasir', included: true },
      { label: 'Pantau sisa kuota & jumlah penukaran dasar', included: true },
      { label: 'Lencana Centang Biru (Mitra Terverifikasi)', included: false },
      { label: 'Prioritas tampil di katalog wilayah', included: false },
      { label: 'Ekspor laporan penukaran CSV & analitik konversi', included: false },
      { label: 'Sorotan Promo Unggulan & manajemen multi-cabang', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Bisnis Pro',
    shortLabel: 'Pro',
    tagline: 'Dirancang untuk meningkatkan kepercayaan & trafik pelanggan rutin.',
    audience: 'Ideal untuk kafe, kedai, & resto berkembang',
    monthlyPrice: 79000,
    yearlyMonthlyPrice: 63000,
    dailyHint: 'Hanya ~Rp 2.600/hari',
    isPopular: true,
    maxPromos: 25,
    maxQuotaPerPromo: 500,
    hasBlueBadge: true,
    canExportCsv: true,
    priorityCatalog: true,
    featuredBoost: false,
    multiBranchSupport: false,
    ctaLabel: 'Upgrade ke Bisnis Pro',
    features: [
      { label: 'Upload hingga 25 promo aktif sekaligus', included: true, highlight: true },
      {
        label: 'Lencana Centang Biru di profil & katalog utama',
        included: true,
        highlight: true,
      },
      { label: 'Prioritas tampil lebih atas di katalog wilayah', included: true },
      { label: 'Kuota voucher fleksibel hingga 500 klaim/promo', included: true },
      { label: 'Analitik performa promo & peringatan kuota menipis', included: true },
      { label: 'Ekspor laporan riwayat penukaran voucher (CSV)', included: true },
      { label: 'Pintasan WhatsApp kasir & integrasi media sosial lengkap', included: true },
      { label: 'Sorotan Promo Unggulan otomatis & multi-cabang', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Bisnis Eksklusif',
    shortLabel: 'Eksklusif',
    tagline: 'Paket lengkap tanpa batas untuk dominasi pasar & skala besar.',
    audience: 'Khusus restoran mapan, waralaba, & multi-outlet',
    monthlyPrice: 249000,
    yearlyMonthlyPrice: 199000,
    dailyHint: 'Sekitar Rp 8.300/hari untuk akses penuh',
    isFlagship: true,
    maxPromos: null,
    maxQuotaPerPromo: null,
    hasBlueBadge: true,
    canExportCsv: true,
    priorityCatalog: true,
    featuredBoost: true,
    multiBranchSupport: true,
    ctaLabel: 'Pilih Bisnis Eksklusif',
    features: [
      { label: 'Upload promo Tanpa Batas (Unlimited)', included: true, highlight: true },
      {
        label: 'Lencana Centang Biru + Status Mitra Unggulan',
        included: true,
        highlight: true,
      },
      { label: 'Sorotan otomatis di slot rekomendasi wilayah (Featured Boost)', included: true },
      { label: 'Kuota voucher tak terbatas & kode promo kustom bebas', included: true },
      { label: 'Analitik mendalam: konversi, jam ramai, & estimasi omzet', included: true },
      { label: 'Ekspor laporan CSV & audit kasir tanpa batas', included: true },
      { label: 'Manajemen multi-cabang / multi-outlet dalam satu akun', included: true },
      { label: 'Dukungan prioritas mitra bisnis 24/7 & verifikasi kilat', included: true },
    ],
  },
];

export const COMPARISON_ROWS: {
  label: string;
  free: string;
  pro: string;
  enterprise: string;
}[] = [
  {
    label: 'Batas Upload Promo',
    free: 'Maks. 5 promo',
    pro: 'Maks. 25 promo',
    enterprise: 'Unlimited (Tanpa Batas)',
  },
  {
    label: 'Lencana Centang Biru',
    free: 'Tidak tersedia',
    pro: 'Aktif di profil & katalog',
    enterprise: 'Aktif + Mitra Unggulan',
  },
  {
    label: 'Kuota Voucher per Promo',
    free: 'Maks. 100 klaim',
    pro: 'Maks. 500 klaim',
    enterprise: 'Tanpa batas',
  },
  {
    label: 'Visibilitas Katalog Utama',
    free: 'Standar',
    pro: 'Prioritas Wilayah',
    enterprise: 'Featured Boost Teratas',
  },
  {
    label: 'Analitik & Laporan Kasir',
    free: 'Ringkasan dasar',
    pro: 'Konversi + Ekspor CSV',
    enterprise: 'Analitik Lengkap + Audit CSV',
  },
  {
    label: 'Manajemen Outlet & Cabang',
    free: '1 outlet',
    pro: '1 outlet + profil lengkap',
    enterprise: 'Multi-cabang & kode kustom',
  },
  {
    label: 'Layanan Bantuan Mitra',
    free: 'Bantuan reguler',
    pro: 'Prioritas jam kerja',
    enterprise: 'Prioritas Bisnis 24/7',
  },
];

export function getSubscriptionPlanSpec(planId?: SubscriptionPlanId | null): SubscriptionPlanSpec {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) || SUBSCRIPTION_PLANS[0];
}

export function readStoredSubscriptionState(
  fallbackPlan?: SubscriptionPlanId
): StoredSubscriptionState {
  try {
    const raw = localStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredSubscriptionState>;
      if (parsed.planId === 'free' || parsed.planId === 'pro' || parsed.planId === 'enterprise') {
        return {
          planId: parsed.planId,
          billingCycle: parsed.billingCycle === 'yearly' ? 'yearly' : 'monthly',
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
      }
    }
  } catch {
    // Ignore storage read errors
  }

  return {
    planId: fallbackPlan || 'free',
    billingCycle: 'monthly',
    updatedAt: new Date().toISOString(),
  };
}

export function saveStoredSubscriptionState(next: StoredSubscriptionState): void {
  try {
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage write errors
  }
}

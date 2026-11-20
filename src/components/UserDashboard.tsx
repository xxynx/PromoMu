import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Camera,
  Check,
  Clock,
  Copy,
  CreditCard,
  Crown,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Globe,
  Headphones,
  Heart,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  User,
  X,
  Zap,
} from 'lucide-react';
import defaultBizBanner from '../assets/images/bisnismu_outlet_banner_1795096781081.jpg';
import {
  BusinessAccount,
  BusinessOfferItem,
  BusinessOutletType,
  BusinessRedemptionLog,
  BusinessScale,
  DashboardTab,
  PromoItem,
  PromoMuStateSnapshot,
  SubscriptionBillingCycle,
  SubscriptionPlanId,
  UserPreferences,
} from '../types/promomu';
import {
  findProvinceByCity,
  getCitiesByProvince,
  INDONESIA_PROVINCES,
  resolveCityInProvince,
} from '../data/indonesiaRegions';
import {
  getSubscriptionPlanSpec,
  readStoredSubscriptionState,
  saveStoredSubscriptionState,
  SUBSCRIPTION_PLANS,
  SubscriptionPlanSpec,
} from '../data/subscriptionPlans';

type VoucherFilter = 'all' | 'active' | 'used';

const BUSINESS_CATALOG_STORAGE_KEY = 'promomu_business_catalog_v1';
const BUSINESS_REDEMPTIONS_STORAGE_KEY = 'promomu_business_redemptions_v1';
const BUSINESS_OUTLET_STATUS_STORAGE_KEY = 'promomu_business_outlet_status_v1';

const DASHBOARD_PATHS: Record<DashboardTab, string> = {
  overview: '/dashboard',
  vouchers: '/dashboard/voucher',
  favorites: '/dashboard/favorit',
  business: '/dashboard/bisnis',
  businessPortal: '/dashboard/portal-bisnis',
  subscription: '/dashboard/langganan',
  settings: '/dashboard/pengaturan',
};

const BUSINESS_OUTLET_TYPES: BusinessOutletType[] = [
  'Cafe & Kopi',
  'Resto & Mie',
  'Bakery & Dessert',
  'Fast Food',
  'Gerobak / UMKM',
];

const BUSINESS_SCALES: BusinessScale[] = [
  'UMKM / Usaha Rintisan',
  'Usaha Berkembang',
  'Restoran / Kafe Mandiri',
  'Cabang / Waralaba',
];

const PROMO_TYPES = [
  'Diskon Menu',
  'Buy 1 Get 1',
  'Paket Bundling',
  'Harga Spesial',
  'Voucher Nominal',
] as const;

const TIME_SLOTS: string[] = Array.from({ length: 48 }, (_, idx) => {
  const hour = String(Math.floor(idx / 2)).padStart(2, '0');
  const minute = idx % 2 === 0 ? '00' : '30';
  return `${hour}.${minute}`;
});

const parseOperatingHours = (
  value: string
): { is24h: boolean; open: string; close: string } => {
  const trimmed = (value || '').trim();
  if (trimmed.toLowerCase().includes('24 jam')) {
    return { is24h: true, open: '00.00', close: '23.30' };
  }
  const match = trimmed.match(/(\d{2})[:.](\d{2})\s*[-–]\s*(\d{2})[:.](\d{2})/);
  if (match) {
    return {
      is24h: false,
      open: `${match[1]}.${match[2]}`,
      close: `${match[3]}.${match[4]}`,
    };
  }
  return { is24h: false, open: '08.00', close: '22.00' };
};

const deriveBusinessSlug = (name: string): string =>
  (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 32);

const AVATAR_COLORS = [
  { label: 'Obsidian', hex: '#181716' },
  { label: 'Oranye PromoMu', hex: '#FF6B1A' },
  { label: 'Emerald', hex: '#0F766E' },
  { label: 'Cobalt', hex: '#2563EB' },
  { label: 'Violet', hex: '#7C3AED' },
  { label: 'Crimson', hex: '#BE123C' },
];

interface UserDashboardProps {
  snapshot: PromoMuStateSnapshot;
  preferences: UserPreferences;
  onUpdatePreferences: (next: UserPreferences) => void;
  onClose: () => void;
}

const formatRp = (num: number) =>
  'Rp ' + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const deriveUsername = (name: string, email: string) => {
  const source = name.trim() || email.split('@')[0] || 'member';
  const cleaned = source
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 18);
  return cleaned || 'memberpromomu';
};

const maskEmail = (email: string): string => {
  const trimmed = (email || '').trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex === -1) return trimmed;
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (local.length <= 2) {
    return `${local.charAt(0)}*****@${domain}`;
  }
  const visiblePrefix = local.slice(0, 2);
  const maskedCount = Math.max(8, local.length - 2);
  return `${visiblePrefix}${'*'.repeat(maskedCount)}@${domain}`;
};

const maskPhone = (phone: string): string => {
  const cleaned = (phone || '').replace(/\s+/g, '');
  if (!cleaned) return '';
  if (cleaned.length <= 2) return `${'*'.repeat(8)}${cleaned}`;
  const visibleSuffix = cleaned.slice(-2);
  const maskedCount = Math.max(9, cleaned.length - 2);
  return `${'*'.repeat(maskedCount)}${visibleSuffix}`;
};

const formatBirthDate = (isoDate: string): string => {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (Number.isNaN(day) || monthIdx < 0 || monthIdx > 11) return isoDate;
  return `${day} ${months[monthIdx]} ${year}`;
};

const DELETION_GRACE_DAYS = 25;
const DELETION_REASONS = [
  'Ingin mengganti atau membuat akun baru',
  'Jarang menggunakan aplikasi PromoMu',
  'Kekhawatiran privasi & keamanan data',
  'Kendala teknis atau performa aplikasi',
  'Lainnya',
] as const;

const formatDateId = (date: Date): string => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const getDeletionScheduleInfo = (scheduledAt?: string) => {
  if (!scheduledAt) return null;
  const scheduledMs = Date.parse(scheduledAt);
  if (Number.isNaN(scheduledMs)) return null;
  const graceMs = DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;
  const purgeDate = new Date(scheduledMs + graceMs);
  const elapsedDays = Math.max(
    0,
    Math.floor((Date.now() - scheduledMs) / (24 * 60 * 60 * 1000))
  );
  const remainingDays = Math.max(0, DELETION_GRACE_DAYS - elapsedDays);
  return {
    scheduledDateLabel: formatDateId(new Date(scheduledMs)),
    purgeDateLabel: formatDateId(purgeDate),
    remainingDays,
    isExpired: Date.now() - scheduledMs >= graceMs,
  };
};

function ProviderBadge({ provider }: { provider: 'Google' | 'Apple' | 'Email' }) {
  if (provider === 'Google') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
          />
        </svg>
        <span>Akun Google</span>
      </span>
    );
  }

  if (provider === 'Apple') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
        <svg className="h-3.5 w-3.5 shrink-0 fill-current text-ink" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        <span>Apple ID</span>
      </span>
    );
  }

  return <span className="text-xs font-semibold text-ink-muted">Akun Email</span>;
}

function PromoThumbnail({ item }: { item: PromoItem }) {
  const [failed, setFailed] = useState(false);

  if (failed || !item.img) {
    return (
      <div className="h-12 w-12 shrink-0 rounded-xl bg-accent-50 border border-black/8 flex items-center justify-center text-sm font-extrabold text-[#FF6B1A]">
        {item.merchant.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={item.img}
      alt={item.merchant}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-12 w-12 shrink-0 rounded-xl object-cover border border-black/8 bg-subtle"
    />
  );
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  snapshot,
  preferences,
  onUpdatePreferences,
  onClose,
}) => {
  const {
    user,
    businessAccount,
    claimedIds,
    usedVoucherIds,
    savedIds,
    activeCity,
    promoItems,
    cities,
    dashboardTab,
  } = snapshot;

  const activeTab: DashboardTab = dashboardTab || 'overview';
  const navigateTab = (tab: DashboardTab) => {
    window.PromoMuBridge?.setDashboardTab(tab);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [voucherFilter, setVoucherFilter] = useState<VoucherFilter>('all');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileUsername, setProfileUsername] = useState(
    user?.username || (user ? deriveUsername(user.name, user.email) : '')
  );
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileBirthDate, setProfileBirthDate] = useState(user?.birthDate || '');
  const [profileGender, setProfileGender] = useState(user?.gender || '');
  const [profileCity, setProfileCity] = useState(user?.city || activeCity || 'Madiun');
  const [profileArea, setProfileArea] = useState(user?.area || '');
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(user?.avatarUrl || '');
  const [profileAvatarBg, setProfileAvatarBg] = useState(user?.avatarBg || '#181716');

  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingBirthDate, setEditingBirthDate] = useState(false);
  const [showFullEmail, setShowFullEmail] = useState(false);
  const [showFullPhone, setShowFullPhone] = useState(false);
  const [settingsSubTab, setSettingsSubTab] = useState<'advanced' | 'notifications'>('advanced');
  const [deleteModalTarget, setDeleteModalTarget] = useState<'personal' | 'business' | null>(null);
  const [deleteReceiptTarget, setDeleteReceiptTarget] = useState<'personal' | 'business' | null>(
    null
  );
  const [deleteReason, setDeleteReason] = useState<string>(DELETION_REASONS[0]);
  const [deleteAcknowledge25Days, setDeleteAcknowledge25Days] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [immediatePurgeTarget, setImmediatePurgeTarget] = useState<'personal' | 'business' | null>(
    null
  );

  // Business account creation / management state
  const rawDefaultCity =
    user?.city && user.city !== 'Semua Wilayah'
      ? user.city
      : activeCity !== 'Semua Wilayah'
      ? activeCity
      : 'Kota Madiun';
  const initialBizProvince =
    businessAccount?.province || findProvinceByCity(businessAccount?.city || rawDefaultCity);
  const initialBizCity = resolveCityInProvince(
    initialBizProvince,
    businessAccount?.city || rawDefaultCity
  );

  const [bizName, setBizName] = useState(businessAccount?.businessName || '');
  const [bizSlug, setBizSlug] = useState(businessAccount?.brandSlug || '');
  const [bizSlugEdited, setBizSlugEdited] = useState(Boolean(businessAccount?.brandSlug));
  const [bizOutletType, setBizOutletType] = useState<BusinessOutletType>(
    businessAccount?.outletType || 'Cafe & Kopi'
  );
  const [bizScale, setBizScale] = useState<BusinessScale>(
    businessAccount?.businessScale || 'UMKM / Usaha Rintisan'
  );
  const [bizOperatingHours, setBizOperatingHours] = useState(
    businessAccount?.operatingHours || '08.00 - 22.00 WIB'
  );
  const [bizEstablishedYear, setBizEstablishedYear] = useState(
    businessAccount?.establishedYear || ''
  );
  const [bizInstagram, setBizInstagram] = useState(businessAccount?.instagramHandle || '');
  const [bizTiktok, setBizTiktok] = useState(businessAccount?.tiktokHandle || '');
  const [bizFacebook, setBizFacebook] = useState(businessAccount?.facebookHandle || '');
  const [bizOtherSocial, setBizOtherSocial] = useState(businessAccount?.otherSocial || '');
  const [bizDescription, setBizDescription] = useState(businessAccount?.description || '');
  const [bizProvince, setBizProvince] = useState(initialBizProvince);
  const [bizCity, setBizCity] = useState(initialBizCity);
  const [bizAddress, setBizAddress] = useState(businessAccount?.address || '');
  const [bizPicName, setBizPicName] = useState(businessAccount?.picName || user?.name || '');
  const [bizWhatsapp, setBizWhatsapp] = useState(businessAccount?.whatsapp || user?.phone || '');
  const [bizEmail, setBizEmail] = useState(businessAccount?.businessEmail || user?.email || '');
  const [bizNib, setBizNib] = useState(businessAccount?.nibNumber || '');
  const [bizLogoUrl, setBizLogoUrl] = useState(businessAccount?.logoUrl || '');
  const [bizLogoBg, setBizLogoBg] = useState(businessAccount?.logoBg || '#181716');
  const [bizBannerUrl, setBizBannerUrl] = useState(businessAccount?.bannerUrl || '');
  const [bizAgreed, setBizAgreed] = useState(Boolean(businessAccount));
  const [bizFormError, setBizFormError] = useState('');
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [editingBizEmail, setEditingBizEmail] = useState(false);
  const [editingBizPhone, setEditingBizPhone] = useState(false);
  const [showFullBizEmail, setShowFullBizEmail] = useState(false);
  const [showFullBizPhone, setShowFullBizPhone] = useState(false);
  const [bizJustSaved, setBizJustSaved] = useState(false);
  const bizFileInputRef = useRef<HTMLInputElement | null>(null);
  const bizBannerInputRef = useRef<HTMLInputElement | null>(null);

  // Business Portal (BisnisMu) unified workspace state
  const [outletOpen, setOutletOpen] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(BUSINESS_OUTLET_STATUS_STORAGE_KEY);
      return raw === null ? true : JSON.parse(raw) === true;
    } catch {
      return true;
    }
  });
  const [bizOffers, setBizOffers] = useState<BusinessOfferItem[]>(() => {
    try {
      const raw = localStorage.getItem(BUSINESS_CATALOG_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [bizRedemptions, setBizRedemptions] = useState<BusinessRedemptionLog[]>(() => {
    try {
      const raw = localStorage.getItem(BUSINESS_REDEMPTIONS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [showAddOfferForm, setShowAddOfferForm] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerSearch, setOfferSearch] = useState('');
  const [offerFilter, setOfferFilter] = useState<'all' | 'active' | 'paused' | 'low'>('all');
  const [offerSort, setOfferSort] = useState<'newest' | 'redeemed' | 'quota'>('newest');
  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferType, setNewOfferType] = useState<string>('Diskon Menu');
  const [newOfferDesc, setNewOfferDesc] = useState('');
  const [newOfferNormalPrice, setNewOfferNormalPrice] = useState('');
  const [newOfferPrice, setNewOfferPrice] = useState('');
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferQuota, setNewOfferQuota] = useState('50');
  const [newOfferValidUntil, setNewOfferValidUntil] = useState('');
  const [newOfferImageUrl, setNewOfferImageUrl] = useState('');
  const [newOfferActive, setNewOfferActive] = useState(true);
  const [newOfferError, setNewOfferError] = useState('');
  const [isPublishingOffer, setIsPublishingOffer] = useState(false);
  const [publishStageLabel, setPublishStageLabel] = useState('');
  const [publishProgress, setPublishProgress] = useState(0);
  const publishTimersRef = useRef<number[]>([]);
  const newOfferImageInputRef = useRef<HTMLInputElement | null>(null);
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [verifyFeedback, setVerifyFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Subscription state (3-tier business plan)
  const initialSubscription = readStoredSubscriptionState(businessAccount?.subscriptionPlan);
  const [subscriptionPlanId, setSubscriptionPlanId] = useState<SubscriptionPlanId>(
    businessAccount?.subscriptionPlan || initialSubscription.planId
  );
  const [subscriptionBillingCycle, setSubscriptionBillingCycle] =
    useState<SubscriptionBillingCycle>(
      businessAccount?.subscriptionBillingCycle || initialSubscription.billingCycle
    );
  const [selectedBillingView, setSelectedBillingView] = useState<SubscriptionBillingCycle>(
    businessAccount?.subscriptionBillingCycle || initialSubscription.billingCycle
  );
  const [subscriptionViewMode, setSubscriptionViewMode] = useState<'main' | 'business'>('main');
  const [selectedBusinessLicense, setSelectedBusinessLicense] = useState<'pro' | 'enterprise'>(
    businessAccount?.subscriptionPlan === 'enterprise' ? 'enterprise' : 'pro'
  );
  const [pendingUpgradePlan, setPendingUpgradePlan] = useState<SubscriptionPlanSpec | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'qris' | 'va' | 'bank'>(
    'qris'
  );
  const [isActivatingPlan, setIsActivatingPlan] = useState(false);

  const activePlanSpec = useMemo(
    () => getSubscriptionPlanSpec(subscriptionPlanId),
    [subscriptionPlanId]
  );

  const isPromoLimitReached =
    activePlanSpec.maxPromos !== null && bizOffers.length >= activePlanSpec.maxPromos;

  useEffect(() => {
    if (businessAccount?.subscriptionPlan) {
      setSubscriptionPlanId(businessAccount.subscriptionPlan);
    }
    if (businessAccount?.subscriptionBillingCycle) {
      setSubscriptionBillingCycle(businessAccount.subscriptionBillingCycle);
    }
  }, [businessAccount?.subscriptionPlan, businessAccount?.subscriptionBillingCycle]);

  useEffect(() => {
    return () => {
      publishTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      publishTimersRef.current = [];
    };
  }, []);

  const bizProvinceCities = useMemo(() => getCitiesByProvince(bizProvince), [bizProvince]);

  // Sync local draft whenever underlying user object updates
  useEffect(() => {
    if (!user) return;
    setProfileName(user.name || '');
    setProfileUsername(user.username || deriveUsername(user.name, user.email));
    setProfileEmail(user.email || '');
    setProfilePhone(user.phone || '');
    setProfileBirthDate(user.birthDate || '');
    setProfileGender(user.gender || '');
    setProfileCity(user.city || activeCity || 'Madiun');
    setProfileArea(user.area || '');
    setProfileBio(user.bio || '');
    setProfileAvatarUrl(user.avatarUrl || '');
    setProfileAvatarBg(user.avatarBg || '#181716');
  }, [
    user?.name,
    user?.email,
    user?.username,
    user?.phone,
    user?.birthDate,
    user?.gender,
    user?.city,
    user?.area,
    user?.bio,
    user?.avatarUrl,
    user?.avatarBg,
    activeCity,
  ]);

  useEffect(() => {
    if (!businessAccount) {
      setIsEditingBusiness(false);
      setDeleteModalTarget((prev) => (prev === 'business' ? null : prev));
      setDeleteReceiptTarget((prev) => (prev === 'business' ? null : prev));
      setImmediatePurgeTarget((prev) => (prev === 'business' ? null : prev));
      return;
    }
    setBizName(businessAccount.businessName);
    setBizSlug(businessAccount.brandSlug);
    setBizSlugEdited(true);
    setBizOutletType(businessAccount.outletType);
    setBizScale(businessAccount.businessScale || 'UMKM / Usaha Rintisan');
    setBizOperatingHours(businessAccount.operatingHours || '08.00 - 22.00 WIB');
    setBizEstablishedYear(businessAccount.establishedYear || '');
    setBizInstagram(businessAccount.instagramHandle || '');
    setBizTiktok(businessAccount.tiktokHandle || '');
    setBizFacebook(businessAccount.facebookHandle || '');
    setBizOtherSocial(businessAccount.otherSocial || '');
    setBizDescription(businessAccount.description || '');
    const syncedProvince =
      businessAccount.province || findProvinceByCity(businessAccount.city);
    setBizProvince(syncedProvince);
    setBizCity(resolveCityInProvince(syncedProvince, businessAccount.city));
    setBizAddress(businessAccount.address);
    setBizPicName(businessAccount.picName);
    setBizWhatsapp(businessAccount.whatsapp);
    setBizEmail(businessAccount.businessEmail);
    setBizNib(businessAccount.nibNumber || '');
    setBizLogoUrl(businessAccount.logoUrl || '');
    setBizLogoBg(businessAccount.logoBg || '#181716');
    setBizBannerUrl(businessAccount.bannerUrl || '');
    setBizAgreed(true);
  }, [businessAccount]);

  useEffect(() => {
    try {
      localStorage.setItem(BUSINESS_OUTLET_STATUS_STORAGE_KEY, JSON.stringify(outletOpen));
    } catch {
      // Ignore storage errors
    }
  }, [outletOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(BUSINESS_CATALOG_STORAGE_KEY, JSON.stringify(bizOffers));
    } catch {
      // Ignore storage errors
    }
    window.PromoMuBridge?.syncBusinessCatalog?.();
  }, [bizOffers]);

  useEffect(() => {
    try {
      localStorage.setItem(BUSINESS_REDEMPTIONS_STORAGE_KEY, JSON.stringify(bizRedemptions));
    } catch {
      // Ignore storage errors
    }
  }, [bizRedemptions]);

  const claimedPromos = useMemo(
    () => promoItems.filter((item) => claimedIds.includes(item.id)),
    [promoItems, claimedIds]
  );

  const favoritePromos = useMemo(
    () => promoItems.filter((item) => savedIds.includes(item.id)),
    [promoItems, savedIds]
  );

  const activeVoucherPromos = useMemo(
    () => claimedPromos.filter((item) => !usedVoucherIds.includes(item.id)),
    [claimedPromos, usedVoucherIds]
  );

  const filteredVouchers = useMemo(() => {
    return claimedPromos.filter((item) => {
      const isUsed = usedVoucherIds.includes(item.id);
      if (voucherFilter === 'active' && isUsed) return false;
      if (voucherFilter === 'used' && !isUsed) return false;
      if (!voucherSearch.trim()) return true;
      const q = voucherSearch.trim().toLowerCase();
      return (
        item.merchant.toLowerCase().includes(q) ||
        item.menu.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q)
      );
    });
  }, [claimedPromos, usedVoucherIds, voucherFilter, voucherSearch]);

  if (!user || !snapshot.dashboardOpen) {
    return null;
  }

  const savedBaseline = {
    name: user.name || '',
    username: user.username || deriveUsername(user.name, user.email),
    email: user.email || '',
    phone: user.phone || '',
    birthDate: user.birthDate || '',
    gender: user.gender || '',
    city: user.city || activeCity || 'Madiun',
    area: user.area || '',
    bio: user.bio || '',
    avatarUrl: user.avatarUrl || '',
    avatarBg: user.avatarBg || '#181716',
  };

  const hasUnsavedChanges =
    profileName !== savedBaseline.name ||
    profileUsername !== savedBaseline.username ||
    profileEmail !== savedBaseline.email ||
    profilePhone !== savedBaseline.phone ||
    profileBirthDate !== savedBaseline.birthDate ||
    profileGender !== savedBaseline.gender ||
    profileCity !== savedBaseline.city ||
    profileArea !== savedBaseline.area ||
    profileBio !== savedBaseline.bio ||
    profileAvatarUrl !== savedBaseline.avatarUrl ||
    profileAvatarBg !== savedBaseline.avatarBg;

  const handleCopyCode = (code: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code);
      } else {
        const temp = document.createElement('textarea');
        temp.value = code;
        temp.style.position = 'fixed';
        temp.style.opacity = '0';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }
      setCopiedCode(code);
      window.PromoMuBridge?.showToast(`Kode voucher ${code} disalin!`);
      setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      window.PromoMuBridge?.showToast(`Kode voucher: ${code}`);
    }
  };

  const handleResetProfile = () => {
    setProfileName(savedBaseline.name);
    setProfileUsername(savedBaseline.username);
    setProfileEmail(savedBaseline.email);
    setProfilePhone(savedBaseline.phone);
    setProfileBirthDate(savedBaseline.birthDate);
    setProfileGender(savedBaseline.gender);
    setProfileCity(savedBaseline.city);
    setProfileArea(savedBaseline.area);
    setProfileBio(savedBaseline.bio);
    setProfileAvatarUrl(savedBaseline.avatarUrl);
    setProfileAvatarBg(savedBaseline.avatarBg);
    setEditingEmail(false);
    setEditingPhone(false);
    setEditingBirthDate(false);
    window.PromoMuBridge?.showToast('Perubahan dikembalikan ke profil tersimpan');
  };

  const saveProfileUpdates = () => {
    const cleanedName = profileName.trim() || user.name;
    const cleanedEmail = profileEmail.trim() || user.email;
    const cleanedUsername =
      profileUsername
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '') || deriveUsername(cleanedName, cleanedEmail);

    setProfileName(cleanedName);
    setProfileEmail(cleanedEmail);
    setProfileUsername(cleanedUsername);
    setEditingEmail(false);
    setEditingPhone(false);
    setEditingBirthDate(false);

    window.PromoMuBridge?.updateUserProfile({
      name: cleanedName,
      username: cleanedUsername,
      email: cleanedEmail,
      phone: profilePhone.trim(),
      birthDate: profileBirthDate,
      gender: profileGender,
      city: profileCity,
      area: profileArea.trim(),
      bio: profileBio.trim(),
      avatarUrl: profileAvatarUrl,
      avatarBg: profileAvatarBg,
    });

    if (profileCity) {
      window.PromoMuBridge?.selectCity(profileCity);
    }
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2400);
    window.PromoMuBridge?.showToast('Profil akun berhasil diperbarui');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfileUpdates();
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      window.PromoMuBridge?.showToast('Ukuran foto maksimal 2MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBrowseCatalog = () => {
    onClose();
    setTimeout(() => {
      window.PromoMuBridge?.scrollToCatalog();
    }, 80);
  };

  const bizBaseline = businessAccount
    ? {
        businessName: businessAccount.businessName || '',
        brandSlug: businessAccount.brandSlug || '',
        outletType: businessAccount.outletType,
        businessScale: businessAccount.businessScale || 'UMKM / Usaha Rintisan',
        operatingHours: businessAccount.operatingHours || '08.00 - 22.00 WIB',
        establishedYear: businessAccount.establishedYear || '',
        instagramHandle: businessAccount.instagramHandle || '',
        tiktokHandle: businessAccount.tiktokHandle || '',
        facebookHandle: businessAccount.facebookHandle || '',
        otherSocial: businessAccount.otherSocial || '',
        description: businessAccount.description || '',
        province: businessAccount.province || findProvinceByCity(businessAccount.city),
        city: resolveCityInProvince(
          businessAccount.province || findProvinceByCity(businessAccount.city),
          businessAccount.city
        ),
        address: businessAccount.address || '',
        picName: businessAccount.picName || '',
        whatsapp: businessAccount.whatsapp || '',
        businessEmail: businessAccount.businessEmail || '',
        nibNumber: businessAccount.nibNumber || '',
        logoUrl: businessAccount.logoUrl || '',
        logoBg: businessAccount.logoBg || '#181716',
        bannerUrl: businessAccount.bannerUrl || '',
      }
    : null;

  const hasUnsavedBizChanges = Boolean(
    bizBaseline &&
      (bizName !== bizBaseline.businessName ||
        bizSlug !== bizBaseline.brandSlug ||
        bizOutletType !== bizBaseline.outletType ||
        bizScale !== bizBaseline.businessScale ||
        bizOperatingHours !== bizBaseline.operatingHours ||
        bizEstablishedYear !== bizBaseline.establishedYear ||
        bizInstagram !== bizBaseline.instagramHandle ||
        bizTiktok !== bizBaseline.tiktokHandle ||
        bizFacebook !== bizBaseline.facebookHandle ||
        bizOtherSocial !== bizBaseline.otherSocial ||
        bizDescription !== bizBaseline.description ||
        bizProvince !== bizBaseline.province ||
        bizCity !== bizBaseline.city ||
        bizAddress !== bizBaseline.address ||
        bizPicName !== bizBaseline.picName ||
        bizWhatsapp !== bizBaseline.whatsapp ||
        bizEmail !== bizBaseline.businessEmail ||
        bizNib !== bizBaseline.nibNumber ||
        bizLogoUrl !== bizBaseline.logoUrl ||
        bizLogoBg !== bizBaseline.logoBg ||
        bizBannerUrl !== bizBaseline.bannerUrl)
  );

  const handleResetBizProfile = () => {
    if (!bizBaseline) return;
    setBizName(bizBaseline.businessName);
    setBizSlug(bizBaseline.brandSlug);
    setBizOutletType(bizBaseline.outletType);
    setBizScale(bizBaseline.businessScale);
    setBizOperatingHours(bizBaseline.operatingHours);
    setBizEstablishedYear(bizBaseline.establishedYear);
    setBizInstagram(bizBaseline.instagramHandle);
    setBizTiktok(bizBaseline.tiktokHandle);
    setBizFacebook(bizBaseline.facebookHandle);
    setBizOtherSocial(bizBaseline.otherSocial);
    setBizDescription(bizBaseline.description);
    setBizProvince(bizBaseline.province);
    setBizCity(bizBaseline.city);
    setBizAddress(bizBaseline.address);
    setBizPicName(bizBaseline.picName);
    setBizWhatsapp(bizBaseline.whatsapp);
    setBizEmail(bizBaseline.businessEmail);
    setBizNib(bizBaseline.nibNumber);
    setBizLogoUrl(bizBaseline.logoUrl);
    setBizLogoBg(bizBaseline.logoBg);
    setBizBannerUrl(bizBaseline.bannerUrl);
    setEditingBizEmail(false);
    setEditingBizPhone(false);
    setBizFormError('');
    window.PromoMuBridge?.showToast('Perubahan dikembalikan ke profil bisnis tersimpan');
  };

  const handleBizLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      window.PromoMuBridge?.showToast('Ukuran logo maksimal 2MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBizLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBizBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      window.PromoMuBridge?.showToast('Ukuran foto banner maksimal 3MB');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBizBannerUrl(reader.result);
        window.PromoMuBridge?.showToast('Banner foto bisnis diperbarui, klik Simpan Profil Bisnis');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveBusinessAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = bizName.trim();
    const cleanSlug = deriveBusinessSlug(bizSlug || cleanName);
    const cleanHours = bizOperatingHours.trim();
    const cleanDesc = bizDescription.trim();
    const cleanAddress = bizAddress.trim();
    const cleanPic = bizPicName.trim();
    const cleanWa = bizWhatsapp.trim();
    const cleanEmail = bizEmail.trim();

    if (!cleanName || !cleanSlug) {
      setBizFormError('Nama usaha dan tautan profil bisnis wajib diisi.');
      return;
    }
    if (!cleanDesc) {
      setBizFormError('Kolom Tentang Bisnis wajib diisi untuk menjelaskan profil usaha Anda.');
      return;
    }
    if (!cleanAddress) {
      setBizFormError('Alamat lengkap outlet wajib diisi agar informasi lokasi jelas.');
      return;
    }
    if (!cleanPic || !cleanWa || !cleanEmail) {
      setBizFormError('Nama penanggung jawab, WhatsApp bisnis, dan email bisnis wajib dilengkapi.');
      return;
    }
    if (!businessAccount && !bizAgreed) {
      setBizFormError('Centang persetujuan ketentuan akun bisnis terlebih dahulu.');
      return;
    }

    setBizFormError('');
    setEditingBizEmail(false);
    setEditingBizPhone(false);
    const nowIso = new Date().toISOString();
    const payload: BusinessAccount = {
      businessName: cleanName,
      brandSlug: cleanSlug,
      outletType: bizOutletType,
      businessScale: bizScale,
      operatingHours: cleanHours || '08.00 - 22.00 WIB',
      establishedYear: bizEstablishedYear.trim() || undefined,
      instagramHandle: bizInstagram.trim() || undefined,
      tiktokHandle: bizTiktok.trim() || undefined,
      facebookHandle: bizFacebook.trim() || undefined,
      otherSocial: bizOtherSocial.trim() || undefined,
      description: cleanDesc,
      province: bizProvince,
      city: bizCity,
      address: cleanAddress,
      picName: cleanPic,
      whatsapp: cleanWa,
      businessEmail: cleanEmail,
      nibNumber: bizNib.trim() || undefined,
      logoUrl: bizLogoUrl || undefined,
      logoBg: bizLogoBg,
      bannerUrl: bizBannerUrl || undefined,
      subscriptionPlan: subscriptionPlanId,
      subscriptionBillingCycle,
      subscriptionUpdatedAt: businessAccount?.subscriptionUpdatedAt || nowIso,
      createdAt: businessAccount?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    window.PromoMuBridge?.saveBusinessAccount(payload);
    setIsEditingBusiness(false);
    setBizJustSaved(true);
    setTimeout(() => setBizJustSaved(false), 2400);
  };

  const handleResetOfferForm = () => {
    setEditingOfferId(null);
    setNewOfferTitle('');
    setNewOfferType('Diskon Menu');
    setNewOfferDesc('');
    setNewOfferNormalPrice('');
    setNewOfferPrice('');
    setNewOfferCode('');
    setNewOfferQuota('50');
    setNewOfferValidUntil('');
    setNewOfferImageUrl('');
    setNewOfferActive(true);
    setNewOfferError('');
  };

  const handleOfferImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      window.PromoMuBridge?.showToast('Ukuran foto produk maksimal 3MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const rawDataUrl = reader.result;
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 900;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setNewOfferImageUrl(canvas.toDataURL('image/jpeg', 0.84));
          } else {
            setNewOfferImageUrl(rawDataUrl);
          }
        } catch {
          setNewOfferImageUrl(rawDataUrl);
        }
        window.PromoMuBridge?.showToast('Foto produk siap ditampilkan di dashboard utama');
      };
      img.onerror = () => {
        setNewOfferImageUrl(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerateOfferCode = () => {
    const prefix = (businessAccount?.businessName || 'BIZ')
      .replace(/[^A-Z0-9]/gi, '')
      .slice(0, 4)
      .toUpperCase();
    const randomNum = Math.floor(100 + Math.random() * 900);
    setNewOfferCode(`${prefix || 'BIZ'}${randomNum}`);
  };

  const handleEditBusinessOffer = (offer: BusinessOfferItem) => {
    setEditingOfferId(offer.id);
    setNewOfferTitle(offer.title);
    setNewOfferType(offer.promoType || 'Diskon Menu');
    setNewOfferDesc(offer.description || '');
    setNewOfferNormalPrice(String(offer.normalPrice));
    setNewOfferPrice(String(offer.offerPrice));
    setNewOfferCode(offer.code);
    setNewOfferQuota(String(offer.quota));
    setNewOfferValidUntil(offer.validUntil || '');
    setNewOfferImageUrl(offer.imageUrl || '');
    setNewOfferActive(offer.active);
    setNewOfferError('');
    setShowAddOfferForm(true);
  };

  const handleSaveBusinessOffer = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPublishingOffer) return;

    const cleanTitle = newOfferTitle.trim();
    const normalVal = parseInt(newOfferNormalPrice.replace(/\D/g, ''), 10) || 0;
    const promoVal = parseInt(newOfferPrice.replace(/\D/g, ''), 10) || 0;
    const quotaVal = Math.max(1, parseInt(newOfferQuota, 10) || 0);
    const cleanCode =
      newOfferCode
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '') ||
      `${(businessAccount?.businessName || 'BIZ').replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;

    if (!cleanTitle) {
      setNewOfferError('Nama menu atau judul promo wajib diisi.');
      return;
    }
    if (normalVal <= 0 || promoVal <= 0 || promoVal > normalVal) {
      setNewOfferError('Masukkan harga normal dan harga promo yang valid (promo <= normal).');
      return;
    }

    if (!editingOfferId && activePlanSpec.maxPromos !== null && bizOffers.length >= activePlanSpec.maxPromos) {
      setNewOfferError(
        `Batas paket ${activePlanSpec.name} tercapai (maksimal ${activePlanSpec.maxPromos} promo). Upgrade ke paket lebih tinggi di menu Paket Langganan untuk menambah promo lagi.`
      );
      return;
    }

    if (activePlanSpec.maxQuotaPerPromo !== null && quotaVal > activePlanSpec.maxQuotaPerPromo) {
      setNewOfferError(
        `Kuota per promo pada paket ${activePlanSpec.name} maksimal ${activePlanSpec.maxQuotaPerPromo} klaim. Kurangi kuota atau upgrade paket langganan Anda.`
      );
      return;
    }

    setNewOfferError('');
    setIsPublishingOffer(true);
    setPublishProgress(28);
    setPublishStageLabel(
      newOfferImageUrl
        ? 'Mengompresi & menyiapkan data promo beserta foto produk...'
        : 'Memvalidasi data promo untuk diunggah ke database...'
    );

    publishTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    publishTimersRef.current = [];

    const t1 = window.setTimeout(() => {
      setPublishProgress(68);
      setPublishStageLabel('Mengunggah data promo ke database PromoMu...');
    }, 420);

    const t2 = window.setTimeout(() => {
      setPublishProgress(94);
      setPublishStageLabel(
        newOfferActive
          ? 'Menyinkronkan promo ke katalog utama...'
          : 'Menyimpan draf promo ke database...'
      );
    }, 900);

    const t3 = window.setTimeout(() => {
      if (editingOfferId) {
        setBizOffers((prev) =>
          prev.map((item) =>
            item.id === editingOfferId
              ? {
                  ...item,
                  title: cleanTitle,
                  category: businessAccount?.outletType || item.category || 'Kuliner',
                  promoType: newOfferType,
                  description: newOfferDesc.trim() || undefined,
                  normalPrice: normalVal,
                  offerPrice: promoVal,
                  code: cleanCode,
                  quota: quotaVal,
                  validUntil: newOfferValidUntil || undefined,
                  imageUrl: newOfferImageUrl || undefined,
                  merchantName: businessAccount?.businessName || item.merchantName,
                  merchantCity: businessAccount?.city || item.merchantCity,
                  merchantAddress: businessAccount?.address
                    ? `${businessAccount.address}, ${businessAccount.city}`
                    : item.merchantAddress,
                  active: newOfferActive,
                }
              : item
          )
        );
        window.PromoMuBridge?.showToast(
          newOfferActive
            ? `Promo "${cleanTitle}" berhasil diunggah & diperbarui di katalog utama`
            : `Promo "${cleanTitle}" berhasil disimpan ke database (dijeda)`
        );
      } else {
        const newItem: BusinessOfferItem = {
          id: `biz-${Date.now()}`,
          title: cleanTitle,
          category: businessAccount?.outletType || 'Kuliner',
          promoType: newOfferType,
          description: newOfferDesc.trim() || undefined,
          normalPrice: normalVal,
          offerPrice: promoVal,
          code: cleanCode,
          quota: quotaVal,
          redeemedCount: 0,
          validUntil: newOfferValidUntil || undefined,
          imageUrl: newOfferImageUrl || undefined,
          merchantName: businessAccount?.businessName,
          merchantCity: businessAccount?.city,
          merchantAddress: businessAccount?.address
            ? `${businessAccount.address}, ${businessAccount.city}`
            : undefined,
          active: newOfferActive,
          createdAt: new Date().toISOString(),
        };
        setBizOffers((prev) => [newItem, ...prev]);
        window.PromoMuBridge?.showToast(
          newOfferActive
            ? `Promo "${cleanTitle}" berhasil diunggah & tayang di dashboard utama`
            : `Promo "${cleanTitle}" berhasil disimpan ke database (dijeda)`
        );
      }

      setPublishProgress(100);
      setIsPublishingOffer(false);
      setPublishStageLabel('');
      setPublishProgress(0);
      handleResetOfferForm();
      setShowAddOfferForm(false);
    }, 1280);

    publishTimersRef.current = [t1, t2, t3];
  };

  const handleExportRedemptionsCsv = () => {
    if (!activePlanSpec.canExportCsv) {
      window.PromoMuBridge?.showToast(
        'Ekspor laporan CSV tersedia mulai paket Bisnis Pro. Buka Paket Langganan untuk upgrade.'
      );
      navigateTab('subscription');
      return;
    }
    if (bizRedemptions.length === 0) {
      window.PromoMuBridge?.showToast('Belum ada data penukaran voucher untuk diekspor.');
      return;
    }

    const escapeCsv = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
    const rows = [
      ['No', 'Kode Voucher', 'Nama Promo', 'Waktu Verifikasi'],
      ...bizRedemptions.map((entry, idx) => [
        String(idx + 1),
        entry.code,
        entry.title,
        entry.verifiedAt,
      ]),
    ];
    const csvContent = '\uFEFF' + rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-voucher-${businessAccount?.brandSlug || 'bisnismu'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    window.PromoMuBridge?.showToast('Laporan penukaran CSV berhasil diunduh');
  };

  const handleConfirmSubscriptionChange = () => {
    if (!pendingUpgradePlan || isActivatingPlan) return;
    setIsActivatingPlan(true);

    const targetPlan = pendingUpgradePlan;
    const cycleToSave: SubscriptionBillingCycle =
      targetPlan.id === 'free' ? 'monthly' : selectedBillingView;

    const timerId = window.setTimeout(() => {
      const nowIso = new Date().toISOString();
      setSubscriptionPlanId(targetPlan.id);
      setSubscriptionBillingCycle(cycleToSave);
      saveStoredSubscriptionState({
        planId: targetPlan.id,
        billingCycle: cycleToSave,
        updatedAt: nowIso,
      });

      if (businessAccount) {
        window.PromoMuBridge?.saveBusinessAccount({
          ...businessAccount,
          subscriptionPlan: targetPlan.id,
          subscriptionBillingCycle: cycleToSave,
          subscriptionUpdatedAt: nowIso,
          updatedAt: nowIso,
        });
      }

      window.PromoMuBridge?.syncBusinessCatalog?.();
      setIsActivatingPlan(false);
      setPendingUpgradePlan(null);
      window.PromoMuBridge?.showToast(
        targetPlan.hasBlueBadge
          ? `Paket ${targetPlan.name} aktif! Lencana Centang Biru & kapasitas promo langsung diperbarui.`
          : 'Paket berhasil dialihkan ke Paket Gratis.'
      );
    }, 950);

    publishTimersRef.current.push(timerId);
  };

  const handleAdjustOfferQuota = (offerId: string, delta: number) => {
    setBizOffers((prev) =>
      prev.map((item) =>
        item.id === offerId ? { ...item, quota: Math.max(0, item.quota + delta) } : item
      )
    );
    window.PromoMuBridge?.showToast(
      delta > 0 ? `Kuota promo ditambah +${delta}` : 'Kuota promo disesuaikan'
    );
  };

  const handleVerifyCustomerCode = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = verifyCodeInput.trim().toUpperCase();
    if (!normalized) {
      setVerifyFeedback({
        type: 'error',
        message: 'Masukkan kode voucher pelanggan terlebih dahulu.',
      });
      return;
    }

    const matchedBizOffer = bizOffers.find((item) => item.code.toUpperCase() === normalized);
    const matchedCatalogPromo = promoItems.find((item) => item.code.toUpperCase() === normalized);

    if (!matchedBizOffer && !matchedCatalogPromo) {
      setVerifyFeedback({
        type: 'error',
        message: `Kode "${normalized}" tidak ditemukan pada daftar promo usaha maupun katalog aktif.`,
      });
      return;
    }

    if (matchedBizOffer && !matchedBizOffer.active) {
      setVerifyFeedback({
        type: 'error',
        message: `Kode "${normalized}" (${matchedBizOffer.title}) sedang dijeda dan tidak dapat digunakan.`,
      });
      return;
    }

    if (matchedBizOffer && matchedBizOffer.quota <= 0) {
      setVerifyFeedback({
        type: 'error',
        message: `Kuota untuk kode "${normalized}" (${matchedBizOffer.title}) sudah habis.`,
      });
      return;
    }

    const resolvedTitle = matchedBizOffer
      ? matchedBizOffer.title
      : `${matchedCatalogPromo?.merchant} — ${matchedCatalogPromo?.menu}`;

    if (matchedBizOffer) {
      setBizOffers((prev) =>
        prev.map((item) =>
          item.id === matchedBizOffer.id
            ? {
                ...item,
                quota: Math.max(0, item.quota - 1),
                redeemedCount: (item.redeemedCount || 0) + 1,
              }
            : item
        )
      );
    }

    const logEntry: BusinessRedemptionLog = {
      id: `log-${Date.now()}`,
      code: normalized,
      title: resolvedTitle,
      verifiedAt: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setBizRedemptions((prev) => [logEntry, ...prev]);
    setVerifyCodeInput('');
    setVerifyFeedback({
      type: 'success',
      message: `Kode ${normalized} terverifikasi valid untuk "${resolvedTitle}".`,
    });
    window.PromoMuBridge?.showToast(`Voucher ${normalized} terverifikasi`);
  };

  const filteredBizOffers = [...bizOffers]
    .filter((item) => {
      if (offerFilter === 'active' && !item.active) return false;
      if (offerFilter === 'paused' && item.active) return false;
      if (offerFilter === 'low' && item.quota > 5) return false;
      if (!offerSearch.trim()) return true;
      const q = offerSearch.trim().toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.promoType || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (offerSort === 'redeemed') {
        return (b.redeemedCount || 0) - (a.redeemedCount || 0);
      }
      if (offerSort === 'quota') {
        return a.quota - b.quota;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

  const personalDeletionInfo = getDeletionScheduleInfo(user.deletionScheduledAt);
  const businessDeletionInfo = getDeletionScheduleInfo(businessAccount?.deletionScheduledAt);

  const openDeleteConfirmation = (target: 'personal' | 'business') => {
    setDeleteReason(DELETION_REASONS[0]);
    setDeleteAcknowledge25Days(false);
    setDeleteConfirmText('');
    setDeleteReceiptTarget(null);
    setDeleteModalTarget(target);
  };

  const handleConfirmScheduledDeletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteModalTarget) return;
    if (!deleteAcknowledge25Days || deleteConfirmText.trim().toUpperCase() !== 'HAPUS') {
      return;
    }

    const scheduledIso = new Date().toISOString();
    if (deleteModalTarget === 'personal') {
      window.PromoMuBridge?.updateUserProfile({
        deletionScheduledAt: scheduledIso,
        deletionReason: deleteReason,
      });
      window.PromoMuBridge?.showToast(
        `Pengajuan hapus akun dicatat. Akun dihapus permanen jika melebihi ${DELETION_GRACE_DAYS} hari.`
      );
    } else if (businessAccount) {
      window.PromoMuBridge?.saveBusinessAccount({
        ...businessAccount,
        deletionScheduledAt: scheduledIso,
        deletionReason: deleteReason,
        updatedAt: scheduledIso,
      });
      window.PromoMuBridge?.showToast(
        `Pengajuan hapus akun bisnis dicatat. Dihapus permanen jika melebihi ${DELETION_GRACE_DAYS} hari.`
      );
    }

    const confirmedTarget = deleteModalTarget;
    setDeleteModalTarget(null);
    setDeleteConfirmText('');
    setDeleteAcknowledge25Days(false);
    setDeleteReceiptTarget(confirmedTarget);
  };

  const handleCancelScheduledDeletion = (target: 'personal' | 'business') => {
    if (target === 'personal') {
      window.PromoMuBridge?.updateUserProfile({
        deletionScheduledAt: undefined,
        deletionReason: undefined,
      });
      window.PromoMuBridge?.showToast('Penghapusan akun dibatalkan. Akun Anda aktif kembali.');
    } else if (businessAccount) {
      window.PromoMuBridge?.saveBusinessAccount({
        ...businessAccount,
        deletionScheduledAt: undefined,
        deletionReason: undefined,
        updatedAt: new Date().toISOString(),
      });
      window.PromoMuBridge?.showToast(
        'Penghapusan akun bisnis dibatalkan. Profil usaha aktif kembali.'
      );
    }
    if (deleteReceiptTarget === target) {
      setDeleteReceiptTarget(null);
    }
  };

  const navItems: {
    id: DashboardTab;
    label: string;
    icon: React.ReactNode;
    count?: number;
    metaText?: string;
  }[] = [
    {
      id: 'overview',
      label: 'Edit Profil',
      icon: <User className="h-4 w-4" />,
    },
    {
      id: 'favorites',
      label: 'Promo Favorit',
      icon: <Heart className="h-4 w-4" />,
      count: favoritePromos.length,
    },
    {
      id: 'businessPortal',
      label: 'BisnisMu',
      icon: <Briefcase className="h-4 w-4" />,
    },
    {
      id: 'business',
      label: businessAccount ? 'Akun Bisnis' : 'Buat Akun Bisnis',
      icon: <Store className="h-4 w-4" />,
    },
    {
      id: 'subscription',
      label: 'Paket Langganan',
      icon: <Crown className="h-4 w-4" />,
      metaText: activePlanSpec.shortLabel,
    },
    {
      id: 'settings',
      label: 'Pengaturan Lanjutan',
      icon: <Settings className="h-4 w-4" />,
    },
  ];

  const headerTitles: Record<DashboardTab, string> = {
    overview: 'Profil Saya',
    vouchers: 'Voucher Saya',
    favorites: 'Promo Favorit',
    businessPortal: 'BisnisMu',
    business: businessAccount ? 'Akun Bisnis' : 'Buat Akun Bisnis',
    subscription: 'Paket Langganan Bisnis',
    settings: 'Pengaturan Lanjutan',
  };

  const headerSubtitles: Record<DashboardTab, string> = {
    overview: 'Kelola informasi profil Anda untuk mengontrol, melindungi dan mengamankan akun.',
    vouchers: 'Daftar kode promo yang sudah kamu klaim dan siap dipindai di kasir.',
    favorites: 'Menu dan outlet favorit yang kamu simpan dari katalog PromoMu.',
    businessPortal: businessAccount
      ? `Edit profil usaha ${businessAccount.businessName}, tambah serta pantau promo aktif, dan verifikasi kode pelanggan dalam satu tampilan.`
      : 'Khusus pengguna yang sudah mendaftarkan bisnis. Lengkapi akun bisnis Anda untuk membuka akses menu ini.',
    business: businessAccount
      ? 'Kelola profil usaha, deskripsi bisnis, jam operasional, dan kontak resmi outlet Anda.'
      : 'Lengkapi identitas, profil singkat usaha, dan kontak resmi untuk membuat akun bisnis Anda.',
    subscription:
      'Pilih kapasitas upload promo, lencana centang biru, dan perangkat bisnis sesuai skala usaha Anda.',
    settings:
      'Kelola sesi login, hapus akun permanen, serta atur notifikasi web, email, dan SMS.',
  };

  const headerAvatarInitial = (profileName || user.name).trim().charAt(0).toUpperCase() || 'P';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit Profil Akun PromoMu"
      className="fixed inset-0 z-[45] bg-canvas text-ink overflow-hidden"
    >
      <div className="h-full flex flex-col lg:flex-row">
        {/* ================================================================
            SIDEBAR NAVIGATION (Desktop 260px, Mobile Top Bar)
           ================================================================ */}
        <aside className="shrink-0 lg:w-[260px] lg:h-full lg:overflow-y-auto bg-white border-b lg:border-b-0 lg:border-r border-black/8 flex flex-col p-4 sm:p-6">
          <div>
            {/* Brand + Close */}
            <div className="flex items-center justify-between gap-3 pb-5 border-b border-black/8">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                }}
                className="flex items-center gap-2.5 text-left group"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FF6B1A] text-white text-xs font-extrabold shadow-xs">
                  %
                </span>
                <div>
                  <span className="block text-base font-extrabold tracking-tight text-[#141312] leading-none">
                    Promo<span className="text-[#FF6B1A]">Mu</span>
                  </span>
                  <span className="block text-[11px] font-medium text-ink-muted mt-0.5">
                    Profil &amp; Akun
                  </span>
                </div>
              </a>

              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup Dashboard"
                className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full bg-subtle text-ink hover:bg-black/10 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sidebar Links */}
            <nav className="mt-4 flex lg:flex-col gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                const href = DASHBOARD_PATHS[item.id];
                return (
                  <a
                    key={item.id}
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTab(item.id);
                    }}
                    className={`flex items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold whitespace-nowrap shrink-0 transition ${
                      active
                        ? 'bg-[#181716] text-white'
                        : 'text-ink-muted hover:bg-canvas hover:text-ink'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && (
                      <span
                        className={`font-mono tabular-nums text-[11px] font-bold ${
                          active ? 'text-white/80' : 'text-ink-light'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                    {item.metaText && (
                      <span
                        className={`text-[10px] font-bold tracking-wide uppercase ${
                          active
                            ? 'text-[#FFD8BF]'
                            : subscriptionPlanId === 'enterprise'
                            ? 'text-[#141312]'
                            : subscriptionPlanId === 'pro'
                            ? 'text-[#FF6B1A]'
                            : 'text-ink-light'
                        }`}
                      >
                        {item.metaText}
                      </span>
                    )}
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ================================================================
            MAIN WORKSPACE VIEWPORT (MENU AKUN & EDIT PROFIL)
           ================================================================ */}
        <main
          className={`flex-1 min-w-0 min-h-0 overflow-y-auto px-4 sm:px-8 lg:px-10 bg-canvas text-ink ${
            activeTab === 'subscription' ? 'py-7 sm:py-10' : 'py-6 sm:py-9'
          }`}
        >
          <div
            className={`mx-auto ${
              activeTab === 'subscription' ? 'max-w-[1100px] space-y-7' : 'max-w-4xl space-y-6'
            }`}
          >
            {/* Simple Page Title & Navigation Back (hidden on dedicated subscription studio view) */}
            {activeTab !== 'subscription' && (
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-black/8">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#141312]">
                    {headerTitles[activeTab]}
                  </h1>
                  <p className="text-xs sm:text-sm text-ink-muted mt-1">
                    {headerSubtitles[activeTab]}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      onClose();
                    }}
                    className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap"
                  >
                    ← Kembali ke Beranda
                  </a>
                  <button
                    type="button"
                    onClick={() => window.PromoMuBridge?.signOutUser()}
                    className="lg:hidden rounded-xl bg-[#181716] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap"
                  >
                    Keluar
                  </button>
                </div>
              </div>
            )}

            {/* ============================================================
                TAB 1: PROFIL SAYA (HORIZONTAL SETTINGS + SENSOR EMAIL & HP)
               ============================================================ */}
            {activeTab === 'overview' && (
              <form
                id="profileEditorForm"
                onSubmit={handleSaveProfile}
                className="rounded-2xl bg-white border border-black/8 p-5 sm:p-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                  {/* Left Side: Horizontal Label-Value Account Form */}
                  <div className="lg:col-span-8 space-y-5 order-2 lg:order-1">

                    {/* Username */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start">
                      <label
                        htmlFor="profileEditUsername"
                        className="sm:col-span-4 sm:text-right sm:pt-2.5 text-xs sm:text-[13px] font-medium text-ink-muted"
                      >
                        Username
                      </label>
                      <div className="sm:col-span-8">
                        <input
                          id="profileEditUsername"
                          type="text"
                          value={profileUsername}
                          onChange={(e) =>
                            setProfileUsername(
                              e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '')
                            )
                          }
                          placeholder="username"
                          className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                        />
                        <p className="mt-1.5 text-[11px] text-ink-light">
                          Username digunakan sebagai identitas akun PromoMu Anda.
                        </p>
                      </div>
                    </div>

                    {/* Nama */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-center">
                      <label
                        htmlFor="profileEditName"
                        className="sm:col-span-4 sm:text-right text-xs sm:text-[13px] font-medium text-ink-muted"
                      >
                        Nama
                      </label>
                      <div className="sm:col-span-8">
                        <input
                          id="profileEditName"
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          required
                          placeholder="Masukkan nama lengkap"
                          className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                        />
                      </div>
                    </div>

                    {/* Email (Auto Censored Middle + Show/Edit Toggle + Provider Name) */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-center">
                      <span className="sm:col-span-4 sm:text-right text-xs sm:text-[13px] font-medium text-ink-muted">
                        Email
                      </span>
                      <div className="sm:col-span-8">
                        {editingEmail ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              value={profileEmail}
                              onChange={(e) => setProfileEmail(e.target.value)}
                              required
                              placeholder="nama@gmail.com"
                              className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-[#FF6B1A] focus:outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingEmail(false)}
                              className="shrink-0 whitespace-nowrap rounded-lg bg-canvas px-3 py-2 text-xs font-semibold text-ink border border-black/12 hover:border-ink transition cursor-pointer"
                            >
                              Selesai
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm">
                            <span className="font-medium text-ink break-all">
                              {showFullEmail ? profileEmail : maskEmail(profileEmail)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowFullEmail((prev) => !prev)}
                              aria-label={showFullEmail ? 'Sembunyikan email' : 'Lihat email lengkap'}
                              title={showFullEmail ? 'Sembunyikan email' : 'Lihat email lengkap'}
                              className="inline-flex items-center text-ink-light hover:text-ink transition cursor-pointer"
                            >
                              {showFullEmail ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingEmail(true)}
                              className="text-xs font-medium text-[#2563EB] underline underline-offset-2 hover:text-[#1D4ED8] transition cursor-pointer"
                            >
                              Ubah
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nomor Telepon (Censored Digits Except Last 2 + Show/Edit Toggle) */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-center">
                      <span className="sm:col-span-4 sm:text-right text-xs sm:text-[13px] font-medium text-ink-muted">
                        Nomor Telepon
                      </span>
                      <div className="sm:col-span-8">
                        {editingPhone ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="tel"
                              value={profilePhone}
                              onChange={(e) => setProfilePhone(e.target.value)}
                              placeholder="0812xxxxxxxx"
                              className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm font-mono text-ink border border-[#FF6B1A] focus:outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingPhone(false)}
                              className="shrink-0 whitespace-nowrap rounded-lg bg-canvas px-3 py-2 text-xs font-semibold text-ink border border-black/12 hover:border-ink transition cursor-pointer"
                            >
                              Selesai
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm">
                            {profilePhone.trim() ? (
                              <>
                                <span className="font-mono font-medium text-ink">
                                  {showFullPhone ? profilePhone : maskPhone(profilePhone)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowFullPhone((prev) => !prev)}
                                  aria-label={showFullPhone ? 'Sembunyikan nomor telepon' : 'Lihat nomor telepon'}
                                  title={showFullPhone ? 'Sembunyikan nomor telepon' : 'Lihat nomor telepon'}
                                  className="inline-flex items-center text-ink-light hover:text-ink transition cursor-pointer"
                                >
                                  {showFullPhone ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingPhone(true)}
                                  className="text-xs font-medium text-[#2563EB] underline underline-offset-2 hover:text-[#1D4ED8] transition cursor-pointer"
                                >
                                  Ubah
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="font-mono text-ink-light">***********</span>
                                <button
                                  type="button"
                                  onClick={() => setEditingPhone(true)}
                                  className="text-xs font-medium text-[#2563EB] underline underline-offset-2 hover:text-[#1D4ED8] transition cursor-pointer"
                                >
                                  Tambah
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Akun Terhubung */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-center">
                      <span className="sm:col-span-4 sm:text-right text-xs sm:text-[13px] font-medium text-ink-muted">
                        Login Terhubung
                      </span>
                      <div className="sm:col-span-8 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                        <ProviderBadge provider={user.provider} />
                        <span className="text-ink-light" aria-hidden="true">·</span>
                        <span className="text-xs text-ink-muted font-mono">
                          {maskEmail(profileEmail)}
                        </span>
                      </div>
                    </div>

                    {/* Kota Utama */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-center">
                      <label
                        htmlFor="profileEditCity"
                        className="sm:col-span-4 sm:text-right text-xs sm:text-[13px] font-medium text-ink-muted"
                      >
                        Kota Utama
                      </label>
                      <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <select
                          id="profileEditCity"
                          value={profileCity}
                          onChange={(e) => setProfileCity(e.target.value)}
                          className="w-full rounded-lg bg-white px-3 py-2 text-xs sm:text-sm font-medium text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                        >
                          {cities.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <input
                          id="profileEditArea"
                          type="text"
                          value={profileArea}
                          onChange={(e) => setProfileArea(e.target.value)}
                          placeholder="Kecamatan / Area"
                          className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                        />
                      </div>
                    </div>

                    {/* Jenis Kelamin */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-center">
                      <span className="sm:col-span-4 sm:text-right text-xs sm:text-[13px] font-medium text-ink-muted">
                        Jenis Kelamin
                      </span>
                      <div className="sm:col-span-8 flex flex-wrap items-center gap-5">
                        {(['Laki-laki', 'Perempuan', 'Lainnya'] as const).map((option) => (
                          <label
                            key={option}
                            className="inline-flex items-center gap-2 text-xs sm:text-sm text-ink cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="profileGender"
                              value={option}
                              checked={profileGender === option}
                              onChange={(e) => setProfileGender(e.target.value)}
                              className="h-4 w-4 accent-[#FF6B1A] cursor-pointer"
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Tanggal Lahir */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-center">
                      <span className="sm:col-span-4 sm:text-right text-xs sm:text-[13px] font-medium text-ink-muted">
                        Tanggal Lahir
                      </span>
                      <div className="sm:col-span-8">
                        {editingBirthDate ? (
                          <div className="flex items-center gap-2">
                            <input
                              id="profileEditBirthDate"
                              type="date"
                              value={profileBirthDate}
                              onChange={(e) => setProfileBirthDate(e.target.value)}
                              className="rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-[#FF6B1A] focus:outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingBirthDate(false)}
                              className="shrink-0 whitespace-nowrap rounded-lg bg-canvas px-3 py-2 text-xs font-semibold text-ink border border-black/12 hover:border-ink transition cursor-pointer"
                            >
                              Selesai
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 text-xs sm:text-sm text-ink">
                            <span>{formatBirthDate(profileBirthDate)}</span>
                            <button
                              type="button"
                              onClick={() => setEditingBirthDate(true)}
                              className="text-xs font-medium text-[#2563EB] underline underline-offset-2 hover:text-[#1D4ED8] transition cursor-pointer"
                            >
                              {profileBirthDate ? 'Ubah' : 'Tambah'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bio Singkat */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start">
                      <label
                        htmlFor="profileEditBio"
                        className="sm:col-span-4 sm:text-right sm:pt-2 text-xs sm:text-[13px] font-medium text-ink-muted"
                      >
                        Bio Singkat
                      </label>
                      <div className="sm:col-span-8">
                        <textarea
                          id="profileEditBio"
                          rows={2}
                          maxLength={160}
                          value={profileBio}
                          onChange={(e) => setProfileBio(e.target.value)}
                          placeholder="Tulis minat kuliner atau makanan favoritmu..."
                          className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition resize-none"
                        />
                      </div>
                    </div>

                    {/* Submit Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 pt-2">
                      <div className="sm:col-start-5 sm:col-span-8 flex flex-wrap items-center gap-3">
                        <button
                          type="submit"
                          className="rounded-lg bg-[#FF6B1A] px-7 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#EA580C] transition cursor-pointer"
                        >
                          Simpan
                        </button>
                        {hasUnsavedChanges && (
                          <button
                            type="button"
                            onClick={handleResetProfile}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-4 py-2.5 text-xs font-semibold text-ink border border-black/12 hover:border-ink transition cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Batalkan</span>
                          </button>
                        )}
                        {!hasUnsavedChanges && justSaved && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <Check className="h-3.5 w-3.5" />
                            <span>Tersimpan</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Circular Avatar Upload + Censored Email Preview */}
                  <div className="lg:col-span-4 lg:border-l lg:border-black/8 lg:pl-8 flex flex-col items-center text-center pt-2 lg:pt-4 order-1 lg:order-2">
                    {profileAvatarUrl ? (
                      <img
                        src={profileAvatarUrl}
                        alt={profileName || user.name}
                        className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border border-black/10 bg-canvas"
                      />
                    ) : (
                      <div
                        className="h-24 w-24 sm:h-28 sm:w-28 rounded-full flex items-center justify-center text-3xl font-extrabold text-white select-none transition-colors border border-black/10"
                        style={{ backgroundColor: profileAvatarBg }}
                      >
                        {headerAvatarInitial}
                      </div>
                    )}

                    {/* Account Name & Censored Email Label */}
                    <div className="mt-3.5 max-w-full">
                      <p className="text-sm font-extrabold text-ink truncate">
                        {profileName.trim() || user.name}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-ink-muted truncate">
                        {maskEmail(profileEmail)}
                      </p>
                      <div className="mt-1.5 flex justify-center">
                        <ProviderBadge provider={user.provider} />
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />

                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-ink border border-black/15 hover:border-ink transition cursor-pointer"
                      >
                        Pilih Gambar
                      </button>
                      {profileAvatarUrl && (
                        <button
                          type="button"
                          onClick={() => setProfileAvatarUrl('')}
                          className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    <div className="mt-3 text-[11px] leading-relaxed text-ink-light">
                      <p>Ukuran gambar: maks. 2 MB</p>
                      <p>Format gambar: .JPEG, .PNG, .WEBP</p>
                    </div>

                    {!profileAvatarUrl && (
                      <div className="mt-4 flex items-center justify-center gap-1.5" aria-label="Pilih warna latar inisial">
                        {AVATAR_COLORS.map((swatch) => {
                          const selected = profileAvatarBg === swatch.hex;
                          return (
                            <button
                              key={swatch.hex}
                              type="button"
                              title={swatch.label}
                              onClick={() => setProfileAvatarBg(swatch.hex)}
                              className={`h-5 w-5 rounded-full transition cursor-pointer ${
                                selected
                                  ? 'ring-2 ring-offset-2 ring-[#141312] scale-105'
                                  : 'opacity-80 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: swatch.hex }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </form>
            )}

            {/* ============================================================
                TAB 2: VOUCHER SAYA
               ============================================================ */}
            {activeTab === 'vouchers' && (
              <section className="rounded-3xl bg-white p-5 sm:p-6 border border-black/8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/8">
                  <div className="inline-flex items-center gap-1 p-1 bg-canvas rounded-full border border-black/8 self-start">
                    {(
                      [
                        { id: 'all', label: `Semua (${claimedPromos.length})` },
                        { id: 'active', label: `Aktif (${activeVoucherPromos.length})` },
                        {
                          id: 'used',
                          label: `Terpakai (${claimedPromos.length - activeVoucherPromos.length})`,
                        },
                      ] as { id: VoucherFilter; label: string }[]
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setVoucherFilter(tab.id)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                          voucherFilter === tab.id
                            ? 'bg-[#181716] text-white'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="h-3.5 w-3.5 text-ink-light absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={voucherSearch}
                      onChange={(e) => setVoucherSearch(e.target.value)}
                      placeholder="Cari merchant atau kode..."
                      className="w-full rounded-full bg-canvas pl-9 pr-4 py-2 text-xs text-ink border border-black/8 focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>
                </div>

                {filteredVouchers.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-sm font-extrabold text-ink">
                      Tidak ada voucher di kategori ini
                    </p>
                    <p className="text-xs text-ink-muted mt-1">
                      Klaim promo dari halaman utama atau ubah kata kunci pencarianmu.
                    </p>
                    <button
                      type="button"
                      onClick={handleBrowseCatalog}
                      className="mt-4 rounded-full bg-[#FF6B1A] px-5 py-2.5 text-xs font-bold text-white hover:bg-accent-600 transition"
                    >
                      Eksplor Katalog Promo
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-black/6">
                    {filteredVouchers.map((item) => {
                      const isUsed = usedVoucherIds.includes(item.id);
                      const savings = Math.max(0, item.oldPrice - item.promoPrice);
                      return (
                        <div
                          key={item.id}
                          className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                            <PromoThumbnail item={item} />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                                <span className="font-extrabold text-ink">{item.merchant}</span>
                                <span aria-hidden="true">·</span>
                                <span>{item.city}</span>
                                <span aria-hidden="true">·</span>
                                <span>{item.validUntil}</span>
                              </div>
                              <p className="text-sm font-bold text-ink mt-0.5">{item.menu}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs">
                                <span className="font-mono font-bold text-ink bg-canvas px-2.5 py-0.5 rounded-lg border border-black/8">
                                  {item.code}
                                </span>
                                <span className="font-mono tabular-nums font-bold text-[#FF6B1A]">
                                  Bayar {formatRp(item.promoPrice)}
                                </span>
                                <span className="font-mono tabular-nums text-ink-muted">
                                  (Hemat {formatRp(savings)})
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => window.PromoMuBridge?.toggleVoucherUsed(item.id)}
                              className={`rounded-full px-3.5 py-2 text-xs font-bold border transition whitespace-nowrap ${
                                isUsed
                                  ? 'bg-canvas text-ink-muted border-black/10 hover:text-ink'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {isUsed ? 'Sudah Dipakai ✓' : 'Tandai Terpakai'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(item.code)}
                              className="rounded-full bg-canvas px-3.5 py-2 text-xs font-bold text-ink border border-black/8 hover:border-ink transition whitespace-nowrap inline-flex items-center gap-1"
                            >
                              {copiedCode === item.code ? (
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                              <span>{copiedCode === item.code ? 'Disalin' : 'Salin Kode'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => window.PromoMuBridge?.openVoucherModal(item.id)}
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#181716] px-4 py-2 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              <span>Tampilkan QR</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ============================================================
                TAB 3: PROMO FAVORIT
               ============================================================ */}
            {activeTab === 'favorites' && (
              <section>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-base font-extrabold text-ink">
                      Promo Favorit Tersimpan
                    </h2>
                    <p className="text-xs text-ink-muted">
                      Tersinkron otomatis dengan tombol hati (♡) di katalog PromoMu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBrowseCatalog}
                    className="rounded-full bg-white px-4 py-2 text-xs font-bold text-ink border border-black/10 hover:border-ink transition whitespace-nowrap"
                  >
                    + Tambah Favorit
                  </button>
                </div>

                {favoritePromos.length === 0 ? (
                  <div className="rounded-3xl bg-white p-12 text-center border border-black/8">
                    <p className="text-sm font-extrabold text-ink">Belum ada promo favorit</p>
                    <p className="text-xs text-ink-muted mt-1">
                      Klik ikon hati pada kartu promo mana pun untuk menyimpannya di sini.
                    </p>
                    <button
                      type="button"
                      onClick={handleBrowseCatalog}
                      className="mt-4 rounded-full bg-[#181716] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#FF6B1A] transition"
                    >
                      Lihat Katalog Promo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favoritePromos.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-3xl bg-white p-5 border border-black/8 flex flex-col justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
                            <span className="font-bold text-ink truncate">{item.merchant}</span>
                            <span className="shrink-0">
                              {item.city} · {item.distance}
                            </span>
                          </div>
                          <h3 className="mt-1.5 text-sm font-extrabold text-ink leading-snug">
                            {item.menu}
                          </h3>
                          <p className="mt-1 text-xs text-ink-muted">
                            {item.category} · {item.badge}
                          </p>
                        </div>

                        <div className="pt-3.5 border-t border-black/8 flex items-center justify-between gap-2">
                          <div>
                            <p className="font-mono tabular-nums text-[11px] text-ink-light line-through">
                              {formatRp(item.oldPrice)}
                            </p>
                            <p className="font-mono tabular-nums text-base font-extrabold text-[#FF6B1A]">
                              {formatRp(item.promoPrice)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => window.PromoMuBridge?.toggleSavePromo(item.id)}
                              aria-label="Hapus dari favorit"
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink-muted hover:text-rose-600 border border-black/8 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => window.PromoMuBridge?.openVoucherModal(item.id)}
                              className="rounded-full bg-[#181716] px-4 py-2 text-xs font-bold text-white hover:bg-[#FF6B1A] transition"
                            >
                              Klaim
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ============================================================
                TAB 4: BUAT / KELOLA AKUN BISNIS
               ============================================================ */}
            {activeTab === 'business' && (
              <section className="space-y-5">
                {!businessAccount || isEditingBusiness ? (
                  <div className="rounded-2xl bg-white border border-black/8 overflow-hidden">
                    <div className="p-5 sm:p-7 border-b border-black/8 space-y-4">
                      <div>
                        <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-[#141312]">
                          {businessAccount
                            ? 'Perbarui Profil Akun Bisnis'
                            : 'Formulir Pendaftaran Akun Bisnis'}
                        </h2>
                        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                          {businessAccount
                            ? 'Sesuaikan deskripsi usaha, jam operasional, dan kontak resmi bisnis Anda.'
                            : 'Bangun profil usaha Anda secara terpisah dari akun pribadi dalam satu dashboard.'}
                        </p>
                      </div>

                      {!businessAccount && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-black/8 text-xs">
                          <div>
                            <p className="font-bold text-[#141312]">01. Identitas Bisnis</p>
                            <p className="text-ink-muted mt-0.5 leading-relaxed">
                              Atur nama merek, tautan profil bisnis, kategori, dan skala usaha Anda.
                            </p>
                          </div>
                          <div>
                            <p className="font-bold text-[#141312]">02. Tentang Bisnis &amp; Jam Buka</p>
                            <p className="text-ink-muted mt-0.5 leading-relaxed">
                              Ceritakan profil singkat usaha, jam operasional, dan alamat lengkap
                              outlet.
                            </p>
                          </div>
                          <div>
                            <p className="font-bold text-[#141312]">03. Kontak Resmi Usaha</p>
                            <p className="text-ink-muted mt-0.5 leading-relaxed">
                              Simpan data penanggung jawab, WhatsApp, media sosial, dan email bisnis.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSaveBusinessAccount} className="p-5 sm:p-7 space-y-6">
                      {bizFormError && (
                        <div className="rounded-xl bg-rose-50 px-4 py-3 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-semibold">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{bizFormError}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="bizNameInput"
                            className="block text-xs font-bold text-[#141312] mb-1.5"
                          >
                            Nama Usaha / Brand <span className="text-rose-600">*</span>
                          </label>
                          <input
                            id="bizNameInput"
                            type="text"
                            value={bizName}
                            onChange={(e) => {
                              const nextVal = e.target.value;
                              setBizName(nextVal);
                              if (!bizSlugEdited) {
                                setBizSlug(deriveBusinessSlug(nextVal));
                              }
                            }}
                            placeholder="Contoh: Kopi Senja Madiun"
                            required
                            className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="bizSlugInput"
                            className="block text-xs font-bold text-[#141312] mb-1.5"
                          >
                            Tautan Profil Bisnis <span className="text-rose-600">*</span>
                          </label>
                          <div className="flex items-center rounded-xl bg-canvas border border-black/10 focus-within:border-[#FF6B1A] overflow-hidden">
                            <span className="pl-3.5 pr-1 text-xs font-mono text-ink-muted whitespace-nowrap select-none">
                              promomu.id/bisnis/
                            </span>
                            <input
                              id="bizSlugInput"
                              type="text"
                              value={bizSlug}
                              onChange={(e) => {
                                setBizSlugEdited(true);
                                setBizSlug(deriveBusinessSlug(e.target.value));
                              }}
                              placeholder="kopi-senja"
                              required
                              className="w-full bg-transparent pr-3.5 py-2.5 text-xs sm:text-sm font-mono text-ink focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="bizOutletTypeSelect"
                            className="block text-xs font-bold text-[#141312] mb-1.5"
                          >
                            Bidang / Kategori Usaha
                          </label>
                          <select
                            id="bizOutletTypeSelect"
                            value={bizOutletType}
                            onChange={(e) =>
                              setBizOutletType(e.target.value as BusinessOutletType)
                            }
                            className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                          >
                            {BUSINESS_OUTLET_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="bizScaleSelect"
                            className="block text-xs font-bold text-[#141312] mb-1.5"
                          >
                            Skala / Bentuk Usaha
                          </label>
                          <select
                            id="bizScaleSelect"
                            value={bizScale}
                            onChange={(e) => setBizScale(e.target.value as BusinessScale)}
                            className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                          >
                            {BUSINESS_SCALES.map((scale) => (
                              <option key={scale} value={scale}>
                                {scale}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2 py-3.5 border-y border-black/8 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#141312]">
                              Wilayah Operasional (Provinsi &rsaquo; Kota / Kabupaten)
                            </span>
                            <span className="text-[11px] font-medium text-ink-muted">
                              {bizProvince} &rsaquo;{' '}
                              <span className="font-bold text-[#141312]">{bizCity}</span>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label
                                htmlFor="bizProvinceSelect"
                                className="block text-[11px] font-semibold text-ink-muted mb-1"
                              >
                                1. Provinsi
                              </label>
                              <select
                                id="bizProvinceSelect"
                                value={bizProvince}
                                onChange={(e) => {
                                  const nextProvince = e.target.value;
                                  const nextCities = getCitiesByProvince(nextProvince);
                                  setBizProvince(nextProvince);
                                  setBizCity(nextCities[0] || '');
                                }}
                                className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                              >
                                {INDONESIA_PROVINCES.map((region) => (
                                  <option key={region.province} value={region.province}>
                                    {region.province}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor="bizCitySelect"
                                className="block text-[11px] font-semibold text-ink-muted mb-1"
                              >
                                2. Kota / Kabupaten
                              </label>
                              <select
                                id="bizCitySelect"
                                value={bizCity}
                                onChange={(e) => setBizCity(e.target.value)}
                                className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                              >
                                {bizProvinceCities.map((city) => (
                                  <option key={city} value={city}>
                                    {city}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="bizHoursInput"
                            className="block text-xs font-bold text-[#141312] mb-1.5"
                          >
                            Jam Operasional
                          </label>
                          <input
                            id="bizHoursInput"
                            type="text"
                            value={bizOperatingHours}
                            onChange={(e) => setBizOperatingHours(e.target.value)}
                            placeholder="Contoh: 08.00 - 22.00 WIB"
                            className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="bizEstablishedInput"
                            className="block text-xs font-bold text-[#141312] mb-1.5"
                          >
                            Tahun Berdiri (Opsional)
                          </label>
                          <input
                            id="bizEstablishedInput"
                            type="text"
                            value={bizEstablishedYear}
                            onChange={(e) => setBizEstablishedYear(e.target.value)}
                            placeholder="Contoh: 2022"
                            maxLength={4}
                            className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm font-mono text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="bizInstagramInput"
                            className="block text-xs font-bold text-[#141312] mb-1.5"
                          >
                            Instagram / Media Sosial (Opsional)
                          </label>
                          <input
                            id="bizInstagramInput"
                            type="text"
                            value={bizInstagram}
                            onChange={(e) => setBizInstagram(e.target.value)}
                            placeholder="Contoh: @kopisenja.madiun"
                            className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label
                            htmlFor="bizNibInput"
                            className="block text-xs font-bold text-[#141312] mb-1.5"
                          >
                            Nomor NIB / Izin Usaha (Opsional)
                          </label>
                          <input
                            id="bizNibInput"
                            type="text"
                            value={bizNib}
                            onChange={(e) => setBizNib(e.target.value)}
                            placeholder="Kosongkan jika belum ada"
                            className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm font-mono text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                          />
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="bizDescriptionInput"
                          className="block text-xs font-bold text-[#141312] mb-1.5"
                        >
                          Tentang Bisnis <span className="text-rose-600">*</span>
                        </label>
                        <textarea
                          id="bizDescriptionInput"
                          rows={3}
                          value={bizDescription}
                          onChange={(e) => setBizDescription(e.target.value)}
                          placeholder="Ceritakan singkat mengenai usaha Anda, konsep tempat, menu khas, atau layanan yang ditawarkan."
                          required
                          className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A] resize-none"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="bizAddressInput"
                          className="block text-xs font-bold text-[#141312] mb-1.5"
                        >
                          Alamat Lengkap Outlet <span className="text-rose-600">*</span>
                        </label>
                        <textarea
                          id="bizAddressInput"
                          rows={2}
                          value={bizAddress}
                          onChange={(e) => setBizAddress(e.target.value)}
                          placeholder="Contoh: Jl. Pahlawan No. 42, Kartoharjo (Samping Alun-Alun)"
                          required
                          className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A] resize-none"
                        />
                      </div>

                      <div className="pt-4 border-t border-black/8 space-y-4">
                        <h3 className="text-sm font-extrabold text-[#141312]">
                          Penanggung Jawab &amp; Kontak Resmi Usaha
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label
                              htmlFor="bizPicInput"
                              className="block text-xs font-bold text-[#141312] mb-1.5"
                            >
                              Nama PIC <span className="text-rose-600">*</span>
                            </label>
                            <input
                              id="bizPicInput"
                              type="text"
                              value={bizPicName}
                              onChange={(e) => setBizPicName(e.target.value)}
                              placeholder="Nama lengkap pemilik/PIC"
                              required
                              className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="bizWaInput"
                              className="block text-xs font-bold text-[#141312] mb-1.5"
                            >
                              WhatsApp Bisnis <span className="text-rose-600">*</span>
                            </label>
                            <input
                              id="bizWaInput"
                              type="tel"
                              value={bizWhatsapp}
                              onChange={(e) => setBizWhatsapp(e.target.value)}
                              placeholder="0812xxxxxxxx"
                              required
                              className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="bizEmailInput"
                              className="block text-xs font-bold text-[#141312] mb-1.5"
                            >
                              Email Bisnis <span className="text-rose-600">*</span>
                            </label>
                            <input
                              id="bizEmailInput"
                              type="email"
                              value={bizEmail}
                              onChange={(e) => setBizEmail(e.target.value)}
                              placeholder="outlet@bisnis.com"
                              required
                              className="w-full rounded-xl bg-canvas px-3.5 py-2.5 text-xs sm:text-sm text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                            />
                          </div>
                        </div>
                      </div>

                      {!businessAccount && (
                        <label className="flex items-start gap-2.5 text-xs text-ink-muted cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={bizAgreed}
                            onChange={(e) => setBizAgreed(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-[#FF6B1A] shrink-0"
                          />
                          <span>
                            Saya menyatakan informasi bisnis di atas benar dan siap dikelola melalui
                            akun ini.
                          </span>
                        </label>
                      )}

                      <div className="pt-4 border-t border-black/8 flex flex-wrap items-center justify-between gap-3">
                        {isEditingBusiness ? (
                          <button
                            type="button"
                            onClick={() => {
                              setBizFormError('');
                              setIsEditingBusiness(false);
                            }}
                            className="rounded-xl bg-canvas px-4 py-2.5 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap"
                          >
                            Batalkan
                          </button>
                        ) : (
                          <p className="text-[11px] text-ink-muted">
                            Akun pribadi Anda tetap aktif dan bisa digunakan kapan saja.
                          </p>
                        )}

                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#181716] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap"
                        >
                          <Store className="h-3.5 w-3.5" />
                          <span>
                            {businessAccount ? 'Simpan Perubahan Bisnis' : 'Buat Akun Bisnis'}
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white p-5 sm:p-7 border border-black/8 space-y-6">
                    {/* Active Business Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#181716] text-white text-xl font-extrabold">
                          {businessAccount.businessName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg font-extrabold text-[#141312] truncate">
                            {businessAccount.businessName}
                          </h2>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted mt-0.5">
                            <span>{businessAccount.outletType}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {businessAccount.province
                                ? `${businessAccount.province} › ${businessAccount.city}`
                                : businessAccount.city}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[11px]">
                              promomu.id/bisnis/{businessAccount.brandSlug}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setBizFormError('');
                          setIsEditingBusiness(true);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-canvas px-4 py-2 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap shrink-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit Info Bisnis</span>
                      </button>
                    </div>

                    {/* Summary Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-black/8 divide-y sm:divide-y-0 sm:divide-x divide-black/8">
                      <div className="py-3.5 sm:pr-4">
                        <p className="text-[11px] font-semibold text-ink-muted">Skala Usaha</p>
                        <p className="text-xs sm:text-sm font-bold text-[#141312] mt-0.5">
                          {businessAccount.businessScale || 'UMKM / Usaha Rintisan'}
                        </p>
                      </div>
                      <div className="py-3.5 sm:px-4">
                        <p className="text-[11px] font-semibold text-ink-muted">Jam Operasional</p>
                        <p className="text-xs sm:text-sm font-bold text-[#141312] mt-0.5 tabular-nums">
                          {businessAccount.operatingHours || '08.00 - 22.00 WIB'}
                        </p>
                      </div>
                      <div className="py-3.5 sm:px-4">
                        <p className="text-[11px] font-semibold text-ink-muted">Penanggung Jawab</p>
                        <p className="text-xs sm:text-sm font-bold text-[#141312] mt-0.5 truncate">
                          {businessAccount.picName}
                        </p>
                      </div>
                      <div className="py-3.5 sm:pl-4">
                        <p className="text-[11px] font-semibold text-ink-muted">Terdaftar Sejak</p>
                        <p className="text-xs sm:text-sm font-mono font-bold text-[#141312] mt-0.5 tabular-nums">
                          {formatBirthDate(businessAccount.createdAt.slice(0, 10))}
                        </p>
                      </div>
                    </div>

                    {/* About & Outlet Detail Rows */}
                    <div className="space-y-3.5 text-xs sm:text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                        <span className="sm:col-span-3 text-ink-muted font-medium">
                          Tentang Bisnis
                        </span>
                        <span className="sm:col-span-9 font-medium text-[#141312] leading-relaxed">
                          {businessAccount.description || 'Belum ada deskripsi usaha.'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                        <span className="sm:col-span-3 text-ink-muted font-medium">
                          Wilayah Usaha
                        </span>
                        <span className="sm:col-span-9 font-semibold text-[#141312]">
                          {businessAccount.province
                            ? `${businessAccount.province} › ${businessAccount.city}`
                            : businessAccount.city}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                        <span className="sm:col-span-3 text-ink-muted font-medium">
                          Alamat Outlet
                        </span>
                        <span className="sm:col-span-9 font-semibold text-[#141312] leading-relaxed">
                          {businessAccount.address}, {businessAccount.city}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                        <span className="sm:col-span-3 text-ink-muted font-medium">
                          WhatsApp Bisnis
                        </span>
                        <span className="sm:col-span-9 font-mono font-semibold text-[#141312] tabular-nums">
                          {maskPhone(businessAccount.whatsapp)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                        <span className="sm:col-span-3 text-ink-muted font-medium">
                          Email Bisnis
                        </span>
                        <span className="sm:col-span-9 font-semibold text-[#141312] break-all">
                          {maskEmail(businessAccount.businessEmail)}
                        </span>
                      </div>

                      {businessAccount.instagramHandle && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                          <span className="sm:col-span-3 text-ink-muted font-medium">
                            Media Sosial
                          </span>
                          <span className="sm:col-span-9 font-semibold text-[#141312]">
                            {businessAccount.instagramHandle}
                          </span>
                        </div>
                      )}

                      {businessAccount.establishedYear && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                          <span className="sm:col-span-3 text-ink-muted font-medium">
                            Tahun Berdiri
                          </span>
                          <span className="sm:col-span-9 font-mono font-semibold text-[#141312] tabular-nums">
                            {businessAccount.establishedYear}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4 items-baseline">
                        <span className="sm:col-span-3 text-ink-muted font-medium">
                          Nomor NIB / Izin
                        </span>
                        <span className="sm:col-span-9 font-mono font-semibold text-[#141312]">
                          {businessAccount.nibNumber?.trim() || 'Belum diisi'}
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-black/8 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => navigateTab('businessPortal')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#181716] px-4 py-2 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap cursor-pointer"
                      >
                        <Briefcase className="h-3.5 w-3.5" />
                        <span>Buka BisnisMu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTab('settings')}
                        className="text-xs font-bold text-ink hover:text-[#FF6B1A] transition cursor-pointer"
                      >
                        Atur notifikasi &amp; sesi →
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ============================================================
                TAB 4B: PORTAL BISNIS (WAJIB DAFTAR AKUN BISNIS DULU)
               ============================================================ */}
            {activeTab === 'businessPortal' && (
              <section className="space-y-5">
                {!businessAccount ? (
                  <div className="rounded-2xl bg-white p-6 sm:p-8 border border-black/8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-50 text-[#FF6B1A] border border-[#FF6B1A]/15">
                        <Store className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-[#141312]">
                          Daftarkan Bisnis Anda Terlebih Dahulu
                        </h2>
                        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed max-w-2xl">
                          Menu <strong>BisnisMu</strong> hanya dapat diakses setelah akun
                          bisnis Anda terdaftar. Lengkapi profil usaha terlebih dahulu melalui menu{' '}
                          <strong>Buat Akun Bisnis</strong> agar dapat mengelola menu outlet dan
                          verifikasi kode pelanggan.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 border-y border-black/8 text-xs">
                      <div>
                        <p className="font-bold text-[#141312]">01. Visibilitas &amp; Brand Usaha</p>
                        <p className="text-ink-muted mt-0.5 leading-relaxed">
                          Perkenalkan nama usaha, cerita bisnis, lokasi wilayah, dan keunikan brand
                          Anda kepada calon pelanggan.
                        </p>
                      </div>
                      <div>
                        <p className="font-bold text-[#141312]">02. Pengelolaan Operasional</p>
                        <p className="text-ink-muted mt-0.5 leading-relaxed">
                          Atur jadwal operasional, status ketersediaan outlet, serta katalog produk
                          dan layanan bisnis dalam satu tempat.
                        </p>
                      </div>
                      <div>
                        <p className="font-bold text-[#141312]">03. Kepercayaan Pelanggan</p>
                        <p className="text-ink-muted mt-0.5 leading-relaxed">
                          Tampilkan kontak resmi bisnis dan kelola layanan outlet secara profesional
                          agar usaha Anda makin dipercaya.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-ink-muted">
                        Belum memiliki profil usaha terdaftar di akun ini.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigateTab('business');
                          window.PromoMuBridge?.showToast(
                            'Silakan daftarkan bisnis Anda terlebih dahulu'
                          );
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#181716] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap"
                      >
                        <Store className="h-3.5 w-3.5" />
                        <span>Lanjut ke Menu Buat Akun Bisnis →</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* ========================================================
                        1. EDIT PROFIL BISNIS (GAYA HORIZONTAL SEPERTI EDIT PROFIL)
                       ======================================================== */}
                    <form
                      id="bizProfileEditorForm"
                      onSubmit={handleSaveBusinessAccount}
                      className="rounded-2xl bg-white border border-black/8 overflow-hidden"
                    >
                      {/* Banner Foto Outlet */}
                      <div className="relative h-44 sm:h-56 w-full bg-[#181716] overflow-hidden">
                        <img
                          src={bizBannerUrl || defaultBizBanner}
                          alt={`Banner outlet ${bizName || businessAccount.businessName}`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover object-center"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/15" />

                        <input
                          ref={bizBannerInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleBizBannerUpload}
                          className="hidden"
                        />

                        {/* Top-Right Banner Controls */}
                        <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-5 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => bizBannerInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3.5 py-2 text-xs font-bold text-[#141312] hover:bg-white transition whitespace-nowrap cursor-pointer shadow-xs"
                          >
                            <Camera className="h-3.5 w-3.5" />
                            <span>Ganti Banner</span>
                          </button>

                          {bizBannerUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setBizBannerUrl('');
                                window.PromoMuBridge?.showToast('Banner dikembalikan ke foto bawaan');
                              }}
                              className="rounded-xl bg-[#181716]/85 px-3 py-2 text-xs font-bold text-white hover:bg-[#181716] transition whitespace-nowrap cursor-pointer"
                            >
                              Pakai Bawaan
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const next = !outletOpen;
                              setOutletOpen(next);
                              window.PromoMuBridge?.showToast(
                                next
                                  ? 'Status outlet diubah ke Buka'
                                  : 'Status outlet diubah ke Tutup Sementara'
                              );
                            }}
                            className={`rounded-xl px-3.5 py-2 text-xs font-bold border transition whitespace-nowrap cursor-pointer ${
                              outletOpen
                                ? 'bg-emerald-600/95 text-white border-emerald-400/30 hover:bg-emerald-600'
                                : 'bg-amber-500/95 text-white border-amber-300/30 hover:bg-amber-500'
                            }`}
                          >
                            {outletOpen ? 'Outlet Sedang Buka' : 'Outlet Tutup Sementara'}
                          </button>
                        </div>

                        {/* Bottom-Left Business Identity Over Scrim */}
                        <div className="absolute inset-x-0 bottom-0 p-5 sm:px-8 sm:pb-5 flex flex-wrap items-end justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 max-w-full">
                              <h2 className="relative inline-block max-w-full truncate pb-2 text-2xl sm:text-3xl lg:text-[2.15rem] font-extrabold tracking-[-0.03em] leading-tight bg-gradient-to-b from-white via-white to-[#F3E6DA] bg-clip-text text-transparent drop-shadow-[0_3px_14px_rgba(0,0,0,0.55)] after:content-[''] after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-14 after:rounded-full after:bg-gradient-to-r after:from-[#FF6B1A] after:to-[#FFE6D5]">
                                {bizName.trim() || businessAccount.businessName}
                              </h2>
                              {activePlanSpec.hasBlueBadge && (
                                <span
                                  title="Lencana Centang Biru — Mitra Terverifikasi PromoMu"
                                  className="inline-flex shrink-0 items-center mb-1.5"
                                >
                                  <BadgeCheck className="h-6 w-6 sm:h-7 sm:w-7 fill-[#1D9BF0] text-white drop-shadow-xs" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-[13px] text-white/90 mt-1.5 truncate drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">
                              {bizOutletType} · {bizProvince} &rsaquo; {bizCity} ·{' '}
                              {bizOperatingHours || '08.00 - 22.00 WIB'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigateTab('subscription')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-black/55 hover:bg-black/75 backdrop-blur-xs px-3.5 py-2 text-[11px] font-bold text-white border border-white/20 transition whitespace-nowrap cursor-pointer"
                          >
                            <Crown className="h-3.5 w-3.5 text-[#FFD8BF]" />
                            <span>
                              {activePlanSpec.hasBlueBadge
                                ? `Paket ${activePlanSpec.name}`
                                : 'Paket Gratis · Aktifkan Centang Biru'}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="p-5 sm:p-8 space-y-6">
                        <div className="pb-4 border-b border-black/8">
                          <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-[#141312]">
                            Edit Profil Bisnis
                          </h3>
                          <p className="text-xs text-ink-muted mt-0.5">
                            Kelola identitas usaha, logo outlet, kontak resmi, dan jadwal
                            operasional {businessAccount.businessName}.
                          </p>
                        </div>

                        {bizFormError && (
                          <div className="rounded-xl bg-rose-50 px-4 py-3 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 font-semibold">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{bizFormError}</span>
                          </div>
                        )}

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                        {/* Left Side: Horizontal Label-Value Business Form */}
                        <div className="lg:col-span-8 space-y-5 order-2 lg:order-1">
                          {/* Tautan Profil Bisnis */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start">
                            <label
                              htmlFor="portalBizSlugInput"
                              className="sm:col-span-4 sm:text-right sm:pt-2.5 text-xs sm:text-[13px] font-medium text-ink-muted"
                            >
                              Tautan Bisnis
                            </label>
                            <div className="sm:col-span-8">
                              <div className="flex items-center rounded-lg bg-white border border-black/15 focus-within:border-[#FF6B1A] overflow-hidden transition">
                                <span className="pl-3.5 pr-1 text-xs font-mono text-ink-muted whitespace-nowrap select-none">
                                  promomu.id/bisnis/
                                </span>
                                <input
                                  id="portalBizSlugInput"
                                  type="text"
                                  value={bizSlug}
                                  onChange={(e) => {
                                    setBizSlugEdited(true);
                                    setBizSlug(deriveBusinessSlug(e.target.value));
                                  }}
                                  placeholder="nama-usaha"
                                  required
                                  className="w-full bg-transparent pr-3.5 py-2 text-xs sm:text-sm font-mono text-ink focus:outline-none"
                                />
                              </div>
                              <p className="mt-1.5 text-[11px] text-ink-light">
                                Tautan profil publik bisnis Anda di PromoMu.
                              </p>
                            </div>
                          </div>

                          {/* Nama Usaha / Brand */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-center">
                            <label
                              htmlFor="portalBizNameInput"
                              className="sm:col-span-4 sm:text-right text-xs sm:text-[13px] font-medium text-ink-muted"
                            >
                              Nama Usaha
                            </label>
                            <div className="sm:col-span-8">
                              <input
                                id="portalBizNameInput"
                                type="text"
                                value={bizName}
                                onChange={(e) => setBizName(e.target.value)}
                                required
                                placeholder="Masukkan nama usaha atau brand"
                                className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                              />
                            </div>
                          </div>

                          {/* Bidang & Skala Usaha */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-center">
                            <label
                              htmlFor="portalBizTypeSelect"
                              className="sm:col-span-4 sm:text-right text-xs sm:text-[13px] font-medium text-ink-muted"
                            >
                              Bidang &amp; Skala
                            </label>
                            <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <select
                                id="portalBizTypeSelect"
                                value={bizOutletType}
                                onChange={(e) =>
                                  setBizOutletType(e.target.value as BusinessOutletType)
                                }
                                className="w-full rounded-lg bg-white px-3 py-2 text-xs sm:text-sm font-medium text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                              >
                                {BUSINESS_OUTLET_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                              <select
                                id="portalBizScaleSelect"
                                aria-label="Skala Usaha"
                                value={bizScale}
                                onChange={(e) => setBizScale(e.target.value as BusinessScale)}
                                className="w-full rounded-lg bg-white px-3 py-2 text-xs sm:text-sm font-medium text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                              >
                                {BUSINESS_SCALES.map((scale) => (
                                  <option key={scale} value={scale}>
                                    {scale}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Email Bisnis (Auto Censored + Show/Edit Toggle) */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-center">
                            <span className="sm:col-span-4 sm:text-right text-xs sm:text-[13px] font-medium text-ink-muted">
                              Email Bisnis
                            </span>
                            <div className="sm:col-span-8">
                              {editingBizEmail ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="email"
                                    value={bizEmail}
                                    onChange={(e) => setBizEmail(e.target.value)}
                                    required
                                    placeholder="bisnis@usaha.com"
                                    className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-[#FF6B1A] focus:outline-none transition"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setEditingBizEmail(false)}
                                    className="shrink-0 whitespace-nowrap rounded-lg bg-canvas px-3 py-2 text-xs font-semibold text-ink border border-black/12 hover:border-ink transition cursor-pointer"
                                  >
                                    Selesai
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm">
                                  <span className="font-medium text-ink break-all">
                                    {showFullBizEmail ? bizEmail : maskEmail(bizEmail)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setShowFullBizEmail((prev) => !prev)}
                                    aria-label={
                                      showFullBizEmail
                                        ? 'Sembunyikan email bisnis'
                                        : 'Lihat email bisnis lengkap'
                                    }
                                    title={
                                      showFullBizEmail
                                        ? 'Sembunyikan email bisnis'
                                        : 'Lihat email bisnis lengkap'
                                    }
                                    className="inline-flex items-center text-ink-light hover:text-ink transition cursor-pointer"
                                  >
                                    {showFullBizEmail ? (
                                      <EyeOff className="h-3.5 w-3.5" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingBizEmail(true)}
                                    className="text-xs font-medium text-[#2563EB] underline underline-offset-2 hover:text-[#1D4ED8] transition cursor-pointer"
                                  >
                                    Ubah
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* WhatsApp Bisnis (Auto Censored + Show/Edit Toggle) */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-center">
                            <span className="sm:col-span-4 sm:text-right text-xs sm:text-[13px] font-medium text-ink-muted">
                              WhatsApp Bisnis
                            </span>
                            <div className="sm:col-span-8">
                              {editingBizPhone ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="tel"
                                    value={bizWhatsapp}
                                    onChange={(e) => setBizWhatsapp(e.target.value)}
                                    required
                                    placeholder="0812xxxxxxxx"
                                    className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm font-mono text-ink border border-[#FF6B1A] focus:outline-none transition"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setEditingBizPhone(false)}
                                    className="shrink-0 whitespace-nowrap rounded-lg bg-canvas px-3 py-2 text-xs font-semibold text-ink border border-black/12 hover:border-ink transition cursor-pointer"
                                  >
                                    Selesai
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm">
                                  <span className="font-mono font-medium text-ink">
                                    {showFullBizPhone ? bizWhatsapp : maskPhone(bizWhatsapp)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setShowFullBizPhone((prev) => !prev)}
                                    aria-label={
                                      showFullBizPhone
                                        ? 'Sembunyikan nomor WhatsApp'
                                        : 'Lihat nomor WhatsApp'
                                    }
                                    title={
                                      showFullBizPhone
                                        ? 'Sembunyikan nomor WhatsApp'
                                        : 'Lihat nomor WhatsApp'
                                    }
                                    className="inline-flex items-center text-ink-light hover:text-ink transition cursor-pointer"
                                  >
                                    {showFullBizPhone ? (
                                      <EyeOff className="h-3.5 w-3.5" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingBizPhone(true)}
                                    className="text-xs font-medium text-[#2563EB] underline underline-offset-2 hover:text-[#1D4ED8] transition cursor-pointer"
                                  >
                                    Ubah
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Wilayah Usaha (Provinsi > Kota / Kabupaten) */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-center">
                            <label
                              htmlFor="portalBizProvinceSelect"
                              className="sm:col-span-4 sm:text-right text-xs sm:text-[13px] font-medium text-ink-muted"
                            >
                              Wilayah Usaha
                            </label>
                            <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <select
                                id="portalBizProvinceSelect"
                                value={bizProvince}
                                onChange={(e) => {
                                  const nextProvince = e.target.value;
                                  const nextCities = getCitiesByProvince(nextProvince);
                                  setBizProvince(nextProvince);
                                  setBizCity(nextCities[0] || '');
                                }}
                                className="w-full rounded-lg bg-white px-3 py-2 text-xs sm:text-sm font-medium text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                              >
                                {INDONESIA_PROVINCES.map((region) => (
                                  <option key={region.province} value={region.province}>
                                    {region.province}
                                  </option>
                                ))}
                              </select>
                              <select
                                id="portalBizCitySelect"
                                aria-label="Kota atau Kabupaten"
                                value={bizCity}
                                onChange={(e) => setBizCity(e.target.value)}
                                className="w-full rounded-lg bg-white px-3 py-2 text-xs sm:text-sm font-medium text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                              >
                                {bizProvinceCities.map((city) => (
                                  <option key={city} value={city}>
                                    {city}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Alamat Outlet */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start">
                            <label
                              htmlFor="portalBizAddressInput"
                              className="sm:col-span-4 sm:text-right sm:pt-2 text-xs sm:text-[13px] font-medium text-ink-muted"
                            >
                              Alamat Outlet
                            </label>
                            <div className="sm:col-span-8">
                              <textarea
                                id="portalBizAddressInput"
                                rows={2}
                                value={bizAddress}
                                onChange={(e) => setBizAddress(e.target.value)}
                                required
                                placeholder="Jl. Pahlawan No. 42, Kartoharjo"
                                className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition resize-none"
                              />
                            </div>
                          </div>

                          {/* Jam Operasional & Tahun Berdiri */}
                          {(() => {
                            const parsedHours = parseOperatingHours(bizOperatingHours);
                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-end">
                                <label
                                  htmlFor="portalBizHoursInput"
                                  className="sm:col-span-4 sm:text-right sm:pb-2 text-xs sm:text-[13px] font-medium text-ink-muted"
                                >
                                  Jam Buka &amp; Berdiri
                                </label>
                                <div className="sm:col-span-8 grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-end">
                                  <div className="col-span-1 sm:col-span-4">
                                    <span className="block text-[11px] font-medium text-ink-muted mb-1">
                                      Buka
                                    </span>
                                    <select
                                      id="portalBizHoursInput"
                                      aria-label="Waktu Buka"
                                      value={parsedHours.is24h ? '24H' : parsedHours.open}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '24H') {
                                          setBizOperatingHours('Buka 24 Jam');
                                        } else {
                                          setBizOperatingHours(`${val} - ${parsedHours.close} WIB`);
                                        }
                                      }}
                                      className="w-full rounded-lg bg-white px-2.5 py-2 text-xs sm:text-sm font-mono font-medium text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                                    >
                                      <option value="24H">24 Jam</option>
                                      {!parsedHours.is24h &&
                                        !TIME_SLOTS.includes(parsedHours.open) && (
                                          <option value={parsedHours.open}>
                                            {parsedHours.open}
                                          </option>
                                        )}
                                      {TIME_SLOTS.map((slot) => (
                                        <option key={`open-${slot}`} value={slot}>
                                          {slot}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="col-span-1 sm:col-span-4">
                                    <span className="block text-[11px] font-medium text-ink-muted mb-1">
                                      Tutup
                                    </span>
                                    <select
                                      id="portalBizCloseHoursInput"
                                      aria-label="Waktu Tutup"
                                      disabled={parsedHours.is24h}
                                      value={parsedHours.is24h ? '24H' : parsedHours.close}
                                      onChange={(e) => {
                                        setBizOperatingHours(
                                          `${parsedHours.open} - ${e.target.value} WIB`
                                        );
                                      }}
                                      className={`w-full rounded-lg px-2.5 py-2 text-xs sm:text-sm font-mono font-medium border transition ${
                                        parsedHours.is24h
                                          ? 'bg-canvas text-ink-muted border-black/10 cursor-not-allowed'
                                          : 'bg-white text-ink border-black/15 focus:outline-none focus:border-[#FF6B1A]'
                                      }`}
                                    >
                                      {parsedHours.is24h ? (
                                        <option value="24H">24 Jam</option>
                                      ) : (
                                        <>
                                          {!TIME_SLOTS.includes(parsedHours.close) && (
                                            <option value={parsedHours.close}>
                                              {parsedHours.close}
                                            </option>
                                          )}
                                          {TIME_SLOTS.map((slot) => (
                                            <option key={`close-${slot}`} value={slot}>
                                              {slot}
                                            </option>
                                          ))}
                                        </>
                                      )}
                                    </select>
                                  </div>

                                  <div className="col-span-2 sm:col-span-4">
                                    <span className="block text-[11px] font-medium text-ink-muted mb-1">
                                      Tahun Berdiri
                                    </span>
                                    <input
                                      id="portalBizYearInput"
                                      type="text"
                                      maxLength={4}
                                      value={bizEstablishedYear}
                                      onChange={(e) => setBizEstablishedYear(e.target.value)}
                                      placeholder="2022"
                                      className="w-full rounded-lg bg-white px-3 py-2 text-xs sm:text-sm font-mono text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Medsos BisnisMu (Instagram, TikTok, Facebook, Lainnya) */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start">
                            <label
                              htmlFor="portalBizIgInput"
                              className="sm:col-span-4 sm:text-right sm:pt-7 text-xs sm:text-[13px] font-medium text-ink-muted"
                            >
                              Medsos BisnisMu
                            </label>
                            <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <span className="block text-[11px] font-medium text-ink-muted mb-1">
                                  Instagram
                                </span>
                                <input
                                  id="portalBizIgInput"
                                  type="text"
                                  value={bizInstagram}
                                  onChange={(e) => setBizInstagram(e.target.value)}
                                  placeholder="@instagramusaha"
                                  className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                                />
                              </div>
                              <div>
                                <span className="block text-[11px] font-medium text-ink-muted mb-1">
                                  TikTok
                                </span>
                                <input
                                  id="portalBizTiktokInput"
                                  type="text"
                                  value={bizTiktok}
                                  onChange={(e) => setBizTiktok(e.target.value)}
                                  placeholder="@tiktokusaha"
                                  className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                                />
                              </div>
                              <div>
                                <span className="block text-[11px] font-medium text-ink-muted mb-1">
                                  Facebook
                                </span>
                                <input
                                  id="portalBizFacebookInput"
                                  type="text"
                                  value={bizFacebook}
                                  onChange={(e) => setBizFacebook(e.target.value)}
                                  placeholder="fb.com/namausaha"
                                  className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                                />
                              </div>
                              <div>
                                <span className="block text-[11px] font-medium text-ink-muted mb-1">
                                  YouTube / Lainnya
                                </span>
                                <input
                                  id="portalBizOtherSocialInput"
                                  type="text"
                                  value={bizOtherSocial}
                                  onChange={(e) => setBizOtherSocial(e.target.value)}
                                  placeholder="@kanal / tautan medsos lain"
                                  className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Penanggung Jawab (PIC) & Nomor NIB */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start sm:items-end">
                            <label
                              htmlFor="portalBizPicInput"
                              className="sm:col-span-4 sm:text-right sm:pb-2 text-xs sm:text-[13px] font-medium text-ink-muted"
                            >
                              PIC &amp; Nomor NIB
                            </label>
                            <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div>
                                <span className="block text-[11px] font-medium text-ink-muted mb-1">
                                  Penanggung Jawab
                                </span>
                                <input
                                  id="portalBizPicInput"
                                  type="text"
                                  value={bizPicName}
                                  onChange={(e) => setBizPicName(e.target.value)}
                                  required
                                  placeholder="Nama Penanggung Jawab"
                                  className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                                />
                              </div>
                              <div>
                                <span className="block text-[11px] font-medium text-ink-muted mb-1">
                                  Nomor NIB (Opsional)
                                </span>
                                <input
                                  id="portalBizNibInput"
                                  type="text"
                                  value={bizNib}
                                  onChange={(e) => setBizNib(e.target.value)}
                                  placeholder="Kosongkan jika belum ada"
                                  className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm font-mono text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Tentang Bisnis */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 items-start">
                            <label
                              htmlFor="portalBizDescInput"
                              className="sm:col-span-4 sm:text-right sm:pt-2 text-xs sm:text-[13px] font-medium text-ink-muted"
                            >
                              Tentang Bisnis
                            </label>
                            <div className="sm:col-span-8">
                              <textarea
                                id="portalBizDescInput"
                                rows={2}
                                value={bizDescription}
                                onChange={(e) => setBizDescription(e.target.value)}
                                required
                                placeholder="Ceritakan konsep tempat, produk unggulan, dan keunikan usaha Anda..."
                                className="w-full rounded-lg bg-white px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A] transition resize-none"
                              />
                            </div>
                          </div>

                          {/* Submit Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-5 pt-2">
                            <div className="sm:col-start-5 sm:col-span-8 flex flex-wrap items-center gap-3">
                              <button
                                type="submit"
                                className="rounded-lg bg-[#FF6B1A] px-7 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-[#EA580C] transition cursor-pointer"
                              >
                                Simpan Profil Bisnis
                              </button>
                              {hasUnsavedBizChanges && (
                                <button
                                  type="button"
                                  onClick={handleResetBizProfile}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-4 py-2.5 text-xs font-semibold text-ink border border-black/12 hover:border-ink transition cursor-pointer"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  <span>Batalkan</span>
                                </button>
                              )}
                              {!hasUnsavedBizChanges && bizJustSaved && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Tersimpan</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Circular Logo Upload + Business Summary */}
                        <div className="lg:col-span-4 lg:border-l lg:border-black/8 lg:pl-8 flex flex-col items-center text-center pt-2 lg:pt-4 order-1 lg:order-2">
                          {bizLogoUrl ? (
                            <img
                              src={bizLogoUrl}
                              alt={bizName || businessAccount.businessName}
                              className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border border-black/10 bg-canvas"
                            />
                          ) : (
                            <div
                              className="h-24 w-24 sm:h-28 sm:w-28 rounded-full flex items-center justify-center text-3xl font-extrabold text-white select-none transition-colors border border-black/10"
                              style={{ backgroundColor: bizLogoBg }}
                            >
                              {(bizName || businessAccount.businessName || 'B')
                                .trim()
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="mt-3.5 max-w-full">
                            <div className="flex items-center justify-center gap-1 max-w-full">
                              <p className="text-sm font-extrabold text-ink truncate">
                                {bizName.trim() || businessAccount.businessName}
                              </p>
                              {activePlanSpec.hasBlueBadge && (
                                <BadgeCheck
                                  className="h-4 w-4 shrink-0 fill-[#1D9BF0] text-white"
                                  aria-label="Mitra Terverifikasi"
                                />
                              )}
                            </div>
                            <p className="mt-0.5 text-xs font-medium text-ink-muted truncate">
                              {maskEmail(bizEmail)}
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-ink-light truncate">
                              {bizOutletType} · {bizCity}
                            </p>
                          </div>

                          <input
                            ref={bizFileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={handleBizLogoUpload}
                            className="hidden"
                          />

                          <div className="mt-4 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => bizFileInputRef.current?.click()}
                              className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-ink border border-black/15 hover:border-ink transition cursor-pointer"
                            >
                              Pilih Logo
                            </button>
                            {bizLogoUrl && (
                              <button
                                type="button"
                                onClick={() => setBizLogoUrl('')}
                                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                              >
                                Hapus
                              </button>
                            )}
                          </div>

                          <div className="mt-3 text-[11px] leading-relaxed text-ink-light">
                            <p>Ukuran gambar: maks. 2 MB</p>
                            <p>Format gambar: .JPEG, .PNG, .WEBP</p>
                          </div>

                          {!bizLogoUrl && (
                            <div
                              className="mt-4 flex items-center justify-center gap-1.5"
                              aria-label="Pilih warna latar logo"
                            >
                              {AVATAR_COLORS.map((swatch) => {
                                const selected = bizLogoBg === swatch.hex;
                                return (
                                  <button
                                    key={swatch.hex}
                                    type="button"
                                    title={swatch.label}
                                    onClick={() => setBizLogoBg(swatch.hex)}
                                    className={`h-5 w-5 rounded-full transition cursor-pointer ${
                                      selected
                                        ? 'ring-2 ring-offset-2 ring-[#141312] scale-105'
                                        : 'hover:scale-105 opacity-85 hover:opacity-100'
                                    }`}
                                    style={{ backgroundColor: swatch.hex }}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      </div>
                    </form>

                    {/* ========================================================
                        2. PANTAU PERFORMA PROMO & RINGKASAN USAHA
                       ======================================================== */}
                    <div className="rounded-2xl bg-white p-5 sm:p-6 border border-black/8 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 className="text-sm sm:text-base font-extrabold text-[#141312]">
                            Pantau Performa Promo &amp; Kuota
                          </h2>
                          <p className="text-xs text-ink-muted mt-0.5">
                            Ringkasan kondisi promo usaha Anda secara langsung.
                          </p>
                        </div>
                        <span className="text-xs font-medium text-ink-muted">
                          {bizOffers.filter((o) => o.quota <= 5).length > 0
                            ? `${bizOffers.filter((o) => o.quota <= 5).length} promo kuota menipis`
                            : 'Semua kuota promo dalam kondisi aman'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 pt-4 border-t border-black/8 divide-y sm:divide-y-0 sm:divide-x divide-black/8">
                        <div className="py-2 sm:pr-4">
                          <p className="text-[11px] font-semibold text-ink-muted">Total Promo</p>
                          <p className="text-lg font-mono font-extrabold text-[#141312] tabular-nums mt-0.5">
                            {bizOffers.length}
                          </p>
                        </div>
                        <div className="py-2 sm:px-4">
                          <p className="text-[11px] font-semibold text-ink-muted">Promo Aktif</p>
                          <p className="text-lg font-mono font-extrabold text-emerald-700 tabular-nums mt-0.5">
                            {bizOffers.filter((o) => o.active).length}
                            <span className="text-[11px] font-sans font-medium text-ink-light ml-1.5">
                              ({bizOffers.filter((o) => !o.active).length} dijeda)
                            </span>
                          </p>
                        </div>
                        <div className="py-2 sm:px-4">
                          <p className="text-[11px] font-semibold text-ink-muted">
                            Sisa Kuota Aktif
                          </p>
                          <p className="text-lg font-mono font-extrabold text-[#141312] tabular-nums mt-0.5">
                            {bizOffers.reduce(
                              (sum, item) => sum + (item.active ? item.quota : 0),
                              0
                            )}
                          </p>
                        </div>
                        <div className="py-2 sm:pl-4">
                          <p className="text-[11px] font-semibold text-ink-muted">
                            Total Penukaran
                          </p>
                          <p className="text-lg font-mono font-extrabold text-[#FF6B1A] tabular-nums mt-0.5">
                            {Math.max(
                              bizRedemptions.length,
                              bizOffers.reduce((sum, item) => sum + (item.redeemedCount || 0), 0)
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ========================================================
                        3. KELOLA, TAMBAH & PANTAU DAFTAR PROMO LENGKAP
                       ======================================================== */}
                    <div className="rounded-2xl bg-white p-5 sm:p-6 border border-black/8 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <h2 className="text-sm sm:text-base font-extrabold text-[#141312]">
                              Kelola &amp; Tambah Promo Usaha
                            </h2>
                            <span
                              className={`font-mono tabular-nums text-[11px] font-bold ${
                                isPromoLimitReached ? 'text-rose-600' : 'text-ink-muted'
                              }`}
                            >
                              {activePlanSpec.maxPromos !== null
                                ? `${bizOffers.length} / ${activePlanSpec.maxPromos} slot (${activePlanSpec.name})`
                                : `${bizOffers.length} promo · Unlimited (${activePlanSpec.name})`}
                            </span>
                          </div>
                          <p className="text-xs text-ink-muted mt-0.5">
                            Buat promo baru, ubah harga atau kuota, jeda penawaran, dan pantau
                            penggunaannya.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (showAddOfferForm) {
                              if (isPublishingOffer) return;
                              handleResetOfferForm();
                              setShowAddOfferForm(false);
                            } else if (isPromoLimitReached) {
                              window.PromoMuBridge?.showToast(
                                `Batas ${activePlanSpec.maxPromos} promo pada paket ${activePlanSpec.name} telah tercapai. Upgrade paket untuk menambah promo.`
                              );
                              navigateTab('subscription');
                            } else {
                              handleResetOfferForm();
                              setShowAddOfferForm(true);
                            }
                          }}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition whitespace-nowrap shrink-0 cursor-pointer ${
                            isPromoLimitReached && !showAddOfferForm
                              ? 'bg-[#FF6B1A] hover:bg-accent-600'
                              : 'bg-[#181716] hover:bg-[#FF6B1A]'
                          }`}
                        >
                          {isPromoLimitReached && !showAddOfferForm ? (
                            <>
                              <Crown className="h-3.5 w-3.5" />
                              <span>Upgrade Batas Promo</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-3.5 w-3.5" />
                              <span>
                                {showAddOfferForm ? 'Tutup Form Promo' : 'Tambah Promo Baru'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>

                      {isPromoLimitReached && !showAddOfferForm && (
                        <div className="rounded-xl bg-amber-50/80 border border-amber-200/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="min-w-0 text-amber-950">
                            <p className="font-bold">
                              Kuota upload promo paket {activePlanSpec.name} penuh (
                              <span className="font-mono tabular-nums">
                                {bizOffers.length}/{activePlanSpec.maxPromos}
                              </span>
                              ).
                            </p>
                            <p className="text-amber-900/80 mt-0.5">
                              Upgrade ke Bisnis Pro (maks. 25 promo + Centang Biru) atau Bisnis
                              Eksklusif (tanpa batas promo).
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigateTab('subscription')}
                            className="rounded-lg bg-[#181716] px-3.5 py-2 text-[11px] font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap cursor-pointer"
                          >
                            Lihat Paket Langganan
                          </button>
                        </div>
                      )}

                      {showAddOfferForm && (
                        <form
                          onSubmit={handleSaveBusinessOffer}
                          className="py-5 border-y border-black/8 space-y-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-extrabold text-[#141312]">
                              {editingOfferId ? 'Edit Promo Usaha' : 'Buat Promo Usaha Baru'}
                            </h3>
                            {newOfferNormalPrice &&
                              newOfferPrice &&
                              Number(newOfferNormalPrice) > Number(newOfferPrice) &&
                              Number(newOfferPrice) > 0 && (
                                <span className="font-mono text-xs font-bold text-[#FF6B1A] tabular-nums">
                                  Hemat{' '}
                                  {Math.round(
                                    ((Number(newOfferNormalPrice) - Number(newOfferPrice)) /
                                      Number(newOfferNormalPrice)) *
                                      100
                                  )}
                                  % · Potongan{' '}
                                  {formatRp(Number(newOfferNormalPrice) - Number(newOfferPrice))}
                                </span>
                              )}
                          </div>

                          {newOfferError && (
                            <p className="text-xs font-semibold text-rose-600">{newOfferError}</p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            <div className="sm:col-span-2 lg:col-span-2">
                              <label
                                htmlFor="newOfferTitleInput"
                                className="block text-[11px] font-semibold text-ink-muted mb-1"
                              >
                                Nama Menu / Judul Promo <span className="text-rose-600">*</span>
                              </label>
                              <input
                                id="newOfferTitleInput"
                                type="text"
                                value={newOfferTitle}
                                onChange={(e) => setNewOfferTitle(e.target.value)}
                                placeholder="Contoh: Paket Ngopi Sore (Kopi Susu + Croissant)"
                                className="w-full rounded-xl bg-canvas px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="newOfferTypeSelect"
                                className="block text-[11px] font-semibold text-ink-muted mb-1"
                              >
                                Jenis Promo
                              </label>
                              <select
                                id="newOfferTypeSelect"
                                value={newOfferType}
                                onChange={(e) => setNewOfferType(e.target.value)}
                                className="w-full rounded-xl bg-canvas px-3.5 py-2 text-xs sm:text-sm font-semibold text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                              >
                                {PROMO_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor="newOfferNormalInput"
                                className="block text-[11px] font-semibold text-ink-muted mb-1"
                              >
                                Harga Normal (Rp) <span className="text-rose-600">*</span>
                              </label>
                              <input
                                id="newOfferNormalInput"
                                type="number"
                                min={1000}
                                value={newOfferNormalPrice}
                                onChange={(e) => setNewOfferNormalPrice(e.target.value)}
                                placeholder="35000"
                                className="w-full rounded-xl bg-canvas px-3.5 py-2 text-xs sm:text-sm font-mono text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="newOfferPriceInput"
                                className="block text-[11px] font-semibold text-ink-muted mb-1"
                              >
                                Harga Promo (Rp) <span className="text-rose-600">*</span>
                              </label>
                              <input
                                id="newOfferPriceInput"
                                type="number"
                                min={1000}
                                value={newOfferPrice}
                                onChange={(e) => setNewOfferPrice(e.target.value)}
                                placeholder="22000"
                                className="w-full rounded-xl bg-canvas px-3.5 py-2 text-xs sm:text-sm font-mono text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor="newOfferValidInput"
                                className="block text-[11px] font-semibold text-ink-muted mb-1"
                              >
                                Berlaku Sampai (Opsional)
                              </label>
                              <input
                                id="newOfferValidInput"
                                type="date"
                                value={newOfferValidUntil}
                                onChange={(e) => setNewOfferValidUntil(e.target.value)}
                                className="w-full rounded-xl bg-canvas px-3.5 py-2 text-xs sm:text-sm font-mono text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label
                                htmlFor="newOfferCodeInput"
                                className="block text-[11px] font-semibold text-ink-muted mb-1"
                              >
                                Kode Voucher (Kosongkan untuk otomatis)
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  id="newOfferCodeInput"
                                  type="text"
                                  value={newOfferCode}
                                  onChange={(e) => setNewOfferCode(e.target.value.toUpperCase())}
                                  placeholder="SENJA22"
                                  className="flex-1 rounded-xl bg-canvas px-3.5 py-2 text-xs font-mono font-bold text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                                />
                                <button
                                  type="button"
                                  onClick={handleGenerateOfferCode}
                                  className="rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap cursor-pointer"
                                >
                                  Buat Kode
                                </button>
                              </div>
                            </div>

                            <div>
                              <label
                                htmlFor="newOfferQuotaInput"
                                className="block text-[11px] font-semibold text-ink-muted mb-1"
                              >
                                Kuota Voucher
                              </label>
                              <input
                                id="newOfferQuotaInput"
                                type="number"
                                min={1}
                                value={newOfferQuota}
                                onChange={(e) => setNewOfferQuota(e.target.value)}
                                className="w-full rounded-xl bg-canvas px-3.5 py-2 text-xs font-mono text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                              />
                            </div>

                            <div className="sm:col-span-2 lg:col-span-3">
                              <label
                                htmlFor="newOfferDescInput"
                                className="block text-[11px] font-semibold text-ink-muted mb-1"
                              >
                                Deskripsi &amp; Syarat Promo (Opsional)
                              </label>
                              <textarea
                                id="newOfferDescInput"
                                rows={2}
                                value={newOfferDesc}
                                onChange={(e) => setNewOfferDesc(e.target.value)}
                                placeholder="Contoh: Berlaku dine-in & takeaway setiap hari pukul 14.00 - 18.00 WIB."
                                className="w-full rounded-xl bg-canvas px-3.5 py-2 text-xs sm:text-sm text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A] resize-none"
                              />
                            </div>

                            {/* Foto Produk untuk Dashboard Utama */}
                            <div className="sm:col-span-2 lg:col-span-3">
                              <span className="block text-[11px] font-semibold text-ink-muted mb-1.5">
                                Foto Produk (Ditampilkan di Dashboard Utama PromoMu)
                              </span>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl bg-canvas p-3.5 border border-black/10">
                                <div className="h-24 w-full sm:w-36 shrink-0 rounded-xl bg-white border border-black/8 overflow-hidden flex items-center justify-center">
                                  {newOfferImageUrl ? (
                                    <img
                                      src={newOfferImageUrl}
                                      alt={newOfferTitle || 'Preview foto produk'}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center justify-center gap-1 text-ink-light px-2 text-center">
                                      <Camera className="h-5 w-5" />
                                      <span className="text-[10px] font-medium">
                                        Belum ada foto
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <input
                                  ref={newOfferImageInputRef}
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  onChange={handleOfferImageUpload}
                                  className="hidden"
                                />

                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => newOfferImageInputRef.current?.click()}
                                      className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-[#141312] border border-black/15 hover:border-[#141312] transition whitespace-nowrap cursor-pointer"
                                    >
                                      <Camera className="h-3.5 w-3.5" />
                                      <span>
                                        {newOfferImageUrl
                                          ? 'Ganti Foto Produk'
                                          : 'Upload Foto Produk'}
                                      </span>
                                    </button>
                                    {newOfferImageUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setNewOfferImageUrl('')}
                                        className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-50 transition whitespace-nowrap cursor-pointer"
                                      >
                                        Hapus Foto
                                      </button>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-ink-muted leading-relaxed">
                                    Saat promo berstatus aktif, foto produk ini akan langsung muncul
                                    di katalog promo <strong>Dashboard Utama</strong>. Format
                                    JPEG, PNG, atau WEBP (maks. 3 MB).
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {isPublishingOffer && (
                            <div
                              role="status"
                              aria-live="polite"
                              className="rounded-xl bg-[#FFF7F1] border border-[#FF6B1A]/25 px-4 py-3 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <span className="inline-flex items-center gap-2 font-bold text-[#141312] min-w-0">
                                  <Loader2 className="h-4 w-4 shrink-0 text-[#FF6B1A] animate-spin" />
                                  <span className="truncate">
                                    {publishStageLabel || 'Mengunggah data promo ke database...'}
                                  </span>
                                </span>
                                <span className="font-mono tabular-nums text-[11px] font-extrabold text-[#FF6B1A] shrink-0">
                                  {publishProgress}%
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-black/8 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#FF6B1A] transition-all duration-300 ease-out"
                                  style={{ width: `${publishProgress}%` }}
                                />
                              </div>
                              <p className="text-[11px] text-ink-muted">
                                Mohon tunggu sebentar, jangan tutup halaman saat data sedang
                                dikirim ke database.
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <label className="inline-flex items-center gap-2 text-xs font-medium text-ink cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newOfferActive}
                                disabled={isPublishingOffer}
                                onChange={(e) => setNewOfferActive(e.target.checked)}
                                className="h-4 w-4 accent-[#FF6B1A] cursor-pointer disabled:opacity-50"
                              />
                              <span>Langsung aktifkan promo setelah disimpan</span>
                            </label>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isPublishingOffer}
                                onClick={() => {
                                  if (isPublishingOffer) return;
                                  handleResetOfferForm();
                                  setShowAddOfferForm(false);
                                }}
                                className="rounded-xl bg-canvas px-4 py-2 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Batalkan
                              </button>
                              <button
                                type="submit"
                                disabled={isPublishingOffer}
                                aria-busy={isPublishingOffer}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B1A] px-5 py-2 text-xs font-bold text-white hover:bg-accent-600 transition whitespace-nowrap cursor-pointer disabled:opacity-80 disabled:cursor-wait"
                              >
                                {isPublishingOffer ? (
                                  <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                    <span>Mengunggah ke Database...</span>
                                  </>
                                ) : (
                                  <span>
                                    {editingOfferId
                                      ? 'Simpan Perubahan Promo'
                                      : 'Publikasikan Promo'}
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        </form>
                      )}

                      {/* Filter, Sort & Search Controls */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 py-3 border-y border-black/8">
                        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-canvas rounded-xl border border-black/8 self-start">
                          {(
                            [
                              { id: 'all', label: `Semua (${bizOffers.length})` },
                              {
                                id: 'active',
                                label: `Aktif (${bizOffers.filter((o) => o.active).length})`,
                              },
                              {
                                id: 'paused',
                                label: `Dijeda (${bizOffers.filter((o) => !o.active).length})`,
                              },
                              {
                                id: 'low',
                                label: `Menipis (${bizOffers.filter((o) => o.quota <= 5).length})`,
                              },
                            ] as const
                          ).map((tab) => (
                            <button
                              key={tab.id}
                              type="button"
                              onClick={() => setOfferFilter(tab.id)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                                offerFilter === tab.id
                                  ? 'bg-[#181716] text-white'
                                  : 'text-ink-muted hover:text-ink'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="relative">
                            <Search className="h-3.5 w-3.5 text-ink-light absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={offerSearch}
                              onChange={(e) => setOfferSearch(e.target.value)}
                              placeholder="Cari promo atau kode..."
                              className="w-full sm:w-48 rounded-xl bg-canvas pl-8 pr-3 py-2 text-xs text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                            />
                          </div>

                          <select
                            aria-label="Urutkan promo"
                            value={offerSort}
                            onChange={(e) =>
                              setOfferSort(e.target.value as 'newest' | 'redeemed' | 'quota')
                            }
                            className="rounded-xl bg-canvas px-3 py-2 text-xs font-semibold text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                          >
                            <option value="newest">Terbaru</option>
                            <option value="redeemed">Penukaran Terbanyak</option>
                            <option value="quota">Kuota Paling Sedikit</option>
                          </select>
                        </div>
                      </div>

                      {/* Promo List / Monitor Rows */}
                      {filteredBizOffers.length === 0 ? (
                        <div className="py-10 text-center space-y-2">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-ink-muted border border-black/8">
                            <Tag className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-extrabold text-[#141312]">
                            {bizOffers.length === 0
                              ? 'Belum ada promo usaha yang dibuat'
                              : 'Tidak ada promo yang cocok dengan filter'}
                          </p>
                          <p className="text-xs text-ink-muted max-w-md mx-auto">
                            {bizOffers.length === 0
                              ? `Tambahkan promo pertama untuk ${businessAccount.businessName} agar pelanggan bisa mengklaim dan menukarkannya di outlet Anda.`
                              : 'Coba ubah kata kunci pencarian atau pilih filter status promo lainnya.'}
                          </p>
                          {bizOffers.length === 0 && !showAddOfferForm ? (
                            <button
                              type="button"
                              onClick={() => {
                                handleResetOfferForm();
                                setShowAddOfferForm(true);
                              }}
                              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[#181716] px-4 py-2 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Tambah Promo Pertama</span>
                            </button>
                          ) : (
                            bizOffers.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOfferFilter('all');
                                  setOfferSearch('');
                                }}
                                className="mt-2 rounded-xl bg-canvas px-4 py-2 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap cursor-pointer"
                              >
                                Tampilkan Semua Promo
                              </button>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="divide-y divide-black/6">
                          {filteredBizOffers.map((offer) => {
                            const discountPct =
                              offer.normalPrice > 0
                                ? Math.round(
                                    ((offer.normalPrice - offer.offerPrice) / offer.normalPrice) *
                                      100
                                  )
                                : 0;
                            const redeemed = offer.redeemedCount || 0;
                            const totalStock = Math.max(1, offer.quota + redeemed);
                            const usedRatio = Math.min(100, Math.round((redeemed / totalStock) * 100));

                            return (
                              <div
                                key={offer.id}
                                className="py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                              >
                                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                  {offer.imageUrl && (
                                    <img
                                      src={offer.imageUrl}
                                      alt={offer.title}
                                      className="h-16 w-20 sm:h-16 sm:w-24 shrink-0 rounded-xl object-cover border border-black/10 bg-canvas"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                                      <p className="text-sm font-bold text-[#141312]">
                                        {offer.title}
                                      </p>
                                      <span
                                        className={`text-[11px] font-bold ${
                                          !offer.active
                                            ? 'text-amber-700'
                                            : offer.quota === 0
                                            ? 'text-rose-600'
                                            : 'text-emerald-700'
                                        }`}
                                      >
                                        {!offer.active
                                          ? 'Dijeda'
                                          : offer.quota === 0
                                          ? 'Kuota Habis'
                                          : 'Aktif · Tampil di Dashboard Utama'}
                                      </span>
                                    </div>

                                  {offer.description && (
                                    <p className="text-xs text-ink-muted leading-relaxed">
                                      {offer.description}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                                    <span>{offer.promoType || 'Diskon Menu'}</span>
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono font-bold text-[#141312]">
                                      {offer.code}
                                    </span>
                                    {offer.validUntil && (
                                      <>
                                        <span aria-hidden="true">·</span>
                                        <span>s/d {formatBirthDate(offer.validUntil)}</span>
                                      </>
                                    )}
                                    <span aria-hidden="true">·</span>
                                    <span className="font-mono tabular-nums text-ink-light line-through">
                                      {formatRp(offer.normalPrice)}
                                    </span>
                                    <span className="font-mono tabular-nums font-extrabold text-[#FF6B1A]">
                                      {formatRp(offer.offerPrice)}
                                    </span>
                                    {discountPct > 0 && (
                                      <span className="font-mono tabular-nums text-[11px] font-bold text-emerald-700">
                                        (-{discountPct}%)
                                      </span>
                                    )}
                                  </div>

                                  <div className="pt-1 flex flex-wrap items-center gap-3 max-w-md">
                                    <div className="flex-1 min-w-[140px] h-1.5 rounded-full bg-canvas overflow-hidden border border-black/5">
                                      <div
                                        className="h-full bg-[#FF6B1A] transition-all"
                                        style={{ width: `${usedRatio}%` }}
                                      />
                                    </div>
                                    <span className="font-mono tabular-nums text-[11px] text-ink-muted">
                                      Terpakai <strong className="text-ink">{redeemed}</strong> ·
                                      Sisa <strong className="text-ink">{offer.quota}</strong>
                                    </span>
                                  </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleEditBusinessOffer(offer)}
                                    className="inline-flex items-center gap-1 rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap cursor-pointer"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustOfferQuota(offer.id, 10)}
                                    className="rounded-xl bg-canvas px-3 py-2 text-xs font-mono font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap cursor-pointer"
                                  >
                                    +10 Kuota
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setBizOffers((prev) =>
                                        prev.map((item) =>
                                          item.id === offer.id
                                            ? { ...item, active: !item.active }
                                            : item
                                        )
                                      )
                                    }
                                    className="rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap cursor-pointer"
                                  >
                                    {offer.active ? 'Jeda' : 'Aktifkan'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCode(offer.code)}
                                    className="inline-flex items-center gap-1 rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap cursor-pointer"
                                  >
                                    <Copy className="h-3 w-3" />
                                    <span>{copiedCode === offer.code ? 'Disalin' : 'Salin'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Hapus promo"
                                    onClick={() =>
                                      setBizOffers((prev) =>
                                        prev.filter((item) => item.id !== offer.id)
                                      )
                                    }
                                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* ========================================================
                        4. VERIFIKASI KODE PELANGGAN & RIWAYAT PENUKARAN
                       ======================================================== */}
                    <div className="rounded-2xl bg-white p-5 sm:p-6 border border-black/8 space-y-5">
                      <div className="pb-4 border-b border-black/8">
                        <h2 className="text-sm sm:text-base font-extrabold text-[#141312]">
                          Verifikasi Kode Pelanggan di Kasir
                        </h2>
                        <p className="text-xs text-ink-muted mt-0.5">
                          Masukkan kode voucher dari promo usaha Anda maupun katalog PromoMu untuk
                          mencatat penukaran dan mengurangi kuota otomatis.
                        </p>
                      </div>

                      <form
                        onSubmit={handleVerifyCustomerCode}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                      >
                        <input
                          type="text"
                          value={verifyCodeInput}
                          onChange={(e) => setVerifyCodeInput(e.target.value.toUpperCase())}
                          placeholder="Contoh: SENJA22 atau PROMO-KOPI"
                          aria-label="Kode voucher pelanggan"
                          className="flex-1 rounded-xl bg-canvas px-4 py-2.5 text-xs sm:text-sm font-mono font-bold text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#181716] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Verifikasi Kode</span>
                        </button>
                      </form>

                      {verifyFeedback && (
                        <div
                          className={`rounded-xl px-4 py-3 border text-xs font-semibold ${
                            verifyFeedback.type === 'success'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {verifyFeedback.message}
                        </div>
                      )}

                      <div className="pt-1 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-xs font-extrabold text-[#141312]">
                            Riwayat Verifikasi Terakhir ({bizRedemptions.length})
                          </h3>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={handleExportRedemptionsCsv}
                              className={`inline-flex items-center gap-1.5 text-[11px] font-bold transition cursor-pointer ${
                                activePlanSpec.canExportCsv
                                  ? 'text-[#141312] hover:text-[#FF6B1A]'
                                  : 'text-ink-muted hover:text-[#FF6B1A]'
                              }`}
                            >
                              {activePlanSpec.canExportCsv ? (
                                <Download className="h-3.5 w-3.5" />
                              ) : (
                                <Lock className="h-3.5 w-3.5" />
                              )}
                              <span>
                                {activePlanSpec.canExportCsv
                                  ? 'Ekspor Laporan CSV'
                                  : 'Ekspor CSV (Pro/Eksklusif)'}
                              </span>
                            </button>
                            {bizRedemptions.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setBizRedemptions([])}
                                className="text-[11px] font-bold text-ink-muted hover:text-rose-600 transition cursor-pointer"
                              >
                                Bersihkan Riwayat
                              </button>
                            )}
                          </div>
                        </div>

                        {bizRedemptions.length === 0 ? (
                          <p className="text-xs text-ink-muted py-4 border-t border-black/6">
                            Belum ada kode yang diverifikasi pada sesi ini.
                          </p>
                        ) : (
                          <div className="divide-y divide-black/6 border-t border-black/8">
                            {bizRedemptions.map((entry) => (
                              <div
                                key={entry.id}
                                className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                                  <span className="font-mono font-bold text-[#141312]">
                                    {entry.code}
                                  </span>
                                  <span className="text-ink-light" aria-hidden="true">
                                    ·
                                  </span>
                                  <span className="font-semibold text-ink truncate">
                                    {entry.title}
                                  </span>
                                </div>
                                <span className="font-mono tabular-nums text-[11px] text-ink-muted shrink-0">
                                  {entry.verifiedAt}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ============================================================
                TAB 5: PENGATURAN LANJUTAN & MENU PENGATURAN NOTIFIKASI
               ============================================================ */}
            {activeTab === 'settings' && (
              <section className="space-y-5">
                {/* Internal Sub-Menu Switcher inside Pengaturan Lanjutan */}
                <div
                  role="tablist"
                  aria-label="Menu Pengaturan Lanjutan"
                  className="rounded-2xl bg-white p-1.5 border border-black/8 grid grid-cols-1 sm:grid-cols-2 gap-1.5"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={settingsSubTab === 'advanced'}
                    onClick={() => setSettingsSubTab('advanced')}
                    className={`flex items-center justify-center sm:justify-start gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
                      settingsSubTab === 'advanced'
                        ? 'bg-[#181716] text-white'
                        : 'text-ink-muted hover:bg-canvas hover:text-ink'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>Akun, Logout &amp; Hapus Akun</span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={settingsSubTab === 'notifications'}
                    onClick={() => setSettingsSubTab('notifications')}
                    className={`flex items-center justify-between gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
                      settingsSubTab === 'notifications'
                        ? 'bg-[#181716] text-white'
                        : 'text-ink-muted hover:bg-canvas hover:text-ink'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Bell className="h-4 w-4 shrink-0" />
                      <span>Pengaturan Notifikasi</span>
                    </span>
                    <span
                      className={`font-mono text-[11px] font-semibold ${
                        settingsSubTab === 'notifications' ? 'text-white/80' : 'text-ink-light'
                      }`}
                    >
                      {[
                        preferences.notifyWeb,
                        preferences.notifyEmail,
                        preferences.notifySms,
                      ].filter(Boolean).length}
                      /3 aktif
                    </span>
                  </button>
                </div>

                {/* ------------------------------------------------------------
                    SUB-MENU 1: PENGATURAN LANJUTAN (LOGOUT & HAPUS AKUN)
                   ------------------------------------------------------------ */}
                {settingsSubTab === 'advanced' && (
                  <div className="space-y-5">
                    {/* Session & Logout Akun Card */}
                    <div className="rounded-2xl bg-white p-5 sm:p-6 border border-black/8 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/8">
                        <div>
                          <h2 className="text-sm font-extrabold text-[#141312]">
                            Sesi Masuk &amp; Logout Akun
                          </h2>
                          <p className="text-xs text-ink-muted mt-0.5">
                            Informasi metode autentikasi yang sedang aktif di perangkat ini.
                          </p>
                        </div>
                        <ProviderBadge provider={user.provider} />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-canvas px-4 py-3 border border-black/6">
                          <p className="text-[11px] font-semibold text-ink-muted">Email Terhubung</p>
                          <p className="font-bold text-ink mt-0.5 break-all">
                            {maskEmail(profileEmail || user.email)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-canvas px-4 py-3 border border-black/6">
                          <p className="text-[11px] font-semibold text-ink-muted">
                            Wilayah Promo Utama
                          </p>
                          <p className="font-bold text-ink mt-0.5">{profileCity || activeCity}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                        <div>
                          <p className="text-xs font-bold text-ink">Keluar dari Akun Ini</p>
                          <p className="text-[11px] text-ink-muted mt-0.5">
                            Data voucher dan profilmu tetap tersimpan. Kamu bisa masuk lagi kapan saja.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.PromoMuBridge?.signOutUser()}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#181716] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap shrink-0"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>Logout Akun</span>
                        </button>
                      </div>
                    </div>

                    {/* Zona Berbahaya: Hapus Akun Permanen */}
                    <div
                      className={`rounded-2xl bg-white p-5 sm:p-6 border space-y-4 ${
                        personalDeletionInfo ? 'border-amber-300' : 'border-rose-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                              personalDeletionInfo
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}
                          >
                            {personalDeletionInfo ? (
                              <Clock className="h-4 w-4" />
                            ) : (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                className={`text-sm font-extrabold ${
                                  personalDeletionInfo ? 'text-amber-800' : 'text-rose-700'
                                }`}
                              >
                                Hapus Akun Permanen
                              </h2>
                              {personalDeletionInfo && (
                                <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-900 tabular-nums">
                                  Sisa {personalDeletionInfo.remainingDays} hari
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                              Menghapus akun akan melalui masa tenggang{' '}
                              <strong className="text-ink">{DELETION_GRACE_DAYS} hari</strong>. Jika
                              sudah melebihi {DELETION_GRACE_DAYS} hari tanpa pembatalan, profil,
                              voucher ter-klaim, promo favorit, dan preferensi akan dihapus
                              permanen.
                            </p>
                          </div>
                        </div>

                        {!personalDeletionInfo && (
                          <button
                            type="button"
                            onClick={() => openDeleteConfirmation('personal')}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white transition whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Hapus Akun</span>
                          </button>
                        )}
                      </div>

                      {personalDeletionInfo && (
                        <div className="rounded-xl bg-amber-50/75 p-4 border border-amber-200 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-extrabold text-amber-900">
                              Akun Dijadwalkan untuk Dihapus ({DELETION_GRACE_DAYS} Hari)
                            </p>
                            <span className="font-mono text-[11px] font-bold text-amber-800 tabular-nums">
                              Batas: {personalDeletionInfo.purgeDateLabel}
                            </span>
                          </div>
                          <p className="text-xs text-amber-900/90 leading-relaxed">
                            Pengajuan dicatat pada{' '}
                            <strong>{personalDeletionInfo.scheduledDateLabel}</strong>. Akun Anda
                            akan <strong>dihapus permanen jika sudah melebihi 25 hari</strong>{' '}
                            (setelah <strong>{personalDeletionInfo.purgeDateLabel}</strong>) apabila
                            tidak ada pembatalan.
                            {user.deletionReason && (
                              <span className="block mt-1 text-[11px] text-amber-800">
                                Alasan tercatat: {user.deletionReason}
                              </span>
                            )}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleCancelScheduledDeletion('personal')}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#181716] px-4 py-2 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap cursor-pointer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Batalkan Penghapusan</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => window.PromoMuBridge?.signOutUser()}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap cursor-pointer"
                            >
                              <LogOut className="h-3.5 w-3.5" />
                              <span>Keluar Sekarang</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setImmediatePurgeTarget('personal')}
                              className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white transition whitespace-nowrap cursor-pointer"
                            >
                              Hapus Permanen Sekarang
                            </button>
                          </div>

                          {immediatePurgeTarget === 'personal' && (
                            <div className="mt-2 rounded-lg bg-white p-3 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <p className="text-[11px] font-semibold text-rose-800">
                                Lewati masa tenggang 25 hari dan hapus akun permanen detik ini juga?
                              </p>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setImmediatePurgeTarget(null)}
                                  className="rounded-lg bg-canvas px-3 py-1.5 text-[11px] font-bold text-ink border border-black/10 cursor-pointer"
                                >
                                  Tunda
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImmediatePurgeTarget(null);
                                    window.PromoMuBridge?.deleteUserAccount();
                                  }}
                                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                                >
                                  Ya, Hapus Sekarang
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Hapus Akun Bisnis */}
                    <div
                      className={`rounded-2xl bg-white p-5 sm:p-6 border space-y-4 ${
                        businessDeletionInfo
                          ? 'border-amber-300'
                          : businessAccount
                          ? 'border-rose-200'
                          : 'border-black/8'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                              businessDeletionInfo
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : businessAccount
                                ? 'bg-rose-50 text-rose-600 border-rose-200'
                                : 'bg-canvas text-ink-muted border-black/10'
                            }`}
                          >
                            {businessDeletionInfo ? (
                              <Clock className="h-4 w-4" />
                            ) : (
                              <Store className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                className={`text-sm font-extrabold ${
                                  businessDeletionInfo
                                    ? 'text-amber-800'
                                    : businessAccount
                                    ? 'text-rose-700'
                                    : 'text-[#141312]'
                                }`}
                              >
                                Hapus Akun Bisnis
                              </h2>
                              {businessDeletionInfo && (
                                <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-900 tabular-nums">
                                  Sisa {businessDeletionInfo.remainingDays} hari
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                              {businessAccount ? (
                                <>
                                  Penghapusan profil bisnis{' '}
                                  <strong className="text-ink">
                                    {businessAccount.businessName}
                                  </strong>{' '}
                                  menggunakan masa tenggang{' '}
                                  <strong className="text-ink">{DELETION_GRACE_DAYS} hari</strong>{' '}
                                  dan dihapus permanen jika sudah melebihi {DELETION_GRACE_DAYS}{' '}
                                  hari. Akun pribadi dan voucher milikmu tetap aman.
                                </>
                              ) : (
                                'Belum ada akun bisnis yang terdaftar pada akun ini.'
                              )}
                            </p>
                          </div>
                        </div>

                        {businessAccount ? (
                          !businessDeletionInfo && (
                            <button
                              type="button"
                              onClick={() => openDeleteConfirmation('business')}
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white transition whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Hapus Akun Bisnis</span>
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigateTab('business')}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-canvas px-4 py-2 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Store className="h-3.5 w-3.5" />
                            <span>Daftar Bisnis</span>
                          </button>
                        )}
                      </div>

                      {businessAccount && businessDeletionInfo && (
                        <div className="rounded-xl bg-amber-50/75 p-4 border border-amber-200 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-extrabold text-amber-900">
                              Akun Bisnis Dijadwalkan Dihapus ({DELETION_GRACE_DAYS} Hari)
                            </p>
                            <span className="font-mono text-[11px] font-bold text-amber-800 tabular-nums">
                              Batas: {businessDeletionInfo.purgeDateLabel}
                            </span>
                          </div>
                          <p className="text-xs text-amber-900/90 leading-relaxed">
                            Permintaan hapus untuk <strong>{businessAccount.businessName}</strong>{' '}
                            dicatat pada <strong>{businessDeletionInfo.scheduledDateLabel}</strong>
                            . Profil bisnis beserta katalog promo akan{' '}
                            <strong>dihapus permanen jika sudah melebihi 25 hari</strong> (setelah{' '}
                            <strong>{businessDeletionInfo.purgeDateLabel}</strong>).
                            {businessAccount.deletionReason && (
                              <span className="block mt-1 text-[11px] text-amber-800">
                                Alasan tercatat: {businessAccount.deletionReason}
                              </span>
                            )}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleCancelScheduledDeletion('business')}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#181716] px-4 py-2 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap cursor-pointer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>Batalkan Penghapusan</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setImmediatePurgeTarget('business')}
                              className="rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-600 hover:text-white transition whitespace-nowrap cursor-pointer"
                            >
                              Hapus Bisnis Sekarang
                            </button>
                          </div>

                          {immediatePurgeTarget === 'business' && (
                            <div className="mt-2 rounded-lg bg-white p-3 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <p className="text-[11px] font-semibold text-rose-800">
                                Lewati masa tenggang 25 hari dan hapus profil bisnis sekarang juga?
                              </p>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setImmediatePurgeTarget(null)}
                                  className="rounded-lg bg-canvas px-3 py-1.5 text-[11px] font-bold text-ink border border-black/10 cursor-pointer"
                                >
                                  Tunda
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImmediatePurgeTarget(null);
                                    window.PromoMuBridge?.removeBusinessAccount();
                                  }}
                                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                                >
                                  Ya, Hapus Sekarang
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------
                    SUB-MENU 2: PENGATURAN NOTIFIKASI (WEB, EMAIL, SMS, PROMO)
                   ------------------------------------------------------------ */}
                {settingsSubTab === 'notifications' && (
                  <div className="space-y-5">
                    {/* Saluran Notifikasi (Web, Email, SMS) */}
                    <div className="rounded-2xl bg-white p-5 sm:p-6 border border-black/8">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/8">
                        <div>
                          <h2 className="text-sm font-extrabold text-[#141312]">
                            Saluran Notifikasi
                          </h2>
                          <p className="text-xs text-ink-muted mt-0.5">
                            Atur dari mana kamu ingin menerima info promo, voucher, dan keamanan
                            akun.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onUpdatePreferences({
                              ...preferences,
                              notifyWeb: true,
                              notifyEmail: true,
                              notifySms: false,
                              notifyWeeklyDigest: true,
                              notifyTanggalTua: true,
                              notifyB1G1: true,
                            });
                            window.PromoMuBridge?.showToast(
                              'Pengaturan notifikasi dikembalikan ke default'
                            );
                          }}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-canvas px-3.5 py-2 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reset Default</span>
                        </button>
                      </div>

                      <div className="divide-y divide-black/6">
                        {/* 1. Notifikasi Web */}
                        <div className="py-4 flex items-center justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-canvas text-ink border border-black/8">
                              <Globe className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-[#141312]">
                                Notifikasi Web (Browser)
                              </p>
                              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                                Tampilkan pemberitahuan langsung di web saat ada flash promo atau
                                voucher baru di {profileCity || activeCity}.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={preferences.notifyWeb}
                            aria-label="Aktifkan Notifikasi Web"
                            onClick={() => {
                              const next = !preferences.notifyWeb;
                              onUpdatePreferences({ ...preferences, notifyWeb: next });
                              window.PromoMuBridge?.showToast(
                                next
                                  ? 'Notifikasi Web diaktifkan'
                                  : 'Notifikasi Web dinonaktifkan'
                              );
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                              preferences.notifyWeb ? 'bg-[#FF6B1A]' : 'bg-black/15'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                                preferences.notifyWeb ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* 2. Notifikasi Email */}
                        <div className="py-4 flex items-center justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-canvas text-ink border border-black/8">
                              <Mail className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-[#141312]">
                                Notifikasi Email
                              </p>
                              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                                Kirim tanda terima klaim voucher, pengingat masa berlaku, dan
                                keamanan ke{' '}
                                <span className="font-semibold text-ink">
                                  {maskEmail(profileEmail || user.email)}
                                </span>
                                .
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={preferences.notifyEmail}
                            aria-label="Aktifkan Notifikasi Email"
                            onClick={() => {
                              const next = !preferences.notifyEmail;
                              onUpdatePreferences({ ...preferences, notifyEmail: next });
                              window.PromoMuBridge?.showToast(
                                next
                                  ? 'Notifikasi Email diaktifkan'
                                  : 'Notifikasi Email dinonaktifkan'
                              );
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                              preferences.notifyEmail ? 'bg-[#FF6B1A]' : 'bg-black/15'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                                preferences.notifyEmail ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* 3. Notifikasi SMS */}
                        <div className="pt-4 flex items-center justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-canvas text-ink border border-black/8">
                              <MessageSquare className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs sm:text-sm font-bold text-[#141312]">
                                  Notifikasi SMS
                                </p>
                                {!profilePhone.trim() && (
                                  <button
                                    type="button"
                                    onClick={() => navigateTab('overview')}
                                    className="text-[11px] font-bold text-[#2563EB] hover:underline"
                                  >
                                    Tambah Nomor
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                                {profilePhone.trim() ? (
                                  <>
                                    Kirim kode verifikasi singkat dan pengingat voucher menjelang
                                    kedaluwarsa ke{' '}
                                    <span className="font-semibold text-ink">
                                      {maskPhone(profilePhone)}
                                    </span>
                                    .
                                  </>
                                ) : (
                                  'Lengkapi nomor telepon di menu Edit Profil untuk menerima pemberitahuan via SMS.'
                                )}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            role="switch"
                            aria-checked={preferences.notifySms}
                            aria-label="Aktifkan Notifikasi SMS"
                            onClick={() => {
                              const next = !preferences.notifySms;
                              onUpdatePreferences({ ...preferences, notifySms: next });
                              window.PromoMuBridge?.showToast(
                                next
                                  ? 'Notifikasi SMS diaktifkan'
                                  : 'Notifikasi SMS dinonaktifkan'
                              );
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                              preferences.notifySms ? 'bg-[#FF6B1A]' : 'bg-black/15'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                                preferences.notifySms ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Jenis Pemberitahuan Promo */}
                    <div className="rounded-2xl bg-white p-5 sm:p-6 border border-black/8">
                      <div className="pb-4 border-b border-black/8">
                        <h3 className="text-sm font-extrabold text-[#141312]">
                          Topik &amp; Jenis Notifikasi Promo
                        </h3>
                        <p className="text-xs text-ink-muted mt-0.5">
                          Pilih kategori promo yang ingin kamu terima melalui saluran aktif di atas.
                        </p>
                      </div>

                      <div className="divide-y divide-black/6">
                        <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-[#141312]">
                              Ringkasan Promo Mingguan
                            </p>
                            <p className="text-xs text-ink-muted mt-0.5">
                              Kurasi outlet paling hemat setiap akhir pekan di{' '}
                              {profileCity || activeCity}.
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={preferences.notifyWeeklyDigest}
                            onChange={(e) =>
                              onUpdatePreferences({
                                ...preferences,
                                notifyWeeklyDigest: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-[#FF6B1A] shrink-0"
                          />
                        </label>

                        <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-[#141312]">
                              Alert Promo Tanggal Tua
                            </p>
                            <p className="text-xs text-ink-muted mt-0.5">
                              Info menu makan &amp; ngopi hemat di bawah Rp 20.000.
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={preferences.notifyTanggalTua}
                            onChange={(e) =>
                              onUpdatePreferences({
                                ...preferences,
                                notifyTanggalTua: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-[#FF6B1A] shrink-0"
                          />
                        </label>

                        <label className="pt-3.5 flex items-center justify-between gap-4 cursor-pointer">
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-[#141312]">
                              Info Buy 1 Get 1
                            </p>
                            <p className="text-xs text-ink-muted mt-0.5">
                              Sorotan promo patungan terdekat untuk nongkrong bareng teman.
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={preferences.notifyB1G1}
                            onChange={(e) =>
                              onUpdatePreferences({
                                ...preferences,
                                notifyB1G1: e.target.checked,
                              })
                            }
                            className="h-4 w-4 accent-[#FF6B1A] shrink-0"
                          />
                        </label>
                      </div>

                      <div className="mt-4 pt-3.5 border-t border-black/8 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-muted">
                        <span>Perubahan pengaturan notifikasi disimpan otomatis.</span>
                        <button
                          type="button"
                          onClick={() => setSettingsSubTab('advanced')}
                          className="font-bold text-ink hover:text-[#FF6B1A] transition"
                        >
                          ← Kembali ke Akun &amp; Keamanan
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ============================================================
                TAB 6: PAKET LANGGANAN (PAKET UTAMA 3 TIER & MENU BISNIS)
               ============================================================ */}
            {activeTab === 'subscription' && (() => {
              const freePlan = SUBSCRIPTION_PLANS[0];
              const proPlan = SUBSCRIPTION_PLANS[1];
              const enterprisePlan = SUBSCRIPTION_PLANS[2];
              const activeBizLicensePlan =
                selectedBusinessLicense === 'enterprise' ? enterprisePlan : proPlan;

              const isFreeActive = subscriptionPlanId === 'free';
              const isProMonthlyActive =
                subscriptionPlanId === 'pro' && subscriptionBillingCycle === 'monthly';
              const isEnterpriseMonthlyActive =
                subscriptionPlanId === 'enterprise' && subscriptionBillingCycle === 'monthly';
              const isSelectedBizLicenseCurrent =
                subscriptionPlanId === activeBizLicensePlan.id &&
                subscriptionBillingCycle === selectedBillingView;

              return (
                <section className="relative pb-6">
                  {/* Top-Right Minimal Close / Back Button */}
                  <div className="flex justify-end mb-2 sm:mb-0 sm:absolute sm:top-0 sm:right-0">
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Kembali ke beranda"
                      title="Kembali ke Beranda"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink-muted hover:text-[#141312] hover:bg-black/6 transition cursor-pointer"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Centered Studio Title & Top Switcher (Paket Utama | Bisnis) */}
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl sm:text-[1.85rem] font-extrabold tracking-tight text-[#141312]">
                      Tingkatkan paket Anda
                    </h1>

                    <div
                      role="tablist"
                      aria-label="Kategori paket langganan"
                      className="mt-5 inline-flex items-center rounded-full bg-white p-1 border border-black/10 shadow-xs"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={subscriptionViewMode === 'main'}
                        onClick={() => {
                          setSubscriptionViewMode('main');
                          setSelectedBillingView('monthly');
                        }}
                        className={`rounded-full px-5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                          subscriptionViewMode === 'main'
                            ? 'bg-[#181716] text-white shadow-xs'
                            : 'text-ink-muted hover:text-[#141312]'
                        }`}
                      >
                        Paket Utama
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={subscriptionViewMode === 'business'}
                        onClick={() => {
                          setSubscriptionViewMode('business');
                          setSelectedBillingView('yearly');
                        }}
                        className={`rounded-full px-5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                          subscriptionViewMode === 'business'
                            ? 'bg-[#181716] text-white shadow-xs'
                            : 'text-ink-muted hover:text-[#141312]'
                        }`}
                      >
                        Bisnis
                      </button>
                    </div>
                  </div>

                  {/* ========================================================
                      MODE 1: PAKET UTAMA (3 TIER: GRATIS, BISNIS PRO, EKSKLUSIF)
                     ======================================================== */}
                  {subscriptionViewMode === 'main' && (
                    <div className="mt-8 space-y-6">
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-stretch max-w-[1060px] mx-auto">
                        {/* 1. GRATIS */}
                        <article className="rounded-2xl bg-white border border-black/10 p-6 flex flex-col justify-between shadow-xs">
                          <div>
                            <div className="flex items-center justify-between gap-2 min-h-[24px]">
                              <span className="text-sm font-bold text-[#141312]">Gratis</span>
                            </div>

                            <h2 className="mt-4 text-xl font-extrabold tracking-tight text-[#141312]">
                              Coba PromoMu
                            </h2>
                            <p className="mt-1 text-xs text-ink-muted leading-relaxed min-h-[34px]">
                              Mulai kenalkan promo outlet Anda di katalog lokal tanpa biaya.
                            </p>

                            <button
                              type="button"
                              disabled={isFreeActive}
                              onClick={() => {
                                setSelectedBillingView('monthly');
                                setPendingUpgradePlan(freePlan);
                              }}
                              className={`mt-5 w-full rounded-full px-4 py-2.5 text-xs font-bold transition ${
                                isFreeActive
                                  ? 'bg-canvas text-ink-muted border border-black/12 cursor-default'
                                  : 'bg-canvas text-[#141312] border border-black/15 hover:border-[#141312] cursor-pointer'
                              }`}
                            >
                              {isFreeActive ? 'Paket Anda saat ini' : 'Gunakan paket Gratis'}
                            </button>

                            <div className="mt-5 flex items-baseline gap-1 text-[#141312]">
                              <span className="text-xs font-semibold text-ink-muted self-start mt-1">
                                Rp
                              </span>
                              <span className="font-mono text-3xl font-extrabold tracking-tight tabular-nums">
                                0
                              </span>
                              <span className="text-xs text-ink-muted ml-0.5">/ bulan</span>
                            </div>

                            <ul className="mt-6 space-y-3 text-xs text-ink">
                              <li className="flex items-start gap-2.5">
                                <Tag className="h-4 w-4 shrink-0 text-ink-muted mt-0.5" />
                                <span>Upload maksimal 5 promo aktif di katalog</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <Store className="h-4 w-4 shrink-0 text-ink-muted mt-0.5" />
                                <span>Halaman profil bisnis publik dasar</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <QrCode className="h-4 w-4 shrink-0 text-ink-muted mt-0.5" />
                                <span>Verifikasi kode voucher manual di kasir</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <BarChart3 className="h-4 w-4 shrink-0 text-ink-muted mt-0.5" />
                                <span>Pantau sisa kuota &amp; klaim promo dasar</span>
                              </li>
                              <li className="flex items-start gap-2.5 text-ink-light">
                                <Lock className="h-4 w-4 shrink-0 text-ink-light mt-0.5" />
                                <span>Tanpa lencana centang biru &amp; ekspor laporan</span>
                              </li>
                            </ul>
                          </div>

                          <p className="mt-8 pt-4 border-t border-black/8 text-[11px] leading-relaxed text-ink-light">
                            Gratis selamanya tanpa kartu kredit. Batas maksimal 5 promo dan 100
                            kuota per promo.
                          </p>
                        </article>

                        {/* 2. BISNIS PRO (DIREKOMENDASIKAN — HIGHLIGHTED PROMOMU CARD) */}
                        <article className="rounded-2xl bg-gradient-to-b from-[#FFF6EE] via-white to-white border-2 border-[#FF6B1A]/75 p-6 flex flex-col justify-between shadow-[0_18px_42px_-24px_rgba(255,107,26,0.32)]">
                          <div>
                            <div className="flex items-center justify-between gap-2 min-h-[24px]">
                              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#141312]">
                                <span>Bisnis Pro</span>
                                <BadgeCheck className="h-4 w-4 fill-[#1D9BF0] text-white shrink-0" />
                              </span>
                              <span className="rounded-md bg-[#FFEAD9] px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#EA580C] uppercase">
                                Direkomendasikan
                              </span>
                            </div>

                            <h2 className="mt-4 text-xl font-extrabold tracking-tight text-[#141312]">
                              Tumbuh lebih cepat
                            </h2>
                            <p className="mt-1 text-xs text-ink-muted leading-relaxed min-h-[34px]">
                              Bangun kepercayaan pembeli &amp; perluas jangkauan promo outlet
                              harian Anda.
                            </p>

                            <button
                              type="button"
                              disabled={isProMonthlyActive}
                              onClick={() => {
                                setSelectedBillingView('monthly');
                                setPendingUpgradePlan(proPlan);
                              }}
                              className={`mt-5 w-full inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold transition ${
                                isProMonthlyActive
                                  ? 'bg-[#FFF0E5] text-[#EA580C] border border-[#FF6B1A]/30 cursor-default'
                                  : 'bg-[#FF6B1A] text-white hover:bg-[#EA580C] cursor-pointer shadow-xs'
                              }`}
                            >
                              {!isProMonthlyActive && <Zap className="h-3.5 w-3.5 fill-current" />}
                              <span>
                                {isProMonthlyActive ? 'Paket Anda saat ini' : 'Mulai berlangganan'}
                              </span>
                            </button>

                            <div className="mt-5 flex items-baseline gap-1 text-[#141312]">
                              <span className="text-xs font-semibold text-ink-muted self-start mt-1">
                                Rp
                              </span>
                              <span className="font-mono text-3xl font-extrabold tracking-tight tabular-nums">
                                79.000
                              </span>
                              <span className="text-xs text-ink-muted ml-0.5">/ bulan</span>
                            </div>

                            <ul className="mt-6 space-y-3 text-xs text-ink">
                              <li className="flex items-start gap-2.5">
                                <Layers className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                                <span>
                                  Upload hingga <strong className="text-[#141312]">25 promo</strong>{' '}
                                  aktif sekaligus
                                </span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <BadgeCheck className="h-4 w-4 shrink-0 text-[#1D9BF0] mt-0.5" />
                                <span>
                                  <strong className="text-[#141312]">Lencana Centang Biru</strong>{' '}
                                  di profil &amp; katalog utama
                                </span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <TrendingUp className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                                <span>Prioritas tampil lebih tinggi di katalog wilayah</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <QrCode className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                                <span>Kuota voucher fleksibel hingga 500 klaim per promo</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <BarChart3 className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                                <span>Analitik performa promo &amp; deteksi kuota menipis</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                                <span>Ekspor laporan penukaran kasir (CSV)</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <MessageSquare className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                                <span>Pintasan WhatsApp kasir &amp; media sosial lengkap</span>
                              </li>
                            </ul>
                          </div>

                          <p className="mt-8 pt-4 border-t border-black/8 text-[11px] leading-relaxed text-ink-muted">
                            Setara Rp 2.600/hari. Bisa beralih ke pembayaran tahunan hemat 20%
                            kapan saja.
                          </p>
                        </article>

                        {/* 3. BISNIS EKSKLUSIF */}
                        <article className="rounded-2xl bg-white border border-black/15 p-6 flex flex-col justify-between shadow-xs">
                          <div>
                            <div className="flex items-center justify-between gap-2 min-h-[24px]">
                              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#141312]">
                                <span>Bisnis Eksklusif</span>
                                <BadgeCheck className="h-4 w-4 fill-[#1D9BF0] text-white shrink-0" />
                              </span>
                              <span className="rounded-md bg-[#181716] px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                                Lengkap
                              </span>
                            </div>

                            <h2 className="mt-4 text-xl font-extrabold tracking-tight text-[#141312]">
                              Kendali penuh tanpa batas
                            </h2>
                            <p className="mt-1 text-xs text-ink-muted leading-relaxed min-h-[34px]">
                              Semua fitur terbaik untuk restoran mapan &amp; kampanye promo
                              intensif.
                            </p>

                            <button
                              type="button"
                              disabled={isEnterpriseMonthlyActive}
                              onClick={() => {
                                setSelectedBillingView('monthly');
                                setPendingUpgradePlan(enterprisePlan);
                              }}
                              className={`mt-5 w-full rounded-full px-4 py-2.5 text-xs font-bold transition ${
                                isEnterpriseMonthlyActive
                                  ? 'bg-canvas text-ink-muted border border-black/12 cursor-default'
                                  : 'bg-[#181716] text-white hover:bg-[#FF6B1A] cursor-pointer'
                              }`}
                            >
                              {isEnterpriseMonthlyActive
                                ? 'Paket Anda saat ini'
                                : 'Mulai berlangganan'}
                            </button>

                            <div className="mt-5 flex items-baseline gap-1 text-[#141312]">
                              <span className="text-xs font-semibold text-ink-muted self-start mt-1">
                                Rp
                              </span>
                              <span className="font-mono text-3xl font-extrabold tracking-tight tabular-nums">
                                249.000
                              </span>
                              <span className="text-xs text-ink-muted ml-0.5">/ bulan</span>
                            </div>

                            <ul className="mt-6 space-y-3 text-xs text-ink">
                              <li className="flex items-start gap-2.5">
                                <Zap className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                                <span>
                                  Upload promo{' '}
                                  <strong className="text-[#141312]">
                                    Tanpa Batas (Unlimited)
                                  </strong>
                                </span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <Crown className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                                <span>Lencana Centang Biru + Status Mitra Unggulan</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <TrendingUp className="h-4 w-4 shrink-0 text-[#141312] mt-0.5" />
                                <span>
                                  Sorotan otomatis di rekomendasi wilayah (Featured Boost)
                                </span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <Tag className="h-4 w-4 shrink-0 text-[#141312] mt-0.5" />
                                <span>Kuota voucher tak terbatas &amp; kode promo kustom</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <BarChart3 className="h-4 w-4 shrink-0 text-[#141312] mt-0.5" />
                                <span>Analitik konversi, jam ramai, &amp; estimasi omzet</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <Building2 className="h-4 w-4 shrink-0 text-[#141312] mt-0.5" />
                                <span>Manajemen multi-cabang / multi-outlet terpusat</span>
                              </li>
                              <li className="flex items-start gap-2.5">
                                <Headphones className="h-4 w-4 shrink-0 text-[#141312] mt-0.5" />
                                <span>Dukungan prioritas mitra bisnis 24/7</span>
                              </li>
                            </ul>
                          </div>

                          <p className="mt-8 pt-4 border-t border-black/8 text-[11px] leading-relaxed text-ink-light">
                            Ingin harga tahunan lebih hemat hingga Rp 600.000/thn? Pilih menu
                            Bisnis.
                          </p>
                        </article>
                      </div>

                      {/* Subtle Bottom Link to Business Annual Menu */}
                      <div className="text-center pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSubscriptionViewMode('business');
                            setSelectedBillingView('yearly');
                          }}
                          className="text-xs font-semibold text-ink-muted underline underline-offset-4 hover:text-[#FF6B1A] transition cursor-pointer"
                        >
                          Lihat penawaran Paket Bisnis Tahunan (Hemat 20%)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ========================================================
                      MODE 2: MENU BISNIS (GRATIS VS BISNIS TAHUNAN / BULANAN)
                     ======================================================== */}
                  {subscriptionViewMode === 'business' && (
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch max-w-[840px] mx-auto">
                      {/* LEFT CARD: GRATIS (BASELINE COMPARISON) */}
                      <article className="rounded-2xl bg-white border border-black/10 p-6 sm:p-7 flex flex-col justify-between shadow-xs">
                        <div>
                          <div className="flex items-center justify-between gap-2 min-h-[28px]">
                            <span className="text-sm font-bold text-[#141312]">Gratis</span>
                          </div>

                          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[#141312]">
                            Coba PromoMu
                          </h2>
                          <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
                            Lihat bagaimana promo digital bekerja untuk outlet Anda.
                          </p>

                          <button
                            type="button"
                            disabled={isFreeActive}
                            onClick={() => {
                              setSelectedBillingView('monthly');
                              setPendingUpgradePlan(freePlan);
                            }}
                            className={`mt-5 w-full rounded-full px-4 py-2.5 text-xs font-bold transition ${
                              isFreeActive
                                ? 'bg-canvas text-ink-muted border border-black/12 cursor-default'
                                : 'bg-canvas text-[#141312] border border-black/15 hover:border-[#141312] cursor-pointer'
                            }`}
                          >
                            {isFreeActive ? 'Paket Anda saat ini' : 'Gunakan paket Gratis'}
                          </button>

                          <div className="mt-5 flex items-baseline gap-1 text-[#141312]">
                            <span className="text-xs font-semibold text-ink-muted self-start mt-1">
                              Rp
                            </span>
                            <span className="font-mono text-3xl font-extrabold tracking-tight tabular-nums">
                              0
                            </span>
                            <span className="text-xs text-ink-muted ml-0.5">/ bulan</span>
                          </div>

                          <ul className="mt-6 space-y-3.5 text-xs text-ink">
                            <li className="flex items-start gap-2.5">
                              <Tag className="h-4 w-4 shrink-0 text-ink-muted mt-0.5" />
                              <span>Upload promo terbatas maksimal 5 menu</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <Store className="h-4 w-4 shrink-0 text-ink-muted mt-0.5" />
                              <span>Hanya untuk 1 lokasi outlet standar</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <QrCode className="h-4 w-4 shrink-0 text-ink-muted mt-0.5" />
                              <span>Kuota voucher dibatasi maks. 100 klaim/promo</span>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <BarChart3 className="h-4 w-4 shrink-0 text-ink-muted mt-0.5" />
                              <span>Ringkasan performa dasar tanpa ekspor CSV</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-ink-light">
                              <Lock className="h-4 w-4 shrink-0 text-ink-light mt-0.5" />
                              <span>Tidak termasuk lencana centang biru</span>
                            </li>
                          </ul>
                        </div>

                        <p className="mt-8 pt-4 border-t border-black/8 text-[11px] leading-relaxed text-ink-light">
                          Cocok untuk uji coba awal. Tingkatkan ke paket Bisnis untuk membuka
                          verifikasi centang biru, kuota lebih besar, dan laporan kasir lengkap.
                        </p>
                      </article>

                      {/* RIGHT CARD: BISNIS (WITH INLINE TAHUNAN | BULANAN & LICENSE BOX) */}
                      <article className="rounded-2xl bg-gradient-to-b from-[#FFF6EE] via-white to-white border-2 border-[#FF6B1A]/75 p-6 sm:p-7 flex flex-col justify-between shadow-[0_18px_42px_-24px_rgba(255,107,26,0.32)]">
                        <div>
                          {/* Header Row: Bisnis + Inline Tahunan / Bulanan Switcher */}
                          <div className="flex items-center justify-between gap-3 min-h-[28px]">
                            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#141312]">
                              <span>Bisnis</span>
                              <BadgeCheck className="h-4 w-4 fill-[#1D9BF0] text-white shrink-0" />
                            </span>

                            <div
                              role="group"
                              aria-label="Siklus pembayaran bisnis"
                              className="inline-flex items-center rounded-full bg-[#F5ECE4] p-0.5 border border-black/8"
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedBillingView('yearly')}
                                className={`rounded-full px-3 py-1 text-[11px] font-bold transition cursor-pointer ${
                                  selectedBillingView === 'yearly'
                                    ? 'bg-[#181716] text-white shadow-xs'
                                    : 'text-ink-muted hover:text-[#141312]'
                                }`}
                              >
                                Tahunan
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedBillingView('monthly')}
                                className={`rounded-full px-3 py-1 text-[11px] font-bold transition cursor-pointer ${
                                  selectedBillingView === 'monthly'
                                    ? 'bg-[#181716] text-white shadow-xs'
                                    : 'text-ink-muted hover:text-[#141312]'
                                }`}
                              >
                                Bulanan
                              </button>
                            </div>
                          </div>

                          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-[#141312] leading-snug">
                            Untuk bisnis &amp; outlet yang sedang berkembang
                          </h2>
                          <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
                            Kendali promo terpusat, lencana centang biru, dan perangkat ekspansi
                            usaha dengan biaya tahunan lebih hemat 20%.
                          </p>

                          <button
                            type="button"
                            disabled={isSelectedBizLicenseCurrent}
                            onClick={() => setPendingUpgradePlan(activeBizLicensePlan)}
                            className={`mt-5 w-full inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold transition ${
                              isSelectedBizLicenseCurrent
                                ? 'bg-[#FFF0E5] text-[#EA580C] border border-[#FF6B1A]/30 cursor-default'
                                : 'bg-[#FF6B1A] text-white hover:bg-[#EA580C] cursor-pointer shadow-xs'
                            }`}
                          >
                            {!isSelectedBizLicenseCurrent && (
                              <Zap className="h-3.5 w-3.5 fill-current" />
                            )}
                            <span>
                              {isSelectedBizLicenseCurrent
                                ? `Aktif (${activeBizLicensePlan.name} · ${
                                    selectedBillingView === 'yearly' ? 'Tahunan' : 'Bulanan'
                                  })`
                                : `Mulai berlangganan ${activeBizLicensePlan.name}`}
                            </span>
                          </button>

                          {/* Inner Selectable Business License Box (mirrors reference!) */}
                          <div className="mt-5 rounded-xl bg-canvas border border-black/10 p-2 space-y-1.5">
                            {/* License 1: Bisnis Pro */}
                            <button
                              type="button"
                              onClick={() => setSelectedBusinessLicense('pro')}
                              className={`w-full rounded-lg px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition cursor-pointer border ${
                                selectedBusinessLicense === 'pro'
                                  ? 'bg-white border-[#FF6B1A] shadow-xs'
                                  : 'bg-transparent border-transparent hover:bg-white/70'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#141312]">
                                  Lisensi Bisnis Pro
                                </p>
                                <p className="text-[11px] text-ink-muted leading-snug mt-0.5">
                                  Paling sesuai untuk kafe &amp; resto aktif (maks. 25 promo)
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-mono text-xs sm:text-[13px] font-extrabold text-[#141312] tabular-nums whitespace-nowrap">
                                  {formatRp(
                                    selectedBillingView === 'yearly'
                                      ? proPlan.yearlyMonthlyPrice
                                      : proPlan.monthlyPrice
                                  )}
                                  <span className="font-sans text-[11px] font-normal text-ink-muted">
                                    {' '}
                                    / bulan
                                  </span>
                                </p>
                                {selectedBillingView === 'yearly' && (
                                  <p className="font-mono text-[10px] font-semibold text-[#EA580C] tabular-nums">
                                    {formatRp(proPlan.yearlyMonthlyPrice * 12)}/tahun
                                  </p>
                                )}
                              </div>
                            </button>

                            {/* License 2: Bisnis Eksklusif */}
                            <button
                              type="button"
                              onClick={() => setSelectedBusinessLicense('enterprise')}
                              className={`w-full rounded-lg px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition cursor-pointer border ${
                                selectedBusinessLicense === 'enterprise'
                                  ? 'bg-white border-[#FF6B1A] shadow-xs'
                                  : 'bg-transparent border-transparent hover:bg-white/70'
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#141312]">
                                  Lisensi Bisnis Eksklusif
                                </p>
                                <p className="text-[11px] text-ink-muted leading-snug mt-0.5">
                                  Promo tanpa batas, Featured Boost &amp; multi-cabang penuh
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-mono text-xs sm:text-[13px] font-extrabold text-[#141312] tabular-nums whitespace-nowrap">
                                  {formatRp(
                                    selectedBillingView === 'yearly'
                                      ? enterprisePlan.yearlyMonthlyPrice
                                      : enterprisePlan.monthlyPrice
                                  )}
                                  <span className="font-sans text-[11px] font-normal text-ink-muted">
                                    {' '}
                                    / bulan
                                  </span>
                                </p>
                                {selectedBillingView === 'yearly' && (
                                  <p className="font-mono text-[10px] font-semibold text-[#EA580C] tabular-nums">
                                    {formatRp(enterprisePlan.yearlyMonthlyPrice * 12)}/tahun
                                  </p>
                                )}
                              </div>
                            </button>
                          </div>

                          {/* Rich Business Features List */}
                          <ul className="mt-5 space-y-3 text-xs text-ink">
                            <li className="flex items-start gap-2.5">
                              <BadgeCheck className="h-4 w-4 shrink-0 text-[#1D9BF0] mt-0.5" />
                              <span>
                                Lencana Centang Biru &amp; Mitra Unggulan di profil serta katalog
                                utama PromoMu
                              </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <TrendingUp className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                              <span>
                                Prioritas tampil di katalog wilayah &amp; sorotan otomatis Featured
                                Boost (Eksklusif)
                              </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <Building2 className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                              <span>
                                Manajemen multi-cabang &amp; outlet dalam satu pusat kendali
                                BisnisMu
                              </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <Tag className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                              <span>
                                Kode voucher kustom bebas untuk event gajian, bundling, hingga
                                kolaborasi brand
                              </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <BarChart3 className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                              <span>
                                Analitik performa promo, rasio konversi, dan pemantauan jam ramai
                                pelanggan
                              </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <FileSpreadsheet className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                              <span>
                                Ekspor laporan audit penukaran kasir (CSV) siap pakai untuk
                                pembukuan bisnis
                              </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <CreditCard className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                              <span>
                                Penagihan tahunan terpusat — hemat hingga Rp 600.000/tahun untuk
                                operasional usaha
                              </span>
                            </li>
                            <li className="flex items-start gap-2.5">
                              <Headphones className="h-4 w-4 shrink-0 text-[#FF6B1A] mt-0.5" />
                              <span>
                                Dukungan prioritas mitra bisnis 24/7 &amp; verifikasi profil usaha
                                kilat
                              </span>
                            </li>
                          </ul>
                        </div>

                        <p className="mt-7 pt-4 border-t border-black/8 text-[11px] leading-relaxed text-ink-muted">
                          Klik salah satu lisensi di atas untuk memilih kapasitas bisnis Anda.
                          Pembayaran tahunan langsung memotong biaya hingga 20%.
                        </p>
                      </article>
                    </div>
                  )}
                </section>
              );
            })()}
          </div>
        </main>
      </div>

      {/* ====================================================================
          MODAL KONFIRMASI HAPUS AKUN & PESAN MASA TENGGANG 25 HARI
         ==================================================================== */}
      {deleteModalTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deleteConfirmModalTitle"
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white border border-black/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-black/8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3
                    id="deleteConfirmModalTitle"
                    className="text-sm sm:text-base font-extrabold text-[#141312] truncate"
                  >
                    {deleteModalTarget === 'personal'
                      ? 'Konfirmasi Penghapusan Akun'
                      : 'Konfirmasi Penghapusan Akun Bisnis'}
                  </h3>
                  <p className="text-[11px] font-medium text-ink-muted truncate">
                    {deleteModalTarget === 'personal'
                      ? `Akun Utama · ${maskEmail(profileEmail || user.email)}`
                      : `Akun Bisnis · ${businessAccount?.businessName || 'Profil Usaha'}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalTarget(null)}
                aria-label="Tutup konfirmasi hapus akun"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-muted hover:bg-canvas hover:text-ink transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleConfirmScheduledDeletion}
              className="p-6 space-y-4 overflow-y-auto"
            >
              {/* 25-Day Policy Notice */}
              <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900">
                  <Clock className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>Ketentuan Penghapusan Otomatis {DELETION_GRACE_DAYS} Hari</span>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  Akun akan masuk ke masa tenggang selama{' '}
                  <strong>{DELETION_GRACE_DAYS} hari</strong>. Apabila{' '}
                  <strong>sudah melebihi 25 hari</strong> sejak pengajuan (batas akhir{' '}
                  <strong>
                    {formatDateId(
                      new Date(Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000)
                    )}
                  </strong>
                  ) tanpa pembatalan, akun dan seluruh data terkait akan{' '}
                  <strong>dihapus permanen</strong> dan tidak dapat dipulihkan.
                </p>
              </div>

              {/* Impact Breakdown */}
              <div className="rounded-xl bg-canvas p-4 border border-black/8 space-y-2 text-xs">
                <p className="font-bold text-[#141312]">
                  Dampak jika sudah melebihi {DELETION_GRACE_DAYS} hari:
                </p>
                {deleteModalTarget === 'personal' ? (
                  <ul className="space-y-1 text-ink-muted list-disc pl-4 leading-relaxed">
                    <li>Profil akun, riwayat klaim voucher, dan daftar favorit dihapus permanen.</li>
                    <li>Preferensi notifikasi serta target hemat tidak dapat diakses lagi.</li>
                    {businessAccount && (
                      <li>
                        Profil bisnis <strong>{businessAccount.businessName}</strong> yang
                        terhubung juga ikut terhapus.
                      </li>
                    )}
                  </ul>
                ) : (
                  <ul className="space-y-1 text-ink-muted list-disc pl-4 leading-relaxed">
                    <li>
                      Profil usaha <strong>{businessAccount?.businessName}</strong>, banner, dan
                      seluruh katalog promo usaha dihapus permanen.
                    </li>
                    <li>Riwayat verifikasi kode pelanggan di kasir ikut dibersihkan.</li>
                    <li>Akun pribadi, voucher ter-klaim, dan favorit Anda tetap aman.</li>
                  </ul>
                )}
              </div>

              {/* Reason Selection */}
              <div>
                <label
                  htmlFor="deleteAccountReasonSelect"
                  className="block text-xs font-bold text-[#141312] mb-1.5"
                >
                  Alasan Menghapus Akun (Opsional)
                </label>
                <select
                  id="deleteAccountReasonSelect"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full rounded-xl bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-ink border border-black/15 focus:outline-none focus:border-[#FF6B1A]"
                >
                  {DELETION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              {/* 25-Day Acknowledgement Checkbox */}
              <label className="flex items-start gap-2.5 rounded-xl bg-rose-50/60 p-3.5 border border-rose-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAcknowledge25Days}
                  onChange={(e) => setDeleteAcknowledge25Days(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-rose-600 shrink-0 cursor-pointer"
                />
                <span className="text-xs text-rose-900 leading-relaxed">
                  Saya mengerti bahwa akun akan <strong>dihapus secara permanen</strong> apabila
                  sudah melebihi masa tenggang <strong>{DELETION_GRACE_DAYS} hari</strong> sejak
                  hari ini.
                </span>
              </label>

              {/* Confirmation Keyword Input */}
              <div>
                <label
                  htmlFor="deleteConfirmKeywordInput"
                  className="block text-xs font-bold text-[#141312] mb-1.5"
                >
                  Ketik{' '}
                  <span className="font-mono font-extrabold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
                    HAPUS
                  </span>{' '}
                  untuk melanjutkan
                </label>
                <input
                  id="deleteConfirmKeywordInput"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Ketik HAPUS"
                  className="w-full rounded-xl bg-white px-3.5 py-2.5 text-xs sm:text-sm font-mono font-bold text-ink border border-black/15 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-black/8">
                <button
                  type="button"
                  onClick={() => setDeleteModalTarget(null)}
                  className="rounded-xl bg-canvas px-4 py-2.5 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  disabled={
                    !deleteAcknowledge25Days || deleteConfirmText.trim().toUpperCase() !== 'HAPUS'
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition whitespace-nowrap cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Konfirmasi Hapus Akun</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteReceiptTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deleteReceiptModalTitle"
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-black/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3
                  id="deleteReceiptModalTitle"
                  className="text-sm sm:text-base font-extrabold text-[#141312]"
                >
                  {deleteReceiptTarget === 'personal'
                    ? 'Pengajuan Hapus Akun Diterima'
                    : 'Pengajuan Hapus Akun Bisnis Diterima'}
                </h3>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  {deleteReceiptTarget === 'personal'
                    ? 'Akun Anda kini berada dalam masa tunggu penghapusan.'
                    : `Profil bisnis ${businessAccount?.businessName || ''} kini berada dalam masa tunggu penghapusan.`}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50/80 p-4 border border-amber-200 text-xs text-amber-900 space-y-2 leading-relaxed">
              <p className="font-bold">
                Pesan Penting: Dihapus Permanen Jika Melebihi {DELETION_GRACE_DAYS} Hari
              </p>
              <p>
                Akun akan <strong>dihapus secara permanen</strong> apabila pengajuan ini{' '}
                <strong>sudah melebihi {DELETION_GRACE_DAYS} hari</strong> (batas akhir:{' '}
                <strong>
                  {formatDateId(
                    new Date(Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000)
                  )}
                </strong>
                ). Selama belum melewati {DELETION_GRACE_DAYS} hari, Anda tetap dapat membatalkan
                penghapusan kapan saja melalui menu Pengaturan Lanjutan.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleCancelScheduledDeletion(deleteReceiptTarget)}
                className="rounded-xl bg-canvas px-4 py-2 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition whitespace-nowrap cursor-pointer"
              >
                Batalkan Penghapusan
              </button>
              <button
                type="button"
                onClick={() => setDeleteReceiptTarget(null)}
                className="rounded-xl bg-[#181716] px-5 py-2 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap cursor-pointer"
              >
                Mengerti &amp; Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL KONFIRMASI & AKTIVASI PAKET LANGGANAN
         ==================================================================== */}
      {pendingUpgradePlan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="subscriptionConfirmTitle"
          className="fixed inset-0 z-[135] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-black/10 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-black/8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF4EC] text-[#FF6B1A] border border-[#FF6B1A]/20">
                  <Crown className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3
                    id="subscriptionConfirmTitle"
                    className="text-sm font-extrabold text-[#141312] truncate"
                  >
                    Aktifkan Paket {pendingUpgradePlan.name}
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    Konfirmasi perubahan paket langganan bisnis Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isActivatingPlan}
                onClick={() => setPendingUpgradePlan(null)}
                aria-label="Tutup modal konfirmasi paket"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-canvas text-ink-muted hover:text-ink transition cursor-pointer disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-canvas p-4 border border-black/8 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-muted">Paket Dipilih</span>
                  <span className="inline-flex items-center gap-1 font-extrabold text-[#141312]">
                    <span>{pendingUpgradePlan.name}</span>
                    {pendingUpgradePlan.hasBlueBadge && (
                      <BadgeCheck className="h-4 w-4 fill-[#1D9BF0] text-white" />
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-muted">Batas Upload Promo</span>
                  <span className="font-mono font-bold text-[#141312]">
                    {pendingUpgradePlan.maxPromos !== null
                      ? `Maks. ${pendingUpgradePlan.maxPromos} Promo`
                      : 'Unlimited (Tanpa Batas)'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-muted">Lencana Centang Biru</span>
                  <span
                    className={`font-bold ${
                      pendingUpgradePlan.hasBlueBadge ? 'text-[#1D9BF0]' : 'text-ink-muted'
                    }`}
                  >
                    {pendingUpgradePlan.hasBlueBadge ? 'Aktif Langsung' : 'Tidak Termasuk'}
                  </span>
                </div>
                <div className="pt-2 border-t border-black/8 flex items-center justify-between gap-2">
                  <span className="font-bold text-[#141312]">Total Pembayaran</span>
                  <span className="font-mono text-sm font-extrabold text-[#FF6B1A] tabular-nums">
                    {pendingUpgradePlan.monthlyPrice === 0
                      ? 'Rp 0'
                      : selectedBillingView === 'yearly'
                      ? `${formatRp(pendingUpgradePlan.yearlyMonthlyPrice * 12)} / tahun`
                      : `${formatRp(pendingUpgradePlan.monthlyPrice)} / bulan`}
                  </span>
                </div>
              </div>

              {pendingUpgradePlan.monthlyPrice > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-ink-muted">Pilih Metode Pembayaran</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'qris', label: 'QRIS Instan' },
                        { id: 'va', label: 'Virtual Account' },
                        { id: 'bank', label: 'Transfer Bank' },
                      ] as const
                    ).map((method) => {
                      const active = selectedPaymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          disabled={isActivatingPlan}
                          onClick={() => setSelectedPaymentMethod(method.id)}
                          className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2.5 py-2.5 text-[11px] font-bold border transition cursor-pointer ${
                            active
                              ? 'bg-[#181716] text-white border-[#181716]'
                              : 'bg-white text-ink-muted border-black/10 hover:border-[#141312]'
                          }`}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          <span>{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {pendingUpgradePlan.id === 'free' &&
                pendingUpgradePlan.maxPromos !== null &&
                bizOffers.length > pendingUpgradePlan.maxPromos && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-[11px] text-amber-900 leading-relaxed">
                    Anda saat ini memiliki <strong>{bizOffers.length} promo</strong>. Promo lama
                    tetap tersimpan, namun Anda tidak bisa menambah promo baru sebelum jumlahnya di
                    bawah batas 5 promo.
                  </div>
                )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isActivatingPlan}
                  onClick={() => setPendingUpgradePlan(null)}
                  className="rounded-xl bg-canvas px-4 py-2.5 text-xs font-bold text-ink border border-black/10 hover:border-[#141312] transition cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isActivatingPlan}
                  onClick={handleConfirmSubscriptionChange}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B1A] px-5 py-2.5 text-xs font-bold text-white hover:bg-accent-600 transition cursor-pointer disabled:opacity-80 disabled:cursor-wait"
                >
                  {isActivatingPlan ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      <span>Mengaktifkan Paket...</span>
                    </>
                  ) : (
                    <span>
                      {pendingUpgradePlan.monthlyPrice === 0
                        ? 'Konfirmasi Paket Gratis'
                        : 'Bayar & Aktifkan Sekarang'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

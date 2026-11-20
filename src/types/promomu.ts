export type AuthProvider = 'Google' | 'Apple' | 'Email';

export type DashboardTab =
  | 'overview'
  | 'vouchers'
  | 'favorites'
  | 'business'
  | 'businessPortal'
  | 'subscription'
  | 'settings';

export type SubscriptionPlanId = 'free' | 'pro' | 'enterprise';

export type SubscriptionBillingCycle = 'monthly' | 'yearly';

export type BusinessOutletType =
  | 'Cafe & Kopi'
  | 'Resto & Mie'
  | 'Bakery & Dessert'
  | 'Fast Food'
  | 'Gerobak / UMKM';

export type BusinessScale =
  | 'UMKM / Usaha Rintisan'
  | 'Usaha Berkembang'
  | 'Restoran / Kafe Mandiri'
  | 'Cabang / Waralaba';

export interface BusinessAccount {
  businessName: string;
  brandSlug: string;
  outletType: BusinessOutletType;
  businessScale: BusinessScale;
  operatingHours: string;
  establishedYear?: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  facebookHandle?: string;
  otherSocial?: string;
  description: string;
  province?: string;
  city: string;
  address: string;
  picName: string;
  whatsapp: string;
  businessEmail: string;
  nibNumber?: string;
  logoUrl?: string;
  logoBg?: string;
  bannerUrl?: string;
  subscriptionPlan?: SubscriptionPlanId;
  subscriptionBillingCycle?: SubscriptionBillingCycle;
  subscriptionUpdatedAt?: string;
  deletionScheduledAt?: string;
  deletionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessOfferItem {
  id: string;
  title: string;
  category: string;
  promoType?: string;
  description?: string;
  normalPrice: number;
  offerPrice: number;
  code: string;
  quota: number;
  redeemedCount?: number;
  validUntil?: string;
  imageUrl?: string;
  merchantName?: string;
  merchantCity?: string;
  merchantAddress?: string;
  active: boolean;
  createdAt: string;
}

export interface BusinessRedemptionLog {
  id: string;
  code: string;
  title: string;
  verifiedAt: string;
}

export interface PromoItem {
  id: number;
  merchant: string;
  menu: string;
  category: string;
  tags: string[];
  collections?: string[];
  city: string;
  distance: string;
  address: string;
  badge: string;
  validUntil: string;
  oldPrice: number;
  promoPrice: number;
  code: string;
  img: string;
  verified?: boolean;
  planTier?: SubscriptionPlanId;
}

export interface PromoMuUser {
  name: string;
  email: string;
  provider: AuthProvider;
  city?: string;
  joinedAt?: string;
  username?: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  area?: string;
  bio?: string;
  avatarUrl?: string;
  avatarBg?: string;
  favoriteCategories?: string[];
  deletionScheduledAt?: string;
  deletionReason?: string;
}

export interface PromoMuStateSnapshot {
  user: PromoMuUser | null;
  businessAccount: BusinessAccount | null;
  claimedIds: number[];
  usedVoucherIds: number[];
  savedIds: number[];
  activeCity: string;
  promoItems: PromoItem[];
  cities: string[];
  dashboardOpen: boolean;
  dashboardTab: DashboardTab;
  selectedSellerPromoId: number | null;
}

export interface SellerPublicProfile {
  businessName: string;
  brandSlug: string;
  outletType: BusinessOutletType;
  businessScale: BusinessScale;
  operatingHours: string;
  establishedYear?: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  facebookHandle?: string;
  otherSocial?: string;
  description: string;
  province: string;
  city: string;
  address: string;
  picName: string;
  whatsapp: string;
  businessEmail: string;
  nibNumber?: string;
  logoUrl?: string;
  logoBg: string;
  bannerUrl?: string;
  isOutletOpen: boolean;
  isOwnBusiness: boolean;
  isVerified: boolean;
  planTier?: SubscriptionPlanId;
  totalRedemptions: number;
  totalQuota: number;
}

export interface UserPreferences {
  monthlyTarget: number;
  notifyWeb: boolean;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyWeeklyDigest: boolean;
  notifyTanggalTua: boolean;
  notifyB1G1: boolean;
}

declare global {
  interface Window {
    PromoMuBridge?: {
      getSnapshot: () => PromoMuStateSnapshot;
      openDashboard: (tab?: DashboardTab) => void;
      closeDashboard: () => void;
      setDashboardTab: (tab: DashboardTab) => void;
      openVoucherModal: (promoId: number) => void;
      openSellerProfile: (promoId: number) => void;
      closeSellerProfile: () => void;
      toggleSavePromo: (promoId: number) => void;
      toggleVoucherUsed: (promoId: number) => void;
      selectCity: (city: string) => void;
      updateUserProfile: (updates: Partial<PromoMuUser>) => void;
      saveBusinessAccount: (account: BusinessAccount) => void;
      removeBusinessAccount: () => void;
      signOutUser: () => void;
      deleteUserAccount: () => void;
      syncBusinessCatalog?: () => void;
      scrollToCatalog: () => void;
      showToast: (message: string) => void;
    };
  }
}

import {
  BusinessAccount,
  BusinessOfferItem,
  BusinessOutletType,
  BusinessRedemptionLog,
  BusinessScale,
  PromoItem,
  SellerPublicProfile,
} from '../types/promomu';
import { findProvinceByCity } from './indonesiaRegions';
import { getSubscriptionPlanSpec, readStoredSubscriptionState } from './subscriptionPlans';

interface MerchantDirectorySeed {
  outletType: BusinessOutletType;
  businessScale: BusinessScale;
  operatingHours: string;
  establishedYear: string;
  description: string;
  picName: string;
  whatsapp: string;
  businessEmail: string;
  instagramHandle: string;
  tiktokHandle?: string;
  facebookHandle?: string;
  otherSocial?: string;
  nibNumber: string;
  logoBg: string;
  totalRedemptions: number;
  totalQuota: number;
  isOutletOpen?: boolean;
}

const MERCHANT_DIRECTORY: Record<string, MerchantDirectorySeed> = {
  'Kopi Kenangan': {
    outletType: 'Cafe & Kopi',
    businessScale: 'Cabang / Waralaba',
    operatingHours: '07.00 - 22.00 WIB',
    establishedYear: '2017',
    description:
      'Outlet kopi susu kekinian dengan biji kopi pilihan Nusantara dan gula aren murni, hadir untuk menemani aktivitas kerja, kuliah, dan santai harian Anda.',
    picName: 'Raka Pratama',
    whatsapp: '081234001101',
    businessEmail: 'madiun.pahlawan@kopikenangan.id',
    instagramHandle: '@kopikenangan.id',
    tiktokHandle: '@kopikenangan',
    facebookHandle: 'fb.com/kopikenangan.id',
    nibNumber: '9120108172911',
    logoBg: '#181716',
    totalRedemptions: 412,
    totalQuota: 140,
  },
  'Mie Gacoan': {
    outletType: 'Resto & Mie',
    businessScale: 'Cabang / Waralaba',
    operatingHours: '09.00 - 23.00 WIB',
    establishedYear: '2016',
    description:
      'Restoran mie pedas favorit anak muda dengan beragam pilihan level kepedasan serta dimsum hangat segar setiap hari.',
    picName: 'Dimas Aditya',
    whatsapp: '081234001102',
    businessEmail: 'surabaya.ambengan@miegacoan.id',
    instagramHandle: '@mie.gacoan',
    tiktokHandle: '@miegacoan.official',
    nibNumber: '9120209183402',
    logoBg: '#2563EB',
    totalRedemptions: 685,
    totalQuota: 180,
  },
  'Chatime Indonesia': {
    outletType: 'Cafe & Kopi',
    businessScale: 'Cabang / Waralaba',
    operatingHours: '10.00 - 22.00 WIB',
    establishedYear: '2011',
    description:
      'Gerai minuman teh segar racikan brewed tea dengan beragam pilihan topping boba, pudding, dan mousse favorit.',
    picName: 'Nadia Kusuma',
    whatsapp: '081234001103',
    businessEmail: 'malang.suhat@chatime.co.id',
    instagramHandle: '@chatimeindo',
    tiktokHandle: '@chatimeindo',
    facebookHandle: 'fb.com/ChatimeIndonesia',
    nibNumber: '9120305112003',
    logoBg: '#7C3AED',
    totalRedemptions: 294,
    totalQuota: 95,
  },
  'Ayam Geprek Bensu': {
    outletType: 'Fast Food',
    businessScale: 'Cabang / Waralaba',
    operatingHours: '10.00 - 22.00 WIB',
    establishedYear: '2017',
    description:
      'Ayam crispy geprek dengan sambal bawang ulek segar level 1-10, porsi mengenyangkan dan ramah kantong pelajar.',
    picName: 'Bagus Santoso',
    whatsapp: '081234001104',
    businessEmail: 'yogya.kaliurang@geprekbensu.id',
    instagramHandle: '@ayamgeprekbensu',
    tiktokHandle: '@geprekbensu',
    nibNumber: '9120402198004',
    logoBg: '#BE123C',
    totalRedemptions: 358,
    totalQuota: 110,
  },
  'Roti’O': {
    outletType: 'Bakery & Dessert',
    businessScale: 'Cabang / Waralaba',
    operatingHours: '06.30 - 21.30 WIB',
    establishedYear: '2012',
    description:
      'Roti panggang hangat beraroma kopi khas dengan isian butter lembut di dalam dan topping renyah di luar.',
    picName: 'Siti Rahma',
    whatsapp: '081234001105',
    businessEmail: 'sudirman@rotio.id',
    instagramHandle: '@rotio.indonesia',
    tiktokHandle: '@rotio.id',
    nibNumber: '9120506187105',
    logoBg: '#D97706',
    totalRedemptions: 267,
    totalQuota: 85,
  },
  'Kopi Tuku': {
    outletType: 'Cafe & Kopi',
    businessScale: 'Restoran / Kafe Mandiri',
    operatingHours: '07.00 - 21.00 WIB',
    establishedYear: '2015',
    description:
      'Kedai kopi tetangga yang menyajikan Es Kopi Susu Tetangga dengan karakter manis gurih seimbang dan jajanan pasar pilihan.',
    picName: 'Fajar Nugroho',
    whatsapp: '081234001106',
    businessEmail: 'bandung.cihampelas@tuku.coffee',
    instagramHandle: '@tokokopituku',
    tiktokHandle: '@tokokopituku',
    nibNumber: '9120604176206',
    logoBg: '#0F766E',
    totalRedemptions: 329,
    totalQuota: 100,
  },
  'Kedai Kopi Sareng': {
    outletType: 'Cafe & Kopi',
    businessScale: 'UMKM / Usaha Rintisan',
    operatingHours: '09.00 - 23.30 WIB',
    establishedYear: '2021',
    description:
      'Ruang nongkrong santai di jantung Kota Madiun dengan kopi signature, croffle karamel hangat, serta koneksi WiFi stabil untuk nugas.',
    picName: 'Arif Wibowo',
    whatsapp: '081234001107',
    businessEmail: 'halo@kopisareng.id',
    instagramHandle: '@kopisareng.mdn',
    tiktokHandle: '@kopisareng',
    nibNumber: '9120701145307',
    logoBg: '#FF6B1A',
    totalRedemptions: 198,
    totalQuota: 65,
  },
  'RamenYA!': {
    outletType: 'Resto & Mie',
    businessScale: 'Cabang / Waralaba',
    operatingHours: '10.00 - 22.00 WIB',
    establishedYear: '2018',
    description:
      'Ramen kuah kaldu gurih bersertifikat halal dengan pilihan mie lurus maupun keriting yang dimasak segar tiap pesanan.',
    picName: 'Kevin Wijaya',
    whatsapp: '081234001108',
    businessEmail: 'tp3@ramenya.id',
    instagramHandle: '@ramenya.id',
    tiktokHandle: '@ramenya_official',
    nibNumber: '9120803165408',
    logoBg: '#BE123C',
    totalRedemptions: 276,
    totalQuota: 90,
  },
  'Mochi & Matcha House': {
    outletType: 'Bakery & Dessert',
    businessScale: 'Usaha Berkembang',
    operatingHours: '10.00 - 21.30 WIB',
    establishedYear: '2022',
    description:
      'Spesialis mochi daifuku lembut isi buah segar dan minuman matcha Uji autentik buatan rumahan setiap pagi.',
    picName: 'Hana Pertiwi',
    whatsapp: '081234001109',
    businessEmail: 'order@mochimatcha.id',
    instagramHandle: '@mochimatcha.yk',
    tiktokHandle: '@mochimatchayk',
    nibNumber: '9120905123509',
    logoBg: '#0F766E',
    totalRedemptions: 145,
    totalQuota: 50,
  },
  'Janji Jiwa Toast': {
    outletType: 'Cafe & Kopi',
    businessScale: 'Cabang / Waralaba',
    operatingHours: '08.00 - 22.00 WIB',
    establishedYear: '2019',
    description:
      'Paduan kopi susu klasik Indonesia dan roti panggang isi tebal yang praktis untuk sarapan atau makan siang.',
    picName: 'Yoga Mahendra',
    whatsapp: '081234001110',
    businessEmail: 'solo.slamet@jiwagroup.com',
    instagramHandle: '@kopijanjijiwa',
    tiktokHandle: '@janjijiwa.id',
    nibNumber: '9121007189610',
    logoBg: '#181716',
    totalRedemptions: 231,
    totalQuota: 80,
  },
  'Warkop Naik Kelas': {
    outletType: 'Resto & Mie',
    businessScale: 'UMKM / Usaha Rintisan',
    operatingHours: '15.00 - 01.00 WIB',
    establishedYear: '2020',
    description:
      'Warkop modern konsep open space yang menyajikan indomie nyemek kuah kental, roti bakar, dan teh tarik hingga tengah malam.',
    picName: 'Budi Setiawan',
    whatsapp: '081234001111',
    businessEmail: 'kontak@warkopnaikkelas.id',
    instagramHandle: '@warkopnaikkelas.smg',
    tiktokHandle: '@warkopnaikkelas',
    nibNumber: '9121102145711',
    logoBg: '#FF6B1A',
    totalRedemptions: 189,
    totalQuota: 75,
  },
  'Mixue Ice Cream & Tea': {
    outletType: 'Cafe & Kopi',
    businessScale: 'Cabang / Waralaba',
    operatingHours: '09.00 - 22.00 WIB',
    establishedYear: '2020',
    description:
      'Es krim cone lembut dan minuman buah segar dengan harga ramah pelajar di lokasi strategis pusat kota.',
    picName: 'Lina Marlina',
    whatsapp: '081234001112',
    businessEmail: 'madiun.diponegoro@mixue.id',
    instagramHandle: '@mixueindonesia',
    tiktokHandle: '@mixue.id',
    nibNumber: '9121208134812',
    logoBg: '#BE123C',
    totalRedemptions: 504,
    totalQuota: 160,
  },
  'Fore Coffee': {
    outletType: 'Cafe & Kopi',
    businessScale: 'Cabang / Waralaba',
    operatingHours: '07.00 - 22.00 WIB',
    establishedYear: '2018',
    description:
      'Startup kopi lokal berkonsep modern dengan biji arabika 100% pilihan dan menu signature rendah gula.',
    picName: 'Adit Pramana',
    whatsapp: '081234001113',
    businessEmail: 'melawai@fore.coffee',
    instagramHandle: '@fore.coffee',
    tiktokHandle: '@forecoffee.id',
    nibNumber: '9121304178913',
    logoBg: '#0F766E',
    totalRedemptions: 344,
    totalQuota: 105,
  },
};

const deriveSlug = (name: string): string =>
  (name || 'mitra')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 32);

const mapCatalogCategoryToOutletType = (category: string): BusinessOutletType => {
  if (category === 'Kopi & Minuman') return 'Cafe & Kopi';
  if (category === 'Mie & Ramen') return 'Resto & Mie';
  if (category === 'Camilan & Dessert') return 'Bakery & Dessert';
  if (category === 'Nongkrong Malam') return 'Gerobak / UMKM';
  return 'Resto & Mie';
};

const DEFAULT_SWATCHES = ['#181716', '#FF6B1A', '#0F766E', '#2563EB', '#7C3AED', '#BE123C'];

export function readStoredBizOffers(): BusinessOfferItem[] {
  try {
    const raw = localStorage.getItem('promomu_business_catalog_v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readStoredBizRedemptions(): BusinessRedemptionLog[] {
  try {
    const raw = localStorage.getItem('promomu_business_redemptions_v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readStoredOutletOpen(): boolean {
  try {
    const raw = localStorage.getItem('promomu_business_outlet_status_v1');
    return raw === null ? true : JSON.parse(raw) === true;
  } catch {
    return true;
  }
}

export function resolveSellerProfileForPromo(
  promo: PromoItem,
  businessAccount: BusinessAccount | null,
  merchantPromos: PromoItem[]
): SellerPublicProfile {
  const isCustomBusinessPromo = promo.id >= 100000;
  const matchesLocalBusiness = Boolean(
    businessAccount &&
      (isCustomBusinessPromo ||
        promo.merchant.trim().toLowerCase() === businessAccount.businessName.trim().toLowerCase())
  );

  if (matchesLocalBusiness && businessAccount) {
    const offers = readStoredBizOffers();
    const redemptions = readStoredBizRedemptions();
    const activeOffers = offers.filter((o) => o.active !== false);
    const totalQuota = activeOffers.reduce((sum, o) => sum + Math.max(0, o.quota || 0), 0);
    const totalRedemptions = Math.max(
      redemptions.length,
      offers.reduce((sum, o) => sum + (o.redeemedCount || 0), 0)
    );

    const storedSub = readStoredSubscriptionState(businessAccount.subscriptionPlan);
    const activePlanId = businessAccount.subscriptionPlan || storedSub.planId;
    const planSpec = getSubscriptionPlanSpec(activePlanId);

    return {
      businessName: businessAccount.businessName,
      brandSlug: businessAccount.brandSlug || deriveSlug(businessAccount.businessName),
      outletType: businessAccount.outletType,
      businessScale: businessAccount.businessScale || 'UMKM / Usaha Rintisan',
      operatingHours: businessAccount.operatingHours || '08.00 - 22.00 WIB',
      establishedYear: businessAccount.establishedYear,
      instagramHandle: businessAccount.instagramHandle,
      tiktokHandle: businessAccount.tiktokHandle,
      facebookHandle: businessAccount.facebookHandle,
      otherSocial: businessAccount.otherSocial,
      description:
        businessAccount.description ||
        `Outlet resmi ${businessAccount.businessName} yang terdaftar aktif di jaringan PromoMu.`,
      province: businessAccount.province || findProvinceByCity(businessAccount.city),
      city: businessAccount.city,
      address: businessAccount.address,
      picName: businessAccount.picName,
      whatsapp: businessAccount.whatsapp,
      businessEmail: businessAccount.businessEmail,
      nibNumber: businessAccount.nibNumber,
      logoUrl: businessAccount.logoUrl,
      logoBg: businessAccount.logoBg || '#181716',
      bannerUrl: businessAccount.bannerUrl || promo.img,
      isOutletOpen: readStoredOutletOpen(),
      isOwnBusiness: true,
      isVerified: planSpec.hasBlueBadge,
      planTier: planSpec.id,
      totalRedemptions,
      totalQuota: totalQuota || merchantPromos.length * 40,
    };
  }

  const seed = MERCHANT_DIRECTORY[promo.merchant];
  const slug = deriveSlug(promo.merchant);
  const hashNum = promo.merchant
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const swatch = seed?.logoBg || DEFAULT_SWATCHES[hashNum % DEFAULT_SWATCHES.length];
  const inferredOutletType = seed?.outletType || mapCatalogCategoryToOutletType(promo.category);

  return {
    businessName: promo.merchant,
    brandSlug: slug,
    outletType: inferredOutletType,
    businessScale: seed?.businessScale || 'Restoran / Kafe Mandiri',
    operatingHours:
      seed?.operatingHours ||
      (promo.validUntil.includes('WIB') ? promo.validUntil : '08.00 - 22.00 WIB'),
    establishedYear: seed?.establishedYear || String(2016 + (hashNum % 8)),
    instagramHandle: seed?.instagramHandle || `@${slug.replace(/-/g, '')}.id`,
    tiktokHandle: seed?.tiktokHandle || `@${slug.replace(/-/g, '')}`,
    facebookHandle: seed?.facebookHandle,
    otherSocial: seed?.otherSocial,
    description:
      seed?.description ||
      `${promo.merchant} menghadirkan sajian ${promo.category.toLowerCase()} berkualitas di ${promo.city} dengan penawaran voucher digital resmi langsung dari outlet.`,
    province: findProvinceByCity(promo.city),
    city: promo.city,
    address: promo.address,
    picName: seed?.picName || `Pengelola ${promo.merchant}`,
    whatsapp: seed?.whatsapp || `0812${String(10000000 + (hashNum % 89999999)).slice(0, 8)}`,
    businessEmail: seed?.businessEmail || `halo@${slug.replace(/-/g, '')}.id`,
    nibNumber: seed?.nibNumber || `9120${String(100000000 + (hashNum * 7919) % 899999999)}`,
    logoBg: swatch,
    bannerUrl: promo.img,
    isOutletOpen: seed?.isOutletOpen ?? true,
    isOwnBusiness: false,
    isVerified: true,
    totalRedemptions: seed?.totalRedemptions || 85 + (hashNum % 210),
    totalQuota: seed?.totalQuota || merchantPromos.length * 45 + (hashNum % 35),
  };
}

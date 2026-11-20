import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  Check,
  Clock,
  Copy,
  Globe,
  Heart,
  Mail,
  MapPin,
  MessageSquare,
  QrCode,
  Search,
  ShieldCheck,
  Store,
  Tag,
  User,
  X,
} from 'lucide-react';
import defaultBizBanner from '../assets/images/bisnismu_outlet_banner_1795096781081.jpg';
import {
  readStoredBizOffers,
  resolveSellerProfileForPromo,
} from '../data/merchantProfiles';
import { PromoItem, PromoMuStateSnapshot } from '../types/promomu';

interface SellerDashboardModalProps {
  snapshot: PromoMuStateSnapshot;
  selectedPromoId: number;
  onClose: () => void;
}

const formatRp = (num: number) =>
  'Rp ' + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const toWhatsappHref = (rawPhone: string, businessName: string) => {
  const digits = (rawPhone || '').replace(/\D/g, '');
  const normalized = digits.startsWith('0')
    ? `62${digits.slice(1)}`
    : digits.startsWith('62')
    ? digits
    : `62${digits}`;
  const msg = encodeURIComponent(
    `Halo ${businessName}, saya melihat profil bisnis dan promo Anda di PromoMu.`
  );
  return `https://wa.me/${normalized}?text=${msg}`;
};

function PromoImage({
  src,
  alt,
  fallbackLetter,
  className,
}: {
  src: string;
  alt: string;
  fallbackLetter: string;
  className: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`${className} bg-[#FFF4EC] flex items-center justify-center text-lg font-extrabold text-[#FF6B1A]`}
      >
        {fallbackLetter.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export const SellerDashboardModal: React.FC<SellerDashboardModalProps> = ({
  snapshot,
  selectedPromoId,
  onClose,
}) => {
  const { promoItems, businessAccount, savedIds, claimedIds, user } = snapshot;

  const [promoSearch, setPromoSearch] = useState('');
  const [copiedSlug, setCopiedSlug] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);
  const [bannerError, setBannerError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const selectedPromo = useMemo(
    () => promoItems.find((item) => item.id === selectedPromoId) || null,
    [promoItems, selectedPromoId]
  );

  const merchantPromos = useMemo(() => {
    if (!selectedPromo) return [];
    const targetName = selectedPromo.merchant.trim().toLowerCase();
    const list = promoItems.filter(
      (item) => item.merchant.trim().toLowerCase() === targetName
    );
    return list.sort((a, b) => {
      if (a.id === selectedPromo.id) return -1;
      if (b.id === selectedPromo.id) return 1;
      return a.id - b.id;
    });
  }, [promoItems, selectedPromo]);

  const sellerProfile = useMemo(() => {
    if (!selectedPromo) return null;
    return resolveSellerProfileForPromo(selectedPromo, businessAccount, merchantPromos);
  }, [selectedPromo, businessAccount, merchantPromos]);

  const ownOfferMetaByCode = useMemo(() => {
    if (!sellerProfile?.isOwnBusiness) return new Map<string, { quota: number; redeemed: number; desc?: string }>();
    const map = new Map<string, { quota: number; redeemed: number; desc?: string }>();
    readStoredBizOffers().forEach((o) => {
      if (o.code) {
        map.set(o.code.toUpperCase(), {
          quota: o.quota,
          redeemed: o.redeemedCount || 0,
          desc: o.description,
        });
      }
    });
    return map;
  }, [sellerProfile?.isOwnBusiness]);

  const filteredMerchantPromos = useMemo(() => {
    const q = promoSearch.trim().toLowerCase();
    if (!q) return merchantPromos;
    return merchantPromos.filter(
      (item) =>
        item.menu.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q)
    );
  }, [merchantPromos, promoSearch]);

  if (!selectedPromo || !sellerProfile) {
    return null;
  }

  const publicUrlText = `promomu.id/bisnis/${sellerProfile.brandSlug}`;

  const handleCopySlug = () => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(`https://${publicUrlText}`);
      }
      setCopiedSlug(true);
      window.PromoMuBridge?.showToast(`Tautan ${publicUrlText} disalin`);
      setTimeout(() => setCopiedSlug(false), 1800);
    } catch {
      window.PromoMuBridge?.showToast(publicUrlText);
    }
  };

  const handleCopyPromoCode = (promo: PromoItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(promo.code);
      }
      setCopiedCodeId(promo.id);
      window.PromoMuBridge?.showToast(`Kode voucher ${promo.code} disalin`);
      setTimeout(() => setCopiedCodeId(null), 1600);
    } catch {
      window.PromoMuBridge?.showToast(`Kode: ${promo.code}`);
    }
  };

  const handleClaimPromo = (promoId: number) => {
    window.PromoMuBridge?.openVoucherModal(promoId);
  };

  const handleToggleFavorite = (promoId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    window.PromoMuBridge?.toggleSavePromo(promoId);
  };

  const handleOpenOwnerPortal = () => {
    onClose();
    window.PromoMuBridge?.openDashboard('businessPortal');
  };

  const activeBannerSrc =
    !bannerError && sellerProfile.bannerUrl ? sellerProfile.bannerUrl : defaultBizBanner;

  const socialChannels = [
    { label: 'Instagram', value: sellerProfile.instagramHandle },
    { label: 'TikTok', value: sellerProfile.tiktokHandle },
    { label: 'Facebook', value: sellerProfile.facebookHandle },
    { label: 'Lainnya', value: sellerProfile.otherSocial },
  ].filter((entry) => Boolean(entry.value && entry.value.trim()));

  return (
    <div
      className="fixed inset-0 z-40 overflow-y-auto bg-[#FAF6F2]"
      role="dialog"
      aria-modal="true"
      aria-label={`Profil Bisnis ${sellerProfile.businessName}`}
    >
      {/* Top Sticky Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-black/8 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl bg-canvas px-3 py-2 text-xs font-bold text-[#141312] border border-black/10 hover:border-[#141312] transition whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Kembali</span>
            </button>

            <nav
              aria-label="Breadcrumb profil penjual"
              className="hidden sm:flex items-center gap-2 text-xs text-ink-muted min-w-0"
            >
              <span className="whitespace-nowrap">Katalog Promo</span>
              <span aria-hidden="true">/</span>
              <span className="whitespace-nowrap">Dashboard Penjual</span>
              <span aria-hidden="true">/</span>
              <span className="font-bold text-[#141312] truncate max-w-[240px]">
                {sellerProfile.businessName}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {sellerProfile.isOwnBusiness && user ? (
              <button
                type="button"
                onClick={handleOpenOwnerPortal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF6B1A] px-4 py-2 text-xs font-bold text-white hover:bg-[#EA580C] transition whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>Kelola di BisnisMu</span>
              </button>
            ) : (
              <a
                href={toWhatsappHref(sellerProfile.whatsapp, sellerProfile.businessName)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#181716] px-4 py-2 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap shrink-0"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Hubungi Outlet</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup profil penjual"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-canvas text-ink-muted border border-black/10 hover:text-[#141312] hover:border-[#141312] transition shrink-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="mx-auto max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* 1. SELLER STOREFRONT HEADER & LIVE SUMMARY (MIRRORS BISMU DASHBOARD) */}
        <section className="rounded-2xl bg-white border border-black/8 overflow-hidden">
          {/* Banner Foto Outlet */}
          <div className="relative h-44 sm:h-56 w-full bg-[#181716] overflow-hidden">
            <img
              src={activeBannerSrc}
              alt={`Banner outlet ${sellerProfile.businessName}`}
              referrerPolicy="no-referrer"
              onError={() => setBannerError(true)}
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />

            {/* Top-Right Operational Status */}
            <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopySlug}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3.5 py-2 text-xs font-mono font-bold text-[#141312] hover:bg-white transition whitespace-nowrap cursor-pointer"
              >
                {copiedSlug ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-ink-muted" />
                )}
                <span>{copiedSlug ? 'Tautan Disalin' : publicUrlText}</span>
              </button>

              <span
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap ${
                  sellerProfile.isOutletOpen
                    ? 'bg-emerald-600/95 text-white'
                    : 'bg-amber-500/95 text-white'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {sellerProfile.isOutletOpen ? 'Outlet Sedang Buka' : 'Tutup Sementara'}
                </span>
              </span>
            </div>

            {/* Bottom-Left Merchant Logo + Identity */}
            <div className="absolute inset-x-0 bottom-0 p-5 sm:px-8 sm:pb-6 flex items-end gap-4">
              <div className="shrink-0">
                {sellerProfile.logoUrl && !logoError ? (
                  <img
                    src={sellerProfile.logoUrl}
                    alt={sellerProfile.businessName}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoError(true)}
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-2 border-white bg-white"
                  />
                ) : (
                  <div
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white border-2 border-white select-none"
                    style={{ backgroundColor: sellerProfile.logoBg }}
                  >
                    {sellerProfile.businessName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs font-semibold text-white/85">
                  <span className="inline-flex items-center gap-1 text-[#FFD8BF]">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {sellerProfile.planTier === 'enterprise'
                        ? 'Mitra Unggulan PromoMu'
                        : sellerProfile.isVerified
                        ? 'Mitra Terverifikasi PromoMu'
                        : 'Mitra PromoMu'}
                    </span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{sellerProfile.outletType}</span>
                  <span aria-hidden="true">·</span>
                  <span>{sellerProfile.businessScale}</span>
                </div>

                <div className="mt-1 flex items-center gap-2 min-w-0">
                  <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white truncate">
                    {sellerProfile.businessName}
                  </h1>
                  {sellerProfile.isVerified && (
                    <span
                      title="Bisnis Terverifikasi PromoMu"
                      className="inline-flex shrink-0 items-center justify-center"
                    >
                      <BadgeCheck className="h-5 w-5 sm:h-6 sm:w-6 fill-[#1D9BF0] text-white" />
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs sm:text-[13px] text-white/85 truncate">
                  {sellerProfile.province} &rsaquo; {sellerProfile.city} ·{' '}
                  {sellerProfile.operatingHours}
                </p>
              </div>
            </div>
          </div>

          {/* Seller Dashboard Telemetry Summary Strip */}
          <div className="px-5 sm:px-8 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-0 sm:divide-x divide-black/8">
            <div className="sm:pr-6">
              <p className="text-[11px] font-semibold text-ink-muted">Promo Aktif</p>
              <p className="mt-0.5 font-mono text-lg font-extrabold text-[#141312] tabular-nums">
                {merchantPromos.length}
                <span className="ml-1.5 font-sans text-xs font-medium text-ink-muted">
                  menu diunggah
                </span>
              </p>
            </div>
            <div className="sm:px-6">
              <p className="text-[11px] font-semibold text-ink-muted">Sisa Kuota Promo</p>
              <p className="mt-0.5 font-mono text-lg font-extrabold text-emerald-700 tabular-nums">
                {sellerProfile.totalQuota}
                <span className="ml-1.5 font-sans text-xs font-medium text-ink-muted">
                  voucher
                </span>
              </p>
            </div>
            <div className="sm:px-6">
              <p className="text-[11px] font-semibold text-ink-muted">Total Penukaran</p>
              <p className="mt-0.5 font-mono text-lg font-extrabold text-[#FF6B1A] tabular-nums">
                {sellerProfile.totalRedemptions}
                <span className="ml-1.5 font-sans text-xs font-medium text-ink-muted">
                  klaim
                </span>
              </p>
            </div>
            <div className="sm:pl-6">
              <p className="text-[11px] font-semibold text-ink-muted">Berdiri Sejak</p>
              <p className="mt-0.5 font-mono text-lg font-extrabold text-[#141312] tabular-nums">
                {sellerProfile.establishedYear || '2022'}
              </p>
            </div>
          </div>
        </section>

        {/* 2. TWO-COLUMN SELLER WORKSPACE: ETALASE PROMO (8 COLS) + PROFIL AKUN BISNIS (4 COLS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Cols: Etalase Promo yang Diupload Penjual */}
          <section className="lg:col-span-8 space-y-5">
            {/* Highlighted Selected Promo from Main Dashboard */}
            <div className="rounded-2xl bg-white p-5 sm:p-6 border border-black/8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/8">
                <div className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
                  <Tag className="h-3.5 w-3.5 text-[#FF6B1A]" />
                  <span>Promo yang Anda Pilih</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedPromo.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedPromo.validUntil}</span>
                </div>
                <span className="font-mono text-xs font-bold text-[#FF6B1A]">
                  {selectedPromo.badge}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-5 items-stretch">
                <div className="sm:w-56 shrink-0 rounded-xl overflow-hidden bg-canvas border border-black/8 h-44 sm:h-auto sm:min-h-[168px]">
                  <PromoImage
                    src={selectedPromo.img}
                    alt={selectedPromo.menu}
                    fallbackLetter={selectedPromo.merchant}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-lg sm:text-xl font-extrabold text-[#141312] leading-snug">
                      {selectedPromo.menu}
                    </h2>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      {ownOfferMetaByCode.get(selectedPromo.code.toUpperCase())?.desc ||
                        `Tunjukkan kode voucher digital di kasir ${sellerProfile.businessName} (${selectedPromo.address}) untuk menikmati harga promo spesial.`}
                    </p>
                    <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span>Kode Voucher:</span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyPromoCode(selectedPromo, e)}
                        className="inline-flex items-center gap-1.5 font-mono font-bold text-[#141312] hover:text-[#FF6B1A] transition cursor-pointer"
                      >
                        <span>{selectedPromo.code}</span>
                        {copiedCodeId === selectedPromo.id ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-ink-light" />
                        )}
                      </button>
                      {ownOfferMetaByCode.has(selectedPromo.code.toUpperCase()) && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            Sisa kuota{' '}
                            <strong className="text-[#141312]">
                              {ownOfferMetaByCode.get(selectedPromo.code.toUpperCase())?.quota}
                            </strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-black/8 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-mono tabular-nums text-ink-light line-through">
                        {formatRp(selectedPromo.oldPrice)}
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xl font-extrabold text-[#FF6B1A] tabular-nums">
                          {formatRp(selectedPromo.promoPrice)}
                        </span>
                        {selectedPromo.oldPrice > selectedPromo.promoPrice && (
                          <span className="font-mono text-[11px] font-bold text-emerald-700 tabular-nums">
                            Hemat {formatRp(selectedPromo.oldPrice - selectedPromo.promoPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(selectedPromo.id, e)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold border transition whitespace-nowrap shrink-0 cursor-pointer ${
                          savedIds.includes(selectedPromo.id)
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : 'bg-canvas text-[#141312] border-black/10 hover:border-[#141312]'
                        }`}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 ${
                            savedIds.includes(selectedPromo.id) ? 'fill-current' : ''
                          }`}
                        />
                        <span>
                          {savedIds.includes(selectedPromo.id) ? 'Tersimpan' : 'Simpan'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleClaimPromo(selectedPromo.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#181716] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>
                          {claimedIds.includes(selectedPromo.id)
                            ? 'Lihat Voucher QR'
                            : 'Klaim Promo'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full List of Promos Uploaded by This Seller */}
            <div className="rounded-2xl bg-white p-5 sm:p-6 border border-black/8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/8">
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-[#141312]">
                    Semua Promo dari {sellerProfile.businessName}
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Daftar menu promo aktif yang diunggah oleh akun bisnis penjual ini.
                  </p>
                </div>

                {merchantPromos.length > 1 && (
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-ink-light absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={promoSearch}
                      onChange={(e) => setPromoSearch(e.target.value)}
                      placeholder="Cari menu penjual..."
                      className="w-full sm:w-48 rounded-xl bg-canvas pl-8 pr-3 py-2 text-xs text-ink border border-black/10 focus:outline-none focus:border-[#FF6B1A]"
                    />
                  </div>
                )}
              </div>

              {filteredMerchantPromos.length === 0 ? (
                <div className="py-8 text-center text-xs text-ink-muted">
                  Tidak ada menu promo yang cocok dengan pencarian Anda.
                </div>
              ) : (
                <div className="divide-y divide-black/6">
                  {filteredMerchantPromos.map((item) => {
                    const isSaved = savedIds.includes(item.id);
                    const isClaimed = claimedIds.includes(item.id);
                    const isCurrent = item.id === selectedPromo.id;
                    const ownMeta = ownOfferMetaByCode.get(item.code.toUpperCase());

                    return (
                      <div
                        key={item.id}
                        className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className="h-16 w-20 shrink-0 rounded-xl overflow-hidden border border-black/8 bg-canvas">
                            <PromoImage
                              src={item.img}
                              alt={item.menu}
                              fallbackLetter={item.merchant}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <h3 className="text-sm font-bold text-[#141312] leading-snug">
                                {item.menu}
                              </h3>
                              {isCurrent && (
                                <span className="text-[11px] font-bold text-[#FF6B1A]">
                                  Sedang Dilihat
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-muted">
                              <span>{item.category}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-[#141312]">{item.badge}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono font-semibold">{item.code}</span>
                              <span aria-hidden="true">·</span>
                              <span>{item.validUntil}</span>
                              {ownMeta && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums">
                                    Sisa {ownMeta.quota}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex items-baseline gap-2 pt-0.5">
                              <span className="font-mono text-sm font-extrabold text-[#FF6B1A] tabular-nums">
                                {formatRp(item.promoPrice)}
                              </span>
                              <span className="font-mono text-[11px] text-ink-light line-through tabular-nums">
                                {formatRp(item.oldPrice)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(item.id, e)}
                            aria-label="Simpan promo favorit"
                            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition cursor-pointer ${
                              isSaved
                                ? 'bg-rose-50 text-rose-600 border-rose-200'
                                : 'bg-canvas text-ink-muted border-black/10 hover:border-[#141312] hover:text-[#141312]'
                            }`}
                          >
                            <Heart className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleClaimPromo(item.id)}
                            className="rounded-xl bg-[#181716] px-4 py-2 text-xs font-bold text-white hover:bg-[#FF6B1A] transition whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {isClaimed ? 'Buka Voucher' : 'Klaim Promo'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Right 4 Cols: Identitas & Profil Dashboard Akun Penjual */}
          <aside className="lg:col-span-4 space-y-5">
            <div className="rounded-2xl bg-white p-5 sm:p-6 border border-black/8 space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-black/8">
                <Store className="h-4 w-4 text-[#FF6B1A] shrink-0" />
                <h2 className="text-sm sm:text-base font-extrabold text-[#141312]">
                  Profil Akun Bisnis
                </h2>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed">
                {sellerProfile.description}
              </p>

              <div className="pt-3 border-t border-black/8 space-y-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-ink-muted block">
                    Bidang &amp; Skala Usaha
                  </span>
                  <span className="font-semibold text-[#141312]">
                    {sellerProfile.outletType} · {sellerProfile.businessScale}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-ink-muted block">
                    Wilayah &amp; Alamat Outlet
                  </span>
                  <span className="font-semibold text-[#141312] leading-relaxed flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#FF6B1A] shrink-0 mt-0.5" />
                    <span>
                      {sellerProfile.address} ({sellerProfile.city}, {sellerProfile.province})
                    </span>
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-ink-muted block">
                    Jam Operasional
                  </span>
                  <span className="font-mono font-semibold text-[#141312] tabular-nums flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-ink-muted shrink-0" />
                    <span>{sellerProfile.operatingHours}</span>
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-ink-muted block">
                    Penanggung Jawab Outlet
                  </span>
                  <span className="font-semibold text-[#141312] flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-ink-muted shrink-0" />
                    <span>{sellerProfile.picName}</span>
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-ink-muted block">
                    Email Resmi Bisnis
                  </span>
                  <span className="font-semibold text-[#141312] break-all flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-ink-muted shrink-0" />
                    <span>{sellerProfile.businessEmail}</span>
                  </span>
                </div>

                {sellerProfile.nibNumber && (
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-medium text-ink-muted block">
                      Nomor NIB / Legalitas
                    </span>
                    <span className="font-mono font-semibold text-[#141312] tabular-nums">
                      {sellerProfile.nibNumber}
                    </span>
                  </div>
                )}

                {socialChannels.length > 0 && (
                  <div className="pt-2 border-t border-black/8 space-y-1.5">
                    <span className="text-[11px] font-medium text-ink-muted flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-ink-muted" />
                      <span>Media Sosial Bisnis</span>
                    </span>
                    <div className="space-y-1">
                      {socialChannels.map((ch) => (
                        <div
                          key={ch.label}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-ink-muted">{ch.label}</span>
                          <span className="font-semibold text-[#141312] truncate">
                            {ch.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-black/8 flex flex-col gap-2">
                <a
                  href={toWhatsappHref(sellerProfile.whatsapp, sellerProfile.businessName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition whitespace-nowrap"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Chat WhatsApp Penjual</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopySlug}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-canvas px-4 py-2 text-xs font-bold text-[#141312] border border-black/10 hover:border-[#141312] transition whitespace-nowrap cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedSlug ? 'Tautan Profil Disalin' : 'Salin Tautan Profil'}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

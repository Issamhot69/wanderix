// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export type MultilingualText = {
  en?: string;
  fr?: string;
  ar?: string;
  es?: string;
  de?: string;
  it?: string;
  zh?: string;
  ja?: string;
};

export type GuideStatus = 'active' | 'inactive' | 'pending' | 'suspended';

// ─────────────────────────────────────────
// Modèle Guide
// ─────────────────────────────────────────

export interface GuideModel {
  id: string;
  userId: string;
  destinationId?: string;

  // Profil multilingue
  bio: MultilingualText;
  specialty: MultilingualText;

  // Compétences
  languages: string[];
  certifications: string[];
  experienceYears: number;

  // Tarifs
  pricePerDay: number;
  pricePerHalf: number;
  currency: string;

  // Médias
  avatarUrl?: string;
  images: string[];

  // Scores
  rating: number;
  reviewCount: number;
  tourCount: number;

  // Statut
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────

export interface CreateGuideDto {
  userId: string;
  destinationId?: string;
  bio?: MultilingualText;
  specialty?: MultilingualText;
  languages: string[];
  certifications?: string[];
  experienceYears?: number;
  pricePerDay: number;
  pricePerHalf?: number;
  currency?: string;
  avatarUrl?: string;
  images?: string[];
}

export interface UpdateGuideDto extends Partial<CreateGuideDto> {}

export interface GuideFilterDto {
  destinationId?: string;
  languages?: string[];
  minRating?: number;
  maxPrice?: number;
  language?: string;
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────
// Response
// ─────────────────────────────────────────

export interface GuideResponse {
  id: string;
  bio: string;
  specialty: string;
  languages: string[];
  certifications: string[];
  experienceYears: number;
  pricePerDay: number;
  pricePerHalf: number;
  currency: string;
  avatarUrl?: string;
  images: string[];
  rating: number;
  reviewCount: number;
  tourCount: number;
  isVerified: boolean;
}

// ─────────────────────────────────────────
// Helper — localiser un guide
// ─────────────────────────────────────────

function localizeText(
  text: MultilingualText,
  language: string,
): string {
  return (
    text[language as keyof MultilingualText] ||
    text['en'] ||
    Object.values(text).find(Boolean) ||
    ''
  );
}

export function localizeGuide(
  guide: GuideModel,
  language: string,
): GuideResponse {
  return {
    id: guide.id,
    bio: localizeText(guide.bio, language),
    specialty: localizeText(guide.specialty, language),
    languages: guide.languages,
    certifications: guide.certifications,
    experienceYears: guide.experienceYears,
    pricePerDay: guide.pricePerDay,
    pricePerHalf: guide.pricePerHalf,
    currency: guide.currency,
    avatarUrl: guide.avatarUrl,
    images: guide.images,
    rating: guide.rating,
    reviewCount: guide.reviewCount,
    tourCount: guide.tourCount,
    isVerified: guide.isVerified,
  };
}
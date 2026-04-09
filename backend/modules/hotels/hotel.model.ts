// ─────────────────────────────────────────
// Types multilingues
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

export type HotelCategory =
  | 'hotel'
  | 'riad'
  | 'resort'
  | 'hostel'
  | 'apartment'
  | 'villa';

export type HotelStatus = 'active' | 'inactive' | 'pending' | 'suspended';

// ─────────────────────────────────────────
// Modèle Hotel
// ─────────────────────────────────────────

export interface HotelModel {
  id: string;
  destinationId: string;
  partnerId?: string;

  // Contenu multilingue
  name: MultilingualText;
  description: MultilingualText;
  amenities: MultilingualText;
  address: MultilingualText;

  // Infos
  stars: number;
  category: HotelCategory;
  email?: string;
  phone?: string;
  website?: string;

  // Localisation
  latitude?: number;
  longitude?: number;

  // Prix
  pricePerNight: number;
  currency: string;

  // Médias
  coverImageUrl?: string;
  images: string[];

  // Scores
  rating: number;
  reviewCount: number;

  // Statut
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────

export interface CreateHotelDto {
  destinationId: string;
  partnerId?: string;
  name: MultilingualText;
  description?: MultilingualText;
  amenities?: MultilingualText;
  address?: MultilingualText;
  stars: number;
  category: HotelCategory;
  email?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  pricePerNight: number;
  currency?: string;
  coverImageUrl?: string;
  images?: string[];
}

export interface UpdateHotelDto extends Partial<CreateHotelDto> {}

export interface HotelFilterDto {
  destinationId?: string;
  stars?: number;
  minPrice?: number;
  maxPrice?: number;
  category?: HotelCategory;
  language?: string;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'rating' | 'stars';
  sortOrder?: 'asc' | 'desc';
}

// ─────────────────────────────────────────
// Response formatée pour le client
// ─────────────────────────────────────────

export interface HotelResponse {
  id: string;
  name: string;               // dans la langue du user
  description: string;
  amenities: string;
  address: string;
  stars: number;
  category: HotelCategory;
  pricePerNight: number;
  currency: string;
  coverImageUrl?: string;
  images: string[];
  rating: number;
  reviewCount: number;
  latitude?: number;
  longitude?: number;
  isVerified: boolean;
}

// ─────────────────────────────────────────
// Helper — extraire le texte dans la bonne langue
// ─────────────────────────────────────────

export function localizeText(
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

export function localizeHotel(
  hotel: HotelModel,
  language: string,
): HotelResponse {
  return {
    id: hotel.id,
    name: localizeText(hotel.name, language),
    description: localizeText(hotel.description, language),
    amenities: localizeText(hotel.amenities, language),
    address: localizeText(hotel.address, language),
    stars: hotel.stars,
    category: hotel.category,
    pricePerNight: hotel.pricePerNight,
    currency: hotel.currency,
    coverImageUrl: hotel.coverImageUrl,
    images: hotel.images,
    rating: hotel.rating,
    reviewCount: hotel.reviewCount,
    latitude: hotel.latitude,
    longitude: hotel.longitude,
    isVerified: hotel.isVerified,
  };
}
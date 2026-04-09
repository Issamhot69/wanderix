// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

export type TripStatus =
  | 'draft'
  | 'confirmed'
  | 'ongoing'
  | 'completed'
  | 'cancelled';

export type TravelStyle =
  | 'luxury'
  | 'budget'
  | 'adventure'
  | 'cultural'
  | 'family';

export type BudgetLevel = 'low' | 'medium' | 'high';

export type GroupType = 'solo' | 'couple' | 'family' | 'group';

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

// ─────────────────────────────────────────
// Structure d'un jour d'itinéraire
// ─────────────────────────────────────────

export interface ItineraryDay {
  day: number;
  date?: string;
  morning: MultilingualText;
  afternoon: MultilingualText;
  evening: MultilingualText;
  dining: MultilingualText;
  tips?: MultilingualText;
}

// ─────────────────────────────────────────
// Modèle Trip
// ─────────────────────────────────────────

export interface TripModel {
  id: string;
  userId: string;
  destinationId?: string;

  // Contenu multilingue
  title: MultilingualText;
  overview: MultilingualText;
  itinerary: ItineraryDay[];
  practicalTips: MultilingualText;

  // Langue de génération
  language: string;

  // Paramètres
  durationDays: number;
  travelStyle?: TravelStyle;
  budgetLevel?: BudgetLevel;
  groupType?: GroupType;
  interests?: string[];

  // Dates
  startDate?: Date;
  endDate?: Date;

  // Statut
  status: TripStatus;
  isPublic: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────

export interface CreateTripDto {
  userId: string;
  destination: string;
  destinationId?: string;
  language?: string;
  durationDays: number;
  travelStyle?: TravelStyle;
  budgetLevel?: BudgetLevel;
  groupType?: GroupType;
  interests?: string[];
  startDate?: Date;
  nationality?: string;
}

export interface UpdateTripDto {
  title?: MultilingualText;
  startDate?: Date;
  endDate?: Date;
  status?: TripStatus;
  isPublic?: boolean;
}

export interface TripFilterDto {
  userId?: string;
  destinationId?: string;
  status?: TripStatus;
  isPublic?: boolean;
  language?: string;
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────
// Response
// ─────────────────────────────────────────

export interface TripResponse {
  id: string;
  title: string;
  overview: string;
  itinerary: {
    day: number;
    date?: string;
    morning: string;
    afternoon: string;
    evening: string;
    dining: string;
    tips?: string;
  }[];
  practicalTips: string;
  language: string;
  durationDays: number;
  travelStyle?: TravelStyle;
  budgetLevel?: BudgetLevel;
  groupType?: GroupType;
  interests?: string[];
  startDate?: Date;
  endDate?: Date;
  status: TripStatus;
  isPublic: boolean;
  createdAt: Date;
}

// ─────────────────────────────────────────
// Helper — localiser un trip
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

export function localizeTrip(
  trip: TripModel,
  language: string,
): TripResponse {
  return {
    id: trip.id,
    title: localizeText(trip.title, language),
    overview: localizeText(trip.overview, language),
    itinerary: trip.itinerary.map((day) => ({
      day: day.day,
      date: day.date,
      morning: localizeText(day.morning, language),
      afternoon: localizeText(day.afternoon, language),
      evening: localizeText(day.evening, language),
      dining: localizeText(day.dining, language),
      tips: day.tips ? localizeText(day.tips, language) : undefined,
    })),
    practicalTips: localizeText(trip.practicalTips, language),
    language: trip.language,
    durationDays: trip.durationDays,
    travelStyle: trip.travelStyle,
    budgetLevel: trip.budgetLevel,
    groupType: trip.groupType,
    interests: trip.interests,
    startDate: trip.startDate,
    endDate: trip.endDate,
    status: trip.status,
    isPublic: trip.isPublic,
    createdAt: trip.createdAt,
  };
}
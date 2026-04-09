-- ═══════════════════════════════════════════════════════
--  WANDERIX — DATABASE SCHEMA
--  Plateforme de voyage internationale multilingue
-- ═══════════════════════════════════════════════════════

-- Extensions PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- recherche texte floue
CREATE EXTENSION IF NOT EXISTS "unaccent";    -- recherche sans accents

-- ─────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email             VARCHAR(255) UNIQUE NOT NULL,
  password          VARCHAR(255),                    -- NULL si OAuth
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  phone             VARCHAR(30),
  avatar_url        TEXT,
  role              VARCHAR(20) NOT NULL DEFAULT 'tourist'
                    CHECK (role IN ('tourist', 'guide', 'partner', 'admin')),

  -- Multilingue
  language          VARCHAR(5) NOT NULL DEFAULT 'en'
                    CHECK (language IN ('en','fr','ar','es','de','it','zh','ja')),
  nationality       VARCHAR(100),
  timezone          VARCHAR(50) DEFAULT 'UTC',
  currency          VARCHAR(3) DEFAULT 'USD',

  -- OAuth
  provider          VARCHAR(20) CHECK (provider IN ('google', 'apple', 'email')),
  provider_id       VARCHAR(255),

  -- Préférences voyage
  travel_style      VARCHAR(20) CHECK (travel_style IN ('luxury','budget','adventure','cultural','family')),
  interests         TEXT[],                          -- ['food','history','beaches']
  budget_level      VARCHAR(10) CHECK (budget_level IN ('low','medium','high')),
  group_type        VARCHAR(10) CHECK (group_type IN ('solo','couple','family','group')),

  -- Statut
  is_verified       BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE,
  last_login_at     TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_language ON users(language);

-- ─────────────────────────────────────────
-- 2. DESTINATIONS
-- ─────────────────────────────────────────

CREATE TABLE destinations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug              VARCHAR(100) UNIQUE NOT NULL,   -- 'marrakech', 'paris'
  country_code      VARCHAR(3) NOT NULL,             -- 'MA', 'FR'
  continent         VARCHAR(20),

  -- Contenu multilingue (JSONB)
  name              JSONB NOT NULL,
  -- {"en": "Marrakech", "fr": "Marrakech", "ar": "مراكش", "es": "Marrakech"}

  description       JSONB,
  highlights        JSONB,                           -- points forts par langue

  -- Géolocalisation
  latitude          DECIMAL(9,6),
  longitude         DECIMAL(9,6),

  -- Médias
  cover_image_url   TEXT,
  images            TEXT[],

  -- Méta
  is_active         BOOLEAN DEFAULT TRUE,
  popularity_score  DECIMAL(5,2) DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_destinations_slug ON destinations(slug);
CREATE INDEX idx_destinations_country ON destinations(country_code);
CREATE INDEX idx_destinations_name ON destinations USING gin(name);

-- ─────────────────────────────────────────
-- 3. HOTELS
-- ─────────────────────────────────────────

CREATE TABLE hotels (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination_id    UUID REFERENCES destinations(id) ON DELETE SET NULL,
  partner_id        UUID,                            -- référence partners

  -- Contenu multilingue
  name              JSONB NOT NULL,
  description       JSONB,
  amenities         JSONB,                           -- liste des équipements par langue

  -- Infos
  stars             SMALLINT CHECK (stars BETWEEN 1 AND 5),
  category          VARCHAR(30) CHECK (category IN ('hotel','riad','resort','hostel','apartment','villa')),
  email             VARCHAR(255),
  phone             VARCHAR(30),
  website           VARCHAR(255),

  -- Localisation
  address           JSONB,                           -- {"en": "...", "fr": "...", "ar": "..."}
  latitude          DECIMAL(9,6),
  longitude         DECIMAL(9,6),

  -- Prix
  price_per_night   DECIMAL(10,2),
  currency          VARCHAR(3) DEFAULT 'USD',

  -- Médias
  cover_image_url   TEXT,
  images            TEXT[],

  -- Scores
  rating            DECIMAL(3,2) DEFAULT 0,
  review_count      INTEGER DEFAULT 0,

  -- Statut
  is_active         BOOLEAN DEFAULT TRUE,
  is_verified       BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_hotels_destination ON hotels(destination_id);
CREATE INDEX idx_hotels_stars ON hotels(stars);
CREATE INDEX idx_hotels_rating ON hotels(rating DESC);
CREATE INDEX idx_hotels_price ON hotels(price_per_night);

-- ─────────────────────────────────────────
-- 4. GUIDES
-- ─────────────────────────────────────────

CREATE TABLE guides (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  destination_id    UUID REFERENCES destinations(id) ON DELETE SET NULL,

  -- Profil multilingue
  bio               JSONB,                           -- bio par langue
  specialty         JSONB,                           -- spécialité par langue

  -- Compétences
  languages         TEXT[] NOT NULL,                 -- ['en','fr','ar']
  certifications    TEXT[],
  experience_years  SMALLINT DEFAULT 0,

  -- Tarifs
  price_per_day     DECIMAL(10,2),
  price_per_half    DECIMAL(10,2),
  currency          VARCHAR(3) DEFAULT 'USD',

  -- Médias
  avatar_url        TEXT,
  images            TEXT[],

  -- Scores
  rating            DECIMAL(3,2) DEFAULT 0,
  review_count      INTEGER DEFAULT 0,
  tour_count        INTEGER DEFAULT 0,

  -- Statut
  is_active         BOOLEAN DEFAULT TRUE,
  is_verified       BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_guides_destination ON guides(destination_id);
CREATE INDEX idx_guides_languages ON guides USING gin(languages);
CREATE INDEX idx_guides_rating ON guides(rating DESC);

-- ─────────────────────────────────────────
-- 5. TRIPS (Itinéraires générés par IA)
-- ─────────────────────────────────────────

CREATE TABLE trips (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
  destination_id    UUID REFERENCES destinations(id) ON DELETE SET NULL,

  -- Contenu IA multilingue
  title             JSONB,
  itinerary         JSONB NOT NULL,                  -- itinéraire complet par langue
  language          VARCHAR(5) NOT NULL DEFAULT 'en',

  -- Paramètres
  duration_days     SMALLINT NOT NULL,
  travel_style      VARCHAR(20),
  budget_level      VARCHAR(10),
  group_type        VARCHAR(10),
  interests         TEXT[],

  -- Dates
  start_date        DATE,
  end_date          DATE,

  -- Statut
  status            VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft','confirmed','ongoing','completed','cancelled')),

  is_public         BOOLEAN DEFAULT FALSE,           -- partage communautaire
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_trips_destination ON trips(destination_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_dates ON trips(start_date, end_date);

-- ─────────────────────────────────────────
-- 6. BOOKINGS
-- ─────────────────────────────────────────

CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  trip_id           UUID REFERENCES trips(id) ON DELETE SET NULL,

  -- Type de réservation
  booking_type      VARCHAR(20) NOT NULL
                    CHECK (booking_type IN ('hotel','flight','guide','activity')),

  -- Références
  hotel_id          UUID REFERENCES hotels(id) ON DELETE SET NULL,
  guide_id          UUID REFERENCES guides(id) ON DELETE SET NULL,
  flight_ref        VARCHAR(100),                    -- référence Amadeus

  -- Dates
  check_in          DATE,
  check_out         DATE,
  booking_date      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Tarification
  base_amount       DECIMAL(10,2) NOT NULL,
  commission_rate   DECIMAL(5,2) DEFAULT 10.00,      -- % Wanderix
  commission_amount DECIMAL(10,2),
  total_amount      DECIMAL(10,2) NOT NULL,
  currency          VARCHAR(3) DEFAULT 'USD',

  -- Statut
  status            VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','cancelled','completed','refunded')),

  -- Multilingue
  language          VARCHAR(5) DEFAULT 'en',
  notes             TEXT,

  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_hotel ON bookings(hotel_id);
CREATE INDEX idx_bookings_guide ON bookings(guide_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);

-- ─────────────────────────────────────────
-- 7. PAYMENTS
-- ─────────────────────────────────────────

CREATE TABLE payments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Stripe
  stripe_payment_id VARCHAR(255) UNIQUE,
  stripe_intent_id  VARCHAR(255),

  -- Montants
  amount            DECIMAL(10,2) NOT NULL,
  currency          VARCHAR(3) DEFAULT 'USD',
  commission        DECIMAL(10,2),

  -- Statut
  status            VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','succeeded','failed','refunded')),

  -- Méta
  payment_method    VARCHAR(30),                     -- 'card','wallet','bank'
  failure_reason    TEXT,
  paid_at           TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON payments(booking_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_id);

-- ─────────────────────────────────────────
-- 8. WALLETS
-- ─────────────────────────────────────────

CREATE TABLE wallets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance           DECIMAL(10,2) DEFAULT 0,
  currency          VARCHAR(3) DEFAULT 'USD',
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id         UUID REFERENCES wallets(id) ON DELETE CASCADE,
  type              VARCHAR(20) CHECK (type IN ('credit','debit','payout','refund')),
  amount            DECIMAL(10,2) NOT NULL,
  balance_after     DECIMAL(10,2),
  description       JSONB,                           -- description multilingue
  reference_id      UUID,                            -- booking_id ou payment_id
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wallet_user ON wallets(user_id);
CREATE INDEX idx_wallet_tx ON wallet_transactions(wallet_id);

-- ─────────────────────────────────────────
-- 9. REVIEWS
-- ─────────────────────────────────────────

CREATE TABLE reviews (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  booking_id        UUID REFERENCES bookings(id) ON DELETE SET NULL,

  -- Cible
  target_type       VARCHAR(20) CHECK (target_type IN ('hotel','guide','trip','activity')),
  hotel_id          UUID REFERENCES hotels(id) ON DELETE CASCADE,
  guide_id          UUID REFERENCES guides(id) ON DELETE CASCADE,

  -- Contenu multilingue
  comment           JSONB,                           -- {"en": "...", "fr": "..."}
  original_language VARCHAR(5),                      -- langue originale du commentaire

  -- Notes
  rating            SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  cleanliness       SMALLINT CHECK (cleanliness BETWEEN 1 AND 5),
  service           SMALLINT CHECK (service BETWEEN 1 AND 5),
  location          SMALLINT CHECK (location BETWEEN 1 AND 5),
  value             SMALLINT CHECK (value BETWEEN 1 AND 5),

  -- Statut
  is_verified       BOOLEAN DEFAULT FALSE,
  is_published      BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reviews_hotel ON reviews(hotel_id);
CREATE INDEX idx_reviews_guide ON reviews(guide_id);
CREATE INDEX idx_reviews_rating ON reviews(rating DESC);

-- ─────────────────────────────────────────
-- 10. PARTNERS
-- ─────────────────────────────────────────

CREATE TABLE partners (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Infos société
  company_name      VARCHAR(255) NOT NULL,
  company_type      VARCHAR(30) CHECK (company_type IN ('hotel','agency','activity','transport')),
  registration_no   VARCHAR(100),
  tax_id            VARCHAR(100),

  -- Contact
  contact_email     VARCHAR(255),
  contact_phone     VARCHAR(30),
  website           VARCHAR(255),

  -- Contrat
  commission_rate   DECIMAL(5,2) DEFAULT 10.00,
  contract_signed   BOOLEAN DEFAULT FALSE,
  contract_date     DATE,

  -- Statut
  status            VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','active','suspended','rejected')),
  is_verified       BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_partners_status ON partners(status);
CREATE INDEX idx_partners_type ON partners(company_type);

-- ─────────────────────────────────────────
-- 11. NOTIFICATIONS
-- ─────────────────────────────────────────

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Contenu multilingue
  type              VARCHAR(50) NOT NULL,
  title             JSONB NOT NULL,
  message           JSONB NOT NULL,

  -- Canaux
  channel           VARCHAR(20) CHECK (channel IN ('push','email','sms','in_app')),
  is_read           BOOLEAN DEFAULT FALSE,
  sent_at           TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ─────────────────────────────────────────
-- 12. TRANSLATIONS CACHE (traductions vérifiées)
-- ─────────────────────────────────────────

CREATE TABLE translations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_text       TEXT NOT NULL,
  source_lang       VARCHAR(5) NOT NULL,
  target_lang       VARCHAR(5) NOT NULL,
  translated_text   TEXT NOT NULL,
  context           VARCHAR(100),
  is_verified       BOOLEAN DEFAULT FALSE,   -- TRUE = traduction humaine
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_text, source_lang, target_lang, context)
);

CREATE INDEX idx_translations_langs ON translations(source_lang, target_lang);
CREATE INDEX idx_translations_verified ON translations(is_verified);

-- ─────────────────────────────────────────
-- TRIGGERS — updated_at automatique
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_hotels_updated
  BEFORE UPDATE ON hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payments_updated
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_partners_updated
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_trips_updated
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
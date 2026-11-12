export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    name_en TEXT NOT NULL,
    venue TEXT NOT NULL,
    venue_en TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    description TEXT NOT NULL,
    description_en TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ticket_categories (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id),
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_en TEXT NOT NULL,
    price_idr INTEGER NOT NULL,
    color_hex TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    quota INTEGER NOT NULL,
    sales_open BOOLEAN NOT NULL DEFAULT TRUE
  )`,
  `CREATE TABLE IF NOT EXISTS seats (
    id TEXT PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES ticket_categories(id),
    section TEXT NOT NULL,
    row TEXT NOT NULL,
    num INTEGER NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    z REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','held','sold')),
    hold_token TEXT UNIQUE,
    hold_expires_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_seats_category ON seats(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_seats_status ON seats(status)`,
  `CREATE TABLE IF NOT EXISTS orders (
    code TEXT PRIMARY KEY,
    seat_id TEXT NOT NULL REFERENCES seats(id),
    hold_token TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    total_idr INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
    payment_method TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_seat_active ON orders(seat_id) WHERE status IN ('pending','paid')`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
  `CREATE TABLE IF NOT EXISTS scans (
    id SERIAL PRIMARY KEY,
    payload TEXT NOT NULL,
    result TEXT NOT NULL,
    order_code TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
]

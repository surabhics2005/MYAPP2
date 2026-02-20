PRAGMA foreign_keys = ON;

-- ================================
-- USERS
-- ================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ================================
-- CARDS
-- ================================
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT,
  data TEXT NOT NULL,
  theme TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cards_user ON cards(user_id);

-- ================================
-- CONTACTS
-- ================================
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  location TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_user_id);

-- ================================
-- ANALYTICS EVENTS (single source of truth)
-- ================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,        -- owner of the card (not the visitor)
  card_id TEXT NOT NULL,
  event_type TEXT NOT NULL,        -- view | click | save
  action TEXT DEFAULT '',          -- whatsapp/call/email/...
  src TEXT DEFAULT '',             -- qr/link/direct/...
  visitor_id TEXT DEFAULT '',      -- device id
  created_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(card_id) REFERENCES cards(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ae_user_card ON analytics_events(user_id, card_id);
CREATE INDEX IF NOT EXISTS idx_ae_card ON analytics_events(card_id);
CREATE INDEX IF NOT EXISTS idx_ae_type ON analytics_events(event_type);

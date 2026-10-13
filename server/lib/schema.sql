-- Схема реферальной программы Йотунхейм. Идемпотентна: безопасно запускать при каждом старте.

CREATE TABLE IF NOT EXISTS users (
  id                  BIGSERIAL PRIMARY KEY,
  email               TEXT UNIQUE NOT NULL,
  phone               TEXT,
  name                TEXT,
  tg_id               BIGINT UNIQUE,
  tg_username         TEXT,
  referred_by         BIGINT REFERENCES users(id),
  ref_discount_until  TIMESTAMPTZ,
  ref_discount_used   BOOLEAN NOT NULL DEFAULT FALSE,
  ref_bonus_paid      BOOLEAN NOT NULL DEFAULT FALSE,  -- пригласившему уже начислили +1000 JC за этого друга
  rank                INT NOT NULL DEFAULT 0,          -- достигнутый ранг (не понижается)
  rank_bonus_given    INT NOT NULL DEFAULT 0,          -- до какого ранга выданы разовые бонусы JC
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_referred_by_idx ON users(referred_by);
CREATE INDEX IF NOT EXISTS users_phone_idx ON users(phone);

CREATE TABLE IF NOT EXISTS ref_links (
  code        TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS ref_links_user_idx ON ref_links(user_id, created_at DESC);

CREATE SEQUENCE IF NOT EXISTS orders_id_seq START 10001;
CREATE TABLE IF NOT EXISTS orders (
  id              BIGINT PRIMARY KEY DEFAULT nextval('orders_id_seq'),  -- он же InvId Робокассы
  user_id         BIGINT REFERENCES users(id),
  email           TEXT,
  phone           TEXT,
  name            TEXT,
  address         TEXT,
  items           JSONB NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL,
  discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_kind   TEXT,
  jc_spent        INT NOT NULL DEFAULT 0,
  jc_alloc        JSONB,
  total           NUMERIC(12,2) NOT NULL,
  artifact_count  INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | cancelled
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at         TIMESTAMPTZ,
  matures_at      TIMESTAMPTZ,
  matured         BOOLEAN NOT NULL DEFAULT FALSE
);
ALTER SEQUENCE orders_id_seq OWNED BY orders.id;
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_mature_idx ON orders(status, matured, matures_at);

-- Журнал JC. Начисления (amount > 0) хранят остаток `remaining` и срок сгорания;
-- списания (amount < 0) — только для истории, баланс = сумма remaining у несгоревших начислений.
CREATE TABLE IF NOT EXISTS jc_ledger (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  amount      INT NOT NULL,
  remaining   INT NOT NULL DEFAULT 0,
  reason      TEXT NOT NULL,          -- referral | rank_bonus | game | order_spend | order_refund | manual
  order_id    BIGINT,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS jc_user_idx ON jc_ledger(user_id, expires_at);

CREATE TABLE IF NOT EXISTS auth_codes (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  ip          TEXT,
  attempts    INT NOT NULL DEFAULT 0,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_codes_email_idx ON auth_codes(email, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tg_link_tokens (
  token       TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS game_sessions (
  token       TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id),
  game        TEXT NOT NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished    BOOLEAN NOT NULL DEFAULT FALSE
);

-- Minimal schema for sanfrancisco demo (compatible with admin and seeder)

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  featured INTEGER DEFAULT 0,
  price REAL DEFAULT 0.0,
  FOREIGN KEY(category_id) REFERENCES categories(id)
);

-- Optional: create an images directory placeholder (handled by admin when uploading)

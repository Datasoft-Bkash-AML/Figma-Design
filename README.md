## Database setup (quick)

This project supports MySQL (preferred) and a local SQLite fallback. The app will attempt to connect to MySQL using environment variables; if unavailable it will initialize a SQLite DB at `data/sanfrancisco.sqlite` by converting `database.sql`.

Quick steps for a fresh clone:

1. Copy `.env.example` and edit values if you plan to use MySQL:

   cp .env.example .env

2. Use the helper script to initialize the DB:

   # For SQLite fallback (simplest)
   ./scripts/setup-db.sh sqlite

   # To import into MySQL (requires mysql client and server)
   ./scripts/setup-db.sh mysql

3. Start the app (PHP built-in server for quick dev):

   php -S localhost:8000

Notes:
- The `config.php` file documents the environment variables `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_CHARSET` and `PREFER_MYSQL`.
- Default dev admin password is `admin123`. Replace `ADMIN_PASS_HASH` in `config.php` with a secure hash for production.
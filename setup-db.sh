#!/usr/bin/env bash
set -euo pipefail

# setup-db.sh - initialize a local DB for development
# Usage:
#  ./scripts/setup-db.sh sqlite   # use bundled SQLite DB (copy data file)
#  ./scripts/setup-db.sh mysql    # import database.sql into local MySQL

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
DATA_DIR="$ROOT_DIR/data"

case ${1:-sqlite} in
  sqlite)
    echo "Initializing SQLite database..."
    mkdir -p "$DATA_DIR"
    if [ -f "$DATA_DIR/sanfrancisco.sqlite" ]; then
      echo "SQLite DB already exists at $DATA_DIR/sanfrancisco.sqlite"
      exit 0
    fi
    # If a prebuilt sqlite doesn't exist, let config.php convert database.sql on first run
    touch "$DATA_DIR/.placeholder"
    echo "Done. Start the app and it will initialize SQLite from database.sql if needed."
    ;;

  mysql)
    echo "Importing database.sql into MySQL. Make sure mysql client is installed and running."
    DB_HOST=${DB_HOST:-127.0.0.1}
    DB_PORT=${DB_PORT:-3306}
    DB_NAME=${DB_NAME:-sanfrancisco}
    DB_USER=${DB_USER:-root}
    read -s -p "MySQL password for $DB_USER (leave blank for none): " DB_PASS
    echo
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" < "$ROOT_DIR/database.sql"
    echo "Import complete."
    ;;

  *)
    echo "Usage: $0 [sqlite|mysql]"
    exit 2
    ;;
esac

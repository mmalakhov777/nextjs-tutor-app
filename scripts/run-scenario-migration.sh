#!/bin/bash

# Load environment variables from .env files
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
elif [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Use the DATABASE_URL from environment or default to local
DB_URL=${DATABASE_URL:-"postgres://neondb_owner:npg_S0YKqMtpUVR5@ep-hidden-resonance-a2ztn4wm-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require"}

echo "Running scenario migration script..."
psql "$DB_URL" -f scripts/add_category_to_scenarios.sql

if [ $? -eq 0 ]; then
  echo "Migration completed successfully!"
else
  echo "Migration failed!"
  exit 1
fi

echo "Done." 
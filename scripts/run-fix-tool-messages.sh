#!/bin/bash

# Load environment variables from .env files
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
elif [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Use the CHAT_DATABASE_URL from environment
DB_URL=${CHAT_DATABASE_URL}

if [ -z "$DB_URL" ]; then
  echo "Error: CHAT_DATABASE_URL not set in environment variables"
  exit 1
fi

echo "Running fix for tool messages function..."
echo "Database URL: ${DB_URL:0:20}..." # Show only first 20 chars for security

psql "$DB_URL" -f scripts/fix-tool-messages-function.sql

if [ $? -eq 0 ]; then
  echo "Fix applied successfully!"
  echo "Tool messages should now save properly."
else
  echo "Fix failed!"
  exit 1
fi

echo "Done." 
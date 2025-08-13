#!/usr/bin/env sh
set -e

# Apply Prisma migrations (idempotent)
echo "Applying Prisma migrations..."
npx prisma migrate deploy

# Seed only if script exists (optional)
if npm run | grep -q "seed"; then
  echo "Seeding database..."
  npm run seed || echo "No seed or seed failed; continuing."
fi

# Start the app
echo "Starting chatterbot..."
exec npm start
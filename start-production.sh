#!/bin/bash

# Production start script for Tesseract.
# Runs the API. The frontend (apps/web/dist) is served statically by the platform
# (Render's static publish per render.yaml); this script does not run `vite preview`,
# which is a dev-mode server and not production-grade.

set -e

echo "Starting Tesseract API in production mode..."

if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please copy .env.example to .env and configure it properly."
    exit 1
fi

export $(cat .env | grep -v '^#' | xargs)

required_vars=("DATABASE_URL" "JWT_SECRET" "SUPER_ADMIN_EMAIL" "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "ALLOWED_ORIGINS")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    echo "Error: Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

echo "Building application..."
npm run build

echo "Backend: ${BACKEND_URL:-http://localhost:5001}"
echo "Frontend dist: apps/web/dist (serve via your static host or CDN; not started here)"

exec env NODE_ENV=production npm run start --workspace=apps/api

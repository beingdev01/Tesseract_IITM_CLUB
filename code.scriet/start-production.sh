#!/bin/bash

# Production start script for Tesseract.
# Runs the API and the frontend (vite preview) side-by-side.

set -e

echo "🚀 Starting Tesseract in production mode..."

if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
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
    echo "❌ Error: Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

echo "📦 Building application..."
npm run build

echo "🌐 Starting frontend and backend servers..."
echo "   Backend: ${BACKEND_URL:-http://localhost:5001}"
echo "   Frontend: ${FRONTEND_URL:-http://localhost:5173}"

NODE_ENV=production npm run start --workspace=apps/api &
BACKEND_PID=$!

NODE_ENV=production npm run preview --workspace=apps/web &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID

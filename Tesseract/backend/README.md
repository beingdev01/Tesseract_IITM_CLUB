# Tesseract Backend

TypeScript/NestJS backend for Tesseract.

## Local Development

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run seed
npm run dev
```

The API runs at `http://localhost:8000/api/v1`.

## Contract

All responses use the frontend-compatible envelope:

```json
{ "success": true, "data": {}, "error": null, "meta": null }
```

Errors use:

```json
{ "success": false, "data": null, "error": { "code": "example", "message": "Example" }, "meta": null }
```

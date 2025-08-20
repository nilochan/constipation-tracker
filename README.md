# Constipation Relief Tracker

A personal health tracking application designed to help monitor daily wellness, bowel movements, hydration, and other health metrics.

## Deployment Status
- Latest update: August 20, 2025 - Database persistence with Railway volumes FIXED! 🎉
- Volume mounted at /data/ with DB_PATH=/data/database.db
- Testing user persistence across deployments

## Features

- 🐰 Daily wellness tracking
- 💧 Hydration monitoring
- 📊 Bristol stool scale tracking
- 🍎 Food logging
- 📈 Analytics and trends
- 👤 User authentication
- 📱 Mobile-friendly design

## Tech Stack

- **Backend**: Node.js, Express, SQLite
- **Frontend**: React, Tailwind CSS
- **Authentication**: JWT
- **Database**: SQLite
- **Deployment**: Railway

## Local Development

1. Install dependencies:
```bash
npm run dev
```

2. Start backend:
```bash
npm run install-backend
cd backend && npm start
```

3. Start frontend:
```bash
npm run install-frontend
cd frontend && npm start
```

## Deployment

This app is configured for Railway deployment. Connect your GitHub repository to Railway and it will auto-deploy.

## Environment Variables

Backend requires:
- `JWT_SECRET`: Secret key for JWT tokens
- `NODE_ENV`: Environment (production/development)
- `PORT`: Server port (auto-set by Railway)

## License

Personal use project.
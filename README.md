# Learnify AI

A comprehensive learning platform with AI-powered features.

## Tech Stack
- **Backend**: Django REST Framework + Python
- **Frontend**: React + TypeScript
- **AI**: Google Gemini 2.5 Flash

## Setup Instructions

### Backend
1. Navigate to backend: `cd backend`
2. Create virtual environment: `python -m venv venv`
3. Activate: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and add your API keys
6. Run migrations: `python manage.py migrate`
7. Start server: `python manage.py runserver`

### Frontend
1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure API URL
4. Start dev server: `npm run dev`

## Environment Variables
See `.env.example` files in backend and frontend directories.

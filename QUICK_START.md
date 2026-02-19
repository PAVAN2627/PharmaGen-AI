# Quick Start Guide

## Current Issue: API Key Leaked

Your Gemini API key was reported as leaked and has been disabled by Google. You need to get a new one.

## Steps to Fix:

### 1. Get a New Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the new API key

### 2. Update Your .env File

Open `backend/.env` and replace the API key:

```env
GEMINI_API_KEY=your_new_api_key_here
```

### 3. Restart the Backend Server

The server will automatically restart if it's running with `npm run dev`.

If not, run:
```bash
cd backend
npm run dev
```

### 4. Test the API Key

```bash
cd backend
node test-gemini.js
```

You should see:
- ✅ API Key is valid!
- List of available models
- ✅ Content Generation Test passed

## Running the Application

### Backend (Terminal 1):
```bash
cd backend
npm run dev
```

Server runs on: http://localhost:3001

### Frontend (Terminal 2):
```bash
npm run dev
```

Frontend runs on: http://localhost:8080

## Testing the Upload

1. Open http://localhost:8080 in your browser
2. Navigate to the Dashboard
3. Upload a VCF file
4. Select drugs to analyze
5. Click "Analyze"

## Notes

- Firebase is optional - the app works without it (analysis history won't be saved)
- The app uses fallback explanations if the LLM fails
- Make sure both backend and frontend are running

## Troubleshooting

### "Analysis Failed" Error
- Check backend logs for specific errors
- Verify API key is valid: `node backend/test-gemini.js`
- Ensure backend is running on port 3001

### Connection Refused
- Backend server isn't running
- Start it with: `cd backend && npm run dev`

### CORS Errors
- Frontend must run on port 8080
- Backend CORS is configured for http://localhost:8080

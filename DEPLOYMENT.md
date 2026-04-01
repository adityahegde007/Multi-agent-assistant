# Deployment Guide: AgentFlow

This document provides instructions for deploying **AgentFlow** to **Google Cloud Run** and setting up the local development environment.

## 🚀 Cloud Run Deployment (Production)

AgentFlow is designed to be containerized and deployed as a full-stack application on Cloud Run.

### 1. Prerequisites
- A Google Cloud Project with billing enabled.
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed and authenticated.
- [Docker](https://www.docker.com/) installed.

### 2. Build and Push the Image
Replace `PROJECT_ID` with your actual Google Cloud Project ID.

```bash
# Build the production image
docker build -t gcr.io/PROJECT_ID/agentflow .

# Push to Google Container Registry
docker push gcr.io/PROJECT_ID/agentflow
```

### 3. Deploy to Cloud Run
Deploy the container and set the mandatory `GEMINI_API_KEY` environment variable.

```bash
gcloud run deploy agentflow \
  --image gcr.io/PROJECT_ID/agentflow \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_api_key_here \
  --port 3000
```

### 4. Post-Deployment
- Once deployed, you will receive a service URL (e.g., `https://agentflow-abc123.a.run.app`).
- Ensure the `/api/health` endpoint returns `{"status":"ok"}` to verify the backend is live.

---

## 💻 Local Development Setup

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd agentflow
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_api_key_here
NODE_ENV=development
```

### 3. Run the Full-Stack App
This command starts the Express server on port 3000 and mounts the Vite middleware for the React frontend.
```bash
npm run dev
```

### 4. Verification
- Frontend: `http://localhost:3000`
- API Health: `http://localhost:3000/api/health`
- Agent Manifest: `http://localhost:3000/manifest.json`

---

## 🛠 Troubleshooting

- **"Vite not found"**: Run `npm install` to ensure all devDependencies are present.
- **"Missing API Key"**: The orchestrator will disable AI features if `GEMINI_API_KEY` is not set. Check the browser console for warnings.
- **Port Conflicts**: Ensure no other service is running on port 3000.

# 🚀 SafeGuard AI — Deployment & Hosting Guide

Complete guide to host the **SafeGuard AI (Frontend + Python Flask + YOLOv8 ML Backend)** in production.

---

## 📌 Architecture Overview for Hosting

```
[Users / Browsers]
        │
        ▼ (HTTPS)
┌────────────────────────────────────────┐
│  Frontend (React 18 + Vite)           │
│  Hosted on: Vercel / Netlify / Docker  │
└───────────────────┬────────────────────┘
                    │ REST API Calls (/api/...)
                    ▼
┌────────────────────────────────────────┐
│  Backend (Flask + Gunicorn + YOLOv8)   │
│  Hosted on: Render / Railway / Docker  │
│  • PyTorch CPU Inference               │
│  • SQLite Persistent Storage           │
│  • models/best.pt Checkpoint (~6.2 MB) │
└────────────────────────────────────────┘
```

---

## 🌟 Method 1: Free Cloud Hosting (Vercel + Render) — Recommended

### Step 1: Deploy Backend to Render (Free)
1. Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** → **Web Service**.
2. Connect your GitHub repository: `https://github.com/Shayad-F-4/safeguard-ai-helmet-detection.git`.
3. Configure the service:
   - **Name**: `safeguard-ai-backend`
   - **Region**: Any (e.g. Oregon or Frankfurt)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```bash
     pip install --upgrade pip && pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu && pip install -r requirements.txt
     ```
   - **Start Command**:
     ```bash
     gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120 app:app
     ```
   - **Instance Type**: `Free`
4. Add Environment Variables:
   | Key | Value |
   |---|---|
   | `FLASK_ENV` | `production` |
   | `ML_MODE` | `yolo` |
   | `MODEL_PATH` | `models/best.pt` |
   | `CONFIDENCE_THRESHOLD` | `0.45` |
   | `YOLO_CLASS_NAMES` | `helmet,no_helmet` |
   | `MAX_UPLOAD_SIZE_MB` | `100` |
   | `SECRET_KEY` | *(Click generate or enter random string)* |
5. Click **Deploy Web Service**.
6. Once deployed, copy your backend URL: e.g. `https://safeguard-ai-backend.onrender.com`.

---

### Step 2: Deploy Frontend to Vercel (Free)
1. Go to [vercel.com](https://vercel.com/) and click **Add New...** → **Project**.
2. Select your repository `safeguard-ai-helmet-detection`.
3. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
4. Under **Environment Variables**, add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://safeguard-ai-backend.onrender.com/api` *(Your Render backend URL + `/api`)*
5. Click **Deploy**.
6. Your frontend is live with SSL HTTPS!

---

## 🐳 Method 2: Docker Compose (Any VPS / Cloud Server)

Ideal for **AWS EC2**, **DigitalOcean Droplet**, **Linode**, or **On-Premise Server**.

### 1. Prerequisites
Install Docker and Docker Compose on your server:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
```

### 2. Clone and Launch
```bash
git clone https://github.com/Shayad-F-4/safeguard-ai-helmet-detection.git
cd safeguard-ai-helmet-detection

# Launch both services in detached mode
docker compose up -d --build
```

### 3. Check Running Status
```bash
docker compose ps
docker compose logs -f backend
```

- **Frontend**: Accessible at `http://your-server-ip/`
- **Backend API**: Accessible at `http://your-server-ip:5000/api/health`

---

## ⚡ Method 3: 1-Click All-in-One Deployment (Render Blueprint)

We included a `render.yaml` blueprint file in the repository.
1. In Render dashboard, go to **Blueprints** → **New Blueprint Instance**.
2. Select your repository.
3. Render will automatically detect `render.yaml` and provision both Frontend and Backend with all environment variables pre-configured.

---

## 📋 Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `FLASK_ENV` | `production` | Set to `production` for security |
| `PORT` | `5000` | Port for the backend server |
| `ML_MODE` | `yolo` | `yolo` uses `best.pt`, `mock` runs synthetic test data |
| `MODEL_PATH` | `models/best.pt` | Path to YOLO weights checkpoint |
| `CONFIDENCE_THRESHOLD` | `0.45` | Default detection confidence threshold (45%) |
| `YOLO_CLASS_NAMES` | `helmet,no_helmet` | Comma-separated class labels |
| `MAX_UPLOAD_SIZE_MB` | `100` | Maximum video/image upload limit |
| `VITE_API_URL` | `/api` | Frontend URL to backend API |
| `SECRET_KEY` | random | Flask session security key |

---

## 🔒 Important Production Tips
1. **Camera Permissions**: Browsers only allow webcam access over `https://` or `http://localhost`. When hosting, ensure your frontend URL uses **HTTPS** (Vercel and Render provide automatic free SSL certificates).
2. **CPU Inference**: The PyTorch CPU installation (`--index-url https://download.pytorch.org/whl/cpu`) takes only ~50ms per frame for YOLOv8n, requiring minimal RAM (~500MB).

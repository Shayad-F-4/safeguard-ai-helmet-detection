# SafeGuard AI — Edge AI Helmet Detection System

A complete **React + Flask** web application for real-time safety helmet detection using Edge AI.

> **Project 36 — Computer Vision + Edge AI**  
> Running with **YOLOv8n** model for real-time helmet detection.

---

## Quick Start

### 1. Backend (Flask)

```bash
cd backend
python app.py
```

Server starts at: `http://localhost:5000`

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install    # first time only
npm run dev
```

App opens at: `http://localhost:5173`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, Lucide React |
| Backend | Flask 3, Flask-SQLAlchemy, Flask-CORS |
| Database | SQLite (auto-created on first run) |
| CV | OpenCV, Pillow |
| ML (future) | YOLOv8n via Ultralytics |

---

## Project Structure

```
AIML-p/
├── backend/
│   ├── app.py                  ← Flask entry point
│   ├── .env                    ← Configuration (ML_MODE=mock)
│   ├── database/               ← SQLAlchemy models + seeding
│   ├── ml_service/             ← ML abstraction layer
│   │   ├── base_detector.py    ← Abstract interface
│   │   ├── mock_detector.py    ← Demo mode (no model needed)
│   │   └── yolo_detector.py    ← Production YOLO detector
│   ├── routes/                 ← Flask API blueprints
│   ├── services/               ← Business logic
│   ├── uploads/                ← Uploaded files
│   └── models/                 ← Place best.pt here
│
└── frontend/
    └── src/
        ├── pages/              ← 12 application pages
        ├── components/         ← Reusable UI components
        ├── services/api.js     ← Axios API client
        └── context/            ← Global state
```

---

## Integrating the Trained YOLO Model

When your friend finishes training:

1. **Copy the model:**
   ```
   cp /path/to/best.pt backend/models/best.pt
   ```

2. **Update `.env`:**
   ```
   ML_MODE=yolo
   ```

3. **Install Ultralytics:**
   ```
   pip install ultralytics
   ```

4. **Restart the backend** — no frontend changes needed.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health + mode |
| GET | `/api/dashboard/stats` | Dashboard KPIs |
| POST | `/api/detect/image` | Detect in uploaded image |
| POST | `/api/detect/frame` | Detect in base64 camera frame |
| POST | `/api/detect/video` | Detect in uploaded video |
| GET | `/api/detections` | Paginated detection history |
| GET | `/api/alerts` | Safety alerts |
| PATCH | `/api/alerts/:id` | Update alert status |
| GET | `/api/analytics` | Analytics data for charts |
| POST | `/api/reports` | Generate safety report |
| GET/POST | `/api/cameras` | Camera management |
| GET | `/api/model` | ML model info |
| GET/PUT | `/api/settings` | Application settings |

---

## Detection Response Format

```json
{
  "success": true,
  "mode": "mock",
  "timestamp": "2026-09-20T10:42:12",
  "image_width": 1280,
  "image_height": 720,
  "inference_time_ms": 42.6,
  "fps": 23.4,
  "detections": [
    {
      "id": 1,
      "class": "helmet",
      "status": "safe",
      "confidence": 0.96,
      "bbox": { "x1": 120, "y1": 80, "x2": 245, "y2": 310 }
    }
  ],
  "summary": {
    "workers": 1,
    "helmet": 1,
    "no_helmet": 0,
    "compliance_rate": 100.0
  }
}
```

---

*SafeGuard AI — Edge AI Helmet Detection System*

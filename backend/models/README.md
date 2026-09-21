# Models Directory

Place your trained YOLOv8n model here as `best.pt`.

## Switching from Demo to YOLO Mode

1. Copy your trained model file:
   ```
   cp /path/to/best.pt backend/models/best.pt
   ```

2. Update `.env`:
   ```
   ML_MODE=yolo
   ```

3. Restart the backend server:
   ```
   python app.py
   ```

The application will automatically load and use the YOLO model.
No frontend changes required.

## Supported Model Format
- YOLOv8n PyTorch model (.pt)
- Trained on Hard Hat Workers / PPE Dataset
- Expected classes: `helmet`, `no_helmet` (configurable via YOLO_CLASS_NAMES env var)

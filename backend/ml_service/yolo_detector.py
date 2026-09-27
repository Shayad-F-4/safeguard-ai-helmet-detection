"""
SafeGuard AI — YOLO Helmet Detector
Production detector using a trained YOLOv8n model (best.pt).

To activate:
  1. Place trained model at: models/best.pt
  2. Set in .env: ML_MODE=yolo
  3. Restart the backend server

The class name mapping is configurable via YOLO_CLASS_NAMES env var.
Default: helmet,no_helmet (comma-separated, index-order matches model output)
"""

import os
import time
import logging
import numpy as np

from ml_service.base_detector import HelmetDetector

logger = logging.getLogger(__name__)


class YOLOHelmetDetector(HelmetDetector):
    """
    Production helmet detector using Ultralytics YOLOv8n.
    
    Requires:
    - ultralytics package installed: pip install ultralytics
    - Trained model file at models/best.pt
    - PyTorch installed
    """

    def __init__(self, model_path: str, confidence_threshold: float = 0.5):
        """
        Initialize the YOLO detector.
        
        Args:
            model_path: path to the trained .pt model file
            confidence_threshold: minimum confidence to include a detection (0–1)
            
        Raises:
            FileNotFoundError: if model file does not exist
            ImportError: if ultralytics is not installed
        """
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"YOLO model not found at '{model_path}'. "
                f"Please place your trained model file there and restart. "
                f"See backend/models/README.md for instructions."
            )

        try:
            from ultralytics import YOLO
        except ImportError:
            raise ImportError(
                "ultralytics package is not installed. "
                "Run: pip install ultralytics"
            )

        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.mode = 'yolo'

        # Load class name mapping from env
        class_names_str = os.getenv('YOLO_CLASS_NAMES', 'helmet,no_helmet')
        self.class_map = {i: name.strip() for i, name in enumerate(class_names_str.split(','))}

        logger.info(f"Loading YOLO model from: {model_path}")
        self.model = YOLO(model_path)
        logger.info(f"YOLOHelmetDetector ready. Classes: {self.class_map}")

    # ------------------------------------------------------------------ #
    #  Core prediction methods
    # ------------------------------------------------------------------ #

    def predict_image(self, image_array, conf: float = None) -> dict:
        """Run YOLO inference on a still image."""
        h, w = image_array.shape[:2]
        start = time.time()
        c = conf if conf is not None else self.confidence_threshold

        results = self.model(image_array, conf=c, verbose=False)
        inference_ms = (time.time() - start) * 1000
        fps = 1000 / inference_ms if inference_ms > 0 else 0.0

        detections = self._parse_results(results)
        return self._build_response(detections, w, h, inference_ms, fps, mode='yolo')

    def predict_frame(self, frame_array, conf: float = None) -> dict:
        """Run YOLO inference on a live camera frame."""
        h, w = frame_array.shape[:2]
        start = time.time()
        c = conf if conf is not None else self.confidence_threshold

        results = self.model(frame_array, conf=c, verbose=False)
        inference_ms = (time.time() - start) * 1000
        fps = 1000 / inference_ms if inference_ms > 0 else 0.0

        detections = self._parse_results(results)
        return self._build_response(detections, w, h, inference_ms, fps, mode='yolo')

    def predict_video(self, video_path: str) -> dict:
        """Run YOLO detection across all frames of a video file."""
        import cv2

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()

        start = time.time()
        all_detections = []
        frame_violations = []
        frame_num = 0

        # Process every 5th frame for performance
        results_gen = self.model(video_path, conf=self.confidence_threshold,
                                 stream=True, verbose=False)
        for result in results_gen:
            if frame_num % 5 == 0:
                dets = self._parse_results([result])
                violations = sum(1 for d in dets if d['class'] == 'no_helmet')
                frame_violations.append({
                    'frame': frame_num,
                    'timestamp': round(frame_num / video_fps, 2),
                    'violations': violations,
                    'workers': len(dets),
                })
                all_detections.extend(dets)
            frame_num += 1

        inference_ms = (time.time() - start) * 1000
        helmet_total = sum(1 for d in all_detections if d['class'] == 'helmet')
        no_helmet_total = sum(1 for d in all_detections if d['class'] == 'no_helmet')
        total = len(all_detections)

        base = self._build_response(all_detections[:10], w, h, inference_ms, video_fps, mode='yolo')
        base['video_stats'] = {
            'total_frames': total_frames,
            'processed_frames': frame_num,
            'video_fps': round(video_fps, 1),
            'duration_seconds': round(total_frames / video_fps, 1),
            'total_detections': total,
            'helmet_detections': helmet_total,
            'no_helmet_detections': no_helmet_total,
            'compliance_rate': round(helmet_total / total * 100, 1) if total > 0 else 0,
            'average_confidence': round(
                sum(d['confidence'] for d in all_detections) / total * 100, 1
            ) if total > 0 else 0,
            'frame_violations': frame_violations,
        }
        return base

    def get_model_info(self) -> dict:
        info = {
            'name': 'YOLOHelmetDetector',
            'display_name': 'YOLOv8n',
            'mode': 'yolo',
            'status': 'active',
            'description': 'Production YOLOv8n model trained on Hard Hat Workers / PPE Dataset.',
            'model_file': self.model_path,
            'framework': 'Ultralytics YOLO',
            'deep_learning': 'PyTorch',
            'input_resolution': '640×640',
            'device': 'cpu',
            'confidence_threshold': self.confidence_threshold,
            'class_map': self.class_map,
            # These are populated from model metadata if available
            'map50': None,
            'precision': None,
            'recall': None,
        }
        try:
            # Try to read device from model
            import torch
            info['device'] = 'cuda' if torch.cuda.is_available() else 'cpu'
        except Exception:
            pass
        return info

    # ------------------------------------------------------------------ #
    #  Internal helpers
    # ------------------------------------------------------------------ #

    def _parse_results(self, results) -> list:
        """Parse Ultralytics YOLO result objects into standard detection dicts with IoU suppression."""
        raw_dets = []

        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                cls_id = int(box.cls[0].item())
                class_name = self.class_map.get(cls_id, f'class_{cls_id}')
                confidence = float(box.conf[0].item())
                xyxy = box.xyxy[0].tolist()

                # Map class name to status
                status = 'safe' if class_name == 'helmet' else 'violation'

                raw_dets.append({
                    'class': class_name,
                    'status': status,
                    'confidence': round(confidence, 3),
                    'bbox': {
                        'x1': int(xyxy[0]),
                        'y1': int(xyxy[1]),
                        'x2': int(xyxy[2]),
                        'y2': int(xyxy[3]),
                    }
                })

        # Sort by confidence descending
        raw_dets.sort(key=lambda d: d['confidence'], reverse=True)

        # Class-agnostic NMS suppression for overlapping boxes (> 45% IoU)
        filtered = []
        for d in raw_dets:
            b1 = d['bbox']
            overlap = False
            for kept in filtered:
                b2 = kept['bbox']
                ix1 = max(b1['x1'], b2['x1'])
                iy1 = max(b1['y1'], b2['y1'])
                ix2 = min(b1['x2'], b2['x2'])
                iy2 = min(b1['y2'], b2['y2'])
                iw = max(0, ix2 - ix1)
                ih = max(0, iy2 - iy1)
                inter = iw * ih
                a1 = max(1, (b1['x2'] - b1['x1']) * (b1['y2'] - b1['y1']))
                a2 = max(1, (b2['x2'] - b2['x1']) * (b2['y2'] - b2['y1']))
                union = a1 + a2 - inter
                iou = inter / union if union > 0 else 0
                if iou > 0.45:
                    overlap = True
                    break
            if not overlap:
                filtered.append(d)

        # Assign 1-indexed IDs
        for i, det in enumerate(filtered, 1):
            det['id'] = i

        return filtered

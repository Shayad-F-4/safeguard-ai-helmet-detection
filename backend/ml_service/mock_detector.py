"""
SafeGuard AI — Mock Helmet Detector
Generates realistic simulated detection results for development and demonstration.
No ML model required — works immediately out of the box.

IMPORTANT: Results from this detector are SIMULATED and do NOT represent
real AI model predictions. Always clearly marked as DEMO MODE.
"""

import time
import random
import logging
import numpy as np

from ml_service.base_detector import HelmetDetector

logger = logging.getLogger(__name__)


class MockHelmetDetector(HelmetDetector):
    """
    Realistic mock detector for development, testing, and demonstration.
    
    Generates plausible bounding boxes, confidence scores, and detection
    patterns that mimic what a real YOLOv8n model would produce, but
    without any actual inference.
    
    This allows the full application stack to run and be demonstrated
    before the trained model is available.
    """

    def __init__(self):
        self.mode = 'mock'
        logger.info("MockHelmetDetector initialized — DEMO MODE active")

    # ------------------------------------------------------------------ #
    #  Core prediction methods
    # ------------------------------------------------------------------ #

    def predict_image(self, image_array, conf=None) -> dict:
        """Simulate detection on a still image."""
        h, w = self._get_dims(image_array)
        start = time.time()
        time.sleep(random.uniform(0.02, 0.06))  # Realistic inference latency

        detections = self._generate_detections(w, h)
        inference_ms = (time.time() - start) * 1000
        fps = 1000 / inference_ms if inference_ms > 0 else 25.0

        return self._build_response(detections, w, h, inference_ms, fps, mode='mock')

    def predict_frame(self, frame_array, conf=None) -> dict:
        """Simulate detection on a live camera frame (faster than image)."""
        h, w = self._get_dims(frame_array)
        start = time.time()
        time.sleep(random.uniform(0.015, 0.04))  # Faster for live frames

        detections = self._generate_detections(w, h)
        inference_ms = (time.time() - start) * 1000
        fps = 1000 / inference_ms if inference_ms > 0 else 28.0

        return self._build_response(detections, w, h, inference_ms, fps, mode='mock')

    def predict_video(self, video_path: str) -> dict:
        """Simulate processing a full video file."""
        import cv2

        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError(f"Cannot open video file: {video_path}")

            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            video_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720
            cap.release()

            if total_frames <= 0:
                total_frames = 100  # fallback

        except Exception as e:
            logger.warning(f"Could not read video metadata: {e}. Using defaults.")
            total_frames = 100
            video_fps = 25.0
            w, h = 1280, 720

        # Simulate processing — aggregate stats across frames
        start = time.time()
        time.sleep(min(total_frames * 0.002, 3.0))  # Cap simulation at 3s

        all_detections = []
        frame_violations = []

        # Sample every ~10th frame for the response
        sample_frames = max(1, total_frames // 20)
        for frame_num in range(sample_frames):
            frame_detections = self._generate_detections(w, h)
            violations = sum(1 for d in frame_detections if d['class'] == 'no_helmet')
            frame_violations.append({
                'frame': frame_num * 10,
                'timestamp': round(frame_num * 10 / video_fps, 2),
                'violations': violations,
                'workers': len(frame_detections),
            })
            all_detections.extend(frame_detections)

        inference_ms = (time.time() - start) * 1000
        fps = video_fps  # Report the video's native FPS

        # Summarise across all sampled detections
        helmet_total = sum(1 for d in all_detections if d['class'] == 'helmet')
        no_helmet_total = sum(1 for d in all_detections if d['class'] == 'no_helmet')
        total = len(all_detections)

        base = self._build_response(all_detections[:10], w, h, inference_ms, fps, mode='mock')
        base['video_stats'] = {
            'total_frames': total_frames,
            'processed_frames': sample_frames,
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
        return {
            'name': 'MockHelmetDetector',
            'display_name': 'YOLOv8n (Demo)',
            'mode': 'mock',
            'status': 'demo',
            'description': (
                'Realistic mock detector for development and demonstration. '
                'No actual ML inference is performed. '
                'Replace with YOLOHelmetDetector when best.pt is available.'
            ),
            'model_file': None,
            'framework': 'None (Mock)',
            'deep_learning': 'None (Mock)',
            'input_resolution': '640×640',
            'device': 'cpu (mock)',
            'inference_time_ms': round(random.uniform(20, 60), 1),
            'fps': round(random.uniform(20, 30), 1),
            # Metrics — only available with real model
            'map50': None,
            'precision': None,
            'recall': None,
        }

    # ------------------------------------------------------------------ #
    #  Internal helpers
    # ------------------------------------------------------------------ #

    def _get_dims(self, image_array):
        """Safely extract height/width from numpy array or return defaults."""
        try:
            if image_array is not None and hasattr(image_array, 'shape'):
                h, w = image_array.shape[:2]
                return max(h, 100), max(w, 100)
        except Exception:
            pass
        return 720, 1280

    def _generate_detections(self, img_w: int, img_h: int) -> list:
        """
        Generate a realistic set of worker detections for the given image size.
        
        Workers are spatially distributed across the image with:
        - ~80% helmet compliance (configurable)
        - Bounding boxes that respect image boundaries
        - Confidence scores in the realistic 0.82–0.98 range
        """
        num_workers = random.randint(1, 4)
        helmet_probability = 0.80
        detections = []

        # Divide image width into columns for non-overlapping workers
        col_width = img_w // num_workers

        for i in range(num_workers):
            is_helmet = random.random() < helmet_probability
            class_name = 'helmet' if is_helmet else 'no_helmet'
            status = 'safe' if is_helmet else 'violation'
            confidence = round(random.uniform(0.82, 0.98), 3)

            # Generate bbox within the worker's column
            col_start = i * col_width
            col_end = col_start + col_width
            worker_w = random.randint(80, min(160, col_width - 10))
            worker_h = random.randint(120, min(280, img_h - 40))
            x1 = random.randint(col_start, max(col_start, col_end - worker_w - 10))
            y1 = random.randint(20, max(20, img_h - worker_h - 20))
            x2 = x1 + worker_w
            y2 = y1 + worker_h

            detections.append({
                'id': i + 1,
                'class': class_name,
                'status': status,
                'confidence': confidence,
                'bbox': {
                    'x1': max(0, x1),
                    'y1': max(0, y1),
                    'x2': min(img_w, x2),
                    'y2': min(img_h, y2),
                }
            })

        return detections

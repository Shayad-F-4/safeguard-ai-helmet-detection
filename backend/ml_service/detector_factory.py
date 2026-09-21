"""
SafeGuard AI — Detector Factory
Reads ML_MODE from environment and returns the appropriate detector instance.
Falls back to mock mode if YOLO model file is not found.
"""

import os
import logging

logger = logging.getLogger(__name__)

_detector_instance = None
_active_mode = 'mock'


def get_detector():
    """
    Return a (detector, mode) tuple based on ML_MODE environment variable.
    
    ML_MODE=mock  → MockHelmetDetector (default, always works)
    ML_MODE=yolo  → YOLOHelmetDetector (requires models/best.pt)
    
    If ML_MODE=yolo but model file is missing, falls back to mock with a warning.
    
    Returns:
        tuple: (HelmetDetector instance, mode_string)
    """
    global _detector_instance, _active_mode

    if _detector_instance is not None:
        return _detector_instance, _active_mode

    mode = os.getenv('ML_MODE', 'mock').lower().strip()
    logger.info(f"ML_MODE={mode} — initializing detector...")

    if mode == 'yolo':
        model_path = os.getenv('MODEL_PATH', 'models/best.pt')
        if not os.path.exists(model_path):
            logger.warning(
                f"ML_MODE=yolo but model file not found at '{model_path}'. "
                f"Falling back to mock mode. "
                f"Place your trained model at '{model_path}' and restart."
            )
            _detector_instance, _active_mode = _make_mock()
        else:
            try:
                from ml_service.yolo_detector import YOLOHelmetDetector
                confidence = float(os.getenv('CONFIDENCE_THRESHOLD', '0.5'))
                _detector_instance = YOLOHelmetDetector(model_path, confidence)
                _active_mode = 'yolo'
                logger.info("YOLOHelmetDetector loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load YOLO detector: {e}. Falling back to mock.")
                _detector_instance, _active_mode = _make_mock()
    else:
        _detector_instance, _active_mode = _make_mock()

    return _detector_instance, _active_mode


def _make_mock():
    from ml_service.mock_detector import MockHelmetDetector
    logger.info("MockHelmetDetector active — DEMO MODE")
    return MockHelmetDetector(), 'mock'


def reset_detector():
    """Force re-initialization of the detector (useful after settings change)."""
    global _detector_instance, _active_mode
    _detector_instance = None
    _active_mode = 'mock'

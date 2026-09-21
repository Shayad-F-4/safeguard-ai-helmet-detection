"""
SafeGuard AI — Base Detector Interface
Abstract base class for all helmet detection implementations.
"""

from abc import ABC, abstractmethod
from datetime import datetime


class HelmetDetector(ABC):
    """
    Abstract base class for helmet detection models.
    
    All detection implementations (Mock, YOLOv8n, SSD-MobileNet, etc.)
    must subclass this and implement the three prediction methods.
    
    This ensures the detection service and routes can work with any
    detector without modification — only the detector instance changes.
    """

    @abstractmethod
    def predict_image(self, image_array) -> dict:
        """
        Run detection on a single image (numpy array, BGR format from OpenCV).
        
        Args:
            image_array: numpy ndarray (H, W, C) in BGR format
            
        Returns:
            Standard detection response dict (see _build_response)
        """
        pass

    @abstractmethod
    def predict_frame(self, frame_array) -> dict:
        """
        Run detection on a single video/camera frame.
        Typically same as predict_image but may have different performance tuning.
        
        Args:
            frame_array: numpy ndarray (H, W, C) in BGR format
            
        Returns:
            Standard detection response dict
        """
        pass

    @abstractmethod
    def predict_video(self, video_path: str) -> dict:
        """
        Run detection across all frames of a video file.
        
        Args:
            video_path: absolute path to the video file
            
        Returns:
            Aggregated detection response dict with per-frame stats
        """
        pass

    @abstractmethod
    def get_model_info(self) -> dict:
        """
        Return metadata about this detector implementation.
        
        Returns:
            dict with: name, mode, status, description, and any available metrics
        """
        pass

    def _build_response(self, detections: list, image_w: int, image_h: int,
                        inference_ms: float, fps: float, mode: str = 'mock') -> dict:
        """
        Construct the standard SafeGuard AI detection response.
        
        Args:
            detections: list of detection dicts (id, class, status, confidence, bbox)
            image_w: image width in pixels
            image_h: image height in pixels
            inference_ms: inference time in milliseconds
            fps: frames per second
            mode: 'mock' or 'yolo'
            
        Returns:
            Fully structured detection response dict
        """
        helmet_count = sum(1 for d in detections if d['class'] == 'helmet')
        no_helmet_count = sum(1 for d in detections if d['class'] == 'no_helmet')
        total_workers = len(detections)
        compliance_rate = (helmet_count / total_workers * 100) if total_workers > 0 else 0.0

        return {
            'success': True,
            'timestamp': datetime.utcnow().isoformat(),
            'mode': mode,
            'image_width': image_w,
            'image_height': image_h,
            'inference_time_ms': round(inference_ms, 2),
            'fps': round(fps, 1),
            'detections': detections,
            'summary': {
                'workers': total_workers,
                'helmet': helmet_count,
                'no_helmet': no_helmet_count,
                'compliance_rate': round(compliance_rate, 1),
            }
        }

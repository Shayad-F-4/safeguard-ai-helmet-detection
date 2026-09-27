"""
SafeGuard AI — Detection Service
Business logic for image, frame, and video detection processing.
Handles file I/O, detection orchestration, DB persistence, and alert creation.
"""

import os
import logging
import base64
import uuid
import cv2
import numpy as np
from datetime import datetime
from werkzeug.utils import secure_filename
from PIL import Image
import io

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'avi', 'mov', 'webm', 'mkv'}


def allowed_image(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def allowed_video(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_VIDEO_EXTENSIONS


def get_max_bytes() -> int:
    mb = float(os.getenv('MAX_UPLOAD_SIZE_MB', '100'))
    return int(mb * 1024 * 1024)


# ------------------------------------------------------------------ #
#  Image detection
# ------------------------------------------------------------------ #

def process_image(file_storage, detector, upload_dir: str) -> dict:
    """
    Process an uploaded image file through the detector.
    Saves the session and detections to the database.
    
    Returns the standard detection response dict.
    """
    from database.models import db, DetectionSession, Detection, Alert

    filename = secure_filename(file_storage.filename)
    if not allowed_image(filename):
        raise ValueError(f"Unsupported image format. Allowed: {ALLOWED_IMAGE_EXTENSIONS}")

    # Save uploaded file
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    save_path = os.path.join(upload_dir, unique_name)
    file_storage.save(save_path)

    try:
        # Load image via PIL → convert to OpenCV BGR array
        pil_img = Image.open(save_path).convert('RGB')
        img_array = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        os.remove(save_path)
        raise ValueError(f"Cannot read image file: {e}")

    # Run detection
    result = detector.predict_image(img_array)

    # Persist to database
    try:
        summary = result['summary']
        session = DetectionSession(
            input_type='image',
            source=filename,
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            total_workers=summary['workers'],
            helmet_count=summary['helmet'],
            no_helmet_count=summary['no_helmet'],
            compliance_rate=summary['compliance_rate'],
            average_confidence=_avg_confidence(result['detections']),
            average_fps=result.get('fps', 0),
        )
        db.session.add(session)
        db.session.flush()

        worker_num = 1
        for det in result['detections']:
            detection = Detection(
                session_id=session.id,
                class_name=det['class'],
                status=det['status'],
                confidence=det['confidence'],
                x1=det['bbox']['x1'],
                y1=det['bbox']['y1'],
                x2=det['bbox']['x2'],
                y2=det['bbox']['y2'],
                timestamp=datetime.utcnow(),
            )
            db.session.add(detection)
            db.session.flush()

            if det['class'] == 'no_helmet':
                _create_alert(db, detection, f'Worker #{worker_num:02d}')

            worker_num += 1

        db.session.commit()
        result['session_id'] = session.id

    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to persist detection to DB: {e}")

    return result


# ------------------------------------------------------------------ #
#  Frame detection (live camera)
# ------------------------------------------------------------------ #

def process_frame(frame_b64: str, detector, camera_id: str = 'Camera 01', confidence: float = None) -> dict:
    """
    Decode a base64 JPEG frame from the browser and run detection.
    Does NOT persist to DB (frames are ephemeral for live mode).
    """
    if not frame_b64:
        raise ValueError("No frame data provided")

    # Strip data URI prefix if present
    if ',' in frame_b64:
        frame_b64 = frame_b64.split(',', 1)[1]

    try:
        img_bytes = base64.b64decode(frame_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Could not decode image data")
    except Exception as e:
        raise ValueError(f"Invalid frame data: {e}")

    result = detector.predict_frame(frame, conf=confidence)
    result['camera_id'] = camera_id
    return result


# ------------------------------------------------------------------ #
#  Video detection
# ------------------------------------------------------------------ #

def process_video(file_storage, detector, upload_dir: str) -> dict:
    """
    Process an uploaded video file through the detector.
    Saves session summary to the database.
    """
    from database.models import db, DetectionSession

    filename = secure_filename(file_storage.filename)
    if not allowed_video(filename):
        raise ValueError(f"Unsupported video format. Allowed: {ALLOWED_VIDEO_EXTENSIONS}")

    unique_name = f"{uuid.uuid4().hex}_{filename}"
    save_path = os.path.join(upload_dir, unique_name)
    file_storage.save(save_path)

    result = detector.predict_video(save_path)

    # Persist summary session
    try:
        vs = result.get('video_stats', {})
        summary = result.get('summary', {})
        session = DetectionSession(
            input_type='video',
            source=filename,
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow(),
            total_workers=vs.get('total_detections', summary.get('workers', 0)),
            helmet_count=vs.get('helmet_detections', summary.get('helmet', 0)),
            no_helmet_count=vs.get('no_helmet_detections', summary.get('no_helmet', 0)),
            compliance_rate=vs.get('compliance_rate', summary.get('compliance_rate', 0)),
            average_confidence=vs.get('average_confidence', 0),
            average_fps=vs.get('video_fps', result.get('fps', 0)),
        )
        db.session.add(session)
        db.session.commit()
        result['session_id'] = session.id
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to persist video session: {e}")

    return result


# ------------------------------------------------------------------ #
#  Query helpers
# ------------------------------------------------------------------ #

def get_detections_paginated(page: int = 1, per_page: int = 20,
                              status_filter: str = None, session_id: int = None,
                              search: str = None):
    """Return paginated Detection records with optional status, session, and search filters."""
    from database.models import Detection
    from sqlalchemy import or_

    query = Detection.query.order_by(Detection.timestamp.desc())
    if status_filter:
        query = query.filter(Detection.status == status_filter)
    if session_id:
        query = query.filter(Detection.session_id == session_id)
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(
            Detection.class_name.ilike(search_term),
            Detection.status.ilike(search_term)
        ))

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        'items': [d.to_dict() for d in paginated.items],
        'total': paginated.total,
        'page': paginated.page,
        'pages': paginated.pages,
        'per_page': per_page,
    }


def get_sessions_paginated(page: int = 1, per_page: int = 20,
                           search: str = None, days: int = None):
    """Return paginated DetectionSession records with search and days filters."""
    from database.models import DetectionSession
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import or_

    query = DetectionSession.query.order_by(DetectionSession.created_at.desc())
    if days and days > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(DetectionSession.created_at >= cutoff)
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(
            DetectionSession.source.ilike(search_term),
            DetectionSession.input_type.ilike(search_term)
        ))

    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        'items': [s.to_dict() for s in paginated.items],
        'total': paginated.total,
        'page': paginated.page,
        'pages': paginated.pages,
        'per_page': per_page,
    }


# ------------------------------------------------------------------ #
#  Internal helpers
# ------------------------------------------------------------------ #

def _avg_confidence(detections: list) -> float:
    if not detections:
        return 0.0
    return sum(d['confidence'] for d in detections) / len(detections)


def _create_alert(db, detection, worker_id: str):
    """Create an Alert record for a no-helmet detection."""
    from database.models import Alert
    alert = Alert(
        detection_id=detection.id,
        severity='HIGH',
        message=f'No Helmet Detected — {worker_id}',
        worker_id=worker_id,
        camera_name='Camera 01',
        confidence=detection.confidence,
        status='active',
        created_at=datetime.utcnow(),
    )
    db.session.add(alert)

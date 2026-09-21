"""
SafeGuard AI — Database Initialization
Sets up SQLAlchemy and seeds default data on first run.
"""

import logging
import random
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


def init_db(app):
    """Initialize the database and create all tables."""
    from database.models import db, Camera, AppSettings, DetectionSession, Detection, Alert

    db.init_app(app)

    with app.app_context():
        db.create_all()
        _seed_default_data()
        logger.info("Database initialized successfully.")


def _seed_default_data():
    """Seed default cameras, settings, and historical mock data if DB is empty."""
    from database.models import db, Camera, AppSettings, DetectionSession, Detection, Alert

    # Seed cameras
    if Camera.query.count() == 0:
        cameras = [
            Camera(name='Camera 01', location='Main Entrance', status='inactive',
                   source='webcam', fps=30.0),
            Camera(name='Camera 02', location='Construction Zone A', status='inactive',
                   source='webcam', fps=25.0),
            Camera(name='Camera 03', location='Warehouse Floor', status='inactive',
                   source='rtsp://192.168.1.100:554/stream', fps=20.0),
        ]
        db.session.add_all(cameras)
        logger.info("Seeded default cameras.")

    # Seed default settings
    if AppSettings.query.count() == 0:
        defaults = {
            'confidence_threshold': '0.50',
            'input_resolution': '640',
            'camera_fps': '30',
            'alert_threshold': '1',
            'sound_alerts': 'false',
            'auto_save_detections': 'true',
            'data_retention_days': '30',
            'max_upload_size_mb': '100',
            'detection_device': 'cpu',
            'model_selection': 'yolov8n',
            'nms_threshold': '0.45',
            'auto_start_camera': 'false',
        }
        for key, value in defaults.items():
            db.session.add(AppSettings(key=key, value=value))
        logger.info("Seeded default settings.")

    # Historical mock data seeding is DISABLED — fresh start with real data only
    # To re-enable: uncomment the block below and delete the safeguard.db file
    # if DetectionSession.query.count() == 0:
    #     _seed_historical_data()

    db.session.commit()


def _seed_historical_data():
    """Generate 14 days of realistic mock detection history."""
    from database.models import db, DetectionSession, Detection, Alert

    logger.info("Seeding historical detection data...")
    now = datetime.utcnow()
    worker_counter = 1
    alert_counter = 1

    for day_offset in range(13, -1, -1):
        day = now - timedelta(days=day_offset)

        # 2-5 sessions per day
        sessions_per_day = random.randint(2, 5)
        for session_num in range(sessions_per_day):
            session_start = day.replace(hour=random.randint(7, 17),
                                        minute=random.randint(0, 59),
                                        second=0)
            duration_minutes = random.randint(5, 45)
            session_end = session_start + timedelta(minutes=duration_minutes)

            total_workers = random.randint(2, 6)
            helmet_count = random.randint(int(total_workers * 0.6), total_workers)
            no_helmet_count = total_workers - helmet_count
            compliance_rate = (helmet_count / total_workers * 100) if total_workers > 0 else 0
            avg_confidence = random.uniform(0.85, 0.97)
            avg_fps = random.uniform(20.0, 30.0)

            session = DetectionSession(
                input_type=random.choice(['image', 'live', 'video']),
                source=random.choice(['webcam', 'upload_image.jpg', 'Camera 01', 'video_sample.mp4']),
                start_time=session_start,
                end_time=session_end,
                total_workers=total_workers,
                helmet_count=helmet_count,
                no_helmet_count=no_helmet_count,
                compliance_rate=compliance_rate,
                average_confidence=avg_confidence,
                average_fps=avg_fps,
                created_at=session_start,
            )
            db.session.add(session)
            db.session.flush()  # get session.id

            # Add detections for this session
            for i in range(total_workers):
                is_helmet = i < helmet_count
                class_name = 'helmet' if is_helmet else 'no_helmet'
                status = 'safe' if is_helmet else 'violation'
                confidence = random.uniform(0.82, 0.98)
                x1 = random.randint(50, 400)
                y1 = random.randint(30, 300)
                x2 = x1 + random.randint(80, 180)
                y2 = y1 + random.randint(100, 250)

                detection = Detection(
                    session_id=session.id,
                    class_name=class_name,
                    status=status,
                    confidence=confidence,
                    x1=x1, y1=y1, x2=x2, y2=y2,
                    timestamp=session_start + timedelta(seconds=random.randint(0, duration_minutes * 60)),
                )
                db.session.add(detection)
                db.session.flush()

                # Create alert for no_helmet detections
                if not is_helmet:
                    alert = Alert(
                        detection_id=detection.id,
                        severity=random.choice(['HIGH', 'HIGH', 'MEDIUM']),
                        message=f'No Helmet Detected — Worker #{worker_counter:02d}',
                        worker_id=f'Worker #{worker_counter:02d}',
                        camera_name=random.choice(['Camera 01', 'Camera 02', 'Camera 03']),
                        confidence=confidence,
                        status=random.choice(['resolved', 'acknowledged', 'resolved', 'active']),
                        created_at=detection.timestamp,
                        resolved_at=detection.timestamp + timedelta(minutes=random.randint(5, 30))
                        if random.random() > 0.3 else None,
                    )
                    db.session.add(alert)
                    alert_counter += 1

                worker_counter += 1

    logger.info("Historical data seeded successfully.")

"""
SafeGuard AI — Database Models
SQLAlchemy ORM definitions for all database tables.
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class DetectionSession(db.Model):
    """Represents a single detection session (image, video, or live stream segment)."""
    __tablename__ = 'detection_sessions'

    id = db.Column(db.Integer, primary_key=True)
    input_type = db.Column(db.String(20), nullable=False)   # 'image', 'video', 'live'
    source = db.Column(db.String(255), nullable=True)        # filename or camera name
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime, nullable=True)
    total_workers = db.Column(db.Integer, default=0)
    helmet_count = db.Column(db.Integer, default=0)
    no_helmet_count = db.Column(db.Integer, default=0)
    compliance_rate = db.Column(db.Float, default=0.0)
    average_confidence = db.Column(db.Float, default=0.0)
    average_fps = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    detections = db.relationship('Detection', backref='session', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'input_type': self.input_type,
            'source': self.source,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'total_workers': self.total_workers,
            'helmet_count': self.helmet_count,
            'no_helmet_count': self.no_helmet_count,
            'compliance_rate': round(self.compliance_rate, 1),
            'average_confidence': round(self.average_confidence, 1),
            'average_fps': round(self.average_fps, 1),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Detection(db.Model):
    """Individual detection result within a session."""
    __tablename__ = 'detections'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('detection_sessions.id'), nullable=True)
    class_name = db.Column(db.String(50), nullable=False)    # 'helmet' or 'no_helmet'
    status = db.Column(db.String(20), nullable=False)         # 'safe' or 'violation'
    confidence = db.Column(db.Float, nullable=False)
    x1 = db.Column(db.Integer, default=0)
    y1 = db.Column(db.Integer, default=0)
    x2 = db.Column(db.Integer, default=0)
    y2 = db.Column(db.Integer, default=0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    alerts = db.relationship('Alert', backref='detection', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'class_name': self.class_name,
            'status': self.status,
            'confidence': round(self.confidence * 100, 1),
            'bbox': {
                'x1': self.x1,
                'y1': self.y1,
                'x2': self.x2,
                'y2': self.y2,
            },
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
        }


class Alert(db.Model):
    """Safety alert generated when a no-helmet detection occurs."""
    __tablename__ = 'alerts'

    id = db.Column(db.Integer, primary_key=True)
    detection_id = db.Column(db.Integer, db.ForeignKey('detections.id'), nullable=True)
    severity = db.Column(db.String(20), default='HIGH')       # 'HIGH', 'MEDIUM', 'LOW'
    message = db.Column(db.String(255), nullable=False)
    worker_id = db.Column(db.String(20), nullable=True)
    camera_name = db.Column(db.String(100), default='Camera 01')
    confidence = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='active')       # 'active', 'acknowledged', 'resolved'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'detection_id': self.detection_id,
            'severity': self.severity,
            'message': self.message,
            'worker_id': self.worker_id,
            'camera_name': self.camera_name,
            'confidence': round(self.confidence * 100, 1),
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
        }


class Camera(db.Model):
    """Camera/input source configuration."""
    __tablename__ = 'cameras'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200), nullable=True)
    status = db.Column(db.String(20), default='inactive')     # 'active', 'inactive', 'error'
    source = db.Column(db.String(255), default='webcam')      # 'webcam', 'rtsp://...', 'video', etc.
    fps = db.Column(db.Float, default=30.0)
    last_active = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'location': self.location,
            'status': self.status,
            'source': self.source,
            'fps': self.fps,
            'last_active': self.last_active.isoformat() if self.last_active else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class AppSettings(db.Model):
    """Key-value store for application settings."""
    __tablename__ = 'app_settings'

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.String(500), nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'key': self.key,
            'value': self.value,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class User(db.Model):
    """Basic user/operator record."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=True)
    role = db.Column(db.String(50), default='operator')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

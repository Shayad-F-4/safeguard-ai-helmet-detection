"""
SafeGuard AI — Dashboard Routes
GET /api/health
GET /api/dashboard/stats
"""

import logging
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, current_app

logger = logging.getLogger(__name__)
bp = Blueprint('dashboard', __name__)


@bp.route('/api/health', methods=['GET'])
def health():
    """System health check endpoint."""
    try:
        mode = current_app.config.get('ML_MODE', 'mock')
        detector_info = current_app.config.get('DETECTOR_INFO', {})
        return jsonify({
            'status': 'ok',
            'mode': mode,
            'is_demo': mode == 'mock',
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0.0',
            'detector': detector_info.get('name', 'MockHelmetDetector'),
        })
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500


@bp.route('/api/dashboard/stats', methods=['GET'])
def stats():
    """
    Dashboard statistics endpoint.
    Returns KPIs, recent alerts, compliance trend, and system status.
    """
    try:
        from database.models import DetectionSession, Alert, Camera

        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = now - timedelta(days=7)

        # Today's sessions
        today_sessions = DetectionSession.query.filter(
            DetectionSession.created_at >= today_start
        ).all()

        total_workers = sum(s.total_workers for s in today_sessions)
        helmet_count = sum(s.helmet_count for s in today_sessions)
        no_helmet_count = sum(s.no_helmet_count for s in today_sessions)
        compliance_rate = (
            (helmet_count / total_workers * 100) if total_workers > 0 else 0
        )
        avg_confidence = (
            sum(s.average_confidence for s in today_sessions) / len(today_sessions)
            if today_sessions else 0
        )
        avg_fps = (
            sum(s.average_fps for s in today_sessions) / len(today_sessions)
            if today_sessions else 0
        )

        # Recent alerts (last 5)
        recent_alerts = (
            Alert.query
            .filter(Alert.status == 'active')
            .order_by(Alert.created_at.desc())
            .limit(5)
            .all()
        )

        # 7-day compliance trend
        compliance_trend = []
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            day_sessions = DetectionSession.query.filter(
                DetectionSession.created_at >= day_start,
                DetectionSession.created_at < day_end
            ).all()
            day_workers = sum(s.total_workers for s in day_sessions)
            day_helmets = sum(s.helmet_count for s in day_sessions)
            day_compliance = (day_helmets / day_workers * 100) if day_workers > 0 else 0
            compliance_trend.append({
                'date': day.strftime('%a'),
                'compliance': round(day_compliance, 1),
                'workers': day_workers,
            })

        # Helmet vs no-helmet for last 7 days
        helmet_trend = []
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            day_sessions = DetectionSession.query.filter(
                DetectionSession.created_at >= day_start,
                DetectionSession.created_at < day_end
            ).all()
            helmet_trend.append({
                'date': day.strftime('%a'),
                'helmet': sum(s.helmet_count for s in day_sessions),
                'no_helmet': sum(s.no_helmet_count for s in day_sessions),
            })

        # Camera statuses
        cameras = Camera.query.all()

        # Mode
        mode = current_app.config.get('ML_MODE', 'mock')

        return jsonify({
            'success': True,
            'mode': mode,
            'is_demo': mode == 'mock',
            'kpis': {
                'workers_detected': total_workers,
                'helmet_detected': helmet_count,
                'no_helmet': no_helmet_count,
                'compliance_rate': round(compliance_rate, 1),
                'avg_confidence': round(avg_confidence * 100, 1),
                'current_fps': round(avg_fps, 1),
            },
            'compliance_trend': compliance_trend,
            'helmet_trend': helmet_trend,
            'recent_alerts': [a.to_dict() for a in recent_alerts],
            'system_status': {
                'backend': 'online',
                'database': 'online',
                'ml_service': mode,
                'cameras_active': sum(1 for c in cameras if c.status == 'active'),
                'total_cameras': len(cameras),
            },
            'timestamp': now.isoformat(),
        })

    except Exception as e:
        logger.error(f"Dashboard stats error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to load dashboard statistics'}), 500

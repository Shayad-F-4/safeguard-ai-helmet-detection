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

        # Today's sessions & alerts
        today_sessions = DetectionSession.query.filter(
            DetectionSession.created_at >= today_start
        ).all()
        today_alerts = Alert.query.filter(Alert.created_at >= today_start).all()
        today_alert_count = len(today_alerts)

        helmet_count = sum(s.helmet_count for s in today_sessions)
        no_helmet_count = max(sum(s.no_helmet_count for s in today_sessions), today_alert_count)
        total_workers = max(sum(s.total_workers for s in today_sessions), helmet_count + no_helmet_count)
        compliance_rate = (
            (helmet_count / total_workers * 100) if total_workers > 0 else (100.0 if no_helmet_count == 0 else 0.0)
        )
        avg_confidence = (
            sum(s.average_confidence for s in today_sessions) / len(today_sessions)
            if today_sessions else (sum(a.confidence for a in today_alerts) / len(today_alerts) if today_alerts else 0.88)
        )
        avg_fps = (
            sum(s.average_fps for s in today_sessions) / len(today_sessions)
            if today_sessions else 28.0
        )

        # Recent alerts (last 5)
        recent_alerts = (
            Alert.query
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
            day_alerts = Alert.query.filter(
                Alert.created_at >= day_start,
                Alert.created_at < day_end
            ).count()
            day_violations = max(sum(s.no_helmet_count for s in day_sessions), day_alerts)
            day_helmets = sum(s.helmet_count for s in day_sessions)
            day_workers = max(sum(s.total_workers for s in day_sessions), day_helmets + day_violations)
            day_compliance = (day_helmets / day_workers * 100) if day_workers > 0 else (100.0 if day_violations == 0 else 0.0)
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
            day_alerts = Alert.query.filter(
                Alert.created_at >= day_start,
                Alert.created_at < day_end
            ).count()
            day_violations = max(sum(s.no_helmet_count for s in day_sessions), day_alerts)
            day_helmets = sum(s.helmet_count for s in day_sessions)
            helmet_trend.append({
                'date': day.strftime('%a'),
                'helmet': day_helmets,
                'no_helmet': day_violations,
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

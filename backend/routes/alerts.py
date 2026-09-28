"""
SafeGuard AI — Alert Routes
GET   /api/alerts
PATCH /api/alerts/<id>
"""

import logging
from datetime import datetime
from flask import Blueprint, jsonify, request
from database.models import db, Alert

logger = logging.getLogger(__name__)
bp = Blueprint('alerts', __name__)


@bp.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Return paginated alerts, optionally filtered by status."""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        status_filter = request.args.get('status')  # active, acknowledged, resolved

        query = Alert.query.order_by(Alert.created_at.desc())
        if status_filter:
            query = query.filter(Alert.status == status_filter)

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        # Count by status
        total_active = Alert.query.filter_by(status='active').count()
        total_acknowledged = Alert.query.filter_by(status='acknowledged').count()
        total_resolved = Alert.query.filter_by(status='resolved').count()

        return jsonify({
            'success': True,
            'items': [a.to_dict() for a in paginated.items],
            'total': paginated.total,
            'page': paginated.page,
            'pages': paginated.pages,
            'per_page': per_page,
            'counts': {
                'active': total_active,
                'acknowledged': total_acknowledged,
                'resolved': total_resolved,
                'total': Alert.query.count(),
            }
        })
    except Exception as e:
        logger.error(f"Get alerts error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve alerts'}), 500


@bp.route('/api/alerts/<int:alert_id>', methods=['PATCH'])
def update_alert(alert_id):
    """Update alert status: acknowledge or resolve."""
    try:
        alert = Alert.query.get(alert_id)
        if not alert:
            return jsonify({'success': False, 'error': 'Alert not found'}), 404

        data = request.get_json(silent=True) or {}
        new_status = data.get('status')

        if new_status not in ('acknowledged', 'resolved', 'active'):
            return jsonify({
                'success': False,
                'error': 'Invalid status. Must be: acknowledged, resolved, or active'
            }), 400

        alert.status = new_status
        if new_status == 'resolved' and alert.resolved_at is None:
            alert.resolved_at = datetime.utcnow()

        db.session.commit()
        return jsonify({'success': True, 'alert': alert.to_dict()})

    except Exception as e:
        db.session.rollback()
        logger.error(f"Update alert error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to update alert'}), 500


@bp.route('/api/alerts/stats', methods=['GET'])
def alert_stats():
    """Return alert count statistics."""
    try:
        return jsonify({
            'success': True,
            'active': Alert.query.filter_by(status='active').count(),
            'acknowledged': Alert.query.filter_by(status='acknowledged').count(),
            'resolved': Alert.query.filter_by(status='resolved').count(),
            'total': Alert.query.count(),
        })
    except Exception as e:
        logger.error(f"Alert stats error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve alert stats'}), 500


@bp.route('/api/alerts', methods=['POST'])
def create_alert():
    """Create a new safety alert and link to today's live DetectionSession."""
    try:
        from database.models import DetectionSession, Detection

        data = request.get_json(silent=True) or {}
        message = data.get('message', 'Safety violation detected')
        worker_id = data.get('worker_id', 'Worker #01')
        camera_name = data.get('camera_name', 'Camera 01')
        severity = data.get('severity', 'HIGH')
        raw_conf = float(data.get('confidence', 85.0))
        confidence = raw_conf / 100.0 if raw_conf > 1.0 else raw_conf

        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Synchronize with today's live session for this camera
        session = DetectionSession.query.filter(
            DetectionSession.input_type == 'live',
            DetectionSession.source == camera_name,
            DetectionSession.created_at >= today_start
        ).order_by(DetectionSession.created_at.desc()).first()

        req_workers = int(data.get('workers', 1) or 1)
        req_helmets = int(data.get('helmet', 0) or 0)

        if not session:
            session = DetectionSession(
                input_type='live',
                source=camera_name,
                start_time=now,
                end_time=now,
                total_workers=max(req_workers, 1),
                helmet_count=req_helmets,
                no_helmet_count=1,
                compliance_rate=round((req_helmets / max(req_workers, 1)) * 100, 1),
                average_confidence=confidence,
                average_fps=float(data.get('fps', 30.0) or 30.0),
                created_at=now,
            )
            db.session.add(session)
            db.session.flush()
        else:
            session.total_workers = max(session.total_workers + 1, req_workers)
            session.helmet_count = max(session.helmet_count, req_helmets)
            session.no_helmet_count += 1
            session.end_time = now
            if session.total_workers > 0:
                session.compliance_rate = round((session.helmet_count / session.total_workers) * 100, 1)

        # Create Detection record
        detection = Detection(
            session_id=session.id,
            class_name='no_helmet',
            status='violation',
            confidence=confidence,
            timestamp=now,
        )
        db.session.add(detection)
        db.session.flush()

        # Create Alert
        alert = Alert(
            detection_id=detection.id,
            message=message,
            worker_id=worker_id,
            camera_name=camera_name,
            severity=severity,
            confidence=confidence,
            status='active',
            created_at=now
        )
        db.session.add(alert)
        db.session.commit()
        return jsonify({'success': True, 'alert': alert.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create alert error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


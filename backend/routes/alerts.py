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
    """Create a new safety alert (e.g. from live camera or edge sensor)."""
    try:
        data = request.get_json(silent=True) or {}
        message = data.get('message', 'Safety violation detected')
        worker_id = data.get('worker_id', 'Worker #01')
        camera_name = data.get('camera_name', 'Camera 01')
        severity = data.get('severity', 'HIGH')
        raw_conf = float(data.get('confidence', 85.0))
        confidence = raw_conf / 100.0 if raw_conf > 1.0 else raw_conf

        alert = Alert(
            message=message,
            worker_id=worker_id,
            camera_name=camera_name,
            severity=severity,
            confidence=confidence,
            status='active',
            created_at=datetime.utcnow()
        )
        db.session.add(alert)
        db.session.commit()
        return jsonify({'success': True, 'alert': alert.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create alert error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


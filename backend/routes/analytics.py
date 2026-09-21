"""
SafeGuard AI — Analytics Routes
GET /api/analytics
"""

import logging
from flask import Blueprint, jsonify, request
from services import report_service

logger = logging.getLogger(__name__)
bp = Blueprint('analytics', __name__)


@bp.route('/api/analytics', methods=['GET'])
def get_analytics():
    """Return analytics data for charts and summary KPIs."""
    try:
        period = request.args.get('period', 'weekly')
        if period not in ('daily', 'weekly', 'monthly'):
            period = 'weekly'

        data = report_service.get_analytics_data(period)
        return jsonify({'success': True, **data})

    except Exception as e:
        logger.error(f"Analytics error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to load analytics data'}), 500

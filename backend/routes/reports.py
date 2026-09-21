"""
SafeGuard AI — Reports Routes
POST /api/reports
"""

import logging
from flask import Blueprint, jsonify, request
from services import report_service

logger = logging.getLogger(__name__)
bp = Blueprint('reports', __name__)


@bp.route('/api/reports', methods=['POST'])
def generate_report():
    """Generate a safety report for a given period."""
    try:
        data = request.get_json(silent=True) or {}
        report_type = data.get('report_type', 'weekly')
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if report_type not in ('daily', 'weekly', 'monthly', 'custom'):
            report_type = 'weekly'

        report = report_service.generate_report(report_type, start_date, end_date)
        return jsonify({'success': True, 'report': report})

    except Exception as e:
        logger.error(f"Report generation error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to generate report'}), 500

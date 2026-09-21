"""
SafeGuard AI — Model & Settings Routes
GET /api/model
GET /api/settings
PUT /api/settings
"""

import logging
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from database.models import db, AppSettings

logger = logging.getLogger(__name__)
bp = Blueprint('model', __name__)


@bp.route('/api/model', methods=['GET'])
def get_model_info():
    """Return ML model information and current mode."""
    try:
        detector = current_app.config.get('DETECTOR')
        mode = current_app.config.get('ML_MODE', 'mock')

        if detector:
            info = detector.get_model_info()
        else:
            info = {
                'name': 'MockHelmetDetector',
                'mode': 'mock',
                'status': 'demo',
            }

        return jsonify({
            'success': True,
            'model': {
                **info,
                'display_name': 'YOLOv8n',
                'model_type': 'Object Detection',
                'framework': 'Ultralytics YOLO',
                'deep_learning': 'PyTorch',
                'dataset': 'Hard Hat Workers / PPE Dataset',
                'training_platform': 'Google Colab',
                'integration': 'Flask ML Service',
                'input_resolution': '640×640',
                'current_mode': mode,
                'is_demo': mode == 'mock',
            }
        })

    except Exception as e:
        logger.error(f"Model info error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve model information'}), 500


@bp.route('/api/settings', methods=['GET'])
def get_settings():
    """Return all application settings as a key-value dict."""
    try:
        settings = AppSettings.query.all()
        return jsonify({
            'success': True,
            'settings': {s.key: s.value for s in settings}
        })
    except Exception as e:
        logger.error(f"Get settings error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve settings'}), 500


@bp.route('/api/settings', methods=['PUT'])
def update_settings():
    """Update one or more application settings."""
    try:
        data = request.get_json(silent=True) or {}
        if not data:
            return jsonify({'success': False, 'error': 'No settings provided'}), 400

        for key, value in data.items():
            setting = AppSettings.query.filter_by(key=key).first()
            if setting:
                setting.value = str(value)
                setting.updated_at = datetime.utcnow()
            else:
                db.session.add(AppSettings(key=key, value=str(value)))

        db.session.commit()
        return jsonify({'success': True, 'message': 'Settings updated successfully'})

    except Exception as e:
        db.session.rollback()
        logger.error(f"Update settings error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to update settings'}), 500

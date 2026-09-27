"""
SafeGuard AI — Detection Routes
POST /api/detect/image
POST /api/detect/frame
POST /api/detect/video
GET  /api/detections
GET  /api/detections/<id>
GET  /api/sessions
"""

import logging
from flask import Blueprint, jsonify, request, current_app
from services import detection_service

logger = logging.getLogger(__name__)
bp = Blueprint('detection', __name__)


def _get_detector():
    return current_app.config['DETECTOR']


def _get_upload_dir():
    return current_app.config['UPLOAD_DIR']


@bp.route('/api/detect/image', methods=['POST'])
def detect_image():
    """Upload and detect helmets in a still image."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded. Use form field name: file'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'success': False, 'error': 'Empty file received'}), 400

    # Check file size
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    max_size = detection_service.get_max_bytes()
    if size > max_size:
        mb = max_size // (1024 * 1024)
        return jsonify({'success': False, 'error': f'File too large. Maximum size: {mb}MB'}), 413

    try:
        result = detection_service.process_image(file, _get_detector(), _get_upload_dir())
        return jsonify(result)
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Image detection error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Detection failed. Please try again.'}), 500


@bp.route('/api/detect/frame', methods=['POST'])
def detect_frame():
    """Accept a base64-encoded camera frame and run detection."""
    data = request.get_json(silent=True)
    if not data or 'frame' not in data:
        return jsonify({'success': False, 'error': 'Missing frame data in request body'}), 400

    try:
        conf_val = float(data.get('confidence')) if data.get('confidence') is not None else None
        result = detection_service.process_frame(
            data['frame'],
            _get_detector(),
            camera_id=data.get('camera_id', 'Camera 01'),
            confidence=conf_val
        )
        return jsonify(result)
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Frame detection error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Frame detection failed'}), 500


@bp.route('/api/detect/video', methods=['POST'])
def detect_video():
    """Upload and process a video file for helmet detection."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded. Use form field name: file'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'success': False, 'error': 'Empty file received'}), 400

    try:
        result = detection_service.process_video(file, _get_detector(), _get_upload_dir())
        return jsonify(result)
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Video detection error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Video processing failed. Please try again.'}), 500


@bp.route('/api/detections', methods=['GET'])
def get_detections():
    """Return paginated detection records."""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        status_filter = request.args.get('status')
        session_id = request.args.get('session_id', type=int)
        search = request.args.get('search')

        result = detection_service.get_detections_paginated(
            page, per_page, status_filter=status_filter, session_id=session_id, search=search
        )
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Get detections error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve detections'}), 500


@bp.route('/api/detections/<int:detection_id>', methods=['GET'])
def get_detection(detection_id):
    """Return a single detection record."""
    try:
        from database.models import Detection
        det = Detection.query.get(detection_id)
        if not det:
            return jsonify({'success': False, 'error': 'Detection not found'}), 404
        return jsonify({'success': True, 'detection': det.to_dict()})
    except Exception as e:
        logger.error(f"Get detection error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve detection'}), 500


@bp.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Return paginated detection session history."""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search')
        days = request.args.get('days', type=int)
        result = detection_service.get_sessions_paginated(page, per_page, search=search, days=days)
        return jsonify({'success': True, **result})
    except Exception as e:
        logger.error(f"Get sessions error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve sessions'}), 500


@bp.route('/api/sessions/<int:session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a detection session and its associated detections."""
    try:
        from database.models import db, DetectionSession
        session = DetectionSession.query.get(session_id)
        if not session:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        db.session.delete(session)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Session deleted'})
    except Exception as e:
        logger.error(f"Delete session error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to delete session'}), 500

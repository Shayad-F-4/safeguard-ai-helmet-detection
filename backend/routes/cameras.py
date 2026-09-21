"""
SafeGuard AI — Camera Routes
GET    /api/cameras
POST   /api/cameras
PUT    /api/cameras/<id>
DELETE /api/cameras/<id>
POST   /api/cameras/<id>/test
"""

import logging
from datetime import datetime
from flask import Blueprint, jsonify, request
from database.models import db, Camera

logger = logging.getLogger(__name__)
bp = Blueprint('cameras', __name__)


@bp.route('/api/cameras', methods=['GET'])
def get_cameras():
    """Return all configured cameras."""
    try:
        cameras = Camera.query.order_by(Camera.created_at.asc()).all()
        return jsonify({'success': True, 'cameras': [c.to_dict() for c in cameras]})
    except Exception as e:
        logger.error(f"Get cameras error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to retrieve cameras'}), 500


@bp.route('/api/cameras', methods=['POST'])
def create_camera():
    """Add a new camera configuration."""
    try:
        data = request.get_json(silent=True) or {}
        name = data.get('name', '').strip()
        if not name:
            return jsonify({'success': False, 'error': 'Camera name is required'}), 400

        camera = Camera(
            name=name,
            location=data.get('location', ''),
            status=data.get('status', 'inactive'),
            source=data.get('source', 'webcam'),
            fps=float(data.get('fps', 30.0)),
        )
        db.session.add(camera)
        db.session.commit()
        return jsonify({'success': True, 'camera': camera.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Create camera error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to create camera'}), 500


@bp.route('/api/cameras/<int:camera_id>', methods=['PUT'])
def update_camera(camera_id):
    """Update a camera configuration."""
    try:
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({'success': False, 'error': 'Camera not found'}), 404

        data = request.get_json(silent=True) or {}
        if 'name' in data:
            camera.name = data['name'].strip()
        if 'location' in data:
            camera.location = data['location']
        if 'status' in data:
            camera.status = data['status']
        if 'source' in data:
            camera.source = data['source']
        if 'fps' in data:
            camera.fps = float(data['fps'])

        db.session.commit()
        return jsonify({'success': True, 'camera': camera.to_dict()})

    except Exception as e:
        db.session.rollback()
        logger.error(f"Update camera error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to update camera'}), 500


@bp.route('/api/cameras/<int:camera_id>', methods=['DELETE'])
def delete_camera(camera_id):
    """Delete a camera configuration."""
    try:
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({'success': False, 'error': 'Camera not found'}), 404

        db.session.delete(camera)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Camera deleted'})

    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete camera error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Failed to delete camera'}), 500


@bp.route('/api/cameras/<int:camera_id>/test', methods=['POST'])
def test_camera(camera_id):
    """Test camera connectivity (simulated for webcam in demo mode)."""
    try:
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({'success': False, 'error': 'Camera not found'}), 404

        # For webcam/laptop camera: mark as active (browser handles actual access)
        camera.last_active = datetime.utcnow()
        camera.status = 'active'
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f"Camera '{camera.name}' test successful",
            'camera': camera.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Test camera error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Camera test failed'}), 500

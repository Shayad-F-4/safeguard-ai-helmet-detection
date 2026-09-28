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


def normalize_camera_source(source: str) -> str:
    """Normalize IP camera URLs (e.g. Android IP Webcam app addresses and public tunnels)."""
    if not source or source.strip().lower() in ('webcam', 'default', 'camera 01'):
        return 'webcam'
    s = source.strip()
    if not (s.startswith('http://') or s.startswith('https://') or s.startswith('rtsp://') or s.startswith('rtmp://')):
        s = 'http://' + s
    # IP Webcam app on Android (or tunnel forwarding it) serves video at /video
    has_stream_path = any(s.endswith(p) for p in ['/video', '/shot.jpg', '/stream', '.mjpg', '.mjpeg', '.h264'])
    if not has_stream_path:
        if ':8080' in s or any(t in s for t in ['ngrok', 'pinggy', 'localtunnel', 'localto.net', 'localhost.run', 'serveo']):
            s = s.rstrip('/') + '/video'
    return s


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
    """Add a new camera configuration with normalized source."""
    try:
        data = request.get_json(silent=True) or {}
        name = data.get('name', '').strip()
        if not name:
            return jsonify({'success': False, 'error': 'Camera name is required'}), 400

        source = normalize_camera_source(data.get('source', 'webcam'))
        camera = Camera(
            name=name,
            location=data.get('location', ''),
            status=data.get('status', 'inactive'),
            source=source,
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
            camera.source = normalize_camera_source(data['source'])
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
    """Test camera connectivity for both local webcams and remote IP/mobile cameras."""
    try:
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({'success': False, 'error': 'Camera not found'}), 404

        source = normalize_camera_source(camera.source)
        if source == 'webcam':
            camera.last_active = datetime.utcnow()
            camera.status = 'active'
            db.session.commit()
            return jsonify({
                'success': True,
                'message': f"Local webcam '{camera.name}' verified (ready for browser access)",
                'camera': camera.to_dict()
            })

        # Test remote IP or RTSP stream
        import cv2
        cap = cv2.VideoCapture(source)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        if not cap.isOpened() and source.endswith('/video'):
            alt_source = source[:-6] + '/shot.jpg'
            alt_cap = cv2.VideoCapture(alt_source)
            if alt_cap.isOpened():
                cap = alt_cap
                source = alt_source

        if not cap.isOpened():
            camera.status = 'inactive'
            db.session.commit()
            return jsonify({
                'success': False,
                'error': f"Could not connect to {source}. Ensure mobile IP Webcam is active and on the same Wi-Fi.",
                'camera': camera.to_dict()
            }), 400

        ret, frame = cap.read()
        cap.release()
        if not ret or frame is None:
            camera.status = 'inactive'
            db.session.commit()
            return jsonify({
                'success': False,
                'error': f"Connected to {source}, but no video frame was received.",
                'camera': camera.to_dict()
            }), 400

        camera.last_active = datetime.utcnow()
        camera.status = 'active'
        camera.source = source
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f"IP Camera '{camera.name}' stream verified and active!",
            'camera': camera.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Test camera error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': f'Camera test error: {str(e)}'}), 500


@bp.route('/api/cameras/<int:camera_id>/snapshot', methods=['GET', 'POST'])
def camera_snapshot(camera_id):
    """
    Capture a frame from an IP camera, run YOLO detection,
    and return detection results + live stats.
    """
    try:
        camera = Camera.query.get(camera_id)
        if not camera:
            return jsonify({'success': False, 'error': 'Camera not found'}), 404

        source = normalize_camera_source(camera.source)
        if source == 'webcam':
            return jsonify({'success': False, 'error': 'Use client-side capture for local webcam'}), 400

        import cv2, base64
        from flask import current_app

        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            return jsonify({'success': False, 'error': f'Cannot connect to camera stream at {source}'}), 502

        ret, frame = cap.read()
        cap.release()
        if not ret or frame is None:
            return jsonify({'success': False, 'error': 'Could not read frame from camera'}), 502

        detector = current_app.config.get('DETECTOR')
        conf_val = request.args.get('confidence', type=float)

        result = detector.predict_frame(frame, conf=conf_val)
        result['camera_id'] = camera.name

        # Draw detections onto frame for preview
        for det in result.get('detections', []):
            b = det['bbox']
            color = (0, 200, 0) if det['class'] == 'helmet' else (0, 0, 255)
            cv2.rectangle(frame, (b['x1'], b['y1']), (b['x2'], b['y2']), color, 2)
            lbl = f"{'Helmet' if det['class'] == 'helmet' else 'No Helmet'} {round(det['confidence'] * 100)}%"
            cv2.putText(frame, lbl, (b['x1'], max(20, b['y1'] - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

        _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        result['annotated_image'] = 'data:image/jpeg;base64,' + base64.b64encode(buf).decode('utf-8')

        return jsonify(result)

    except Exception as e:
        logger.error(f"Camera snapshot error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/api/cameras/<int:camera_id>/feed')
def camera_feed_stream(camera_id):
    """
    Live MJPEG streaming endpoint for IP / Mobile cameras with YOLO overlay.
    Natively displayable in any <img>: <img src="/api/cameras/<id>/feed" />
    """
    from flask import Response, current_app
    import cv2, time

    camera = Camera.query.get(camera_id)
    if not camera:
        return jsonify({'success': False, 'error': 'Camera not found'}), 404

    source = normalize_camera_source(camera.source)
    detector = current_app.config.get('DETECTOR')

    def generate_frames():
        cap = cv2.VideoCapture(source)
        frame_idx = 0
        last_dets = []

        if not cap.isOpened():
            import numpy as np
            is_private = any(p in str(source) for p in ['10.', '192.168.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '127.0.0.1', 'localhost'])
            is_cloud = os.environ.get('RENDER') or os.environ.get('FLASK_ENV') == 'production'

            err_img = np.zeros((480, 640, 3), dtype=np.uint8)
            err_img[:] = (20, 24, 33)
            cv2.putText(err_img, "Camera Stream Offline", (150, 160),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.85, (80, 80, 240), 2)
            cv2.putText(err_img, f"Source: {str(source)[:40]}", (80, 205),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (160, 160, 160), 1)

            if is_private and is_cloud:
                cv2.putText(err_img, "NOTE: Private Wi-Fi IP (10.x / 192.168.x)", (70, 250),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.52, (100, 200, 255), 1)
                cv2.putText(err_img, "Cloud backend cannot access private home/office Wi-Fi", (50, 280),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.48, (200, 200, 200), 1)
                cv2.putText(err_img, "1. Open app directly on phone: vercel.app/live", (70, 320),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.48, (100, 240, 150), 1)
                cv2.putText(err_img, "2. Or run backend locally on PC: python app.py", (70, 350),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.48, (180, 180, 180), 1)
                cv2.putText(err_img, "3. Or forward port via public tunnel (ngrok http 8080)", (70, 380),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.48, (180, 180, 180), 1)
            else:
                cv2.putText(err_img, "1. Open IP Webcam app on mobile", (120, 270),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (130, 130, 130), 1)
                cv2.putText(err_img, "2. Tap 'Start server' at the bottom", (120, 305),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (130, 130, 130), 1)
                cv2.putText(err_img, "3. Connect phone & PC to same Wi-Fi", (120, 340),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (130, 130, 130), 1)

            _, err_buf = cv2.imencode('.jpg', err_img, [cv2.IMWRITE_JPEG_QUALITY, 80])
            for _ in range(10):
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + err_buf.tobytes() + b'\r\n')
                time.sleep(1.0)
            return

        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    time.sleep(0.1)
                    continue

                # Run YOLO detection every 4th frame to conserve CPU
                if frame_idx % 4 == 0 and detector:
                    try:
                        res = detector.predict_frame(frame)
                        last_dets = res.get('detections', [])
                    except Exception:
                        pass

                # Draw bounding boxes
                for det in last_dets:
                    b = det['bbox']
                    color = (0, 220, 0) if det['class'] == 'helmet' else (0, 0, 240)
                    cv2.rectangle(frame, (b['x1'], b['y1']), (b['x2'], b['y2']), color, 2)
                    lbl = f"{'Helmet' if det['class'] == 'helmet' else 'No Helmet'} {round(det['confidence'] * 100)}%"
                    cv2.putText(frame, lbl, (b['x1'], max(20, b['y1'] - 6)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.55, color, 2)

                frame_idx += 1
                ret2, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                if not ret2:
                    continue

                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                time.sleep(0.04)
        finally:
            cap.release()

    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


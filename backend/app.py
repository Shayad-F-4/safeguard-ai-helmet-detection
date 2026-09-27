"""
SafeGuard AI — Flask Application Entry Point
Edge AI Helmet Detection System — Backend Server

Run with: python app.py
API available at: http://localhost:5000/api/

ML_MODE=mock  → Demo mode (default, no model required)
ML_MODE=yolo  → Production mode (requires models/best.pt)
"""

import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def create_app():
    """Application factory — creates and configures the Flask app."""
    app = Flask(__name__)

    # ------------------------------------------------------------------ #
    #  Configuration
    # ------------------------------------------------------------------ #
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'safeguard-ai-secret')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL', 'sqlite:///safeguard.db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = int(
        float(os.getenv('MAX_UPLOAD_SIZE_MB', '100')) * 1024 * 1024
    )
    app.config['ML_MODE'] = os.getenv('ML_MODE', 'mock')

    # Upload directory
    upload_dir = os.path.join(os.path.dirname(__file__), 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(__file__), 'models'), exist_ok=True)
    app.config['UPLOAD_DIR'] = upload_dir

    # ------------------------------------------------------------------ #
    #  CORS
    # ------------------------------------------------------------------ #
    CORS(app, resources={
        r'/api/*': {
            'origins': '*',
            'methods': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            'allow_headers': ['Content-Type', 'Authorization'],
        },
        r'/uploads/*': {
            'origins': '*',
            'methods': ['GET', 'OPTIONS'],
        }
    })

    from flask import send_from_directory

    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(app.config['UPLOAD_DIR'], filename)

    @app.route('/api/uploads/<path:filename>')
    def serve_api_upload(filename):
        return send_from_directory(app.config['UPLOAD_DIR'], filename)

    # ------------------------------------------------------------------ #
    #  Database
    # ------------------------------------------------------------------ #
    from database.database import init_db
    init_db(app)

    # ------------------------------------------------------------------ #
    #  ML Detector
    # ------------------------------------------------------------------ #
    from ml_service.detector_factory import get_detector
    detector, active_mode = get_detector()
    app.config['DETECTOR'] = detector
    app.config['ML_MODE'] = active_mode
    app.config['DETECTOR_INFO'] = detector.get_model_info()
    logger.info(f"Detector initialized: {type(detector).__name__} (mode={active_mode})")

    # ------------------------------------------------------------------ #
    #  Register Blueprints
    # ------------------------------------------------------------------ #
    from routes.dashboard import bp as dashboard_bp
    from routes.detection import bp as detection_bp
    from routes.alerts import bp as alerts_bp
    from routes.analytics import bp as analytics_bp
    from routes.reports import bp as reports_bp
    from routes.cameras import bp as cameras_bp
    from routes.model import bp as model_bp

    app.register_blueprint(dashboard_bp)
    app.register_blueprint(detection_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(cameras_bp)
    app.register_blueprint(model_bp)

    # ------------------------------------------------------------------ #
    #  Global error handlers
    # ------------------------------------------------------------------ #
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'success': False, 'error': 'Method not allowed'}), 405

    @app.errorhandler(413)
    def file_too_large(e):
        max_mb = os.getenv('MAX_UPLOAD_SIZE_MB', '100')
        return jsonify({
            'success': False,
            'error': f'File too large. Maximum upload size is {max_mb}MB'
        }), 413

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"Internal server error: {e}")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

    @app.route('/')
    def root():
        return jsonify({
            'status': 'online',
            'service': 'SafeGuard AI Backend API',
            'version': '1.0.0',
            'mode': app.config.get('ML_MODE', 'yolo'),
            'frontend_url': 'http://localhost:5173',
            'endpoints': {
                'health': '/api/health',
                'dashboard': '/api/dashboard/stats',
                'detect_image': '/api/detect/image',
                'detect_frame': '/api/detect/frame',
                'detect_video': '/api/detect/video',
                'alerts': '/api/alerts',
                'analytics': '/api/analytics',
                'cameras': '/api/cameras',
                'model': '/api/model',
                'settings': '/api/settings',
            }
        })

    logger.info(f"SafeGuard AI backend ready | ML_MODE={active_mode} | Port=5000")
    return app


# ------------------------------------------------------------------ #
#  Entry point
# ------------------------------------------------------------------ #
if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    logger.info(f"Starting SafeGuard AI on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=debug, use_reloader=False)


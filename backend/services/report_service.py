"""
SafeGuard AI — Report Service
Aggregates database data into formatted report and analytics payloads.
"""

import logging
from datetime import datetime, timedelta
from sqlalchemy import func

logger = logging.getLogger(__name__)


def get_analytics_data(period: str = 'weekly') -> dict:
    """
    Return analytics data for the given period.
    
    Args:
        period: 'daily' (last 24h), 'weekly' (last 7 days), 'monthly' (last 30 days)
    """
    from database.models import DetectionSession, Detection, Alert, Camera

    now = datetime.utcnow()
    if period == 'daily':
        start = now - timedelta(days=1)
        date_format = '%H:00'
        num_points = 24
        delta = timedelta(hours=1)
    elif period == 'monthly':
        start = now - timedelta(days=30)
        date_format = '%b %d'
        num_points = 30
        delta = timedelta(days=1)
    else:  # weekly (default)
        start = now - timedelta(days=7)
        date_format = '%a'
        num_points = 7
        delta = timedelta(days=1)

    # Build time series data
    compliance_trend = []
    helmet_vs_no_helmet = []
    violations_trend = []
    fps_trend = []

    for i in range(num_points):
        point_start = start + i * delta
        point_end = point_start + delta
        label = point_start.strftime(date_format)

        sessions = DetectionSession.query.filter(
            DetectionSession.created_at >= point_start,
            DetectionSession.created_at < point_end
        ).all()

        if sessions:
            avg_compliance = sum(s.compliance_rate for s in sessions) / len(sessions)
            helmet_sum = sum(s.helmet_count for s in sessions)
            no_helmet_sum = sum(s.no_helmet_count for s in sessions)
            avg_fps = sum(s.average_fps for s in sessions) / len(sessions)
            violations = no_helmet_sum
        else:
            avg_compliance = 0
            helmet_sum = 0
            no_helmet_sum = 0
            avg_fps = 0
            violations = 0

        compliance_trend.append({'label': label, 'compliance_rate': round(avg_compliance, 1)})
        helmet_vs_no_helmet.append({'label': label, 'helmet': helmet_sum, 'no_helmet': no_helmet_sum})
        violations_trend.append({'label': label, 'violations': violations})
        fps_trend.append({'label': label, 'fps': round(avg_fps, 1)})

    # Confidence distribution
    all_detections = Detection.query.filter(Detection.timestamp >= start).all()
    confidence_buckets = {
        '50-60%': 0, '60-70%': 0, '70-80%': 0,
        '80-90%': 0, '90-95%': 0, '95-100%': 0
    }
    for det in all_detections:
        c = det.confidence * 100
        if c < 60:
            confidence_buckets['50-60%'] += 1
        elif c < 70:
            confidence_buckets['60-70%'] += 1
        elif c < 80:
            confidence_buckets['70-80%'] += 1
        elif c < 90:
            confidence_buckets['80-90%'] += 1
        elif c < 95:
            confidence_buckets['90-95%'] += 1
        else:
            confidence_buckets['95-100%'] += 1

    confidence_distribution = [
        {'range': k, 'count': v} for k, v in confidence_buckets.items()
    ]

    # Camera-wise violations
    from database.models import Camera
    cameras = Camera.query.all()
    camera_violations = []
    for cam in cameras:
        alerts = Alert.query.filter(
            Alert.camera_name == cam.name,
            Alert.created_at >= start
        ).count()
        camera_violations.append({'camera': cam.name, 'violations': alerts})

    # Overall summary
    all_sessions = DetectionSession.query.filter(DetectionSession.created_at >= start).all()
    total_detections = sum(s.total_workers for s in all_sessions)
    total_violations = sum(s.no_helmet_count for s in all_sessions)
    avg_compliance = (
        sum(s.compliance_rate for s in all_sessions) / len(all_sessions)
        if all_sessions else 0
    )
    avg_confidence = (
        sum(d.confidence for d in all_detections) / len(all_detections) * 100
        if all_detections else 0
    )
    avg_fps = (
        sum(s.average_fps for s in all_sessions) / len(all_sessions)
        if all_sessions else 0
    )
    avg_inference = 0  # Available only in real-time detection results

    return {
        'period': period,
        'compliance_trend': compliance_trend,
        'helmet_vs_no_helmet': helmet_vs_no_helmet,
        'violations_trend': violations_trend,
        'confidence_distribution': confidence_distribution,
        'fps_trend': fps_trend,
        'camera_violations': camera_violations,
        'summary': {
            'total_detections': total_detections,
            'total_violations': total_violations,
            'avg_compliance': round(avg_compliance, 1),
            'avg_confidence': round(avg_confidence, 1),
            'avg_fps': round(avg_fps, 1),
            'avg_inference_ms': avg_inference,
        }
    }


def generate_report(report_type: str, start_date: str = None, end_date: str = None) -> dict:
    """
    Generate a full safety report for the given period.
    
    Args:
        report_type: 'daily', 'weekly', 'monthly', 'custom'
        start_date: ISO date string (required for custom)
        end_date: ISO date string (required for custom)
    """
    from database.models import DetectionSession, Detection, Alert

    now = datetime.utcnow()

    if report_type == 'daily':
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = now
        label = f"Daily Report — {now.strftime('%B %d, %Y')}"
    elif report_type == 'weekly':
        start = now - timedelta(days=7)
        end = now
        label = f"Weekly Report — {start.strftime('%b %d')} to {now.strftime('%b %d, %Y')}"
    elif report_type == 'monthly':
        start = now - timedelta(days=30)
        end = now
        label = f"Monthly Report — {start.strftime('%b %d')} to {now.strftime('%b %d, %Y')}"
    else:  # custom
        try:
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)
            label = f"Custom Report — {start.strftime('%b %d')} to {end.strftime('%b %d, %Y')}"
        except Exception:
            start = now - timedelta(days=7)
            end = now
            label = "Custom Report"

    sessions = DetectionSession.query.filter(
        DetectionSession.created_at >= start,
        DetectionSession.created_at <= end
    ).order_by(DetectionSession.created_at.asc()).all()

    alerts = Alert.query.filter(
        Alert.created_at >= start,
        Alert.created_at <= end
    ).order_by(Alert.created_at.desc()).all()

    total_workers = sum(s.total_workers for s in sessions)
    helmet_count = sum(s.helmet_count for s in sessions)
    no_helmet_count = sum(s.no_helmet_count for s in sessions)
    compliance_rate = (helmet_count / total_workers * 100) if total_workers > 0 else 0
    avg_confidence = (
        sum(s.average_confidence for s in sessions) / len(sessions)
        if sessions else 0
    )
    avg_fps = (
        sum(s.average_fps for s in sessions) / len(sessions)
        if sessions else 0
    )

    # Violation breakdown per day
    violation_summary = []
    current = start
    while current <= end:
        day_sessions = [s for s in sessions
                        if s.created_at.date() == current.date()]
        day_violations = sum(s.no_helmet_count for s in day_sessions)
        day_workers = sum(s.total_workers for s in day_sessions)
        day_compliance = (
            (sum(s.helmet_count for s in day_sessions) / day_workers * 100)
            if day_workers > 0 else 0
        )
        violation_summary.append({
            'date': current.strftime('%Y-%m-%d'),
            'workers': day_workers,
            'violations': day_violations,
            'compliance': round(day_compliance, 1),
        })
        current += timedelta(days=1)

    return {
        'report_type': report_type,
        'label': label,
        'generated_at': now.isoformat(),
        'period': {
            'start': start.isoformat(),
            'end': end.isoformat(),
        },
        'project_name': 'SafeGuard AI',
        'subtitle': 'Edge AI Helmet Detection System',
        'summary': {
            'total_sessions': len(sessions),
            'total_workers': total_workers,
            'helmet_detections': helmet_count,
            'no_helmet_detections': no_helmet_count,
            'compliance_rate': round(compliance_rate, 1),
            'total_alerts': len(alerts),
            'active_alerts': sum(1 for a in alerts if a.status == 'active'),
            'avg_confidence': round(avg_confidence * 100, 1),
            'avg_fps': round(avg_fps, 1),
        },
        'violation_summary': violation_summary,
        'recent_alerts': [a.to_dict() for a in alerts[:10]],
    }

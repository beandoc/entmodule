"""
Vertigo & Cervical Rehabilitation - YOLOv11 Pose Analysis Script
Powered by Ultralytics YOLOv11 Pose (yolo11n-pose.pt)

This script analyzes patient video recordings for neck movement exercises:
- Head Side-to-Side (Yaw Rotation)
- Head Up-and-Down (Pitch Nodding)
- Head 45-degree Lateral Tilt (Roll Angle)
- Cervical Range of Motion (ROM) assessment
"""

import math
import argparse
import json
import sys

try:
    import cv2
    import numpy as np
    from ultralytics import YOLO
except ImportError:
    cv2 = None
    np = None
    YOLO = None

# Keypoint Mapping for COCO Pose format:
# 0: Nose, 1: Left Eye, 2: Right Eye, 3: Left Ear, 4: Right Ear
# 5: Left Shoulder, 6: Right Shoulder

def calculate_angle(p1, p2, p3):
    """Calculate angle in degrees between three 2D points (vertex at p2)."""
    v1 = (p1[0] - p2[0], p1[1] - p2[1])
    v2 = (p3[0] - p2[0], p3[1] - p2[1])
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    mag1 = math.hypot(v1[0], v1[1])
    mag2 = math.hypot(v2[0], v2[1])
    if mag1 * mag2 == 0:
        return 0.0
    cos_angle = max(-1.0, min(1.0, dot / (mag1 * mag2)))
    return math.degrees(math.acos(cos_angle))

def estimate_head_angles(keypoints):
    """
    Extract head Yaw, Pitch, Roll from facial & shoulder keypoints.
    keypoints: array of shape (17, 2 or 3)
    """
    nose = keypoints[0]
    l_eye, r_eye = keypoints[1], keypoints[2]
    l_ear, r_ear = keypoints[3], keypoints[4]
    l_sh, r_sh = keypoints[5], keypoints[6]

    # Roll angle: slope between eyes or ears relative to horizontal
    dx_ears = r_ear[0] - l_ear[0]
    dy_ears = r_ear[1] - l_ear[1]
    roll_deg = math.degrees(math.atan2(dy_ears, dx_ears)) if dx_ears != 0 else 0.0

    # Yaw angle ratio: nose distance to left vs right ear
    d_left_ear = math.hypot(nose[0] - l_ear[0], nose[1] - l_ear[1])
    d_right_ear = math.hypot(nose[0] - r_ear[0], nose[1] - r_ear[1])
    total_dist = d_left_ear + d_right_ear
    yaw_ratio = (d_right_ear - d_left_ear) / total_dist if total_dist > 0 else 0.0
    yaw_deg = yaw_ratio * 90.0  # Approx estimation -90 to +90 deg

    # Pitch angle: nose vertical position relative to ear center
    ear_mid_y = (l_ear[1] + r_ear[1]) / 2.0
    pitch_offset = nose[1] - ear_mid_y
    pitch_deg = max(-60.0, min(60.0, pitch_offset * 1.5))

    # Shoulder tilt & baseline
    sh_mid_x = (l_sh[0] + r_sh[0]) / 2.0
    sh_mid_y = (l_sh[1] + r_sh[1]) / 2.0

    return {
        "roll_deg": round(roll_deg, 2),
        "yaw_deg": round(yaw_deg, 2),
        "pitch_deg": round(pitch_deg, 2),
        "shoulder_mid": (round(sh_mid_x, 1), round(sh_mid_y, 1))
    }

def process_vertigo_video(video_path, output_json=None):
    if YOLO is None or cv2 is None:
        print("[Error] Required dependencies (ultralytics, opencv-python) not installed.")
        print("Install with: pip install ultralytics opencv-python")
        return None

    print(f"[YOLOv11 Vertigo Rehab] Loading model yolo11n-pose.pt...")
    model = YOLO("yolo11n-pose.pt")
    
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"[Error] Unable to open video: {video_path}")
        return None

    frame_metrics = []
    frame_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, verbose=False)
        frame_idx += 1

        for res in results:
            if res.keypoints is not None and len(res.keypoints) > 0:
                kpts = res.keypoints.data[0].cpu().numpy()  # First detected person
                metrics = estimate_head_angles(kpts)
                metrics["frame"] = frame_idx
                frame_metrics.append(metrics)

    cap.release()

    # Calculate summary metrics
    if frame_metrics:
        yaws = [m["yaw_deg"] for m in frame_metrics]
        pitches = [m["pitch_deg"] for m in frame_metrics]
        rolls = [m["roll_deg"] for m in frame_metrics]

        summary = {
            "total_frames": frame_idx,
            "max_yaw_right": max(yaws),
            "max_yaw_left": min(yaws),
            "max_pitch_up": min(pitches),
            "max_pitch_down": max(pitches),
            "max_roll_tilt": max([abs(r) for r in rolls]),
            "cervical_rom_score": round((max(yaws) - min(yaws)) + (max(pitches) - min(pitches)), 2)
        }
        print("\n=== Biomechanical Cervical ROM Analysis ===")
        print(json.dumps(summary, indent=2))

        if output_json:
            with open(output_json, "w") as f:
                json.dump({"summary": summary, "frame_data": frame_metrics}, f, indent=2)
            print(f"[Success] Saved frame report to {output_json}")

        return summary
    return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="YOLOv11 Vertigo Rehab Pose Tracker")
    parser.add_argument("--video", type=str, help="Path to input patient exercise video")
    parser.add_argument("--out", type=str, default="vertigo_report.json", help="Path for JSON report")
    args = parser.parse_args()

    if args.video:
        process_vertigo_video(args.video, args.out)
    else:
        print("Usage: python scripts/vertigo_yolo11_pose.py --video patient_exercise.mp4")

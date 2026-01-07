import subprocess
import argparse
import sys
import os

# ---------------- ARG PARSER ----------------
parser = argparse.ArgumentParser(description="Run full NeuroMentor preprocessing pipeline")
parser.add_argument(
    "--session",
    required=True,
    help="Path to session directory"
)
args = parser.parse_args()

session_dir = args.session

# ---------------- VALIDATION ----------------
if not os.path.exists(session_dir):
    print(f"❌ Session directory does not exist: {session_dir}")
    sys.exit(1)

# ---------------- PIPELINE STEPS ----------------
pipeline_steps = [
    ("Preprocessing raw EEG", "preprocess_eeg.py"),
    ("Extracting EEG features", "extract_features.py"),
    ("Labeling EEG cognitive states", "label_cognitive_state_eeg_only.py"),
    ("Aligning EEG with behavior", "align_eeg_behavior.py"),
]

# ---------------- EXECUTION ----------------
for step_name, script in pipeline_steps:
    print(f"\n▶️  {step_name}")
    print(f"    Running: python {script} --session {session_dir}")

    result = subprocess.run(
        ["python", script, "--session", session_dir],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print(f"\n❌ ERROR during: {step_name}")
        print(result.stderr)
        sys.exit(1)

    print(result.stdout)

print("\n✅ NeuroMentor preprocessing pipeline completed successfully 🎉")

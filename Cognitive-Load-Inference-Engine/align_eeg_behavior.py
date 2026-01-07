import pandas as pd
import os
import argparse
import glob


# ---------------- CONFIG ----------------
PRE_WINDOW_SEC = 2.0   # EEG window before event (seconds)

# ---------------- ARG PARSE ----------------
parser = argparse.ArgumentParser()
parser.add_argument("--session", required=True, help="Session directory")
args = parser.parse_args()

session_dir = args.session


def align_eeg_with_behavior(session_dir):
    eeg_path = os.path.join(session_dir, "processed", "eeg_labeled.csv")

    files = glob.glob(os.path.join(session_dir, "*behavior.csv"))
    if not files:
        print(f"No EEG CSV file found in {session_dir}")
        return
    beh_path = files[0]  # take the first match

    if not os.path.exists(eeg_path):
        raise FileNotFoundError("eeg_labeled.csv not found")
    if not os.path.exists(beh_path):
        raise FileNotFoundError("behavior.csv not found")

    eeg = pd.read_csv(eeg_path)
    beh = pd.read_csv(beh_path)

    eeg["Timestamp"] = eeg["timestamp"] if "timestamp" in eeg.columns else eeg["Timestamp"]

    aligned_rows = []

    for _, event in beh.iterrows():
        event_time = event["Timestamp"]

        window_start = event_time - PRE_WINDOW_SEC
        window_end = event_time

        eeg_window = eeg[
            (eeg["Timestamp"] >= window_start) &
            (eeg["Timestamp"] <= window_end)
        ]

        if eeg_window.empty:
            continue

        aligned_rows.append({
            "event_timestamp": event_time,
            "event_type": event["EventType"],
            "event_details": event["Details"],

            # EEG FEATURES (mean over window)
            "theta_power": eeg_window["theta_power"].mean(),
            "alpha_power": eeg_window["alpha_power"].mean(),
            "beta_power": eeg_window["beta_power"].mean(),
            "theta_beta_ratio": eeg_window["theta_beta_ratio"].mean(),
            "alpha_beta_ratio": eeg_window["alpha_beta_ratio"].mean(),

            # Dominant cognitive state in window
            "dominant_state": eeg_window["cognitive_state"].mode()[0]
        })

    aligned_df = pd.DataFrame(aligned_rows)

    out_path = os.path.join(session_dir, "processed", "eeg_behavior_aligned.csv")
    aligned_df.to_csv(out_path, index=False)

    print(f"✅ EEG–Behavior alignment saved to {out_path}")
    print(f"Total aligned events: {len(aligned_df)}")


if __name__ == "__main__":
    align_eeg_with_behavior(session_dir)

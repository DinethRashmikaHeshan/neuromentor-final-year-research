import pandas as pd
import glob
import os
from behavioral_features import extract_window_features

DATA_DIR = "/Users/urinduyatawaka/Desktop/NeuroMentor/recordings/"
WINDOW_SEC = 5.0
STEP_SEC = 1.0

def load_all_sessions(data_dir):
    all_files = glob.glob(os.path.join(data_dir, "session_*", "processed", "eeg_behavior_aligned.csv"))
    dfs = []
    for file in all_files:
        df = pd.read_csv(file)
        df["event_details"] = df["event_details"].apply(eval)  # convert str dict to dict
        dfs.append(df)
    combined_df = pd.concat(dfs, ignore_index=True)
    return combined_df

def build_sequential_dataset(df):
    samples, labels = [], []

    t = df["event_timestamp"].min()
    t_end = df["event_timestamp"].max()

    while t + WINDOW_SEC <= t_end:
        window = df[
            (df["event_timestamp"] >= t) &
            (df["event_timestamp"] < t + WINDOW_SEC)
        ]

        if len(window) >= 3:
            samples.append(extract_window_features(window))
            labels.append(window["dominant_state"].mode()[0])

        t += STEP_SEC

    return pd.DataFrame(samples), pd.Series(labels)

if __name__ == "__main__":
    df_all = load_all_sessions(DATA_DIR)
    X, y = build_sequential_dataset(df_all)

    output_dir = "data/processed"
    os.makedirs(output_dir, exist_ok=True)

    X.to_csv("data/processed/sequential_features_all_sessions.csv", index=False)
    y.to_csv("data/processed/labels_all_sessions.csv", index=False)
    print("✅ Combined dataset created from all sessions")

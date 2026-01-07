import pandas as pd
import numpy as np
import os

from utils import bandpass_filter, notch_filter, normalize

SAMPLING_RATE = 500  # must match device

import glob

import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--session", required=True)
args = parser.parse_args()

session_dir = args.session

def preprocess_eeg(session_dir):
    # Find the eeg CSV file matching pattern
    files = glob.glob(os.path.join(session_dir, "*eeg.csv"))
    if not files:
        print(f"No EEG CSV file found in {session_dir}")
        return
    raw_path = files[0]  # take the first match
    
    processed_dir = os.path.join(session_dir, "processed")
    os.makedirs(processed_dir, exist_ok=True)

    df = pd.read_csv(raw_path)
    timestamps = df["Timestamp"]
    channels = df.drop(columns=["Timestamp"])

    processed = {}

    for ch in channels.columns:
        signal = channels[ch].values

        signal = bandpass_filter(signal, 0.5, 45, SAMPLING_RATE)
        signal = notch_filter(signal, SAMPLING_RATE)
        signal = normalize(signal)

        processed[ch] = signal

    processed_df = pd.DataFrame(processed)
    processed_df.insert(0, "Timestamp", timestamps)

    out_path = os.path.join(processed_dir, "eeg_filtered.csv")
    processed_df.to_csv(out_path, index=False)

    print(f"✅ EEG preprocessing complete: {out_path}")

if __name__ == "__main__":
    # session_dir = "/Users/urinduyatawaka/Desktop/NeuroMentor/recordings/session_question1_2026-01-04T13-04-48-357Z"
    preprocess_eeg(session_dir)

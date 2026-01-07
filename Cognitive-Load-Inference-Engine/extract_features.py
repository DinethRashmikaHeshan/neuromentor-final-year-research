import pandas as pd
import numpy as np
import os
from scipy.signal import welch

SAMPLING_RATE = 500
WINDOW_SIZE = 2  # seconds

import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--session", required=True)
args = parser.parse_args()

session_dir = args.session

def band_power(signal, fs, band):
    freqs, psd = welch(signal, fs, nperseg=fs*2)
    idx = np.logical_and(freqs >= band[0], freqs <= band[1])
    return np.mean(psd[idx])

def extract_features(session_dir):
    path = os.path.join(session_dir, "processed", "eeg_filtered.csv")
    df = pd.read_csv(path)

    window_samples = SAMPLING_RATE * WINDOW_SIZE
    features = []

    for start in range(0, len(df) - window_samples, window_samples):
        window = df.iloc[start:start + window_samples]
        timestamp = window["Timestamp"].iloc[0]

        theta = []
        alpha = []
        beta = []

        for ch in window.columns[1:]:
            sig = window[ch].values
            theta.append(band_power(sig, SAMPLING_RATE, (4, 8)))
            alpha.append(band_power(sig, SAMPLING_RATE, (8, 13)))
            beta.append(band_power(sig, SAMPLING_RATE, (13, 30)))

        theta = np.mean(theta)
        alpha = np.mean(alpha)
        beta = np.mean(beta)

        features.append({
            "timestamp": timestamp,
            "theta_power": theta,
            "alpha_power": alpha,
            "beta_power": beta,
            "theta_beta_ratio": theta / beta if beta else 0,
            "alpha_beta_ratio": alpha / beta if beta else 0
        })

    out = pd.DataFrame(features)
    out_path = os.path.join(session_dir, "processed", "eeg_features.csv")
    out.to_csv(out_path, index=False)

    print(f"✅ EEG features extracted: {out_path}")

if __name__ == "__main__":
    # session_dir = "/Users/urinduyatawaka/Desktop/NeuroMentor/recordings/session_question1_2026-01-04T13-04-48-357Z"
    extract_features(session_dir)

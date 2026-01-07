import pandas as pd
import os
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--session", required=True)
args = parser.parse_args()

session_dir = args.session


def label_from_eeg(row):
    theta = row["theta_power"]
    alpha = row["alpha_power"]
    beta = row["beta_power"]

    tbr = row["theta_beta_ratio"]
    abr = row["alpha_beta_ratio"]

    # 💤 Mind wandering / confusion (theta dominant)
    if tbr > 2.5 and theta > alpha:
        return "confused"

    # 😌 Relaxed (alpha dominant)
    if abr > 1.8 and alpha > beta:
        return "relaxed"

    # 🎯 Focused (low beta / SMR-like)
    if 1.0 <= tbr <= 2.0 and beta > theta * 0.6:
        return "focused"

    # 🤯 Active thinking / cognitive load (beta dominant)
    if beta > alpha and tbr < 1.5:
        return "active_thinking"

    return "neutral"


def label_session(session_dir):
    path = os.path.join(session_dir, "processed", "eeg_features.csv")
    df = pd.read_csv(path)

    required_cols = [
        "theta_power",
        "alpha_power",
        "beta_power",
        "theta_beta_ratio",
        "alpha_beta_ratio"
    ]

    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df["cognitive_state"] = df.apply(label_from_eeg, axis=1)

    out_path = os.path.join(session_dir, "processed", "eeg_labeled.csv")
    df.to_csv(out_path, index=False)

    print(f"✅ EEG-only labels saved to {out_path}")


if __name__ == "__main__":
    label_session(session_dir)

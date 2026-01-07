import pandas as pd
import os
import argparse
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import pickle

parser = argparse.ArgumentParser()
parser.add_argument("--session", required=True, help="Session directory")
args = parser.parse_args()

session_dir = args.session

def train_model(session_dir):
    data_path = os.path.join(session_dir, "processed", "eeg_behavior_aligned.csv")
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"{data_path} not found. Run alignment first.")

    df = pd.read_csv(data_path)

    # -- Prepare data --
    # Features: EEG band powers + ratios
    feature_cols = [
        "theta_power",
        "alpha_power",
        "beta_power",
        "theta_beta_ratio",
        "alpha_beta_ratio"
    ]

    # Labels: Use 'dominant_state' (cognitive_state from EEG windows)
    # You could also use event_type or combine for hybrid labels if desired
    df = df.dropna(subset=feature_cols + ["dominant_state"])  # Drop rows with missing data

    X = df[feature_cols]
    y = df["dominant_state"]

    # Optional: encode labels if needed (sklearn can handle strings but encoding often helps)
    from sklearn.preprocessing import LabelEncoder
    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    # -- Train/Test Split --
    X_train, X_test, y_train, y_test = train_test_split(X, y_enc, test_size=0.2, random_state=42, stratify=y_enc)

    # -- Model --
    clf = RandomForestClassifier(n_estimators=100, random_state=42)

    # -- Train --
    clf.fit(X_train, y_train)

    # -- Evaluate --
    y_pred = clf.predict(X_test)

    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # Cross-validation (optional)
    scores = cross_val_score(clf, X, y_enc, cv=5)
    print(f"\n5-fold CV accuracy: {scores.mean():.3f} (+/- {scores.std():.3f})")

    # -- Save Model --
    model_path = os.path.join(session_dir, "processed", "rf_cognitive_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump({"model": clf, "label_encoder": le}, f)
    print(f"\n✅ Model saved to {model_path}")

if __name__ == "__main__":
    train_model(session_dir)

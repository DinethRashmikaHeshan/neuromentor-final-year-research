# models/train_rf.py
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import os

os.makedirs("models", exist_ok=True)


X = pd.read_csv("data/processed/sequential_features_all_sessions.csv")
y = pd.read_csv("data/processed/labels_all_sessions.csv").squeeze()

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, stratify=y, random_state=42
)

model = RandomForestClassifier(
    n_estimators=300,
    max_depth=12,
    min_samples_leaf=5,
    class_weight="balanced",
    random_state=42
)

model.fit(X_train, y_train)

print(classification_report(y_test, model.predict(X_test)))

joblib.dump(model, "models/rf_cognitive_model.pkl")
print("✅ Model saved")

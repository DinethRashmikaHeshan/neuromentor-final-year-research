import time
from collections import deque
import pandas as pd
import joblib
from behavioral_features import extract_window_features

WINDOW_SEC = 5.0

class OnlineBehaviorPredictor:
    def __init__(self, model_path):
        self.buffer = deque()  # will hold (timestamp, event_type, event_details)
        self.model = joblib.load(model_path)
    
    def add_event(self, event_timestamp, event_type, event_details):
        # Add new event
        self.buffer.append((event_timestamp, event_type, event_details))
        self._cleanup_buffer(event_timestamp)
    
    def _cleanup_buffer(self, current_time):
        # Remove old events outside the window
        while self.buffer and (current_time - self.buffer[0][0]) > WINDOW_SEC:
            self.buffer.popleft()
    
    def predict_state(self):
        if len(self.buffer) < 3:
            return None  # not enough data to predict
        
        # Convert buffer to DataFrame
        df = pd.DataFrame(self.buffer, columns=["event_timestamp", "event_type", "event_details"])
        
        # Extract features from current window
        features = extract_window_features(df)
        X = pd.DataFrame([features])
        
        # Predict cognitive state
        pred = self.model.predict(X)[0]
        proba = self.model.predict_proba(X)[0]
        
        return pred, proba


# Example usage:
if __name__ == "__main__":
    import random

    predictor = OnlineBehaviorPredictor("models/rf_cognitive_model.pkl")

    # Simulate streaming events (replace with your real event stream)
    simulated_events = [
        (time.time(), "code_edit", {"length": random.randint(1, 100)}),
        (time.time() + 1, "cursor_move", {"line": 10, "column": 5}),
        (time.time() + 2, "editor_focus", {}),
        # Add more simulated events here
    ]

    for ts, etype, edetails in simulated_events:
        predictor.add_event(ts, etype, edetails)
        result = predictor.predict_state()
        if result:
            pred_state, pred_proba = result
            print(f"Predicted state: {pred_state}, probabilities: {pred_proba}")
        else:
            print("Not enough data to predict yet.")
        time.sleep(1)  # simulate real-time delay

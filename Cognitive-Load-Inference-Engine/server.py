from flask import Flask, request, jsonify
from inference.online_predictor import OnlineBehaviorPredictor
import time

from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all domains on all routes

predictor = OnlineBehaviorPredictor("models/rf_cognitive_model.pkl")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    event_timestamp = data.get("event_timestamp", time.time())
    event_type = data.get("event_type", "")
    event_details = data.get("event_details", {})

    predictor.add_event(event_timestamp, event_type, event_details)
    result = predictor.predict_state()

    if result:
        pred, proba = result
        return jsonify({"prediction": pred, "probabilities": proba.tolist()})
    else:
        return jsonify({"prediction": "Not enough data", "probabilities": []})

if __name__ == "__main__":
    app.run(debug=True, port=8000)


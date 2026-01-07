# features/behavioral_features.py
import numpy as np

def extract_window_features(df_window):
    features = {}

    features["event_count"] = len(df_window)
    features["code_edit_count"] = (df_window["event_type"] == "code_edit").sum()
    features["cursor_move_count"] = (df_window["event_type"] == "cursor_move").sum()
    features["editor_focus_count"] = (df_window["event_type"] == "editor_focus").sum()

    timestamps = df_window["event_timestamp"].values
    if len(timestamps) > 1:
        diffs = np.diff(timestamps)
        features["mean_inter_event_time"] = diffs.mean()
        features["std_inter_event_time"] = diffs.std()
    else:
        features["mean_inter_event_time"] = 0
        features["std_inter_event_time"] = 0

    edit_lengths = []
    for d in df_window["event_details"]:
        if isinstance(d, dict) and "length" in d:
            edit_lengths.append(d["length"])

    features["mean_edit_length"] = np.mean(edit_lengths) if edit_lengths else 0
    features["std_edit_length"] = np.std(edit_lengths) if edit_lengths else 0
    features["large_edit_count"] = sum(l > 50 for l in edit_lengths)

    return features

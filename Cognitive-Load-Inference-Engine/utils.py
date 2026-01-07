import numpy as np
from scipy.signal import butter, filtfilt, iirnotch

def bandpass_filter(data, lowcut, highcut, fs, order=4):
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    b, a = butter(order, [low, high], btype='band')
    return filtfilt(b, a, data)

def notch_filter(data, fs, freq=50.0, quality=30):
    b, a = iirnotch(freq / (fs / 2), quality)
    return filtfilt(b, a, data)

def normalize(signal):
    return (signal - np.mean(signal)) / np.std(signal)

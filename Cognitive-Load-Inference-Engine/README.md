# 🧠 NeuroMentor – EEG & Behavioral Data Processing Pipeline

This repository contains the **end-to-end preprocessing workflow** for synchronised **EEG raw signals** and **behavioral event data** collected during programming-based cognitive tasks.  
The pipeline prepares session-level EEG recordings for feature extraction, alignment with behavior, and cognitive state labeling.

## 📌 Project Overview

NeuroMentor captures:
- **Raw EEG signals** (via LSL)
- **Behavioral events** (e.g., key presses, backspace usage, timestamps)
- **Task structure** (question-based programming sessions)

This repository focuses on the **offline preprocessing stage** that transforms raw session data into analysis-ready datasets.

## 🧩 Workflow Summary

Each session follows this processing sequence:

1. **EEG Preprocessing**
   - Filtering
   - Noise / artifact handling
   - Signal normalization

2. **EEG Feature Extraction**
   - Time-domain features
   - Frequency-band features (e.g., alpha, beta)
   - Windowed statistics

3. **EEG–Behavior Alignment**
   - Temporal synchronization
   - Event-based segmentation

4. **Cognitive State Labeling**
   - EEG-only cognitive inference
   - Attention / workload estimation

## 🔁 Automated Pipeline

Instead of running each step manually, the entire preprocessing workflow can be executed using a **single automation script**.

### Example Session


### Manual Commands (Before Automation)
```bash
python preprocess_eeg.py --session <SESSION_PATH>
python extract_features.py --session <SESSION_PATH>
python align_eeg_behavior.py --session <SESSION_PATH>
python label_cognitive_state_eeg_only.py --session <SESSION_PATH>
```

### Automated Execution (Recommended)
```bash
python run_preprocessing_pipeline.py --session <SESSION_PATH>
```
### 📁 Session-Based Data Storage
Each recording session is stored in its **own directory**, enabling clean experiment management.

```text
NeuroMentor/
│
├── recordings/
│   └── session_question1_2026-01-04T09-47-02-152Z/
│       ├── raw_eeg.csv
│       ├── behavior_events.csv
│       └── preprocessed/
│         ├── eeg_behavior_aligned.csv
│         ├── eeg_labeled.csv
│         ├── eeg_features.csv
│         ├── eeg_filtered.csv

```

## 🔌 Chords-Python Integration (Customized for NeuroMentor)

NeuroMentor uses **Chords-Python**, an open-source toolkit by *Upside Down Labs*, to interface with microcontroller development boards running **Chords Arduino Firmware**.  
This integration enables reliable acquisition, visualization, recording, and streaming of **bio-potential signals** such as EEG.

In NeuroMentor, Chords-Python has been **extended and customized** to support:

- Session-based EEG recording
- Separate EEG and behavioral event logging
- Question-aware experiment structure
- Downstream cognitive-state analysis


## ⚙️ Firmware Requirement

> **Required:** Chords Arduino Firmware  
Ensure your microcontroller is flashed with the appropriate Chords firmware before running NeuroMentor.


## ✨ Key Features (NeuroMentor Extension)

### 🧠 EEG Acquisition
- Multi-channel EEG recording using Upside Down Labs amplifiers
- High-resolution timestamps using Lab Streaming Layer (LSL)

### 🧪 Behavioral Event Logging
- Keystrokes, backspaces, focus events, and task-related actions
- Precisely timestamped and synchronized with EEG data

### 📁 Session-Based Preprocessed Data Storage
Each recording session's preprocessed data is stored in its **own directory**, enabling clean experiment management.

```text
recordings/
└── session_question1_2026-01-04T09-47-02-152Z/
    ├── ChordsPy_<session_id>_eeg.csv
    └── ChordsPy_<session_id>_behavior.csv
```

### Behavioral Events (`*_behavior.csv`)
Contains user interaction events.

**Format:**

Example events:
- `key_pressed`
- `backspace_pressed`
- `compile_clicked`
- `focus_lost`

This separation allows **precise EEG–behavior alignment** during preprocessing.

## 🧪 Session Management Logic

When recording starts:
- A **unique session ID** is generated (or passed explicitly)
- A session folder is created
- EEG and behavior CSV files are initialized

## 🚀 Usage

### Start NeuroMentor Interface
```bash
chordspy
```

## 🔗 Connection Guide

### 🌐 Wi-Fi
- Upload Chords Wi-Fi firmware to your device  
- Connect to the device’s Wi-Fi network  
- Click **Wi-Fi → Connect** in the interface  

### 🔵 Bluetooth
- Enable Bluetooth on your system  
- Upload Bluetooth firmware to your device  
- Scan and connect from the interface  

### 🔌 USB / Serial
- Disable Bluetooth on your system  
- Connect device via USB cable  
- Select **Serial → Connect** in the interface  


## 🧠 Research Applications

NeuroMentor enables:
- EEG–behavior synchronization  
- Cognitive load analysis  
- Attention & confusion detection  
- Programming behavior research  
- Neuroadaptive tutoring systems  


## 📜 Attribution

- **Base Toolkit:** Chords-Python (Upside Down Labs)  
- **Extensions:** NeuroMentor EEG + Behavior Pipeline  
- **Purpose:** Academic & research use  






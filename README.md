# NeuroMentor: Adaptive Bio-Behavioral Tutoring for Novice Programmers

[![Research Project](https://img.shields.io/badge/Research-Final%20Year%20Project-blue)](https://github.com/DinethRashmikaHeshan/neuromentor-final-year-research)
[![Specialization](https://img.shields.io/badge/Specialization-Software%20Engineering-green)](https://github.com/DinethRashmikaHeshan/neuromentor-final-year-research)
[![Research Group](https://img.shields.io/badge/Research%20Group-SST-orange)](https://github.com/DinethRashmikaHeshan/neuromentor-final-year-research)

## 📖 Overview

**NeuroMentor** is an intelligent tutoring system designed to revolutionize programming education for novice coders through adaptive, real-time support. By leveraging software-based behavioral analytics—such as keystroke patterns, error rates, and pause durations—NeuroMentor detects cognitive states like confusion, frustration, or focus without requiring invasive hardware like EEG devices.

The system identifies individual learning styles (Visual, Auditory, Reading/Writing, or Kinesthetic) and delivers personalized feedback, microlearning resources, and AI-generated practice questions tailored to each learner's unique needs. Integrated as a cross-platform VS Code extension, NeuroMentor provides seamless, real-time assistance within the coding environment.

## 🎯 Main Objective

To develop an intelligent tutoring system that detects novice programmers' cognitive and emotional states through behavioral analytics and delivers personalized support based on their VARK learning style, offering a self-guided, adaptive learning experience to boost engagement and outcomes.

## ❓ Research Problem

Learning to program remains a significant challenge for undergraduate students, with several key issues:

- **Cognitive Overload**: Programming requires mastery of abstract logic, debugging skills, and syntax, often overwhelming beginners
- **Generic Feedback**: Traditional IDEs and online platforms provide one-size-fits-all feedback without adapting to individual learner needs
- **Limited Personalization**: Existing systems fail to account for real-time cognitive/emotional states and diverse learning styles
- **Scalability Issues**: While one-on-one tutoring is highly effective, it's not feasible in large classroom settings
- **Hardware Dependencies**: Many current intelligent tutoring systems require expensive, invasive equipment (e.g., EEG devices)

### Key Research Gaps

Current solutions lack:
- **Real-time cognitive state detection** using only behavioral data (no specialized hardware)
- **Learning style personalization** based on VARK model
- **Seamless IDE integration** with robust offline/online functionality
- **Scalable, non-invasive** adaptive learning environments

## 💡 Solution: NeuroMentor Architecture

NeuroMentor addresses these challenges through four integrated components:

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    NeuroMentor System                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │   1. Cognitive Load Inference Engine                │    │
│  │   • Behavioral feature extraction                   │    │
│  │   • ML-based cognitive state prediction             │    │
│  │   • Non-invasive mental state detection             │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │   2. Learning Style Identifier                      │    │
│  │   • VARK model implementation                       │    │
│  │   • Behavior-based style detection                  │    │
│  │   • Real-time style adaptation                      │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │   3. Error-Driven Learning Reinforcement Engine     │    │
│  │   • AI-powered error classification                 │    │
│  │   • Context-aware tutorial recommendations          │    │
│  │   • Targeted remediation support                    │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │   4. Adaptive Feedback & Microlearning System       │    │
│  │   • Personalized hint generation                    │    │
│  │   • Dynamic micro-tutorial delivery                 │    │
│  │   • Multi-format content (video, text, interactive) │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │        VS Code Extension (Online/Offline)           │    │
│  │   • Seamless IDE integration                        │    │
│  │   • Real-time feedback delivery                     │    │
│  │   • Offline capability with sync                    │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 🔬 Research Components & Team

### Component 1: Cognitive Load Inference Engine
**Lead**: IT22254016

**Objectives**:
- Extract behavioral features from keystroke patterns, error rates, pauses, and backspaces
- Train ML models using synchronized EEG and behavioral logs to establish ground truth
- Enable hardware-free, real-time cognitive state prediction

**Novelty**: Non-invasive, software-only mental state detection without expensive hardware

**Technologies**: TensorFlow, PyTorch, Scikit-learn, LSTM, Random Forest

---

### Component 2: Learning Style Identifier & VS Code Extension
**Lead**: IT22092038

**Objectives**:
- Research VARK learning style models and behavior-based detection methods
- Design dual-mode architecture (offline behavioral logging, online model syncing)
- Implement real-time behavioral data collection
- Enable offline data caching and periodic synchronization

**Novelty**: First-of-its-kind lightweight VS Code extension that identifies programming learners' styles using only behavior-based inputs, offering personalized guidance both offline and online

**Technologies**: JavaScript, VS Code API, WebSocket, REST API

---

### Component 3: Error-Driven Learning Reinforcement Engine
**Lead**: IT22256928

**Objectives**:
- Develop ML models to classify error types (syntax, logical) from behavioral logs
- Build recommendation engine mapping errors to appropriate micro-tutorials
- Implement real-time tutorial delivery within IDEs
- Validate through user studies with novice programmers

**Novelty**: AI-driven error classification with context-aware, error-specific micro-tutorial recommendations

**Technologies**: Random Forest, BERT, JavaScript, VS Code API, React.js, Monaco Editor, MongoDB

---

### Component 4: Adaptive Feedback and Microlearning System
**Lead**: IT22168436

**Objectives**:
- Develop algorithms mapping cognitive states to personalized hints
- Create micro-tutorial formats tailored to learning styles
- Design content variations (animations, audio, text, interactive tasks)
- Implement logging system to analyze intervention effectiveness

**Novelty**: Personalized feedback and dynamic micro-tutorials based on both cognitive states and learning styles with data-driven evaluation

**Technologies**: React.js, Monaco Editor, Tailwind CSS, Machine Learning recommendation engine

---

## 🛠️ Technical Stack

### Machine Learning & AI
- **Frameworks**: TensorFlow, PyTorch, Scikit-learn
- **Models**: LSTM, Random Forest, BERT
- **Applications**: Cognitive state detection, error classification, recommendation systems

### Frontend & IDE Integration
- **Web Technologies**: React.js, JavaScript
- **Code Editor**: Monaco Editor
- **Styling**: Tailwind CSS
- **IDE Integration**: VS Code API

### Backend & Data
- **Database**: MongoDB, Firebase
- **APIs**: REST, WebSocket
- **Data Processing**: Behavioral analytics, feature engineering

## 📊 Data Requirements

### Behavioral Data
- Keystroke patterns and timing
- Error rates and types
- Pause durations
- Backspace frequency
- Compile attempt patterns
- Code completion time
- Repeated errors tracking

### Ground Truth Data
- EEG recordings from controlled lab sessions (for model training)
- Publicly available cognitive load datasets
- Programming behavior datasets
- User interaction logs

### Evaluation Data
- Task completion metrics
- Intervention effectiveness logs
- User performance data
- Learning outcome measurements

## 🎓 Domain Expertise

This project integrates knowledge from multiple disciplines:

- **Machine Learning**: Model development, training, deployment
- **Cognitive Psychology**: Behavioral pattern mapping to mental states
- **Educational Technology**: VARK learning style implementation, microlearning design
- **Human-Computer Interaction**: Seamless feedback delivery, UX design
- **Software Engineering**: System architecture, IDE integration, data pipelines

## 🌟 Key Features

### For Learners
- ✅ Real-time cognitive state detection (confusion, frustration, focus)
- ✅ Personalized learning style identification (VARK model)
- ✅ Context-aware hints and micro-tutorials
- ✅ Error-specific remediation support
- ✅ Offline functionality in lab settings
- ✅ Seamless IDE integration (no workflow disruption)

### For Educators
- ✅ Data-driven insights on student engagement
- ✅ Automated, scalable personalized support
- ✅ Intervention effectiveness analytics
- ✅ Learning outcome tracking

## 🔒 Privacy & Ethics

- **Data Security**: All user data stored securely using MongoDB/Firebase
- **Anonymization**: Personal information anonymized to preserve privacy
- **Ethical Clearance**: Protocols established for EEG-related studies
- **Informed Consent**: Required for all data collection activities

## 📈 Expected Outcomes

1. **Improved Learning Outcomes**: Reduced cognitive overload and better comprehension
2. **Increased Engagement**: Personalized support maintaining student interest
3. **Higher Retention**: Reduced dropout rates in introductory programming courses
4. **Scalable Solution**: Non-invasive, cost-effective alternative to one-on-one tutoring
5. **Research Contributions**: Novel approaches to cognitive load detection and adaptive learning

## 📚 References

1. N. Pillay, "Developing intelligent programming tutors for novice programmers," *ACM SIGCSE Bulletin*, vol. 35, no. 2, pp. 78-82, June 2003, doi: 10.1145/782941.782986.

2. S. Asai, D. T. D. Phuong, F. Harada, and H. Shimakawa, "Predicting cognitive load in acquisition of programming abilities," *Int. J. Electr. Comput. Eng.*, vol. 9, no. 4, pp. 3262-3271, Aug. 2019, doi: 10.11591/ijece.v9i4.pp3262-3271.

3. D. Lohr, M. Berges, A. Chugh, and M. Striewe, "Adaptive Learning Systems in Programming Education: A Prototype for Enhanced Formative Feedback," in *Proc. DELFI 2024*, Bonn, Germany, 2024, p. 549, doi: 10.18420/delfi2024_57.

## 🚀 Getting Started

### Prerequisites
- VS Code (latest version)
- Python 3.8+
- Node.js 14+
- MongoDB/Firebase account

### Installation
```bash
# Clone the repository
git clone https://github.com/DinethRashmikaHeshan/neuromentor-final-year-research.git

# Navigate to project directory
cd neuromentor-final-year-research

# Install dependencies for each component
# (Detailed instructions in each component's directory)
```

## 🤝 Contributing

This is a research project developed as part of a final year Software Engineering specialization. 

**Project Team**:
- IT22254016 - Cognitive Load Inference Engine
- IT22092038 - Learning Style Identifier & VS Code Extension
- IT22256928 - Error-Driven Learning Reinforcement Engine
- IT22168436 - Adaptive Feedback and Microlearning System

## 📧 Contact

For questions or collaboration opportunities, please open an issue in this repository.

## 📄 License

This project is part of academic research. Please contact the team for usage and distribution terms.

---

**Research Group**: SST - Software Systems & Technologies  
**Specialization**: Software Engineering (SE)  
**Project ID**: IT4010 Research Project – 2025 July

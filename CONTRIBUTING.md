# Contributing to SIH26102 — MPLADS AI Audit Intelligence System

Thank you for your interest in contributing to the **MPLADS AI Audit Intelligence System**! This document provides guidelines and instructions for contributing to this project.

---

## 📋 Code of Conduct

We expect all contributors to adhere to a respectful and inclusive code of conduct. Please maintain a professional, collaborative, and constructive atmosphere in issues, discussions, and pull requests.

---

## 🛠️ Development Setup

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.x or higher (with npm 9+)
- **Git**: Installed and configured on your system

### 1. Clone & Fork the Repository
```bash
git clone https://github.com/<your-username>/mplads-ai-audit.git
cd mplads-ai-audit/SIH26102
```

### 2. Backend Setup
```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Copy environment settings
cp .env.example .env

# Initialize database and seed sample datasets
python init_data.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🧪 Testing Guidelines

Before submitting any code changes or Pull Requests, ensure that all automated unit and integration tests pass:

```bash
# From the SIH26102 directory:
pytest tests/ -v
```

To run frontend linting and type checking:
```bash
cd frontend
npm run build
```

---

## 🌿 Branching & Git Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
2. Make your code changes with clean, atomic commits:
   ```bash
   git commit -m "feat(ai): add dynamic weights calculation for temporal engine"
   ```
3. Follow the Conventional Commits specification:
   - `feat`: A new feature
   - `fix`: A bug fix
   - `docs`: Documentation updates
   - `test`: Adding or refactoring tests
   - `refactor`: Code changes that neither fix a bug nor add a feature
   - `perf`: Performance improvements
4. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a Pull Request on GitHub against the `main` branch with a clear description of the problem solved, implementation rationale, and test results.

---

## ⚖️ Ethics & Integrity Principles

This platform operates as an explainable decision-support tool for administrative audit verification:
- **No definitive accusations**: The system flags potential anomalies and calculates priority scores (0–100) to help authorities schedule physical site inspections; it does not issue automated legal or judicial judgments.
- **Explainability first**: Every flagged item must provide clear, human-understandable evidence facts (SHAP feature attribution, geospatial distances, lexical comparisons, etc.).
- **Data privacy**: Protect citizen grievance reporter identities where anonymity is requested.

---

## 📬 Reporting Bugs or Requesting Features

- Use the GitHub **Issues** tab to report bugs or suggest enhancements.
- When filing a bug, please include:
  1. Your operating system and Python/Node version
  2. Steps to reproduce the issue
  3. Expected vs. actual behavior
  4. Relevant stack trace or console logs

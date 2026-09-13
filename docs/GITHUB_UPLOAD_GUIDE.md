# 🚀 Step-by-Step GitHub Upload & Submission Guide

This guide walks you through uploading the **SIH26102 — MPLADS AI Audit Intelligence System** repository to GitHub from your Windows machine.

---

## 📋 Pre-Flight Checklist

Before pushing to GitHub, make sure you have:
- [x] A **GitHub account** ([sign up free at github.com](https://github.com) if you don't have one).
- [x] Comprehensive documentation in place (`README.md`, `docs/`, `LICENSE`, `CONTRIBUTING.md`).
- [x] `.gitignore` configured to prevent committing large binary files (`node_modules/`, `mplads_audit.db`, `final pp.zip`, `.env`).

---

## 🛠️ Step 1: Install Git on Windows (If Not Already Installed)

If typing `git --version` in your terminal produces an error, install Git using any of the following simple methods:

### Method A: Using Windows Package Manager (Quickest)
Open **PowerShell** as Administrator and run:
```powershell
winget install --id Git.Git -e --source winget
```

### Method B: Official Installer Download
1. Download the 64-bit installer from: **[https://git-scm.com/download/win](https://git-scm.com/download/win)**
2. Run the `.exe` installer. Keep the default settings and click **Next** until finished.
3. Restart your PowerShell or terminal window.

### Verify Installation:
```powershell
git --version
```
*(You should see output like `git version 2.44.0.windows.1`)*

---

## 👤 Step 2: Configure Your Git Identity

Set your name and email address in Git (this will be attached to your commits):
```powershell
git config --global user.name "Your Full Name"
git config --global user.email "your-email@example.com"
```

---

## 📁 Step 3: Choose Which Folder to Push

You have two options depending on how you want your repository structured on GitHub:

### Recommended: Push `SIH26102` as the Repository Root
This provides the cleanest repository structure where `frontend`, `backend`, `ai`, and `docs` are at the top level of your GitHub repo:
```powershell
cd C:\MPLADS\SIH26102
```

*(Alternatively, if you want the outer `C:\MPLADS` folder as the repository root, run `cd C:\MPLADS`. Both directories have been equipped with `.gitignore`, `README.md`, and license files).*

---

## 📦 Step 4: Initialize Git and Stage Files

Run the following commands in PowerShell from your chosen project directory:

```powershell
# 1. Initialize a new Git repository
git init

# 2. Check which files will be tracked (notice .db, node_modules, and .zip are ignored)
git status

# 3. Stage all source code, documentation, and assets
git add .

# 4. Create your initial commit
git commit -m "feat: initial commit of MPLADS AI Audit Intelligence System"
```

> [!TIP]
> **Why are `.db` and `final pp.zip` ignored?**  
> GitHub has a 100 MB file limit and rejects pushes containing large binary files. Our repository includes automated scripts (`python init_data.py` and `python scripts/load_demo_dataset.py`) that generate rich, realistic demo datasets instantly on any machine without needing bulky database dumps committed!

---

## 🌐 Step 5: Create a New Repository on GitHub

1. Open your web browser and navigate to **[https://github.com/new](https://github.com/new)**.
2. Fill in the repository details:
   - **Repository name**: `mplads-ai-audit-system` (or `SIH26102-MPLADS-AI`)
   - **Description**: `AI-Powered MPLADS Anomaly, Fraud-Risk & Inefficiency Detection System (Problem Statement SIH26102)`
   - **Visibility**: Choose **Public** (required for hackathon submissions or public portfolios).
   - **Initialize this repository with**: **LEAVE ALL UNCHECKED** (do NOT check "Add a README file", "Add .gitignore", or "Choose a license" — we already have these locally).
3. Click the green **Create repository** button.

---

## 🔗 Step 6: Link Remote and Push to GitHub

Copy the URL of your new GitHub repository (e.g. `https://github.com/<your-username>/mplads-ai-audit-system.git`), then run:

```powershell
# 1. Ensure the default branch is named main
git branch -M main

# 2. Link your local repository to GitHub (replace with your actual URL)
git remote add origin https://github.com/<your-username>/mplads-ai-audit-system.git

# 3. Push your code to GitHub
git push -u origin main
```

*(GitHub will prompt you to sign in via your browser or using a GitHub Personal Access Token if not already logged in).*

---

## ✅ Step 7: Verify Your GitHub Repository

Once the push completes, refresh your GitHub repository page:
1. **README Display**: Your comprehensive `README.md` will render with architecture diagrams, badges, and quick-start instructions.
2. **Docs Folder**: Check that `docs/` is visible and links work cleanly.
3. **GitHub Actions CI**: Click the **Actions** tab on GitHub to see the automated CI build and test pipeline running.

---

## 🔄 Making Future Updates

Whenever you make code or documentation changes and want to update GitHub:

```powershell
# Check modified files
git status

# Stage changes
git add .

# Commit with a descriptive message
git commit -m "docs: update API endpoints reference and architecture diagrams"

# Push updates to GitHub
git push
```

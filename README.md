<div align="center">
  <h1 align="center">🛡️ AURIX</h1>
  <h3 align="center"><em>Live Attack Detection Dashboard & Neural Cyber Defense</em></h3>
  <br/>
  <p align="center">
    <a href="https://aurix-sepia.vercel.app"><img src="https://img.shields.io/badge/Live%20Dashboard-Deployed-00C8FF?style=for-the-badge&logo=vercel"></a>
    <a href="https://aurix-rgpt.onrender.com/docs"><img src="https://img.shields.io/badge/Neural%20API-Online-00FF88?style=for-the-badge&logo=fastapi"></a>
  </p>
</div>

<br/>

## 🎯 PROBLEM STATEMENT 1: LIVE ATTACK DETECTION DASHBOARD

> **"Develop a real-time cybersecurity dashboard that continuously monitors system or network activity and detects potential threats such as intrusion attempts, abnormal traffic spikes, or malicious requests.**
> 
> **The system should collect logs from different sources (server, API, user activity), analyze them, and visualize alerts using charts/graphs for quick understanding. It should also provide instant notifications so that suspicious activities can be identified and responded to immediately."**

---

## ⚡ HOW AURIX CRUSHES THE CHALLENGES

At the core of AURIX is a high-performance **Agent-Based Architecture** paired with an **Advanced Heuristic Neural Model**. Here is how we turned the vision into reality:

### 1️⃣ PROCESSING HIGH-VOLUME DATA IN REAL TIME
- **The Challenge:** Handling continuous data streams efficiently.
- **The Innovation:** We built custom, ultra-lightweight C2 Endpoint Agents (`AURIX-Agent.exe`). They collect live System CPU/RAM, active Network Connections, and Running Processes directly from the client kernel and push it to the central server with near-zero latency.

### 2️⃣ ACCURATELY IDENTIFYING ATTACK PATTERNS
- **The Challenge:** Detecting intrusions and malicious requests.
- **The Innovation:** Beyond just network data, AURIX deploys **biometric heuristics** (tracking Keystrokes Per Minute and Clicks Per Minute) to instantly detect automated bot scripts and superhuman threat behaviors. It also features a zero-day remote remote scanner to scrub out hidden rootkits.

### 3️⃣ REDUCING FALSE POSITIVES IN DETECTION
- **The Challenge:** Stopping alert fatigue.
- **The Innovation:** The AURIX Neural Threat Model uses intelligent debouncing and whitelist filters. We explicitly isolate safe IP ranges (like `127.0.x.x` and `172.x.x.x`) to ensure that internal LAN traffic is never flagged as an external attacker. 

### 4️⃣ DESIGNING A CLEAR AND INFORMATIVE UI
- **The Challenge:** Visualizing high-volume alerts for quick understanding.
- **The Innovation:** A stunning, premium dark-mode, 3D WebGL-powered Dashboard. Beautiful graphing visualizations and dynamic threat categorization give security admins immediate clarity without overwhelming them with raw text logs. Instant visual notifications trigger on anomalous connections.

---

## 🚀 LIVE DEPLOYMENT

AURIX is not just a theory. It is a live, deployed, battle-ready application capable of remote device monitoring right now.

- **Admin Dashboard (Frontend):** [https://aurix-sepia.vercel.app](https://aurix-sepia.vercel.app)
- **Neural Backend (API):** [https://aurix-rgpt.onrender.com](https://aurix-rgpt.onrender.com)
- **Endpoint Agent (`.exe`):** Download directly from the live Dashboard using the upper-right navigation button.

---

## 🛠️ ARCHITECTURE & DEPLOYMENT

### Stack
- **Frontend Dashboard:** React, Vite, Three.js (WebGL 3D), CSS Glassmorphism
- **Neural Backend:** Python, FastAPI, WebSockets
- **Endpoint Protection Agent:** Python, PyInstaller, psutil, Windows OS Telemetry

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/DeepuCodesss/AURIX.git

# 2. Run the Neural Backend
cd AURIX/BACKEND
pip install -r requirements.txt
uvicorn main:app --reload

# 3. Run the Dashboard Frontend
cd AURIX/BACKEND/frontend/extracted
npm install
npm run dev
```

### Compiling Custom Endpoint Agents
You can compile your own agent executables targeting your own hosted servers:
```bash
cd AURIX/BACKEND
pyinstaller --onefile --noconsole --name "AURIX-Agent" agent.py
```
> The compiled agent will automatically register itself in the Windows startup registry for persistent protection.

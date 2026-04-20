<p align="center">
  <img src="https://img.shields.io/badge/🛡️-PhantomShield--X-blueviolet?style=for-the-badge&labelColor=0d1117&color=7B2FBE&logo=hackthebox&logoColor=white" alt="PhantomShield-X" height="60"/>
</p>

<h1 align="center">PhantomShield X</h1>

<p align="center">
  <b>AI-Powered Autonomous Cybersecurity Defense Platform</b><br/>
  <i>Real-time threat detection · Behavioral ML analysis · Multi-device endpoint protection</i>
</p>

<p align="center">
  <a href="https://phantom-shield-x.vercel.app"><img src="https://img.shields.io/badge/🌐_Live_Demo-phantom--shield--x.vercel.app-00C7B7?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo"/></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/scikit--learn-1.4+-F7931E?style=flat-square&logo=scikit-learn&logoColor=white" alt="scikit-learn"/>
  <img src="https://img.shields.io/badge/YARA-3.11+-EE0000?style=flat-square&logo=virustotal&logoColor=white" alt="YARA"/>
  <img src="https://img.shields.io/badge/VirusTotal_API-v3-394EFF?style=flat-square&logo=virustotal&logoColor=white" alt="VirusTotal"/>
  <img src="https://img.shields.io/badge/Chrome_Extension-MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Extension"/>
  <img src="https://img.shields.io/github/license/DeepuCodesss/PhantomShield-x?style=flat-square&color=green" alt="License"/>
</p>

---

<br/>

## 🎯 What is PhantomShield X?

**PhantomShield X** is an enterprise-grade, AI-driven cybersecurity platform that autonomously detects, analyzes, and neutralizes cyber threats across endpoints in real time. It combines **machine learning anomaly detection**, **YARA rule-based scanning**, **VirusTotal threat intelligence**, and **behavioral analytics** into a unified security operations center (SOC) accessible through a modern web dashboard and Chrome extension.

> 🔬 *Built for hackathons, designed for production — PhantomShield X demonstrates how modern SOC platforms can leverage AI/ML pipelines to achieve autonomous threat response without human intervention.*

<br/>

## ✨ Key Features

<table>
  <tr>
    <td width="50%">

### 🧠 AI-Powered Threat Detection
- **Isolation Forest ML model** trained on 200+ synthetic log patterns at startup
- Anomaly scoring (0–100) combining AI inference + deterministic rule-based checks
- Detects off-hours access, suspicious ports (SSH/RDP/SMB), and unusual processes

</td>
    <td width="50%">

### 🔍 Multi-Layer File Scanning
- **SHA-256 hash lookup** via VirusTotal API v3
- **YARA rule engine** for signature matching (ransomware, mimikatz, suspicious PowerShell)
- **EMBER static analysis** for Windows PE executable structure inspection
- **Magic byte verification** to detect extension spoofing

</td>
  </tr>
  <tr>
    <td width="50%">

### 🌐 URL & Phishing Analysis
- Live website HTML inspection for hidden iframes, obfuscated JS, cryptominers
- URL shortener detection (bit.ly, tinyurl, t.co, etc.)
- Suspicious TLD flagging (.xyz, .click, .ru, .tk, etc.)
- Domain typosquatting & excessive subdomain detection

</td>
    <td width="50%">

### 🖥️ Endpoint Device Agent
- **Cross-platform** agent (Windows/Linux/macOS) with system tray integration
- Real-time telemetry: CPU, RAM, disk, network, active connections, running processes
- **Behavioral biometrics**: keyboard/mouse activity tracking with anomaly detection
- USB drive auto-scanning & malware auto-deletion

</td>
  </tr>
  <tr>
    <td width="50%">

### 📡 Centralized Admin Dashboard
- Multi-device fleet management with live online/offline status
- Remote scan triggering via command-and-control (C2) polling
- Real-time incident feed with severity classification (HIGH/MEDIUM/LOW)
- System-wide file quarantine & permanent deletion capabilities

</td>
    <td width="50%">

### 🧩 Chrome Extension
- Real-time URL scanning for every page you visit
- Instant phishing/malware warnings before page loads
- Seamless integration with PhantomShield backend API
- Lightweight Manifest V3 architecture

</td>
  </tr>
</table>

<br/>

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PhantomShield X Platform                       │
├─────────────────┬───────────────────┬───────────────────────────────┤
│                 │                   │                               │
│   ┌─────────┐   │   ┌───────────┐   │   ┌─────────────────────┐     │
│   │Frontend │   │   │  Backend  │   │   │   Device Agents     │     │
│   │Dashboard│◄──┼──►│  FastAPI  │◄──┼──►│   (Python client)   │     │
│   │(TS/React)│   │   │  Server   │   │   │                     │     │
│   └─────────┘   │   └─────┬─────┘   │   │  ┌───────────────┐  │     │
│                 │         │         │   │  │ System Tray   │  │     │
│   ┌─────────┐   │   ┌─────▼─────┐   │   │  │ + Autostart   │  │     │
│   │ Chrome  │   │   │ AI Engine │   │   │  └───────────────┘  │     │
│   │Extension│◄──┼──►│(IsolForest│   │   │                     │     │
│   │  (MV3)  │   │   │ + YARA +  │   │   │  ┌───────────────┐  │     │
│   └─────────┘   │   │ EMBER)    │   │   │  │ USB Monitor   │  │     │
│                 │   └─────┬─────┘   │   │  │ + Active Prot. │  │     │
│                 │         │         │   │  └───────────────┘  │     │
│                 │   ┌─────▼─────┐   │   └─────────────────────┘     │
│                 │   │ VirusTotal│   │                               │
│                 │   │  API v3   │   │                               │
│                 │   └───────────┘   │                               │
└─────────────────┴───────────────────┴───────────────────────────────┘
```

<br/>

## 📁 Project Structure

```
PhantomShield-x/
│
├── main.py                    # 🚀 FastAPI server — all API routes & pipeline orchestration
├── ai_model.py                # 🧠 Isolation Forest ML model (train + score)
├── scanner.py                 # 🔍 File & URL scanning engine (YARA + EMBER + heuristics)
├── responder.py               # ⚡ Incident response evaluator (severity classification)
├── virustotal.py              # 🌐 VirusTotal v3 API integration (IP/URL/file hash/upload)
├── fake_logs.py               # 📊 Synthetic log generator for ML training & simulation
├── agent.py                   # 🖥️ Cross-platform device agent (telemetry + protection)
│
├── frontend/                  # 💻 Web dashboard (TypeScript/React)
│   ├── PhantomShieldX-UI-UX-main/
│   └── extracted/
│
├── chrome-extension/          # 🧩 Chrome browser extension
│   ├── manifest.json          #    Extension manifest (MV3)
│   ├── background.js          #    Background service worker
│   ├── popup.html / popup.js  #    Extension popup UI
│   └── warning.html / warning.js  # Threat warning page
│
├── requirements.txt           # 📦 Python dependencies
├── .env.example               # 🔑 Environment variables template
├── Procfile                   # ☁️ Heroku/Railway deployment
├── vercel.json                # ▲ Vercel deployment config
├── railway.toml               # 🚂 Railway deployment config
├── netlify.toml               # 🔷 Netlify deployment config
│
├── install_agent_linux.sh     # 🐧 Linux agent installer script
├── install_agent_windows.bat  # 🪟 Windows agent installer script
│
└── stitch_login.html          # 🔐 Authentication pages
    stitch_signup.html
```

<br/>

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** (for frontend)
- **VirusTotal API Key** ([Get one free](https://www.virustotal.com/gui/join-us))

### 1️⃣  Clone the Repository

```bash
git clone https://github.com/DeepuCodesss/PhantomShield-x.git
cd PhantomShield-x
```

### 2️⃣  Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env and add your VirusTotal API key:
# VIRUSTOTAL_API_KEY=your_key_here
```

### 3️⃣  Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### 4️⃣  Start the Backend Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be live at `http://localhost:8000` with interactive docs at `/docs`.

### 5️⃣  Run the Device Agent (Optional)

```bash
# On any device you want to monitor:
python agent.py --server http://YOUR_BACKEND_URL:8000
```

### 6️⃣  Load the Chrome Extension (Optional)

1. Open `chrome://extensions/` in Chrome
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `chrome-extension/` folder

<br/>

## 🔌 API Endpoints

| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `GET` | `/health` | System health check & status |
| `POST` | `/analyze` | Analyze a single log with AI + threat intelligence |
| `POST` | `/scan/file` | Upload & scan a file (max 32MB) |
| `POST` | `/scan/url` | Scan a URL for phishing/malware |
| `GET` | `/scan/history` | Retrieve last 50 scan results |
| `GET` | `/incidents` | Retrieve last 50 log analysis incidents |
| `GET` | `/simulate` | Generate & analyze 5 random logs instantly |
| `GET` | `/system/stats` | Real-time host system telemetry |
| `GET` | `/system/apps` | Installed applications with vulnerability flags |
| `GET` | `/scan/system/{type}` | Stream live file system scan (`quick`/`complete`/`rootkit`) |
| `POST` | `/delete/files` | Permanently delete malicious files |
| `POST` | `/quarantine/files` | Move files to quarantine directory |
| `POST` | `/agent/register` | Register a new device agent |
| `POST` | `/agent/heartbeat` | Receive live telemetry from agent |
| `GET` | `/admin/devices` | List all registered devices with status |
| `GET` | `/admin/device/{id}` | Full device details + telemetry |
| `POST` | `/admin/device/{id}/command` | Queue a command for remote device |

<br/>

## 🛡️ Detection Pipeline

```
Incoming Log / File / URL
         │
         ▼
┌─────────────────┐
│  1. AI Scoring   │  Isolation Forest anomaly detection
│     (0 – 100)    │  + rule-based penalty checks
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. VirusTotal   │  IP reputation / file hash / URL scan
│  Threat Intel    │  via VirusTotal v3 API
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Heuristic    │  YARA rules, EMBER static analysis,
│  Engine          │  extension mismatch, keyword detection
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Responder    │  Severity: HIGH / MEDIUM / LOW
│  Evaluation      │  Action: block_ip / flag_session / monitor
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. Incident     │  Dashboard alert + optional Splunk SIEM
│  Recording       │  forwarding via HTTP Event Collector
└─────────────────┘
```

<br/>

## ☁️ Deployment

PhantomShield X is pre-configured for multiple cloud platforms:

| Platform | Config File | Command |
|:--------:|:-----------:|:--------|
| **Vercel** | `vercel.json` | `vercel deploy` |
| **Railway** | `railway.toml` | `railway up` |
| **Render** | `Procfile` | Push to linked repo |
| **Netlify** | `netlify.toml` | `netlify deploy` |

> **Live Instance:** [https://phantom-shield-x.vercel.app](https://phantom-shield-x.vercel.app)

<br/>

## 🤝 Contributors & Work Division

<table>
  <tr>
    <th align="center" width="200">Contributor</th>
    <th align="center" width="200">Role</th>
    <th align="left">Responsibilities</th>
  </tr>
  <tr>
    <td align="center">
      <a href="https://github.com/DeepuCodesss">
        <b>@DeepuCodesss</b>
      </a>
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/Project_Lead-FF6B6B?style=flat-square" alt="Lead"/><br/>
      <img src="https://img.shields.io/badge/Backend_&_AI-3776AB?style=flat-square" alt="Backend"/>
    </td>
    <td>
      <b>Core Backend & AI/ML Pipeline</b><br/>
      • FastAPI server architecture (<code>main.py</code>)<br/>
      • Isolation Forest ML model (<code>ai_model.py</code>)<br/>
      • VirusTotal API integration (<code>virustotal.py</code>)<br/>
      • Incident response engine (<code>responder.py</code>)<br/>
      • Live system monitoring & telemetry<br/>
      • Deployment configurations (Vercel, Railway, Render)
    </td>
  </tr>
  <tr>
    <td align="center">
      <b>https://github.com/mayank7720</b><br/>
      <i>@mayank7720</i>
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/Frontend_Lead-3178C6?style=flat-square" alt="Frontend"/><br/>
      <img src="https://img.shields.io/badge/UI/UX_Design-FF61F6?style=flat-square" alt="UI/UX"/>
    </td>
    <td>
      <b>Dashboard & User Interface</b><br/>
      • React/TypeScript dashboard (<code>frontend/</code>)<br/>
      • Real-time incident visualization & charts<br/>
      • Device fleet management UI<br/>
      • Scan progress animations & SSE streaming display<br/>
      • Authentication pages (login/signup)<br/>
      • Responsive design & dark mode theming
    </td>
  </tr>
  <tr>
    <td align="center">
      <b>https://github.com/adityasharma2408</b><br/>
      <i>@adityasharma2408</i>
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/Security_Engineer-EE0000?style=flat-square" alt="Security"/><br/>
      <img src="https://img.shields.io/badge/Scanner_Engine-F7931E?style=flat-square" alt="Scanner"/>
    </td>
    <td>
      <b>Scanner & Detection Engine</b><br/>
      • File scanning pipeline with YARA rules (<code>scanner.py</code>)<br/>
      • EMBER static PE analysis integration<br/>
      • URL heuristic engine (phishing, cryptominer detection)<br/>
      • Custom YARA rule authoring for new threats<br/>
      • Malware sample generation & testing (<code>fake_logs.py</code>)<br/>
      • False positive reduction & detection tuning
    </td>
  </tr>
  <tr>
    <td align="center">
      <b>https://github.com/</b><br/>
      <i>harshitshukla</i>
    </td>
    <td align="center">
      <img src="https://img.shields.io/badge/Agent_Developer-009688?style=flat-square" alt="Agent"/><br/>
      <img src="https://img.shields.io/badge/Systems_Programmer-808080?style=flat-square" alt="Systems"/>
    </td>
    <td>
      <b>Device Agent & Endpoint Protection</b><br/>
      • Cross-platform agent (<code>agent.py</code>)<br/>
      • USB drive auto-scanning & threat neutralization<br/>
      • Active protection real-time file watcher<br/>
      • Behavioral biometrics (keystroke/mouse analytics)<br/>
      • System tray integration (pystray/PIL)<br/>
      • Windows autorun & Linux systemd service setup<br/>
      • Agent installer scripts (Windows <code>.bat</code> / Linux <code>.sh</code>)
    </td>
  </tr>
  <tr>
  <br/>

## 🛠️ Tech Stack

<table>
  <tr>
    <td align="center" width="110">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" width="40"/><br/>
      <b>Python</b>
    </td>
    <td align="center" width="110">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="40"/><br/>
      <b>TypeScript</b>
    </td>
    <td align="center" width="110">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg" width="40"/><br/>
      <b>FastAPI</b>
    </td>
    <td align="center" width="110">
      <img src="https://upload.wikimedia.org/wikipedia/commons/0/05/Scikit_learn_logo_small.svg" width="40"/><br/>
      <b>scikit-learn</b>
    </td>
    <td align="center" width="110">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="40"/><br/>
      <b>React</b>
    </td>
    <td align="center" width="110">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/chrome/chrome-original.svg" width="40"/><br/>
      <b>Chrome API</b>
    </td>
  </tr>
</table>

<br/>

## 📊 Language Distribution

```
TypeScript   ██████████████████████████████████░░░░░░░░░░░░░░░░░░  68.9%
Python       █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  19.3%
HTML         ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   7.6%
CSS          █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   2.3%
JavaScript   █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   1.2%
Other        ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0.7%
```

<br/>

## 🗺️ Roadmap

- [x] AI-powered anomaly detection with Isolation Forest
- [x] VirusTotal v3 integration (IP, URL, File Hash, Upload)
- [x] YARA rule-based scanning engine
- [x] Real-time system monitoring with psutil
- [x] Cross-platform device agent with telemetry
- [x] Chrome extension for URL scanning
- [x] File quarantine & deletion system
- [x] USB drive auto-scanning
- [x] Behavioral biometrics (KPM/CPM anomaly detection)
- [ ] Database persistence (PostgreSQL/SQLite)
- [ ] User authentication & role-based access control
- [ ] Email/SMS alert notifications
- [ ] Docker Compose deployment
- [ ] Automated YARA rule updates from community feeds
- [ ] Network traffic packet capture (Scapy integration)
- [ ] Mobile companion app

<br/>

## 🤝 Contributing

We welcome contributions from security researchers, developers, and cybersecurity enthusiasts!

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

> **💡 New contributors:** Check the [open positions](#-contributors--work-division) in the contributor table above. Pick an area that matches your skills and start building!

<br/>

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

<br/>

## ⚠️ Disclaimer

> PhantomShield X is a **cybersecurity research and educational project**. The sample malware files (e.g., `invoice_urgent.exe`, `mimikatz_dump.txt`, `ransomware_trigger.txt`) included in this repository are **harmless test samples** designed to trigger detection rules. This tool should only be used on systems you own or have explicit permission to scan. The developers are not responsible for any misuse.

<br/>

---

<p align="center">
  <b>Built with 🛡️ by the PhantomShield Team</b><br/>
  <i>Defending the digital frontier, one anomaly at a time.</i>
</p>

<p align="center">
  <a href="https://github.com/DeepuCodesss/PhantomShield-x/stargazers">
    <img src="https://img.shields.io/github/stars/DeepuCodesss/PhantomShield-x?style=social" alt="Stars"/>
  </a>
  <a href="https://github.com/DeepuCodesss/PhantomShield-x/network/members">
    <img src="https://img.shields.io/github/forks/DeepuCodesss/PhantomShield-x?style=social" alt="Forks"/>
  </a>
  <a href="https://github.com/DeepuCodesss/PhantomShield-x/issues">
    <img src="https://img.shields.io/github/issues/DeepuCodesss/PhantomShield-x?style=social&logo=github" alt="Issues"/>
  </a>
</p>

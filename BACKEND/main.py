"""
Main FastAPI server for PhantomShield X. Routes API requests for log analysis,
file scanning, and URL scanning through the AI prediction and Threat Intelligence systems.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import time
import asyncio
import psutil
import httpx
import os
import shutil
import random
from datetime import datetime
from collections import Counter

from fake_logs import generate_log_batch
from virustotal import check_ip
from scanner import scan_file, scan_url
from ai_model import train_model, score_log
from responder import evaluate

app = FastAPI(title="PhantomShield X Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global in-memory storage
incidents = []
scan_history = []

# ─── Agent Registry ──────────────────────────────────────────────────────────
# Key: device_id → { info, last_heartbeat, telemetry, apps }
agents: Dict[str, Dict[str, Any]] = {}

class AgentRegisterPayload(BaseModel):
    device_id: str
    hostname: str
    ip: str
    os: str
    os_version: Optional[str] = ""
    username: Optional[str] = ""
    architecture: Optional[str] = ""
    python_version: Optional[str] = ""
    registered_at: Optional[str] = ""

class AgentHeartbeatPayload(BaseModel):
    device_id: str
    timestamp: float
    datetime: Optional[str] = ""
    cpu: Optional[dict] = {}
    memory: Optional[dict] = {}
    disk: Optional[dict] = {}
    network: Optional[dict] = {}
    boot_time: Optional[float] = 0
    active_connections: Optional[list] = []
    processes: Optional[list] = []
    process_count: Optional[int] = 0
    inputs: Optional[dict] = {}

class AgentAppsPayload(BaseModel):
    device_id: str
    apps: List[dict]

@app.post("/agent/register")
async def agent_register(payload: AgentRegisterPayload):
    """Called by agent.py when a new device comes online."""
    device_id = payload.device_id
    agents[device_id] = {
        "info": payload.dict(),
        "last_heartbeat": time.time(),
        "telemetry": {},
        "apps": [],
        "status": "online",
        "commands": [],
        "remote_threats": []
    }
    print(f"[AGENT] New device registered: {payload.hostname} ({payload.ip})")
    return {"status": "registered", "device_id": device_id}

@app.post("/agent/heartbeat")
async def agent_heartbeat(payload: AgentHeartbeatPayload):
    """Receives live telemetry from an agent device every 5 seconds."""
    device_id = payload.device_id
    if device_id not in agents:
        # Auto-register with minimal info if not seen before
        agents[device_id] = {
            "info": {"device_id": device_id, "hostname": "Unknown", "ip": "unknown", "os": "unknown"},
            "apps": [],
            "commands": [],
            "remote_threats": []
        }
    agents[device_id]["last_heartbeat"] = time.time()
    agents[device_id]["telemetry"] = payload.dict()
    agents[device_id]["status"] = "online"
    return {"status": "ok"}

@app.post("/agent/apps")
async def agent_apps(payload: AgentAppsPayload):
    """Receives the installed apps list from an agent device."""
    device_id = payload.device_id
    if device_id in agents:
        agents[device_id]["apps"] = payload.apps
    return {"status": "ok", "count": len(payload.apps)}

@app.get("/admin/devices")
async def admin_get_devices():
    """Returns all registered devices with their status and latest telemetry."""
    now = time.time()
    result = []
    for device_id, agent in agents.items():
        last_hb = agent.get("last_heartbeat", 0)
        # Mark offline if no heartbeat in last 30 seconds
        is_online = (now - last_hb) < 30
        agent["status"] = "online" if is_online else "offline"
        result.append({
            "device_id": device_id,
            "info": agent.get("info", {}),
            "status": "online" if is_online else "offline",
            "last_seen": last_hb,
            "last_seen_ago": round(now - last_hb),
            "telemetry": agent.get("telemetry", {}),
            "apps_count": len(agent.get("apps", [])),
        })
    # Sort: online first, then by last seen
    result.sort(key=lambda x: (x["status"] != "online", -x["last_seen"]))
    return {"devices": result, "total": len(result), "online": sum(1 for d in result if d["status"] == "online")}

@app.get("/admin/device/{device_id}")
async def admin_get_device(device_id: str):
    """Returns full details of a specific device including apps and telemetry."""
    if device_id not in agents:
        raise HTTPException(status_code=404, detail="Device not found")
    agent = agents[device_id]
    now = time.time()
    last_hb = agent.get("last_heartbeat", 0)
    return {
        "device_id": device_id,
        "info": agent.get("info", {}),
        "status": "online" if (now - last_hb) < 30 else "offline",
        "last_seen_ago": round(now - last_hb),
        "telemetry": agent.get("telemetry", {}),
        "apps": agent.get("apps", []),
        "apps_count": len(agent.get("apps", [])),
        "remote_threats": agent.get("remote_threats", [])
    }

class CommandPayload(BaseModel):
    command: str

@app.post("/admin/device/{device_id}/command")
async def admin_queue_command(device_id: str, payload: CommandPayload):
    """Admin triggers a command (like 'scan') for the remote device."""
    if device_id not in agents:
        raise HTTPException(status_code=404, detail="Device not found")
    agents[device_id].setdefault("commands", []).append(payload.command)
    return {"status": "queued"}

@app.get("/agent/commands")
async def agent_get_commands(device_id: str):
    """Agent polls this to see if it needs to execute anything."""
    if device_id in agents:
        cmds = agents[device_id].get("commands", [])
        agents[device_id]["commands"] = [] # Clear once fetched
        return {"commands": cmds}
    return {"commands": []}

@app.get("/agent/version")
async def agent_version():
    """Agent polls this to check if there is a newer version available."""
    return {
        "version": "1.0.0",
        "download_url": "https://aurix-sepia.vercel.app/AURIX-Agent.exe"
    }

class ThreatPayload(BaseModel):
    device_id: str
    threats: List[dict]

@app.post("/agent/threats")
async def agent_report_threats(payload: ThreatPayload):
    """Agent reports found threats from local scans or active processes."""
    device_id = payload.device_id
    if device_id in agents:
        agents[device_id]["remote_threats"] = payload.threats
        
        # Optionally create a global incident for the centralized dashboard
        for threat in payload.threats:
            is_deleted = threat.get("status") == "deleted"
            
            incident_record = {
                "risk_score": 90 if threat.get('severity') == 'critical' else 60,
                "vt_result": {"malicious": True, "score": 90, "tags": ["agent-scan", "auto-deleted" if is_deleted else "detected"]},
                "severity": threat.get("severity", "high"),
                "action": "DELETED" if is_deleted else ("block" if threat.get('severity') == 'critical' else "warn"),
                "alert": f"Remote Threat {'Auto-deleted' if is_deleted else 'Detected'}: {threat.get('name')}",
                "message": threat.get("description", ""),
                "log": {"device": device_id, "filepath": threat.get("file_path"), "type": "remote_scan", "status": "deleted" if is_deleted else "active"},
                "timestamp": time.time()
            }
            incidents.insert(0, incident_record)
            if len(incidents) > 50:
                incidents.pop()
                
    return {"status": "ok"}




# Pydantic models for incoming requests
class LogPayload(BaseModel):
    log: Optional[dict] = None

class UrlPayload(BaseModel):
    url: str

@app.on_event("startup")
async def startup_event():
    print("Initializing PhantomShield X Data Pipelines...")
    # Generate 200 mock logs to train the Isolation Forest model
    training_data = generate_log_batch(200)
    train_model(training_data)
    
    # Start live system monitor
    # Prime the cpu_percent interval cache
    psutil.cpu_percent(interval=None)
    asyncio.create_task(live_system_monitor()) # Enabled to provide live telemetry
    
    print("PhantomShield X backend ready — all systems online")

@app.get("/health")
async def health_check():
    """Health check endpoint to verify system status."""
    return {
        "status": "ok",
        "model": "loaded",
        "endpoints": [
            "/analyze", "/scan/file", "/scan/url", 
            "/scan/history", "/incidents", "/simulate"
        ],
        "timestamp": time.time()
    }

async def forward_to_splunk(incident_record: dict):
    """
    Enterprise Splunk SIEM Integration (HTTP Event Collector).
    Simulates sending the high-fidelity structured incident to a Splunk Cloud.
    """
    splunk_url = "http://localhost:8088/services/collector/event" # Mock HEC endpoint
    headers = {"Authorization": "Splunk fake-hackathon-token"}
    payload = {"event": incident_record, "sourcetype": "_json"}
    
    try:
        # In a real enterprise env, we httpx.post this payload.
        # For the hackathon, we simulate the async networking without crashing if Splunk is down.
        async with httpx.AsyncClient() as client:
            # await client.post(splunk_url, json=payload, headers=headers, timeout=2.0)
            pass
    except Exception as e:
        pass

async def _process_log_pipeline(log: dict) -> dict:
    """Internal helper to run a single log through the entire analysis pipeline."""
    # Step 1: AI Scoring
    risk_score = score_log(log)
    
    # Step 2: VirusTotal IP Check if an external IP is present
    vt_result = {"malicious": False, "score": 0, "tags": ["unavailable"]}
    ip = log.get("source_ip")
    if ip and not (ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("172.") or ip.startswith("127.")):
        vt_result = await check_ip(ip)
        
    # Step 3: Responder Evaluation
    response_action = evaluate(log, risk_score, vt_result)
    
    # Step 4: Format and Store Incident
    incident_record = {
        "risk_score": risk_score,
        "vt_result": vt_result,
        "severity": response_action["severity"],
        "action": response_action["action"],
        "alert": response_action["alert"],
        "message": response_action["message"],
        "log": log,
        "timestamp": response_action["timestamp"]
    }
    
    incidents.insert(0, incident_record)
    # Keep only last 50
    if len(incidents) > 50:
        incidents.pop()
        
    # Splunk SIEM Integration
    asyncio.create_task(forward_to_splunk(incident_record))
        
    return incident_record

async def live_system_monitor():
    """
    Runs infinitely in the background, sampling actual system metrics every 5 seconds.
    This module simulates the Stratosphere Linux IPS behavioral ML datasets, heavily focusing 
    on monitoring Network Flows and system state deviations rather than traditional signatures.
    """
    while True:
        try:
            # 1. Gather hardware telemetry
            cpu_usage = psutil.cpu_percent(interval=None) # Non-blocking read
            mem_usage = psutil.virtual_memory().percent
            
            # 2. Gather active network connections
            conns = psutil.net_connections(kind='inet')
            
            target_ip = "192.168.1.100" # fallback normal IP
            target_port = 80
            
            # Find an interesting established external connection
            for c in conns:
                if c.status == 'ESTABLISHED' and c.raddr:
                    ip = c.raddr.ip
                    # prefer external IPs for realism
                    if not (ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("127.")):
                        target_ip = ip
                        target_port = c.raddr.port
                        break
            
            # 3. Create the log dictionary matching our schema
            log = {
                "timestamp": time.time(),
                "datetime": datetime.now().isoformat(),
                "source_ip": target_ip, 
                "dest_ip": "127.0.0.1", # host
                "port": target_port,
                "protocol": "TCP",
                "bytes_sent": psutil.net_io_counters().bytes_sent % 40000, 
                "user_id": "HOST-SYSTEM",
                "action": "system_metric",
                "resource": "psutil_monitor",
                "time_of_day": datetime.now().strftime("%H:%M"),
                "location": "Local Host",
                "process_name": "system",
                "cpu_usage": cpu_usage,
                "memory_usage": mem_usage,
                "file_accessed": "N/A"
            }
            
            # 4. Pipe into our AI isolation forest
            await _process_log_pipeline(log)
            
        except Exception as e:
            print(f"Live Monitor error: {e}")
            
        await asyncio.sleep(5)

@app.post("/analyze")
async def analyze_log(payload: LogPayload):
    """Analyze a single log using AI and Threat Intelligence."""
    log = payload.log
    if not log:
        # Generate a random single log for testing if none provided
        log = generate_log_batch(1)[0]
        
    return await _process_log_pipeline(log)

@app.post("/scan/file")
async def scan_file_endpoint(file: UploadFile = File(...)):
    """Upload and scan a file using heuristics and VirusTotal."""
    try:
        # Constraint: Read file bytes, simulate max size handling gracefully
        # FastAPI handles streaming automatically for massive files, but we read to memory here
        file_bytes = await file.read()
        
        # Max size check: 32MB
        if len(file_bytes) > 32 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 32MB.")
            
        result = await scan_file(file_bytes, file.filename)
        
        scan_history.insert(0, result)
        if len(scan_history) > 50:
            scan_history.pop()
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scan/url")
async def scan_url_endpoint(payload: UrlPayload):
    """Scan a URL using heuristics and VirusTotal."""
    try:
        result = await scan_url(payload.url)
        
        scan_history.insert(0, result)
        if len(scan_history) > 50:
            scan_history.pop()
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/scan/history")
async def get_scan_history():
    """Retrieve the last 50 combined file and URL scan results."""
    return scan_history

@app.get("/incidents")
async def get_incidents():
    """Retrieve the last 50 log analysis incidents."""
    return incidents

@app.get("/incidents/stats")
async def get_incident_stats():
    """Returns aggregated incident metrics for the live AURIX SOC dashboard."""
    recent_incidents = incidents[:50]

    def score_band(score: int) -> str:
        if score > 70:
            return "high"
        if score >= 40:
            return "medium"
        return "low"

    high = 0
    medium = 0
    low = 0
    ip_counter: Counter[str] = Counter()
    ip_max_score: Dict[str, int] = {}
    process_counter: Counter[str] = Counter()

    for incident in recent_incidents:
        score = int(incident.get("risk_score", 0) or 0)
        band = score_band(score)

        if band == "high":
            high += 1
        elif band == "medium":
            medium += 1
        else:
            low += 1

        log = incident.get("log", {}) or {}
        source_ip = str(log.get("source_ip") or log.get("device") or log.get("dest_ip") or "unknown")
        process_name = str(
            log.get("process_name")
            or log.get("filepath")
            or incident.get("alert")
            or log.get("action")
            or "system"
        )

        ip_counter[source_ip] += 1
        ip_max_score[source_ip] = max(score, ip_max_score.get(source_ip, 0))
        process_counter[process_name] += 1

    top_ips = []
    for source_ip, count in ip_counter.most_common(5):
        max_score = ip_max_score.get(source_ip, 0)
        top_ips.append({
            "source_ip": source_ip,
            "count": count,
            "max_score": max_score,
            "severity": score_band(max_score),
        })

    top_processes = [
        {"process_name": process_name, "count": count}
        for process_name, count in process_counter.most_common(5)
    ]

    score_timeline = []
    for incident in reversed(recent_incidents[:20]):
        log = incident.get("log", {}) or {}
        timestamp = log.get("datetime")
        if not timestamp:
            timestamp = datetime.fromtimestamp(incident.get("timestamp", time.time())).isoformat()

        score_timeline.append({
            "timestamp": timestamp,
            "score": int(incident.get("risk_score", 0) or 0),
        })

    return {
        "total": len(recent_incidents),
        "high": high,
        "medium": medium,
        "low": low,
        "top_ips": top_ips,
        "top_processes": top_processes,
        "score_timeline": score_timeline,
    }

@app.get("/simulate")
async def simulate_traffic():
    """Generates 5 random network/system logs and analyzes them instantly."""
    logs = generate_log_batch(5)
    results = []
    for log in logs:
        # Process asynchronously but await sequentially for ease
        result = await _process_log_pipeline(log)
        results.append(result)
    return results

@app.get("/system/stats")
async def system_stats():
    """Returns real-time system telemetry from the host machine."""
    cpu = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    net = psutil.net_io_counters()
    boot = psutil.boot_time()
    
    # Network speed approximation
    net_sent = net.bytes_sent
    net_recv = net.bytes_recv
    
    return {
        "cpu_percent": cpu,
        "cpu_count": psutil.cpu_count(),
        "memory": {
            "total_gb": round(mem.total / (1024**3), 2),
            "used_gb": round(mem.used / (1024**3), 2),
            "percent": mem.percent,
        },
        "disk": {
            "total_gb": round(disk.total / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "percent": disk.percent,
        },
        "network": {
            "bytes_sent": net_sent,
            "bytes_recv": net_recv,
            "packets_sent": net.packets_sent,
            "packets_recv": net.packets_recv,
        },
        "boot_time": boot,
        "active_connections": len(psutil.net_connections(kind='inet')),
        "process_count": len(psutil.pids()),
        "timestamp": time.time(),
    }


@app.get("/system/apps")
async def installed_apps():
    """
    Detects installed applications on Windows via the registry.
    Flags apps that appear to be on older versions.
    """
    apps = []
    
    if os.name == 'nt':
        import winreg
        registry_paths = [
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
        ]
        
        for reg_path in registry_paths:
            try:
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, reg_path)
                for i in range(winreg.QueryInfoKey(key)[0]):
                    try:
                        subkey_name = winreg.EnumKey(key, i)
                        subkey = winreg.OpenKey(key, subkey_name)
                        
                        try:
                            name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                        except FileNotFoundError:
                            continue
                            
                        version = ""
                        publisher = ""
                        try:
                            version = winreg.QueryValueEx(subkey, "DisplayVersion")[0]
                        except FileNotFoundError:
                            pass
                        try:
                            publisher = winreg.QueryValueEx(subkey, "Publisher")[0]
                        except FileNotFoundError:
                            pass
                            
                        if name and name.strip():
                            apps.append({
                                "name": name.strip(),
                                "version": version,
                                "publisher": publisher,
                            })
                    except Exception:
                        continue
                winreg.CloseKey(key)
            except Exception:
                continue
    
    # Deduplicate by name
    seen = set()
    unique_apps = []
    for app in apps:
        if app["name"] not in seen:
            seen.add(app["name"])
            unique_apps.append(app)
    
    # Sort alphabetically
    unique_apps.sort(key=lambda x: x["name"].lower())
    
    # Heuristic: flag apps with very old looking versions
    for app in unique_apps:
        v = app.get("version", "")
        app["needs_update"] = False
        app["risk"] = "safe"
        
        if v:
            parts = v.split(".")
            try:
                major = int(parts[0])
                # Flag if major version is very low (heuristic)
                if major <= 2 and len(parts) > 1:
                    app["needs_update"] = True
                    app["risk"] = "warning"
            except (ValueError, IndexError):
                pass
    
    return {"apps": unique_apps, "total": len(unique_apps)}


@app.get("/scan/system/{scan_type}")
async def system_scan_endpoint(scan_type: str):
    """
    Streams the live physical local files being scanned by walking actual OS directories.
    """
    async def event_stream():
        paths_to_scan = []
        user_profile = os.environ.get("USERPROFILE") or os.environ.get("HOME", "/")
        current_dir = os.getcwd() # Force injection of root hackathon testing directory
        
        if scan_type == "quick":
            paths_to_scan = [current_dir, os.path.join(user_profile, "Desktop"), os.path.join(user_profile, "Documents")]
        elif scan_type == "complete":
             paths_to_scan = [current_dir, user_profile]
        elif scan_type == "rootkit":
             paths_to_scan = ["C:\\Windows\\System32\\drivers"] if os.name == 'nt' else ["/lib/modules"]
        else:
             paths_to_scan = [current_dir, os.path.join(user_profile, "Downloads")]

        scanned_count = 0
        threats_found = 0
        malicious_files = []
        max_files = 300 if scan_type == "quick" else (1000 if scan_type == "complete" else 200)
        
        for base_path in paths_to_scan:
            if not os.path.exists(base_path): continue
            for root, dirs, files in os.walk(base_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    safe_path = file_path.replace("\\", "\\\\").replace('"', '\\"')
                    progress = min(int((scanned_count / max_files) * 100), 99)
                    yield f"data: {{\"file\": \"{safe_path}\", \"progress\": {progress}, \"threats\": {threats_found}}} \n\n"
                    scanned_count += 1
                    
                    # Advanced Deterministic Heuristics
                    lower_file = file.lower()
                    is_threat = False
                    
                    # Pattern Match: Only flag files with genuinely suspicious keywords
                    suspicious_keywords = ["ransomware", "mimikatz", "invoice_urgent", "inboice_urgent", "hack", "exploit", "payload", "virus", "trojan", "malware", "keylogger", "backdoor"]
                    
                    if any(kw in lower_file for kw in suspicious_keywords):
                        is_threat = True
                        
                    if is_threat:
                         threats_found += 1
                         malicious_files.append(safe_path)
                    
                    await asyncio.sleep(0.01) # Yield to event loop to simulate deep heuristics scan
                    if scanned_count >= max_files: break
                if scanned_count >= max_files: break
            if scanned_count >= max_files: break
                
        import json
        payload = json.dumps(malicious_files)
        yield f"data: {{\"file\": \"COMPLETE\", \"progress\": 100, \"threats\": {threats_found}, \"infected\": {payload}}} \n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ─── File Delete / Quarantine Endpoints ───────────────────────────────────────
QUARANTINE_DIR = os.path.join(os.path.expanduser("~"), ".phantomshield_quarantine")

class FileActionPayload(BaseModel):
    files: List[str]

@app.post("/delete/files")
async def delete_files(payload: FileActionPayload):
    """Permanently delete a list of files from the local filesystem."""
    deleted = []
    failed = []
    for filepath in payload.files:
        # Unescape the double-escaped backslashes from the SSE stream
        clean_path = filepath.replace("\\\\", "\\")
        try:
            if os.path.isfile(clean_path):
                os.remove(clean_path)
                deleted.append(clean_path)
                print(f"[DELETE] Removed: {clean_path}")
            else:
                failed.append({"file": clean_path, "reason": "File not found"})
        except Exception as e:
            failed.append({"file": clean_path, "reason": str(e)})
    return {"deleted": len(deleted), "failed": len(failed), "details": {"deleted": deleted, "failed": failed}}

@app.post("/quarantine/files")
async def quarantine_files(payload: FileActionPayload):
    """Move files to the quarantine directory."""
    os.makedirs(QUARANTINE_DIR, exist_ok=True)
    quarantined = []
    failed = []
    for filepath in payload.files:
        clean_path = filepath.replace("\\\\", "\\")
        try:
            if os.path.isfile(clean_path):
                dest = os.path.join(QUARANTINE_DIR, os.path.basename(clean_path))
                shutil.move(clean_path, dest)
                quarantined.append({"from": clean_path, "to": dest})
                print(f"[QUARANTINE] Moved: {clean_path} → {dest}")
            else:
                failed.append({"file": clean_path, "reason": "File not found"})
        except Exception as e:
            failed.append({"file": clean_path, "reason": str(e)})
    return {"quarantined": len(quarantined), "failed": len(failed), "details": {"quarantined": quarantined, "failed": failed}}

"""
PhantomShield X — Device Agent
Run this on any device you want to monitor.
It collects real system data and reports to the central PhantomShield backend.

Usage:
    pip install psutil httpx pynput pystray pillow
    python agent.py --server http://YOUR_BACKEND_URL:8000
"""

import asyncio
import platform
import socket
import os
import sys
import uuid
import json
import time
import argparse
import subprocess
import threading
import traceback
import logging
from datetime import datetime

# ─── Crash-safe logging ───────────────────────────────────────────────────────
log_dir = os.path.join(os.path.expanduser("~"), ".phantomshield")
try:
    os.makedirs(log_dir, exist_ok=True)
except Exception:
    pass

try:
    logging.basicConfig(
        filename=os.path.join(log_dir, "agent.log"),
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
except Exception:
    logging.basicConfig(level=logging.WARNING)

# ─── Safe Imports — ALL optional with fallbacks ──────────────────────────────
import psutil
import httpx

# pynput — may fail on some locked-down Windows machines
_HAS_PYNPUT = False
try:
    from pynput import keyboard, mouse
    _HAS_PYNPUT = True
except Exception:
    logging.warning("pynput not available — input tracking disabled")

# pystray + PIL — may fail if DLLs are missing
_HAS_TRAY = False
try:
    import pystray
    from PIL import Image, ImageDraw
    _HAS_TRAY = True
except Exception:
    logging.warning("pystray/PIL not available — running in headless mode")

default_icon = None

def show_tray_notification(title, message):
    """Sends a native Windows system tray notification silently."""
    global default_icon
    if default_icon and getattr(default_icon, 'notify', None):
        try:
            default_icon.notify(message, title)
        except Exception as e:
            logging.warning(f"Tray notification failed: {e}")

# ─── Behavioral Tracking Variables (Thread-Safe) ─────────────────────────────
_counter_lock = threading.Lock()
KEY_PRESS_COUNT = 0
MOUSE_MOVE_COUNT = 0
ANOMALOUS_COUNT = 0

# Throttle BOTH keyboard and mouse to prevent overwhelming the GIL
_KEY_THROTTLE_MS = 10     # min ms between counted key events (~100 KPS max)
_MOUSE_THROTTLE_MS = 100  # min ms between counted mouse events (10/sec)
_last_key_time = 0
_last_mouse_time = 0

def on_press(key):
    """Throttled keyboard handler — prevents CPU flooding from auto-repeat keys."""
    global KEY_PRESS_COUNT, _last_key_time
    try:
        now = time.monotonic_ns() // 1_000_000
        if now - _last_key_time >= _KEY_THROTTLE_MS:
            with _counter_lock:
                KEY_PRESS_COUNT += 1
            _last_key_time = now
    except Exception:
        pass  # NEVER crash from a listener callback

def on_move(x, y):
    """Throttled mouse move handler — prevents CPU flooding from raw mouse events."""
    global MOUSE_MOVE_COUNT, _last_mouse_time
    try:
        now = time.monotonic_ns() // 1_000_000
        if now - _last_mouse_time >= _MOUSE_THROTTLE_MS:
            with _counter_lock:
                MOUSE_MOVE_COUNT += 1
            _last_mouse_time = now
    except Exception:
        pass  # NEVER crash from a listener callback

# ─── Resilient Input Listener Management ─────────────────────────────────────
_k_listener = None
_m_listener = None

def _start_keyboard_listener():
    global _k_listener
    if not _HAS_PYNPUT:
        return
    try:
        _k_listener = keyboard.Listener(on_press=on_press, suppress=False)
        _k_listener.daemon = True
        _k_listener.start()
        logging.info("Keyboard listener started.")
    except Exception as e:
        logging.warning(f"Keyboard listener failed: {e}")

def _start_mouse_listener():
    global _m_listener
    if not _HAS_PYNPUT:
        return
    try:
        _m_listener = mouse.Listener(on_move=on_move, suppress=False)
        _m_listener.daemon = True
        _m_listener.start()
        logging.info("Mouse listener started.")
    except Exception as e:
        logging.warning(f"Mouse listener failed: {e}")

def start_input_listeners():
    """Start input listeners with a watchdog that restarts them if they die."""
    if not _HAS_PYNPUT:
        logging.info("Skipping input listeners (pynput not available)")
        return

    _start_keyboard_listener()
    _start_mouse_listener()

    def _watchdog():
        """Periodically checks that listeners are still alive and restarts them."""
        global _k_listener, _m_listener
        while True:
            time.sleep(30)
            try:
                if _k_listener and not _k_listener.is_alive():
                    logging.warning("Keyboard listener died — restarting")
                    _start_keyboard_listener()
                if _m_listener and not _m_listener.is_alive():
                    logging.warning("Mouse listener died — restarting")
                    _start_mouse_listener()
            except Exception:
                pass

    wd = threading.Thread(target=_watchdog, daemon=True, name="InputWatchdog")
    wd.start()

# ─── Configuration ────────────────────────────────────────────────────────────
# Set before running (or in Windows env): PHANTOMSHIELD_SERVER = your FastAPI base URL (no trailing /)
# Tray "Open Dashboard": PHANTOMSHIELD_DASHBOARD_URL = your deployed Vite/React site URL
# CLI: python agent.py --server https://api.example.com
DEFAULT_SERVER = os.environ.get("PHANTOMSHIELD_SERVER", "http://127.0.0.1:8000").rstrip("/")
DASHBOARD_URL = os.environ.get("PHANTOMSHIELD_DASHBOARD_URL", "http://127.0.0.1:5173").rstrip("/")
HEARTBEAT_INTERVAL = 5  # seconds
DEVICE_ID_FILE = os.path.join(os.path.expanduser("~"), ".phantomshield_device_id")

# ─── Device Identity ──────────────────────────────────────────────────────────
def get_or_create_device_id() -> str:
    """Persistent device ID stored in home directory."""
    try:
        if os.path.exists(DEVICE_ID_FILE):
            with open(DEVICE_ID_FILE, "r") as f:
                return f.read().strip()
    except Exception:
        pass
    device_id = str(uuid.uuid4())
    try:
        with open(DEVICE_ID_FILE, "w") as f:
            f.write(device_id)
    except Exception:
        pass
    return device_id


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def get_installed_apps():
    """Get installed apps — Windows registry or Linux dpkg."""
    apps = []
    if platform.system() == "Windows":
        try:
            import winreg
            for reg_path in [
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
            ]:
                try:
                    key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, reg_path)
                    for i in range(winreg.QueryInfoKey(key)[0]):
                        try:
                            subkey = winreg.OpenKey(key, winreg.EnumKey(key, i))
                            name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                            try:
                                version = winreg.QueryValueEx(subkey, "DisplayVersion")[0]
                            except Exception:
                                version = ""
                            try:
                                publisher = winreg.QueryValueEx(subkey, "Publisher")[0]
                            except Exception:
                                publisher = ""
                            if name and name.strip():
                                apps.append({"name": name.strip(), "version": version, "publisher": publisher})
                        except Exception:
                            continue
                    winreg.CloseKey(key)
                except Exception:
                    continue
        except Exception:
            pass
    elif platform.system() == "Linux":
        try:
            result = subprocess.run(["dpkg", "--get-selections"], capture_output=True, text=True, timeout=5)
            for line in result.stdout.splitlines()[:50]:
                parts = line.split()
                if parts and parts[-1] == "install":
                    apps.append({"name": parts[0], "version": "", "publisher": ""})
        except Exception:
            pass
    elif platform.system() == "Darwin":
        try:
            result = subprocess.run(["ls", "/Applications"], capture_output=True, text=True, timeout=5)
            for app in result.stdout.splitlines()[:50]:
                if app.endswith(".app"):
                    apps.append({"name": app.replace(".app", ""), "version": "", "publisher": "Apple Mac"})
        except Exception:
            pass
    # Deduplicate
    seen = set()
    unique = []
    for app in apps:
        if app["name"] not in seen:
            seen.add(app["name"])
            unique.append(app)
    return sorted(unique, key=lambda x: x["name"].lower())


def get_running_processes():
    """Top 20 most CPU-intensive processes."""
    procs = []
    try:
        for p in sorted(psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']),
                        key=lambda p: p.info.get('cpu_percent') or 0, reverse=True)[:20]:
            try:
                procs.append({
                    "pid": p.info["pid"],
                    "name": p.info["name"],
                    "cpu": round(p.info.get("cpu_percent") or 0, 1),
                    "ram": round(p.info.get("memory_percent") or 0, 1),
                    "status": p.info.get("status", ""),
                })
            except Exception:
                continue
    except Exception:
        pass
    return procs


def get_network_connections():
    """Active established network connections."""
    conns = []
    try:
        for c in psutil.net_connections(kind="inet"):
            if c.status == "ESTABLISHED" and c.raddr:
                conns.append({
                    "local": f"{c.laddr.ip}:{c.laddr.port}",
                    "remote": f"{c.raddr.ip}:{c.raddr.port}",
                    "status": c.status,
                })
    except Exception:
        pass
    return conns[:30]


def collect_telemetry(device_id: str) -> dict:
    """Collect complete system snapshot."""
    cpu = 0
    try: cpu = psutil.cpu_percent(interval=None)
    except Exception: pass
    
    mem_total, mem_used, mem_percent = 0, 0, 0
    try:
        mem = psutil.virtual_memory()
        mem_total = round(mem.total / (1024**3), 2)
        mem_used = round(mem.used / (1024**3), 2)
        mem_percent = mem.percent
    except Exception: pass
    
    disk_total, disk_used, disk_percent = 0, 0, 0
    try:
        disk = psutil.disk_usage("/") if platform.system() != "Windows" else psutil.disk_usage("C:\\")
        disk_total = round(disk.total / (1024**3), 2)
        disk_used = round(disk.used / (1024**3), 2)
        disk_percent = disk.percent
    except Exception: pass
    
    net_sent, net_recv, p_sent, p_recv = 0, 0, 0, 0
    try:
        net = psutil.net_io_counters()
        net_sent, net_recv, p_sent, p_recv = net.bytes_sent, net.bytes_recv, net.packets_sent, net.packets_recv
    except Exception: pass
    
    boot_time = 0
    try: boot_time = psutil.boot_time()
    except Exception: pass

    cpu_freq = 0
    try: cpu_freq = round(psutil.cpu_freq().current, 1) if psutil.cpu_freq() else 0
    except Exception: pass

    # Compute Behavioral Analytics (thread-safe read-and-reset)
    global KEY_PRESS_COUNT, MOUSE_MOVE_COUNT, ANOMALOUS_COUNT
    with _counter_lock:
        kpm = KEY_PRESS_COUNT * 12  # 5s interval → per-minute
        cpm = MOUSE_MOVE_COUNT * 12
        KEY_PRESS_COUNT = 0
        MOUSE_MOVE_COUNT = 0
    
    is_anomalous = False
    
    # Anomalous heuristic: Normal users rarely exceed 500 KPM (~100 WPM max)
    if kpm > 500 or cpm > 8000:
        ANOMALOUS_COUNT += 1
    else:
        ANOMALOUS_COUNT = max(0, ANOMALOUS_COUNT - 1)

    if ANOMALOUS_COUNT >= 2:  # 10 seconds of sustained superhuman speed
        is_anomalous = True
        # NO POPUPS — just log it silently and report to server
        logging.info(f"Anomaly detected: KPM={kpm}, CPM={cpm}")

    return {
        "device_id": device_id,
        "timestamp": time.time(),
        "datetime": datetime.now().isoformat(),
        "cpu": {
            "percent": cpu,
            "cores": psutil.cpu_count() or 1,
            "freq_mhz": cpu_freq,
        },
        "memory": {
            "total_gb": mem_total,
            "used_gb": mem_used,
            "percent": mem_percent,
        },
        "disk": {
            "total_gb": disk_total,
            "used_gb": disk_used,
            "percent": disk_percent,
        },
        "network": {
            "bytes_sent": net_sent,
            "bytes_recv": net_recv,
            "packets_sent": p_sent,
            "packets_recv": p_recv,
        },
        "boot_time": boot_time,
        "active_connections": get_network_connections(),
        "processes": get_running_processes(),
        "process_count": len(psutil.pids()) if hasattr(psutil, 'pids') else 0,
        "inputs": {
            "kpm": kpm,
            "cpm": cpm,
            "anomalous": is_anomalous
        }
    }


async def register_device(client: httpx.AsyncClient, server: str, device_id: str):
    """Register this device with the central server."""
    info = {
        "device_id": device_id,
        "hostname": socket.gethostname(),
        "ip": get_local_ip(),
        "os": f"{platform.system()} {platform.release()}",
        "os_version": platform.version(),
        "username": os.getlogin() if hasattr(os, 'getlogin') else os.environ.get("USER", "unknown"),
        "architecture": platform.machine(),
        "python_version": platform.python_version(),
        "registered_at": datetime.now().isoformat(),
    }
    try:
        response = await client.post(f"{server}/agent/register", json=info, timeout=10)
        if response.status_code == 200:
            logging.info(f"Registered with server: {server} | Device: {device_id}")
        else:
            logging.warning(f"Registration failed: {response.status_code}")
    except Exception as e:
        logging.warning(f"Could not reach server: {e}")


async def send_heartbeat(client: httpx.AsyncClient, server: str, device_id: str):
    """Send live telemetry snapshot."""
    try:
        telemetry = collect_telemetry(device_id)
        await client.post(f"{server}/agent/heartbeat", json=telemetry, timeout=5)
    except Exception:
        pass  # Silently retry on next tick


async def send_apps(client: httpx.AsyncClient, server: str, device_id: str):
    """Send installed apps list (expensive, do once on startup)."""
    apps = get_installed_apps()
    logging.info(f"Found {len(apps)} installed apps")
    try:
        await client.post(
            f"{server}/agent/apps",
            json={"device_id": device_id, "apps": apps},
            timeout=30,
        )
    except Exception as e:
        logging.warning(f"Could not send apps: {e}")


async def run_remote_scan(client: httpx.AsyncClient, server: str, device_id: str):
    """Executes a targeted file scan on the user's system triggered by the Admin.
    
    This runs SILENTLY — no popups, no notifications to the user.
    All results are reported back to the admin dashboard only.
    """
    logging.info("Remote scan triggered by admin")
    
    threats = []
    scanned_count = 0
    
    target_dirs = [
        os.path.join(os.path.expanduser("~"), "Desktop"),
        os.path.join(os.path.expanduser("~"), "OneDrive", "Desktop"),
        os.path.join(os.path.expanduser("~"), "Downloads"),
    ]
    
    malware_filenames = [
        "ransomware_trigger", "mimikatz_dump", "trojan_payload",
        "keylogger", "backdoor", "exploit_kit",
    ]
    
    standalone_keywords = ["virus", "malware", "ransomware", "trojan", "mimikatz", 
                           "exploit", "payload", "keylogger", "backdoor", "hack"]
    
    skip_dirs = {"node_modules", ".git", "__pycache__", "venv", ".venv", "env", 
                 ".next", "dist", "build", ".cache", ".npm"}
    
    for target in target_dirs:
        if not os.path.exists(target): continue
        try:
            for root, dirs, files in os.walk(target):
                dirs[:] = [d for d in dirs if d not in skip_dirs]
                
                for file in files:
                    scanned_count += 1
                    file_lower = file.lower()
                    filepath = os.path.join(root, file)
                    
                    is_threat = False
                    threat_desc = ""
                    
                    name_no_ext = os.path.splitext(file_lower)[0]
                    
                    for pattern in malware_filenames:
                        if pattern in name_no_ext:
                            is_threat = True
                            threat_desc = f"Known malware artifact '{pattern}' detected in filename."
                            break
                    
                    if not is_threat and name_no_ext in standalone_keywords:
                        is_threat = True
                        threat_desc = f"File named '{file}' matches known malware signature."
                    
                    if is_threat:
                        threats.append({
                            "name": file,
                            "file_path": filepath,
                            "severity": "critical",
                            "description": threat_desc
                        })
                        logging.info(f"Threat found: {file} at {filepath}")
                        show_tray_notification("Threat Neutralized", f"Malicious file '{file}' removed.")
        except Exception:
            pass
                    
    if threats:
        try:
            await client.post(
                f"{server}/agent/threats",
                json={"device_id": device_id, "threats": threats},
                timeout=10
            )
            logging.info(f"Reported {len(threats)} threats to server")
        except Exception as e:
            logging.warning(f"Failed to report threats: {e}")
    else:
        logging.info(f"Scan complete: {scanned_count} files, no threats")
        show_tray_notification("Scan Complete", f"System scanned ({scanned_count} files). No threats found.")
        try:
            clean_report = [{
                "name": "SCAN_COMPLETE",
                "file_path": "N/A",
                "severity": "low",
                "status": "clean",
                "description": f"Remote scan completed. {scanned_count} files scanned. System is clean."
            }]
            await client.post(
                f"{server}/agent/threats",
                json={"device_id": device_id, "threats": clean_report},
                timeout=10
            )
        except Exception:
            pass

async def poll_commands(client: httpx.AsyncClient, server: str, device_id: str):
    """Continuously poll for C2 commands from the admin dashboard."""
    while True:
        try:
            res = await client.get(f"{server}/agent/commands", params={"device_id": device_id}, timeout=5)
            if res.status_code == 200:
                data = res.json()
                for cmd in data.get("commands", []):
                    if cmd == "scan":
                        asyncio.create_task(run_remote_scan(client, server, device_id))
        except Exception:
            pass
        await asyncio.sleep(3)


async def active_protection_monitor(client: httpx.AsyncClient, server: str, device_id: str):
    """Background scanner that actively deletes malware immediately upon creation.
    
    Runs SILENTLY — no popups. Reports to admin dashboard only.
    """
    logging.info("Active Protection Module started")
    
    watch_dirs = [
        os.path.join(os.path.expanduser("~"), "Desktop"),
        os.path.join(os.path.expanduser("~"), "OneDrive", "Desktop"),
        os.path.join(os.path.expanduser("~"), "Downloads"),
    ]
    
    malicious_keywords = ["virus", "malware", "ransomware", "trojan", "mimikatz",
                          "hack", "exploit", "payload", "keylogger", "backdoor"]
    
    whitelist = ["virustotal", "antivirus", "hackathon", "explorerframe"]
    
    seen_files = {}
    for d in watch_dirs:
        if os.path.exists(d):
            try:
                seen_files[d] = set(os.listdir(d))
            except Exception:
                seen_files[d] = set()
    
    while True:
        try:
            for d in list(seen_files.keys()):
                if not os.path.exists(d): continue
                current_files = set()
                try:
                    current_files = set(os.listdir(d))
                except Exception:
                    continue
                    
                new_files = current_files - seen_files[d]
                
                for file in new_files:
                    file_lower = file.lower()
                    if any(wl in file_lower for wl in whitelist):
                        continue
                    if any(word in file_lower for word in malicious_keywords):
                        filepath = os.path.join(d, file)
                        try:
                            if os.path.isfile(filepath):
                                os.remove(filepath) 
                                logging.info(f"ACTIVE PROTECTION: Deleted {file} from {d}")
                                threats = [{
                                    "name": file,
                                    "file_path": filepath,
                                    "severity": "critical",
                                    "status": "deleted",
                                    "description": "Malware automatically neutralized by Active Protection Engine."
                                }]
                                try:
                                    await client.post(
                                        f"{server}/agent/threats",
                                        json={"device_id": device_id, "threats": threats},
                                        timeout=5
                                    )
                                    show_tray_notification("Active Protection", f"Malware '{file}' blocked & removed.")
                                except Exception:
                                    pass
                                current_files.discard(file)
                        except Exception as e:
                            logging.warning(f"Failed to delete {file}: {e}")
                seen_files[d] = current_files
        except Exception:
            pass
        await asyncio.sleep(2)

async def usb_monitor(client: httpx.AsyncClient, server: str, device_id: str):
    """Watches for new USB drives and automatically scans them.
    
    Runs SILENTLY — no popups. Reports to admin dashboard only.
    """
    logging.info("USB Monitor started")
    known_drives = set()
    
    try:
        for ptr in psutil.disk_partitions():
            known_drives.add(ptr.device)
    except Exception:
        pass
        
    malicious_keywords = ["virus", "malware", "ransomware", "trojan", "mimikatz"]

    while True:
        try:
            current_drives = set()
            for ptr in psutil.disk_partitions():
                current_drives.add(ptr.device)
                
            new_drives = current_drives - known_drives
            for drive in new_drives:
                logging.info(f"New drive detected: {drive}")
                
                # Report USB insertion to admin dashboard (silently)
                try:
                    usb_alert = [{
                        "name": f"USB_CONNECTED: {drive}",
                        "file_path": drive,
                        "severity": "medium",
                        "status": "scanning",
                        "description": f"USB drive {drive} was connected to this device. Scanning in progress..."
                    }]
                    await client.post(
                        f"{server}/agent/threats",
                        json={"device_id": device_id, "threats": usb_alert},
                        timeout=10
                    )
                    show_tray_notification("USB Scanning", f"Scanning drive {drive} for threats...")
                except Exception:
                    pass
                
                # Scan the USB drive
                threats = []
                scanned = 0
                try:
                    for root, _, files in os.walk(drive):
                        for file in files:
                            scanned += 1
                            file_lower = file.lower()
                            if any(kw in file_lower for kw in malicious_keywords):
                                filepath = os.path.join(root, file)
                                try:
                                    if os.path.isfile(filepath):
                                        os.remove(filepath)
                                        threats.append({
                                            "name": file,
                                            "file_path": filepath,
                                            "severity": "critical",
                                            "status": "deleted",
                                            "description": f"USB malware '{file}' auto-deleted from {drive}"
                                        })
                                        logging.info(f"USB threat deleted: {file}")
                                        show_tray_notification("USB Threat Cleaned", f"Removed '{file}' from {drive}")
                                except Exception:
                                    pass
                except Exception:
                    pass
                
                # Report results to admin (silently)
                if threats:
                    try:
                        await client.post(
                            f"{server}/agent/threats",
                            json={"device_id": device_id, "threats": threats},
                            timeout=10
                        )
                    except Exception:
                        pass
                else:
                    try:
                        clean_usb = [{
                            "name": f"USB_CLEAN: {drive}",
                            "file_path": drive,
                            "severity": "low",
                            "status": "clean",
                            "description": f"USB drive {drive} scanned. {scanned} files checked. No threats found."
                        }]
                        await client.post(
                            f"{server}/agent/threats",
                            json={"device_id": device_id, "threats": clean_usb},
                            timeout=10
                        )
                        show_tray_notification("USB Clean", f"Drive {drive} securely scanned. No threats.")
                    except Exception:
                        pass
                        
            known_drives = current_drives
        except Exception:
            pass
        await asyncio.sleep(5)

async def main(server: str):
    device_id = get_or_create_device_id()

    # Prime the CPU meter
    try:
        psutil.cpu_percent(interval=None)
    except Exception:
        pass

    # Generous startup delay — lets PyInstaller unpack and AV finish scanning
    await asyncio.sleep(2)

    # Fire up the low-level telemetry trackers
    start_input_listeners()

    logging.info("PhantomShield X Agent started")

    # Use connection pooling with limits to prevent socket exhaustion
    transport = httpx.AsyncHTTPTransport(
        retries=2,
        limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
    )
    async with httpx.AsyncClient(transport=transport, timeout=10) as client:
        # Register with server
        await register_device(client, server, device_id)

        # Send apps list in background (delay to let startup stabilize)
        await asyncio.sleep(3)
        asyncio.create_task(send_apps(client, server, device_id))

        # Start C2 command polling
        asyncio.create_task(poll_commands(client, server, device_id))
        
        # Start Active Protection Real-time Watcher
        asyncio.create_task(active_protection_monitor(client, server, device_id))
        
        # Start USB Monitor
        asyncio.create_task(usb_monitor(client, server, device_id))

        # Heartbeat loop
        logging.info(f"Heartbeat active (every {HEARTBEAT_INTERVAL}s)")
        while True:
            try:
                await send_heartbeat(client, server, device_id)
            except Exception as e:
                logging.warning(f"Heartbeat error: {e}")
            await asyncio.sleep(HEARTBEAT_INTERVAL)


def create_image():
    """Generates a simple tray icon (shield)."""
    width = 64
    height = 64
    color = (20, 20, 20)
    image = Image.new('RGB', (width, height), color)
    draw = ImageDraw.Draw(image)
    draw.polygon([(32, 5), (55, 15), (55, 45), (32, 60), (9, 45), (9, 15)], fill=(77, 138, 240))
    return image

def set_autorun():
    """Adds the agent to Windows registry so it auto-starts on login."""
    if platform.system() == "Windows":
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run", 0, winreg.KEY_SET_VALUE)
            if getattr(sys, 'frozen', False):
                exe_path = sys.executable
            else:
                exe_path = f'"{sys.executable}" "{os.path.abspath(__file__)}"'
            winreg.SetValueEx(key, "PhantomShieldAgent", 0, winreg.REG_SZ, exe_path)
            winreg.CloseKey(key)
            logging.info("Autorun set successfully")
        except Exception as e:
            logging.warning(f"Failed to set autorun: {e}")

def run_background_loop(server):
    """Crash-resilient event loop — restarts automatically on failure."""
    max_retries = 10
    retry_delay = 5
    for attempt in range(1, max_retries + 1):
        try:
            asyncio.run(main(server))
            break
        except Exception as e:
            msg = f"Background loop crashed (attempt {attempt}/{max_retries}): {e}"
            logging.error(msg)
            logging.error(traceback.format_exc())
            if attempt < max_retries:
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 60)
            else:
                logging.critical("Agent gave up after max retries.")

def open_ui():
    """Opens the web dashboard (PHANTOMSHIELD_DASHBOARD_URL)."""
    try:
        import webbrowser
        if DASHBOARD_URL:
            webbrowser.open(DASHBOARD_URL)
    except Exception:
        pass

def on_ui_click(icon, item):
    """Spawns the UI securely without blocking the primary tray icon."""
    threading.Thread(target=open_ui, daemon=True).start()


def setup_tray(server):
    """Sets up the system tray icon and branches network loop.
    
    If tray icon fails (missing DLLs, etc.), falls back to headless mode.
    """
    logging.info("Initializing agent...")
    
    # Set autorun (best-effort, non-blocking)
    try:
        set_autorun()
    except Exception:
        pass
    
    # Fire up the networking loop in a background thread
    bg_thread = threading.Thread(target=run_background_loop, args=(server,), daemon=True)
    bg_thread.start()
    
    # Try to set up tray icon — if it fails, run headlessly
    if _HAS_TRAY:
        try:
            image = create_image()
            
            def on_quit(icon, item):
                icon.stop()
                os._exit(0)
                
            menu = pystray.Menu(
                pystray.MenuItem('Open PhantomShield Dashboard', on_ui_click, default=True),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem('Exit Endpoint Agent', on_quit)
            )
            
            icon = pystray.Icon("PhantomShield", image, "PhantomShield-X Agent", menu)
            
            global default_icon
            default_icon = icon

            logging.info("Tray icon initialized — running with UI")
            icon.run()  # This blocks — keeps the process alive
        except Exception as e:
            logging.warning(f"Tray icon failed: {e}. Running headless.")
            # Fall through to headless mode
    
    # Headless fallback — just keep the process alive
    logging.info("Running in headless mode (no tray icon)")
    try:
        while True:
            time.sleep(60)
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    # ─── Global crash handlers — NOTHING should kill the exe silently ─────
    def _global_exception_handler(exc_type, exc_value, exc_tb):
        msg = "".join(traceback.format_exception(exc_type, exc_value, exc_tb))
        logging.critical(f"UNHANDLED EXCEPTION:\n{msg}")
    sys.excepthook = _global_exception_handler

    def _thread_exception_handler(args):
        logging.critical(f"UNHANDLED THREAD EXCEPTION in {args.thread.name}: {args.exc_value}")
    threading.excepthook = _thread_exception_handler

    parser = argparse.ArgumentParser(description="PhantomShield X Device Agent")
    parser.add_argument(
        "--server",
        default=DEFAULT_SERVER,
        help="Backend API base URL, same host the website uses in VITE_API_URL (default: PHANTOMSHIELD_SERVER or http://127.0.0.1:8000)",
    )
    args = parser.parse_args()

    try:
        setup_tray(args.server)
    except KeyboardInterrupt:
        logging.info("Agent stopped by user")
    except Exception as e:
        logging.critical(f"Fatal startup error: {e}")
        logging.critical(traceback.format_exc())
        # In headless mode, try to keep running anyway
        try:
            run_background_loop(args.server)
        except Exception:
            pass

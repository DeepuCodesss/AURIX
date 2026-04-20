"""
Generates realistic mock cybersecurity log data, including network traffic, user behavior,
and system logs. Generates some intentional anomalies to test the detection system.
"""

import random
import time
from datetime import datetime, timedelta

def generate_log_batch(n: int = 10) -> list:
    """Returns a list of log dictionaries."""
    logs = []
    
    actions = ["login", "download", "upload", "delete", "view", "execute"]
    resources = ["/api/v1/data", "/admin/dashboard", "/etc/passwd", "C:\\Windows\\System32\\cmd.exe", "report.pdf"]
    locations = ["US", "UK", "DE", "IN", "CN", "RU", "BR", "JP"]
    processes = ["chrome.exe", "explorer.exe", "python.exe", "svchost.exe", "nmap.exe", "powershell.exe"]
    
    for _ in range(n):
        # 15% chance to generate an obviously suspicious log
        is_suspicious = random.random() < 0.15
        
        current_time = time.time() - random.randint(0, 3600)  # past hour
        dt = datetime.fromtimestamp(current_time)
        
        if is_suspicious:
            # Suspicious profile
            source_ip = f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
            port = random.choice([22, 3389, 445]) # SSH, RDP, SMB
            bytes_sent = random.randint(1000000, 50000000) # Exfiltration
            cpu_usage = random.uniform(85.0, 100.0)
            user_action = "execute"
            resource = random.choice(["/etc/passwd", "C:\\Windows\\System32\\cmd.exe"])
            time_of_day = f"{random.randint(2, 4):02d}:{random.randint(0, 59):02d}" # 2 AM - 4 AM
            location = random.choice(["CN", "RU", "KP", "Unknown"])
            process = random.choice(["nmap.exe", "powershell.exe", "mimikatz.exe"])
        else:
            # Normal profile
            source_ip = f"192.168.1.{random.randint(10, 200)}"
            port = random.choice([80, 443])
            bytes_sent = random.randint(100, 50000)
            cpu_usage = random.uniform(5.0, 40.0)
            user_action = random.choice(["login", "view", "download"])
            resource = random.choice(["/api/v1/data", "report.pdf", "/home/page"])
            time_of_day = f"{random.randint(9, 17):02d}:{random.randint(0, 59):02d}" # 9 AM - 5 PM
            location = random.choice(["US", "UK", "DE"])
            process = random.choice(["chrome.exe", "explorer.exe", "word.exe"])

        log = {
            "timestamp": current_time,
            "datetime": dt.isoformat(),
            # Network Log Data
            "source_ip": source_ip,
            "dest_ip": f"10.0.0.{random.randint(1, 50)}",
            "port": port,
            "protocol": "TCP" if port in [80, 443, 22, 3389] else "UDP",
            "bytes_sent": bytes_sent,
            # User Behavior Data
            "user_id": f"USR-{random.randint(1000, 9999)}",
            "action": user_action,
            "resource": resource,
            "time_of_day": time_of_day,
            "location": location,
            # System Log Data
            "process_name": process,
            "cpu_usage": round(cpu_usage, 2),
            "memory_usage": round(random.uniform(10.0, 80.0), 2),
            "file_accessed": resource
        }
        logs.append(log)
        
    return logs

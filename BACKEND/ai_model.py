"""
Houses the Machine Learning behavior analysis system. Trains an Isolation Forest
model on startup to detect anomalous network and system log activity, augmenting
it with deterministic rule-based checks.
"""

from sklearn.ensemble import IsolationForest
import pandas as pd
import numpy as np

_model = None
_is_trained = False

def train_model(logs_data: list):
    """Trains the Isolation Forest model on initial data."""
    global _model, _is_trained
    if not logs_data:
        return
        
    df = pd.DataFrame(logs_data)
    
    # Simple feature engineering for training
    features = []
    for _, row in df.iterrows():
        # Extracted numeric features
        cpu = row.get("cpu_usage", 0)
        mem = row.get("memory_usage", 0)
        bytes_sent = row.get("bytes_sent", 0)
        
        # Categorical simplification (just length/presence)
        port = row.get("port", 0)
        features.append([cpu, mem, bytes_sent, port])
        
    X = np.array(features)
    
    _model = IsolationForest(contamination=0.1, random_state=42)
    _model.fit(X)
    _is_trained = True
    print("AI Model: Isolation Forest trained successfully.")

def _rule_based_checks(log: dict) -> int:
    """Applies deterministic rules for known bad behavior patterns."""
    penalty = 0
    
    # Rule 1: Port 22/3389 from non-standard networks
    port = log.get("port")
    ip = log.get("source_ip", "")
    if port in [22, 3389]:
        if not (ip.startswith("192.168.") or ip.startswith("10.") or ip.startswith("172.")):
            penalty += 20
            
    # Rule 2: Off-hours access
    time_of_day = log.get("time_of_day", "12:00")
    try:
        hour = int(time_of_day.split(":")[0])
        if hour < 6 or hour > 20: # before 6 AM or after 8 PM
            penalty += 20
    except:
        pass
        
    # Rule 3: High CPU + Unusual process
    cpu = log.get("cpu_usage", 0)
    process = log.get("process_name", "")
    unusual_processes = ["nmap.exe", "mimikatz.exe", "powershell.exe"]
    if cpu > 80.0 and process in unusual_processes:
        penalty += 20
        
    return penalty

def score_log(log: dict) -> int:
    """Scores a single log based on AI anomaly score + rules."""
    if not _is_trained or _model is None:
        # Fallback if not trained
        return min(_rule_based_checks(log), 100)
        
    # Extract features matching training
    cpu = log.get("cpu_usage", 0)
    mem = log.get("memory_usage", 0)
    bytes_sent = log.get("bytes_sent", 0)
    port = log.get("port", 0)
    
    X = np.array([[cpu, mem, bytes_sent, port]])
    
    # isolation forest returns anomaly_score where lower (negative) is more anomalous
    # We want 0-100 where higher is more anomalous.
    score_array = _model.score_samples(X) 
    raw_score = score_array[0] # between -1 and 0 typically
    
    # Normalize: -1.0 (highly anomalous) -> 100, 0.0 (normal) -> 0
    anomaly_base = max(0, min(100, int((abs(raw_score) - 0.3) * 200))) 
    
    # Add rules
    rule_penalty = _rule_based_checks(log)
    
    # Heuristic override for safe background system metrics
    if log.get("action") == "system_metric":
        anomaly_base = min(anomaly_base, 15) # Forcefully cap anomaly base to 15 (Low/Safe)
            
    final_score = min(100, anomaly_base + rule_penalty)
    return final_score

"""
Evaluates risk scores and intelligence data to determine the correct response
action and severity for the system dashboard alerts.
"""

import time

def evaluate(log: dict, risk_score: int, vt_result: dict) -> dict:
    """Takes log details, AI score, and VT result to formulate a response."""
    
    # VirusTotal overrides - if VT says malicious, boost the effective evaluation severity
    effective_score = risk_score
    if vt_result.get("malicious", False):
        effective_score = max(effective_score, 75)
        
    timestamp = time.time()
    
    if effective_score >= 70:
        severity = "HIGH"
        action = "block_ip"
        alert = True
        message = f"CRITICAL: High risk activity detected. Source IP {log.get('source_ip', 'unknown')} should be blocked."
    elif effective_score >= 40:
        severity = "MEDIUM"
        action = "flag_session"
        alert = True
        message = f"WARNING: Suspicious behavior observed from User {log.get('user_id', 'unknown')}. Session flagged."
    else:
        severity = "LOW"
        action = "monitor"
        alert = False
        message = f"INFO: Normal traffic patterns observed."
        
    return {
        "severity": severity,
        "action": action,
        "alert": alert,
        "message": message,
        "timestamp": timestamp
    }

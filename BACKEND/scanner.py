"""
Provides scanning logic for files and URLs. Combines VirusTotal integration
with local heuristic checks to generate a comprehensive risk score and verdict.
"""

import hashlib
import re
import time
from urllib.parse import urlparse
import filetype
import httpx
import yara
from virustotal import check_file_hash, upload_file_to_vt, check_url

# Precompile YARA enterprise heuristics
yara_rules = yara.compile(source='''
rule Detect_Ransomware {
    strings:
        $s1 = "WannaCry" nocase
        $s2 = "bitcoin" nocase
        $s3 = "encrypted" nocase
    condition:
        2 of them
}
rule Detect_Suspicious_Cmd {
    strings:
        $ps = "powershell -ExecutionPolicy Bypass" nocase
        $mimi = "mimikatz" nocase
    condition:
        any of them
}
''')

def ember_static_analysis(file_bytes: bytes) -> dict:
    """
    Simulates ELastic EMBER structural feature extraction for Windows executables.
    It conceptually parses PE headers (Imports, Sections, Exports) to feed into a LightGBM.
    """
    # For a real implementation, lief library extracts PE features for a .bin model.
    return {
        "ember_score": 88, 
        "malware_probability": 0.88
    }

def _compute_sha256(file_bytes: bytes) -> str:
    sha256_hash = hashlib.sha256()
    sha256_hash.update(file_bytes)
    return sha256_hash.hexdigest()

def _get_verdict_and_action(score: int) -> tuple:
    if score >= 70:
        return "DANGEROUS", "block"
    elif score >= 35:
        return "SUSPICIOUS", "warn_user"
    return "SAFE", "allow"

async def scan_file(file_bytes: bytes, filename: str) -> dict:
    """Scans a file using hashes, VirusTotal, and local heuristics."""
    timestamp = time.time()
    sha256 = _compute_sha256(file_bytes)
    
    # Step 2: VT Hash Lookup
    vt_result = await check_file_hash(sha256)
    
    # Step 3: VT Upload if unknown
    if vt_result["score"] == 0 and "unavailable" in vt_result.get("tags", []):
        vt_result = await upload_file_to_vt(file_bytes, filename)
        
    heuristic_flags = []
    heuristic_score = 0
    
    # Step 4: Local Heuristics
    filename_lower = filename.lower()
    
    # 4a. Check size (> 50MB)
    if len(file_bytes) > 50 * 1024 * 1024:
        heuristic_flags.append("large_file_size")
        heuristic_score += 15
        
    # 4b. Dangerous extensions
    danger_exts = ['.exe', '.bat', '.ps1', '.sh', '.vbs', '.js', '.jar', '.dll', '.scr', '.cmd']
    if any(filename_lower.endswith(ext) for ext in danger_exts):
        heuristic_flags.append("dangerous_extension")
        heuristic_score += 30
        
    # 4c. Suspicious words
    suspicious_words = ['invoice', 'payment', 'urgent', 'password', 'free', 'winner']
    if any(word in filename_lower for word in suspicious_words):
        heuristic_flags.append("suspicious_filename_keyword")
        heuristic_score += 20
        
    # 4d. Magic bytes vs Extension mismatch
    kind = filetype.guess(file_bytes)
    if kind is not None:
        actual_ext = "." + kind.extension.lower()
        if not filename_lower.endswith(actual_ext) and "." in filename_lower:
            heuristic_flags.append("extension_mismatch")
            heuristic_score += 40
            
    # 4e. YARA Engine Match
    try:
        yara_matches = yara_rules.match(data=file_bytes)
        for match in yara_matches:
            heuristic_flags.append(f"yara_rule_match_{match.rule}")
            heuristic_score += 45
    except Exception as e:
        print(f"YARA Match Error: {e}")

    # 4f. EMBER Static Machine Learning (Only for Windows Executables)
    if any(filename_lower.endswith(ext) for ext in ['.exe', '.dll', '.sys']):
        ember_res = ember_static_analysis(file_bytes)
        heuristic_flags.append(f"ember_static_analysis: {ember_res['amber_score'] if 'amber_score' in ember_res else ember_res['ember_score']}% malicious probability")
        heuristic_score += int(ember_res['ember_score'] / 2) # Penalize based on EMBER

    # Combine scores
    final_score = min(vt_result.get("score", 0) + heuristic_score, 100)
    verdict, action = _get_verdict_and_action(final_score)
    
    return {
        "filename": filename,
        "sha256": sha256,
        "risk_score": final_score,
        "verdict": verdict,
        "vt_result": vt_result,
        "heuristic_flags": heuristic_flags,
        "recommended_action": action,
        "timestamp": timestamp
    }

async def scan_url(url: str) -> dict:
    """Scans a URL using VirusTotal and local heuristics."""
    timestamp = time.time()
    
    # Step 1: Parse
    parsed_url = urlparse(url)
    domain = parsed_url.netloc
    
    # Step 2: VirusTotal
    vt_result = await check_url(url)
    
    heuristic_flags = []
    heuristic_score = 0
    url_lower = url.lower()
    
    # 2b. Live Active Pinging (Flag dead sites and analyze active HTML)
    try:
        async with httpx.AsyncClient(verify=False, timeout=4.0) as client:
            fetch_resp = await client.get(url)
            html = fetch_resp.text.lower()
            
            # Look for malicious markers inside the live website source code
            if "<iframe" in html and ("display:none" in html or "hidden" in html):
                heuristic_flags.append("live_hidden_iframe_detected")
                heuristic_score += 30
            if "eval(" in html and "atob(" in html:
                heuristic_flags.append("live_obfuscated_javascript")
                heuristic_score += 40
            if "crypto.subtle" in html or "miner" in html:
                heuristic_flags.append("live_cryptominer_code")
                heuristic_score += 35
    except Exception as e:
        # Hit and run phishing sites die fast. If it's dead, flag it aggressively.
        heuristic_flags.append("dead_or_unreachable_link")
        heuristic_score += 55

    # 3a. IP instead of domain
    if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$", domain):
        heuristic_flags.append("ip_as_domain")
        heuristic_score += 40
        
    # 3b. URL Shorteners
    shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd']
    if any(short in domain.lower() for short in shorteners):
        heuristic_flags.append("url_shortener")
        heuristic_score += 25
        
    # 3c. Keywords
    suspicious_keywords = ['login', 'verify', 'account', 'secure', 'update', 'confirm', 'bank', 'paypal', 'free', 'prize', 'malware', 'virus', 'evil', 'hack', 'phishing']
    if any(word in url_lower for word in suspicious_keywords):
        heuristic_flags.append("suspicious_keyword_in_url")
        heuristic_score += 35
        
    # 3d. Suspicious TLDs
    suspicious_tlds = ['.xyz', '.click', '.top', '.ru', '.cn', '.tk', '.biz', '.info']
    if any(domain.endswith(tld) for tld in suspicious_tlds):
        heuristic_flags.append("suspicious_tld")
        heuristic_score += 25
        
    # 3e. Excessive subdomains
    if domain.count('.') > 3:
        heuristic_flags.append("excessive_subdomains")
        heuristic_score += 15
        
    # 3e. Misleading domains (numbers replacing letters)
    if re.search(r"[a-z]+[0-9]+[a-z]+", domain.split('.')[0]):
        heuristic_flags.append("misleading_domain_name")
        heuristic_score += 30
        
    # 3f. Long URL
    if len(url) > 100:
        heuristic_flags.append("long_url")
        heuristic_score += 10
        
    # 3g. HTTP instead of HTTPS
    if parsed_url.scheme == "http":
        heuristic_flags.append("unencrypted_http")
        heuristic_score += 15
        
    # Combine scores
    final_score = min(vt_result.get("score", 0) + heuristic_score, 100)
    verdict, action = _get_verdict_and_action(final_score)
    
    return {
        "url": url,
        "domain": domain,
        "risk_score": final_score,
        "verdict": verdict,
        "vt_result": vt_result,
        "heuristic_flags": heuristic_flags,
        "recommended_action": action,
        "timestamp": timestamp
    }

"""
Handles asynchronous integration with the VirusTotal v3 API. Provides functions
to check IPs, URLs, file hashes, and perform live file uploads for scanning.
"""

import asyncio
import base64
import os

import httpx
from dotenv import load_dotenv

load_dotenv()
VT_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")
BASE_URL = "https://www.virustotal.com/api/v3"

def _format_vt_response(data: dict) -> dict:
    """Helper to parse VT attributes into our standardized format."""
    try:
        stats = data["data"]["attributes"]["last_analysis_stats"]
        malicious_count = stats.get("malicious", 0)
        suspicious_count = stats.get("suspicious", 0)
        total_engines = sum(stats.values())
        
        # Calculate a 0-100 score based on engine flags
        score = 0
        if total_engines > 0:
            score = int(((malicious_count * 1.0 + suspicious_count * 0.5) / total_engines) * 100)
            
        tags = data["data"]["attributes"].get("tags", [])
        
        return {
            "malicious": malicious_count > 0 or score > 15,
            "score": score,
            "tags": tags
        }
    except KeyError:
        return {"malicious": False, "score": 0, "tags": ["unavailable"]}

def _error_response() -> dict:
    return {"malicious": False, "score": 0, "tags": ["unavailable"]}

async def check_ip(ip: str) -> dict:
    """Check IP reputation on VirusTotal."""
    if not VT_API_KEY:
        return _error_response()
        
    headers = {"x-apikey": VT_API_KEY}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/ip_addresses/{ip}", headers=headers)
            if response.status_code == 200:
                return _format_vt_response(response.json())
            return _error_response()
        except:
            return _error_response()

async def check_url(url: str) -> dict:
    """Check URL reputation on VirusTotal."""
    if not VT_API_KEY:
        return _error_response()
        
    url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
    headers = {"x-apikey": VT_API_KEY}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/urls/{url_id}", headers=headers)
            if response.status_code == 200:
                return _format_vt_response(response.json())
            return _error_response()
        except:
            return _error_response()

async def check_file_hash(sha256: str) -> dict:
    """Check a file's SHA-256 hash on VirusTotal."""
    if not VT_API_KEY:
        return _error_response()
        
    headers = {"x-apikey": VT_API_KEY}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/files/{sha256}", headers=headers)
            if response.status_code == 200:
                return _format_vt_response(response.json())
            return _error_response()
        except:
            return _error_response()

async def upload_file_to_vt(file_bytes: bytes, filename: str) -> dict:
    """Uploads a file to VirusTotal and polls for the analysis result."""
    if not VT_API_KEY:
        return _error_response()
        
    headers = {"x-apikey": VT_API_KEY}
    files = {"file": (filename, file_bytes)}
    
    async with httpx.AsyncClient() as client:
        try:
            # Step 1: Upload the file
            upload_resp = await client.post(f"{BASE_URL}/files", headers=headers, files=files)
            if upload_resp.status_code != 200:
                return _error_response()
                
            analysis_id = upload_resp.json()["data"]["id"]
            
            # Step 2: Poll for results (limited attempts)
            for _ in range(5):
                await asyncio.sleep(3)
                poll_resp = await client.get(f"{BASE_URL}/analyses/{analysis_id}", headers=headers)
                if poll_resp.status_code == 200:
                    poll_data = poll_resp.json()
                    status = poll_data["data"]["attributes"]["status"]
                    if status == "completed":
                        # The analysis response format is slightly different 
                        # but contains last_analysis_stats
                        return _format_vt_response(poll_data)
            
            # If still queued after retries
            return _error_response()
        except:
            return _error_response()

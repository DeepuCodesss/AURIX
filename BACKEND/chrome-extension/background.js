const API_URL = "https://phantomshield-x.onrender.com";

let scannedUrls = new Map(); // Cache to avoid rescanning same url multiple times

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const url = tab.url;
    
    // Ignore internal chrome URLs
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return;

    // Check Cache
    if (scannedUrls.has(url)) {
      const cachedResult = scannedUrls.get(url);
      if (cachedResult === 'dangerous') redirectToWarning(tabId, url);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/scan/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url })
      });

      if (response.ok) {
        const data = await response.json();
        const verdict = (data.verdict || '').toLowerCase();
        
        if (verdict === 'dangerous' || verdict === 'suspicious') {
          scannedUrls.set(url, 'dangerous');
          redirectToWarning(tabId, url, data.risk_score, data.heuristic_flags?.join(', '));
        } else {
          scannedUrls.set(url, 'safe');
        }
      }
    } catch (err) {
      console.error("Scan failed for", url, err);
    }
  }
});

function redirectToWarning(tabId, originalUrl, score, flags) {
  const warningUrl = chrome.runtime.getURL(`warning.html?url=${encodeURIComponent(originalUrl)}&score=${score || 'Unknown'}&flags=${encodeURIComponent(flags || 'Malicious Threat Detected')}`);
  chrome.tabs.update(tabId, { url: warningUrl });
}

document.addEventListener('DOMContentLoaded', () => {
  const statusBox = document.getElementById('statusBox');
  const detailsText = document.getElementById('detailsText');
  
  document.getElementById('btnDashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://phantom-shield-x.vercel.app/dashboard' });
  });

  chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
    let currentTab = tabs[0];
    if (!currentTab || !currentTab.url) return;
    
    if (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
      statusBox.className = 'status safe';
      statusBox.textContent = 'System Page';
      return;
    }

    try {
      const response = await fetch("https://phantomshield-x.onrender.com/scan/url", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentTab.url })
      });

      if (response.ok) {
        const data = await response.json();
        const verdict = (data.verdict || 'safe').toLowerCase();
        
        if (verdict === 'dangerous' || verdict === 'suspicious') {
          statusBox.className = 'status danger';
          statusBox.textContent = `⚠️ DANGEROUS SITE`;
          detailsText.textContent = `Risk Score: ${data.risk_score}/100. Flags: ${data.heuristic_flags?.join(', ')}`;
        } else {
          statusBox.className = 'status safe';
          statusBox.textContent = '✅ Safe Website';
          detailsText.textContent = 'No malicious behavior detected on this domain.';
        }
      } else {
        throw new Error('Backend failed');
      }
    } catch (e) {
      statusBox.className = 'status danger';
      statusBox.textContent = 'Server Offline';
      detailsText.textContent = 'Failed to connect to PhantomShield Analysis Engine.';
    }
  });
});

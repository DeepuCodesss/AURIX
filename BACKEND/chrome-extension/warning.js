document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetUrl = urlParams.get('url');
  const score = urlParams.get('score');
  const flags = urlParams.get('flags');

  document.getElementById('urlBox').textContent = targetUrl || 'Unknown URL';
  document.getElementById('scoreBox').textContent = score || 'High';
  document.getElementById('flagsBox').textContent = flags || 'Malicious behavior detected';

  document.getElementById('btnBack').addEventListener('click', () => {
    window.history.back();
    // if no history
    setTimeout(() => {
      window.location.href = "chrome://newtab";
    }, 100);
  });

  document.getElementById('btnProceed').addEventListener('click', () => {
    // If they proceed, we add a flag to the hash so background.js ignoring it is an option, 
    // or we just redirect them back but background.js will flag it again unless we bypass.
    // For now, we will notify background to whitelist it temporarily, then redirect.
    // Given the scope of this hackathon, we'll just redirect to it with a bypass hash.
    window.location.href = targetUrl + (targetUrl.includes('?') ? '&' : '?') + "phantomshield_bypass=true";
  });
});

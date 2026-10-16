// The background rule redirects here as blocked.html#<original url>.
const originalUrl = location.hash.slice(1);
let host = null;
try {
  host = new URL(originalUrl).hostname;
} catch {}

const siteEl = document.getElementById('site');
const backBtn = document.getElementById('back');
const continueBtn = document.getElementById('continue');

if (host) {
  siteEl.textContent = `${host.replace(/^www\./, '')} is on your block list.`;
  document.title = `Blocked: ${host}`;
}

backBtn.addEventListener('click', async () => {
  if (history.length > 1) {
    history.back();
  } else {
    const tab = await chrome.tabs.getCurrent();
    if (tab) chrome.tabs.remove(tab.id);
  }
});

continueBtn.addEventListener('click', () => location.replace(originalUrl));

// If the site was unblocked (e.g. while this tab sat on the blocked page),
// offer to go to it.
async function checkStillBlocked() {
  if (!host) return;
  const sites = await getSites();
  continueBtn.hidden = isHostBlocked(host, sites);
}

checkStillBlocked();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.sites) checkStillBlocked();
});

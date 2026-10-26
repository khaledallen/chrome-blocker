// Helpers shared by the background worker, popup and blocked page.

// Turn whatever the user typed ("https://www.Reddit.com/r/foo", "reddit.com")
// into a bare hostname ("reddit.com"), or null if it isn't a usable domain.
function normalizeSite(input) {
  let s = String(input || '').trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//.test(s)) s = 'http://' + s;
  let host;
  try {
    host = new URL(s).hostname;
  } catch {
    return null;
  }
  host = host.replace(/\.$/, '').replace(/^www\./, '');
  if (!/^[a-z0-9.-]+$/.test(host) || !host.includes('.')) return null;
  if (host.startsWith('.') || host.endsWith('.') || host.includes('..')) return null;
  return host;
}

// Same matching as declarativeNetRequest's requestDomains:
// "reddit.com" blocks reddit.com and every subdomain of it.
function isHostBlocked(hostname, sites) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  return sites.some((site) => host === site || host.endsWith('.' + site));
}

function isUrlBlocked(url, sites) {
  try {
    const { protocol, hostname } = new URL(url);
    return /^https?:$/.test(protocol) && isHostBlocked(hostname, sites);
  } catch {
    return false;
  }
}

async function getSites() {
  const { sites = [] } = await chrome.storage.local.get('sites');
  return sites;
}

async function setSites(sites) {
  const unique = [...new Set(sites)].sort();
  await chrome.storage.local.set({ sites: unique });
}

importScripts('shared.js');

// All blocked sites live in a single dynamic rule.
const RULE_ID = 1;
const BLOCKED_PAGE = chrome.runtime.getURL('blocked.html');

async function applyRules(sites) {
  const addRules = sites.length
    ? [
        {
          id: RULE_ID,
          priority: 1,
          action: {
            type: 'redirect',
            // Pass the original URL along so the blocked page can show it.
            redirect: { regexSubstitution: BLOCKED_PAGE + '#\\0' },
          },
          condition: {
            regexFilter: '^.+$',
            requestDomains: sites,
            resourceTypes: ['main_frame', 'sub_frame'],
          },
        },
      ]
    : [];
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID],
    addRules,
  });
}

// A site's service worker can serve its pages from cache without a network
// request, which the rule above never sees. Removing it sends future visits
// through the network, where the rule blocks them.
function removeServiceWorkers(origins) {
  if (origins.length) chrome.browsingData.remove({ origins }, { serviceWorkers: true });
}

// Runs inside the page. location.replace() swaps the history entry, so "Go
// back" on the blocked page doesn't land on the blocked site again.
function replaceWithBlockedPage(blockedPage, sites) {
  const host = location.hostname.replace(/\.$/, '');
  if (sites.some((site) => host === site || host.endsWith('.' + site))) {
    location.replace(blockedPage + '#' + location.href);
  }
}

async function kickOut(tabId, sites) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      injectImmediately: true,
      func: replaceWithBlockedPage,
      args: [BLOCKED_PAGE, sites],
    });
  } catch {
    // The page can't be scripted (e.g. a network error page); navigate the tab instead.
    const tab = await chrome.tabs.get(tabId).catch(() => null);
    if (tab && isUrlBlocked(tab.url, sites)) {
      chrome.tabs.update(tabId, { url: BLOCKED_PAGE + '#' + tab.url });
    }
  }
}

// Rules only catch new navigations, so also send already-open tabs on a
// blocked site to the blocked page.
async function blockOpenTabs(sites) {
  if (!sites.length) return;
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  for (const tab of tabs) {
    if (isUrlBlocked(tab.url, sites)) kickOut(tab.id, sites);
  }
}

async function sync() {
  const sites = await getSites();
  await applyRules(sites);
  removeServiceWorkers(sites.flatMap((s) => [`https://${s}`, `https://www.${s}`]));
  await blockOpenTabs(sites);
}

chrome.runtime.onInstalled.addListener(sync);
chrome.runtime.onStartup.addListener(sync);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.sites) sync();
});

// Backstop for pages that never hit the network: served by a site's service
// worker, restored by the back/forward cache, or activated from a prerender.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!changeInfo.url && !changeInfo.status) return;
  const sites = await getSites();
  if (!isUrlBlocked(tab.url, sites)) return;
  kickOut(tabId, sites);
  removeServiceWorkers([new URL(tab.url).origin]);
});

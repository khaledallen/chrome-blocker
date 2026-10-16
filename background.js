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

// Rules only catch new navigations, so also send already-open tabs on a
// blocked site to the blocked page.
async function blockOpenTabs(sites) {
  if (!sites.length) return;
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  for (const tab of tabs) {
    let host;
    try {
      host = new URL(tab.url).hostname;
    } catch {
      continue;
    }
    if (isHostBlocked(host, sites)) {
      chrome.tabs.update(tab.id, { url: BLOCKED_PAGE + '#' + tab.url });
    }
  }
}

async function sync() {
  const sites = await getSites();
  await applyRules(sites);
  await blockOpenTabs(sites);
}

chrome.runtime.onInstalled.addListener(sync);
chrome.runtime.onStartup.addListener(sync);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.sites) sync();
});

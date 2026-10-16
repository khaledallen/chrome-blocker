const form = document.getElementById('add-form');
const input = document.getElementById('site-input');
const error = document.getElementById('error');
const list = document.getElementById('list');
const empty = document.getElementById('empty');
const blockCurrent = document.getElementById('block-current');

let currentSite = null;

async function addSite(site) {
  const sites = await getSites();
  if (sites.includes(site)) {
    error.textContent = `${site} is already blocked.`;
    return;
  }
  await setSites([...sites, site]);
}

async function removeSite(site) {
  const sites = await getSites();
  await setSites(sites.filter((s) => s !== site));
}

async function render() {
  const sites = await getSites();

  list.replaceChildren(
    ...sites.map((site) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = site;
      name.title = site;
      const remove = document.createElement('button');
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => removeSite(site));
      li.append(name, remove);
      return li;
    })
  );
  empty.hidden = sites.length > 0;

  const showCurrent = currentSite && !isHostBlocked(currentSite, sites);
  blockCurrent.hidden = !showCurrent;
  if (showCurrent) blockCurrent.textContent = `Block ${currentSite}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  error.textContent = '';
  const site = normalizeSite(input.value);
  if (!site) {
    error.textContent = 'Enter a domain like reddit.com';
    return;
  }
  input.value = '';
  await addSite(site);
});

blockCurrent.addEventListener('click', () => addSite(currentSite));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.sites) render();
});

(async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && /^https?:/.test(tab.url)) currentSite = normalizeSite(tab.url);
  render();
})();

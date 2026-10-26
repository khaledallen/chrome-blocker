# Site Blocker

A tiny Chrome extension that blocks a list of websites you choose.

## Install

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Optional: click the puzzle-piece icon in the toolbar and pin **Site Blocker**.

## Use

Click the toolbar icon to open the popup:

- **Block &lt;current site&gt;** adds the site you're on.
- Type a domain (or paste any URL) and press **Add**.
- **Remove** unblocks a site.

Blocking `reddit.com` also blocks every subdomain (`www.reddit.com`,
`old.reddit.com`, ...). Tabs already open on a site are sent to the blocked
page as soon as you add it. If you unblock a site while a tab is still on the
blocked page, that page shows a **Continue to site** button.

The list is saved in Chrome and survives restarts. After editing the code,
click the reload icon on the extension's card in `chrome://extensions`.

## How it works

- `background.js` turns the saved list into one
  [`declarativeNetRequest`](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
  rule that redirects matching pages and iframes to `blocked.html`.
- That rule only sees network requests, so `background.js` also watches tabs
  and swaps out any page on a blocked site that loaded without one (served by
  the site's service worker, or restored by the back button). It also deletes
  blocked sites' service workers so later visits hit the rule.
- `popup.html` / `popup.js` edit the list in `chrome.storage.local`. The
  background worker watches storage and updates the rule.
- `shared.js` holds the domain cleanup and matching helpers.

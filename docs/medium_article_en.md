# How I Bulk-Download Course Files with 10 Lines of Frontend JS

> TL;DR: Your LMS already has the files. The UI just won't give them to you in bulk. Two tiny DevTools snippets — one using `fetch + <a download>`, one using `PDF.js + iframe` — turn the browser console into a download manager. Here's how they work from a frontend perspective.

## The UX Problem

Many university LMS frontends (in this case, a TronClass-based `iClass` portal) are Single Page Apps.

When you open a course activity, the URL looks like this:

```
https://iclass.example.edu/#/activity/123456
```

You can preview attachments or PDFs in-browser, but there is often:

1. No "Download All" button
2. A custom PDF viewer that hides the browser's native download bar
3. Original filenames replaced by preview titles

As a frontend developer, you immediately think: if the browser can render it, the browser already fetched it. I just need to trigger the download myself.

That's exactly what these two snippets do. No extensions, no Python scraper. Just the DevTools Console.

## How a User Actually Uses This (30 seconds)

You don't need to deploy anything.

1. Log in to the course and open the activity page containing the files.
2. Press `F12` or `Cmd+Option+I` to open DevTools > **Console**.
3. Paste Snippet A for attachments, or Snippet B for PDFs, press Enter.

The browser will start downloading using your existing authenticated session (cookies). That's it.

Let's break down why it works.

## Snippet A: Bulk-Download All Attachments via the Activity API

```javascript
(async () => {
  // 1. Get activityId from URL
  const activityId = location.hash.split('/').pop().replace(/\D/g, '');
  
  if (!activityId) {
    console.error('無法取得活動 ID');
    return;
  }

  // 2. Fetch raw attachment metadata from TronClass API
  const res = await fetch(`/api/activities/${activityId}`);
  const data = await res.json();
  const uploads = data.uploads || [];

  if (!uploads.length) {
    console.error('未找到附件資料');
    return;
  }

  // 3. Download every attachment with original name
  uploads.forEach(file => {
    const downloadUrl = `/api/uploads/${file.id}/blob`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    console.log(`✅ 開始下載原始檔案：${file.name}`);
  });
})();
```

### What the frontend is doing:

**1. `location.hash` routing:**
This LMS uses hash-based routing (`#/activity/:id`). `location.hash.split('/').pop()` grabs the last segment, and `.replace(/\D/g,'')` strips non-digits. It's fragile but effective — it reverse-engineers the SPA router without needing React Router devtools.

**2. `fetch('/api/activities/${activityId}')`:**
Because you're already logged in, `fetch` automatically sends your session cookies (same-origin). The API returns JSON like:

```json
{
  "uploads": [
    { "id": 987, "name": "Week1_Slides.pptx" },
    { "id": 988, "name": "Assignment.txt" }
  ]
}
```

You bypass the rendered UI and talk directly to the data layer the UI itself uses. Open DevTools > Network > Fetch/XHR and you'll see the frontend does the exact same call.

**3. Programmatic `<a download>`:**
This is the classic frontend download trick:

```javascript
const a = document.createElement('a');
a.href = `/api/uploads/${file.id}/blob`;
a.download = file.name;
a.click();
```

Setting `a.download` tells the browser: don't navigate, download as file with this filename. You must `appendChild` before `click()` for Firefox compatibility, then clean up with `removeChild`. Looping with `forEach` triggers multiple parallel downloads — Chrome will ask for "Allow multiple downloads" permission once.

No `Blob`, no `URL.createObjectURL()` needed here because the backend already serves a `Content-Disposition: attachment` blob endpoint.

## Snippet B: Force-Save a PDF from Inside an iframe

Previews often embed PDF.js in an `<iframe>`. The toolbar may be hidden or the download button disabled. Use this:

```javascript
const iframe = document.querySelector('iframe');
const viewerApp = iframe?.contentWindow?.PDFViewerApplication;

if (viewerApp) {
  viewerApp.downloadOrSave();
} else {
  // Fallback: click the viewer UI button directly
  iframe.contentDocument.querySelector('#download').click();
}
```

### What the frontend is doing:

**1. Crossing into the iframe:**
`document.querySelector('iframe')` grabs the preview frame. Because the viewer is served from the same origin (not a cross-domain Google Docs viewer), the parent page is allowed to access `iframe.contentWindow` and `iframe.contentDocument`. If it were cross-origin, this would throw a CORS security error — that's your first debugging clue.

**2. Calling PDF.js directly:**
Most LMS PDF previews are Mozilla's PDF.js. It exposes a global `PDFViewerApplication` object inside the iframe with a method `downloadOrSave()`. You're not hacking anything — you're calling the viewer's own official save function that the hidden button would have called.

**3. Fallback to DOM click:**
If the global isn't exposed (different PDF.js version), you fall back to what a user would do: `contentDocument.querySelector('#download').click()`. You're programmatically clicking the viewer's internal download button from the outside.

## Why This Works: A Frontend Mental Model

| Concept | Snippet A | Snippet B |
|---|---|---|
| Data source | REST JSON API | Already-loaded PDF.js viewer |
| Auth | Same-origin cookies via `fetch` | Same-origin iframe access |
| Download trigger | Dynamic `<a download>` | `viewer.downloadOrSave()` |
| SPA quirk exploited | `location.hash` holds ID | UI hides native controls |

If you understand three browser fundamentals — SPA routing, Fetch + cookies, and same-origin iframe access — you can re-derive both snippets without memorizing them.

## Limitations and Gotchas

1. **Login expiry:** If `fetch` returns 401, just refresh the page and re-login. Your console script runs as you.
2. **Multiple download prompt:** Chrome blocks the 2nd+ file. Click "Allow" in the address bar.
3. **Popup vs. navigation:** Always set `a.download`. Without it, the SPA router may try to handle `/api/uploads/...` as a frontend route.
4. **PDF.js version drift:** Newer viewers rename `PDFViewerApplication` to `PDFViewerApplicationOptions`. Use the `#download` fallback.
5. **Large files:** This streams via browser download manager, so it doesn't blow up tab memory. Don't try to `await res.blob()` for 500MB videos.

## A Note on Ethics and Security

Only use this for courses you are enrolled in, for personal study and backup. Your downloads are logged to your own account just like normal clicks.

And never paste credentials into the Console or save them in a `.txt` next to your script. Console history persists, and any XSS on the page could read what you typed. If you previously saved a password in plain text, delete it now and change it, and switch to a password manager.

DevTools is a power-user UI. The frontend already gave you permission — it just forgot to give you a button.

---
*Tested on TronClass / iClass SPA with Chrome + Edge DevTools. No extensions required.*

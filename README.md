# TKU iClass Courseware Downloader v3.0.3 (fork by zero2005x)

Download TKU iClass Courseware && Course Video — 一鍵下載淡江大學 iClass 中的教材與影片

Forked from [Hs0/TKU-iClass-Courseware-Downloader](https://github.com/Hs0/TKU-iClass-Courseware-Downloader), originally [iamNCJ/ZJU-Tronclass-Courseware-Downloader](https://github.com/iamNCJ/ZJU-Tronclass-Courseware-Downloader).
License: MIT — see [LICENSE](LICENSE).

## What's new (v3.0.3, current)

- Zero dependencies (dropped `@require` jQuery — it could block the whole script when the CDN failed).
- Bulk download: 350ms throttle between files + filename sanitization + `uploads -> attachments -> resources -> materials -> files` fallback chain.
- Video links: per-video guard (one video no longer blocks others) + safe container via `closest()` fallback.
- Scheduler: `MutationObserver` (debounced) + `hashchange` instead of a permanent 1.5s timer.
- Single `@match *://iclass.tku.edu.tw/*` (Tampermonkey ignores URL hash, so `#/activity/...` needs the wildcard).

## History

- v3.0.2: vanilla legacy UI, robust `getActivityId()`, removed `@require`.
- v3.0.1: `@match` cleanup, relaxed video selectors.
- v3.0.0: kept v2.3.4-TKU (`courseware` + video), added verified Console snippets as buttons:

1. **Bulk activity attachments (Snippet A)**
   - `location.hash` → `activityId` → `fetch /api/activities/{id}` → `uploads[]` → `<a href=/api/uploads/{id}/blob download=file.name>` loop
   - New floating button: `一鍵下載全部附件 (v3)` on `#/activity/...` pages
   - Or Console: `window.TKU_DownloaderV3.downloadAllActivityUploads()`

2. **PDF.js iframe force-save (Snippet B)**
   - `iframe.contentWindow.PDFViewerApplication.downloadOrSave()` → fallback `iframe.contentDocument.querySelector('#download').click()` → fallback legacy `pdf-viewer?file=` open
   - Old `強制下載` button now tries iframe API first
   - Or Console: `window.TKU_DownloaderV3.forceSavePdfIframe()`

3. **Tech changes (v3.0.x)**
   - Single site-wide `@match` (hash-aware routing handled at runtime via `getActivityId()`)
   - `MutationObserver` scheduler; no credentials stored, uses logged-in same-origin cookies

## 適用範圍

- `https://iclass.tku.edu.tw/course/課程代號/courseware` (舊版 courseware, v2 邏輯)
- `https://iclass.tku.edu.tw/#/activity/...` / 含 `activity` 的 SPA 頁 (v3 新增)
- 改其他學校：改 `// @match` 成目標 TronClass 站點即可

## 安裝方式

1. 安裝 Tampermonkey / Violentmonkey
2. 新增腳本，貼上 `Downloader.js` 內容，儲存
3. 重新整理 iClass 頁面：
   - activity 頁右下角會出現 `一鍵下載全部附件 (v3)`
   - PDF 預覽頁 header 仍有 `強制下載` (現走 iframe API)
   - Chrome 若擋多檔：按網址列 `允許多個檔案下載`

## 免責聲明

僅作為在預覽頁面中方便下載及避免檔案過期導致無法存取檔案用途，請勿違反著作權！僅下載你有修課/有權存取的檔案供個人學習備份。

## 手動 Console 版 (不裝油猴也行)

見本 fork 上游驗證過的兩段：
- `.txt`/附件包：`fetch /api/activities` + `<a download>` 迴圈
- `.pdf`：`PDFViewerApplication.downloadOrSave()` / `#download` click

[油猴原連結](https://greasyfork.org/zh-TW/scripts/420029-tku-iclass-downloader)

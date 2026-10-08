// ==UserScript==
// @name         TKU iClass Downloader v3
// @namespace    zero2005x.TKU.iClass
// @version      3.0.3
// @license      MIT
// @description  Download TronClass Courseware + Activity attachments (bulk) + PDF.js iframe force-save + Video
// @author       zero2005x (Forked from Hs0, originally NCJ)
// @match        *://iclass.tku.edu.tw/*
// @grant        none
// ==/UserScript==
// NOTE: single @match on purpose — Tampermonkey @match ignores the URL hash, so
// #/activity/... SPA routes can only be covered by the site-wide wildcard.
// The old courseware path (/course/*/courseware) is a subset of this.

/* v3.0.3 fixes (external review):
 * - Polling -> MutationObserver (debounced) + hashchange + first run. No more permanent 1.5s timer.
 * - Video block: per-element dataset guard (was global, one video blocked the rest; dead id check removed,
 *   legacy id migrated to class). Ancestor hops guarded via closest() fallback.
 * - Bulk loop: 350ms throttle between files + filename sanitization for the download attribute.
 * - uploads fallback chain: uploads -> attachments -> resources -> materials -> files.
 * v3.0.2 notes (fixes window.TKU_DownloaderV3 undefined):
 * - Root cause: @require jQuery blocked whole userscript when CDN failed -> core never ran.
 *   Fix: drop @require entirely. Core (bulk + pdf) is now 100% vanilla. Legacy UI uses vanilla
 *   querySelector with optional jQuery if present, never required.
 * - If you see "Cannot read properties of undefined (reading 'downloadAllActivityUploads')",
 *   it means the userscript isn't installed/active on this page. Use the standalone Console
 *   snippet below (no install needed).
 * v3.0.1 notes:
 * - @match: removed redundant *activity* line. NOTE: Tampermonkey @match ignores URL hash,
 *   so #/activity/... SPA routes can only be covered by *://iclass.tku.edu.tw/*.
 * - Keeps v2.3.4-TKU logic: old courseware pdf-viewer window.open + video <a> links.
 * - Adds Snippet A (verified): bulk-download activity uploads via /api/activities/{id} + <a download>.
 *   Source: location.hash -> activityId -> fetch uploads -> forEach create <a href=/api/uploads/{id}/blob>.
 * - Adds Snippet B (verified): force-save PDF.js iframe via contentWindow.PDFViewerApplication.downloadOrSave()
 *   fallback to iframe.contentDocument.querySelector('#download').click().
 * - No credentials are stored. Runs with your logged-in session (same-origin cookies).
 */

(function () {
    'use strict';

    // ---------- Robust activityId parsing (fixes trailing segment / query bug) ----------
    function getActivityId() {
        const href = location.href || '';
        const hash = location.hash || '';
        // Preferred: /activity/<digits> anywhere in full URL (covers #/activity/123, #/activity/123?x=1)
        let m = href.match(/activity\/(\d+)/i) || hash.match(/activity\/(\d+)/i);
        if (m) return m[1];
        // Fallback: last numeric run in hash (old behavior), but strip query/hash params first
        const clean = hash.split('?')[0].split('&')[0];
        const segs = clean.split('/').filter(Boolean);
        for (let i = segs.length - 1; i >= 0; i--) {
            const digits = (segs[i] || '').replace(/\D/g, '');
            if (digits) return digits;
        }
        return '';
    }

    // ---------- Filename sanitization (blocks path traversal / illegal chars) ----------
    function sanitizeFilename(name) {
        if (!name) return 'download';
        return String(name).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim().slice(0, 200) || 'download';
    }

    function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

    // ---------- Snippet A: bulk activity attachments ----------
    async function downloadAllActivityUploads() {
        const activityId = getActivityId();
        if (!activityId) {
            alert('[v3] 無法取得活動 ID，請先打開課程活動頁 (#/activity/...)');
            console.error('[v3] 無法取得活動 ID, hash=', location.hash);
            return;
        }
        try {
            const res = await fetch(`/api/activities/${activityId}`);
            if (!res.ok) {
                alert(`[v3] API 回傳 ${res.status}，請重新整理/重新登入後再試`);
                return;
            }
            const data = await res.json();
            const uploads = data.uploads || data.attachments || data.resources || data.materials || data.files || [];
            if (!uploads.length) {
                alert('[v3] 未找到附件資料 (uploads 為空)');
                console.error('[v3] 未找到附件資料, keys=', Object.keys(data || {}), data);
                return;
            }
            for (const file of uploads) {
                const safeName = sanitizeFilename(file.name);
                const downloadUrl = `/api/uploads/${file.id}/blob`;
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = safeName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                console.log(`[v3] ✅ 開始下載原始檔案：${safeName}`);
                await sleep(350);
            }
            alert(`[v3] 已觸發 ${uploads.length} 個檔案下載，若被擋請按網址列「允許多個檔案下載」`);
        } catch (e) {
            console.error('[v3] bulk download failed', e);
            alert('[v3] 下載失敗，請開 F12 Console 看錯誤');
        }
    }

    // ---------- Snippet B: PDF.js iframe force-save ----------
    function forceSavePdfIframe() {
        // 1) Try new verified path: PDF.js viewer API inside iframe
        try {
            const iframe = document.querySelector('iframe');
            const viewerApp = iframe?.contentWindow?.PDFViewerApplication;
            if (viewerApp && typeof viewerApp.downloadOrSave === 'function') {
                viewerApp.downloadOrSave();
                console.log('[v3] ✅ via PDFViewerApplication.downloadOrSave()');
                return true;
            }
            const innerBtn = iframe?.contentDocument?.querySelector('#download');
            if (innerBtn) {
                innerBtn.click();
                console.log('[v3] ✅ via iframe #download click');
                return true;
            }
        } catch (e) {
            console.warn('[v3] iframe access blocked or failed, fallback to legacy', e);
        }
        // 2) Legacy v2 path: pdf-viewer ?file= direct open (same-origin old courseware page)
        try {
            const pv = document.getElementById('pdf-viewer');
            if (pv && pv.src && pv.src.includes('?file=')) {
                window.open(decodeURIComponent(pv.src.split('?file=')[1]));
                console.log('[v3] ✅ via legacy pdf-viewer ?file= open');
                return true;
            }
        } catch (e) {
            console.error('[v3] legacy pdf open failed', e);
        }
        alert('[v3] 找不到可下載的 PDF (iframe 被跨域擋下或選擇器改變)');
        return false;
    }

    function injectActivityButton() {
        // Avoid duplicates. Inject into a stable header if present, else fixed floating button.
        if (document.getElementById('Tronclass_Downloader_v3_all')) return;
        const btn = document.createElement('input');
        btn.type = 'button';
        btn.value = '一鍵下載全部附件 (v3)';
        btn.id = 'Tronclass_Downloader_v3_all';
        btn.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;padding:8px 12px;cursor:pointer;';
        btn.onclick = downloadAllActivityUploads;
        // Only show on activity-like pages (hash contains activity) to reduce noise,
        // but keep available globally since SPA hash changes without reload.
        const show = /activity/i.test(location.hash) || /activity/i.test(location.href);
        btn.style.display = show ? 'block' : 'none';
        document.documentElement.appendChild(btn);
        // Toggle visibility on hash change
        window.addEventListener('hashchange', () => {
            const s = /activity/i.test(location.hash) || /activity/i.test(location.href);
            btn.style.display = s ? 'block' : 'none';
        });
    }

    // ---------- Safe anchor container (fixes unguarded parentNode.parentNode) ----------
    function anchorContainerFor(videoEl) {
        try {
            const c = videoEl.closest && videoEl.closest('div');
            if (c) return c;
            if (videoEl.parentNode && videoEl.parentNode.parentNode) return videoEl.parentNode.parentNode;
            if (videoEl.parentNode) return videoEl.parentNode;
        } catch (e) { /* fall through */ }
        return document.body;
    }

    function injectVideoLink(videoEl, src, label) {
        const container = anchorContainerFor(videoEl);
        const a = document.createElement('a');
        a.href = src;
        a.className = 'Tronclass_Downloader_video';
        a.textContent = `\t${label}\t`;
        try {
            container.prepend(a);
        } catch (e) {
            console.warn('[v3] prepend failed, appending to body', e);
            document.body.appendChild(a);
        }
    }
    // ---------- Legacy v2.3.4 logic (kept, selectors relaxed, vanilla, jQuery optional) ----------
    function legacyCoursewareEnhance() {
        // Skip heavy DOM work when tab hidden (reduces 1.5s polling cost)
        if (document.hidden) return;
        const hasJq = typeof window.$ === 'function' && window.$.fn;
        // Original: pdf 強制下載 button on old courseware preview header (vanilla, no jQuery needed)
        if (!document.getElementById('Tronclass_Downloader')) {
            const header = document.querySelector('#file-previewer-with-note > div > div > div.header.clearfix');
            if (header) {
                const btn = document.createElement('input');
                btn.type = 'button';
                btn.value = '強制下載';
                btn.id = 'Tronclass_Downloader';
                btn.style.position = 'relative';
                btn.style.left = '10px';
                btn.addEventListener('click', () => {
                    // v3: prefer iframe API first, then legacy open
                    if (!forceSavePdfIframe()) {
                        try {
                            window.open(decodeURIComponent(document.getElementById('pdf-viewer').src.split('?file=')[1]));
                        } catch (e) { console.error('[v3 legacy] open failed', e); }
                    }
                });
                header.appendChild(btn);
            }
        }
        // Relaxed video detection, vanilla, per-element guard.
        // (Old bug: global guard meant one video blocked the rest; dead id check; dataset written never read.)
        // Migrate any legacy id to class once, then work per <video> via dataset.tronclassScanned.
        const legacyIdEl = document.getElementById('Tronclass_Downloader_video');
        if (legacyIdEl && !legacyIdEl.classList.contains('Tronclass_Downloader_video')) {
            legacyIdEl.classList.add('Tronclass_Downloader_video');
        }
        {
            const videos = Array.from(document.querySelectorAll('video'));
            for (const v of videos) {
                if (v.dataset.tronclassScanned) continue;
                const srcs = [];
                const vSrc = v.getAttribute('src');
                if (vSrc && vSrc.indexOf('/api') === 0) {
                    srcs.push({ src: vSrc, label: v.getAttribute('label') || 'video' });
                }
                for (const s of v.children) {
                    const src = s.getAttribute && s.getAttribute('src');
                    if (src && src.indexOf('/api') === 0) {
                        srcs.push({ src, label: s.getAttribute('label') || 'video' });
                    }
                }
                for (const { src, label } of srcs) {
                    injectVideoLink(v, src, label);
                }
                v.dataset.tronclassScanned = '1';
            }
            // Back-compat strict 2020 layout (vanilla): only if nothing injected yet
            if (document.querySelector('.Tronclass_Downloader_video') === null) {
                const v0 = document.querySelector('video');
                if (v0 && !v0.dataset.tronclassScanned && v0.children.length === 3) {
                    const s0 = v0.children[0].getAttribute && v0.children[0].getAttribute('src');
                    if (s0 && s0.indexOf('/api') === 0) {
                    for (const el of v0.children) {
                        injectVideoLink(v0, el.getAttribute('src'), el.getAttribute('label') || 'video');
                    }
                    }
                    v0.dataset.tronclassScanned = '1';
                }
            }
        }
        // Optional jQuery path kept only for back-compat if page already has it; never required.
        if (hasJq) { /* no-op: vanilla above already handled it */ }
    }

    // ---------- Scheduler: MutationObserver (debounced) instead of permanent setInterval ----------
    // Old code polled every 1.5s forever on every iclass page. Now: run once immediately,
    // re-run on DOM mutations (debounced 500ms) + hashchange (SPA nav). Skips when tab hidden.
    let enhanceTimer = null;
    function scheduleEnhance() {
        if (document.hidden) return;
        if (enhanceTimer) return;
        enhanceTimer = setTimeout(() => {
            enhanceTimer = null;
            if (document.hidden) return;
            try {
                injectActivityButton();
                legacyCoursewareEnhance();
            } catch (e) {
                console.error('[v3] enhancer error', e);
            }
        }, 500);
    }
    try {
        injectActivityButton();
        legacyCoursewareEnhance();
    } catch (e) {
        console.error('[v3] initial enhance error', e);
    }
    if (typeof MutationObserver !== 'undefined' && document.body) {
        new MutationObserver(scheduleEnhance).observe(document.body, { childList: true, subtree: true });
    } else {
        // Very old fallback: interval only if MutationObserver unavailable
        setInterval(scheduleEnhance, 2000);
    }
    window.addEventListener('hashchange', scheduleEnhance);

    // Expose for Console manual use (matches explain.md snippets)
    window.TKU_DownloaderV3 = { downloadAllActivityUploads, forceSavePdfIframe, getActivityId };
    console.log('[v3] TKU iClass Downloader loaded. Use window.TKU_DownloaderV3.downloadAllActivityUploads() or click floating button.');
})();

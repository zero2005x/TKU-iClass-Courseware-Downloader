// ==UserScript==
// @name         TKU iClass Downloader v3
// @namespace    zero2005x.TKU.iClass
// @version      3.0.1
// @license      MIT
// @description  Download TronClass Courseware + Activity attachments (bulk) + PDF.js iframe force-save + Video
// @author       zero2005x (Forked from Hs0, originally NCJ)
// @match        *://iclass.tku.edu.tw/course/*/courseware*
// @match        *://iclass.tku.edu.tw/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.5.1.min.js
// ==/UserScript==

/* v3.0.1 merge notes (fixes external review):
 * - jQuery CDN: bootcss -> code.jquery.com (bootcss unreliable; legacy btn/video need window.$).
 * - @match: removed redundant *activity* line. NOTE: Tampermonkey @match ignores URL hash,
 *   so #/activity/... SPA routes can only be covered by *://iclass.tku.edu.tw/*.
 *   Activity detection is done at runtime via location.hash (see getActivityId).
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
            const uploads = data.uploads || [];
            if (!uploads.length) {
                alert('[v3] 未找到附件資料 (uploads 為空)');
                console.error('[v3] 未找到附件資料', data);
                return;
            }
            uploads.forEach((file) => {
                const downloadUrl = `/api/uploads/${file.id}/blob`;
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                console.log(`[v3] ✅ 開始下載原始檔案：${file.name}`);
            });
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

    // ---------- Legacy v2.3.4 logic (kept, selectors relaxed) ----------
    function legacyCoursewareEnhance() {
        // Skip heavy DOM work when tab hidden (reduces 1.5s polling cost)
        if (document.hidden) return;
        // Original: pdf 強制下載 button on old courseware preview header
        if (window.$ && $('#Tronclass_Downloader').length === 0 && $('#file-previewer-with-note > div > div > div.header.clearfix').length) {
            $('#file-previewer-with-note > div > div > div.header.clearfix').append('<input type="button" value="強制下載" id="Tronclass_Downloader">');
            $('#Tronclass_Downloader').css('position', 'relative').css('left', 10);
            $('#Tronclass_Downloader').click(function () {
                // v3: prefer iframe API first, then legacy open
                if (!forceSavePdfIframe()) {
                    try {
                        window.open(decodeURIComponent(document.getElementById('pdf-viewer').src.split('?file=')[1]));
                    } catch (e) { console.error('[v3 legacy] open failed', e); }
                }
            });
        }
        // Relaxed video detection (old code required exactly 3 children; page layout may have changed).
        // Now: any <video> with <source src="/api...">, or video src itself starting with /api.
        if (window.$ && $('#Tronclass_Downloader_video').length === 0 && $('.Tronclass_Downloader_video').length === 0 && $('video').length) {
            const videos = $('video').toArray();
            for (const v of videos) {
                const srcs = [];
                if (v.getAttribute('src') && v.getAttribute('src').indexOf('/api') === 0) {
                    srcs.push({ src: v.getAttribute('src'), label: v.getAttribute('label') || 'video' });
                }
                for (const s of v.children) {
                    const src = s.getAttribute && s.getAttribute('src');
                    if (src && src.indexOf('/api') === 0) {
                        srcs.push({ src, label: s.getAttribute('label') || 'video' });
                    }
                }
                // Keep old behavior as fallback: if no /api src found but children look like sources, skip.
                for (const { src, label } of srcs) {
                    $(v.parentNode.parentNode).prepend(`<a href="${src}" class="Tronclass_Downloader_video">\t${label}\t</a>`);
                }
                // Mark done even if zero found for this video to avoid re-scanning every tick
                if (!v.dataset.tronclassScanned) v.dataset.tronclassScanned = '1';
            }
            // Back-compat: old id-based check (only first match used id, now class to allow multiples)
            if ($('.Tronclass_Downloader_video').length === 0) {
                // Fall through to strict legacy check for 2020 layout
                const v0 = $('video')[0];
                if (v0 && v0.children.length === 3 && v0.children[0].getAttribute('src') && v0.children[0].getAttribute('src').indexOf('/api') === 0) {
                    for (const i of v0.children) {
                        $(v0.parentNode.parentNode).prepend(`<a href="${i.getAttribute('src')}" class="Tronclass_Downloader_video">\t${i.getAttribute('label')}\t</a>`);
                    }
                }
            }
        }
    }

    // Replace deprecated DOMSubtreeModified with interval + MutationObserver-friendly polling.
    // Keeps behavior identical but avoids performance warning.
    setInterval(() => {
        try {
            injectActivityButton();
            legacyCoursewareEnhance();
        } catch (e) {
            console.error('[v3] enhancer error', e);
        }
    }, 1500);

    // Expose for Console manual use (matches explain.md snippets)
    window.TKU_DownloaderV3 = { downloadAllActivityUploads, forceSavePdfIframe, getActivityId };
    console.log('[v3] TKU iClass Downloader loaded. Use window.TKU_DownloaderV3.downloadAllActivityUploads() or click floating button.');
})();

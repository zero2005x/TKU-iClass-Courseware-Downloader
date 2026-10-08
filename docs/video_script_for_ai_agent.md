# VIDEO PRODUCTION BRIEF — For AI Video Agent (Auto-Edit Ready)
# Title: Bulk-Download Course Files with 10 Lines of JS (Frontend Trick)
# Duration: 4:00-4:30 | Format: 16:9 1080p YouTube Tutorial | Language: English VO + English Subtitles

## 1. GLOBAL INSTRUCTIONS FOR AI AGENT (READ FIRST)

**Goal:** Produce a screen-tutorial video that shows an experienced frontend audience how to use 2 DevTools console snippets to download course files, and explains WHY they work (hash routing, fetch API, a.download, iframe + PDF.js).

**Strict Rules:**
- DO NOT show, read aloud, type, or generate any username, student ID, password, or personal portal URL. Blur all avatars, IDs, and school logo if visible. Use `https://iclass.example.edu/#/activity/123456` as demo URL text only.
- All screen recordings must be re-enacted on a generic / staging site. Never use real credentials.
- Voice: Neutral American English, male or female, 150-160 wpm, developer-tutorial tone (like Fireship / Web Dev Simplified). No hype.
- Music: Low-volume lo-fi / tech ambient, -20dB under VO, mute during typing.
- Style: Dark code editor theme, yellow highlight box for mouse clicks, zoom to 150% on Console.
- Export: 1920x1080, 30fps, H.264, burned-in EN subtitles + separate .srt, thumbnail 1280x720.
- Structure: Follow SCENES 1-6 exactly. Use provided VO_SCRIPT verbatim for TTS. Use ON-SCREEN TEXT as lower-thirds / callouts.

**Assets You Must Generate / Capture:**
1. Screen capture: Chrome on course activity page with attachments list (mock data)
2. Screen capture: DevTools Console paste + Enter + multiple downloads
3. Screen capture: PDF preview in iframe + DevTools Elements showing `<iframe>`
4. Diagram (AI-generated): Flow A: URL hash -> fetch API -> JSON uploads -> a.download loop
5. Diagram (AI-generated): Flow B: Parent page -> iframe.contentWindow.PDFViewerApplication -> downloadOrSave()
6. B-roll: close-up keyboard F12, mouse click, download folder filling up

---

## 2. SCENE-BY-SCENE SCRIPT

### SCENE 1 — HOOK [00:00-00:30] (30s)
**Objective:** State pain + promise.

- **VO_SCRIPT (read exactly):**
> "Your LMS lets you preview every file, but there's no Download All button. No direct link. Just endless clicking. What if I told you the browser already has the files, and ten lines of JavaScript in the DevTools console can bulk-download them with original filenames? No extensions. No Python. Let me show you how, and why it works from a frontend perspective."

- **ON-SCREEN TEXT:**
  - Big title: `No Download Button? Use the Console.`
  - Sub: `2 snippets | fetch + a.download | iframe + PDF.js`

- **B-ROLL / SCREEN DIRECTION:**
  - 0:00-0:05: Frustrated montage: clicking preview, no download button, fast zoom.
  - 0:05-0:30: Host screen with activity page, cursor circles attachment list.

- **EDIT-CUE:**
  - Punch-in zoom on "No Download All", SFX: mouse clicks. Add captions word-by-word. Background music fade-in.

---

### SCENE 2 — DEMO A: BULK ATTACHMENTS [00:30-01:45] (75s)
**Objective:** Show exact user steps for Snippet A.

- **VO_SCRIPT:**
> "Step one. Open your course activity page. The URL looks like this — hash, slash, activity, ID. That's important. Step two. Hit F12 to open DevTools, go to Console. Step three. Paste this async snippet and hit Enter. Watch — it grabs the activity ID from location dot hash, fetches slash api slash activities, gets the uploads JSON, then creates a hidden anchor tag for each file and clicks it. Chrome will ask to allow multiple downloads — click Allow. Done. Original filenames, full content."

- **ON-SCREEN TEXT:**
  - Step 1: `Open Activity Page`
  - Step 2: `F12 > Console`
  - Step 3: `Paste Snippet A > Enter`
  - Code overlay (show for 10s, syntax highlighted):
```js
const activityId = location.hash.split('/').pop().replace(/\D/g,'');
const res = await fetch(`/api/activities/${activityId}`);
const uploads = (await res.json()).uploads || [];
uploads.forEach(f => {
  const a = document.createElement('a');
  a.href = `/api/uploads/${f.id}/blob`;
  a.download = f.name; a.click();
});
```

- **B-ROLL / SCREEN DIRECTION:**
  - Show URL bar: `.../#/activity/123456`, highlight hash part.
  - Full-screen Console paste. Zoom 150%. Highlight `fetch` line and `a.download` line sequentially.
  - Show download tray filling with `Week1_Slides.pptx`, `Assignment.txt`.

- **EDIT-CUE:**
  - Typing SFX muted, keystroke Enter with deep thud. Yellow box around Allow button. Freeze-frame 1s on download complete + checkmark pop.

---

### SCENE 3 — EXPLAIN A: WHY IT WORKS [01:45-02:20] (35s)
**Objective:** Frontend deep-dive, diagram.

- **VO_SCRIPT:**
> "Why does this work? Three frontend fundamentals. One, this portal is a Single Page App using hash routing, so the ID lives in location dot hash. Two, fetch sends your login cookies automatically because it's same-origin, so you talk directly to the same API the UI uses. Three, an anchor with download attribute tells the browser to save, not navigate. We just bypassed the UI and called the data layer."

- **ON-SCREEN TEXT:**
  - `1. Hash Routing → ID`
  - `2. fetch + cookies → JSON`
  - `3. <a download> → Save`

- **B-ROLL / SCREEN DIRECTION:**
  - AI diagram: left-to-right flow animation. Show DevTools Network tab with `/api/activities/123456` JSON preview matching UI.

- **EDIT-CUE:**
  - Animated arrows, each number pops with VO. Lower-third: `Same-origin = cookies auto-sent`.

---

### SCENE 4 — DEMO B: PDF FROM IFRAME [02:20-03:10] (50s)
**Objective:** Show Snippet B for PDF viewer.

- **VO_SCRIPT:**
> "Now PDFs. The preview is not a real PDF — it's PDF.js inside an iframe, and the toolbar is hidden. Right-click won't save it. So in Console, we grab the iframe, peek inside its contentWindow dot PDFViewerApplication, and call downloadOrSave. That's the viewer's own save function. If that global changed version, fallback — click the hashtag download button inside the iframe document. Same result — full PDF saved."

- **ON-SCREEN TEXT:**
  - `PDF preview = <iframe> + PDF.js`
  - Code overlay:
```js
const iframe = document.querySelector('iframe');
const app = iframe?.contentWindow?.PDFViewerApplication;
if (app) app.downloadOrSave();
else iframe.contentDocument.querySelector('#download').click();
```

- **B-ROLL / SCREEN DIRECTION:**
  - Show PDF preview stuck, no download bar. Switch to Elements panel, hover `<iframe>` highlights preview.
  - Console execution, PDF downloads instantly. Show fallback line highlighted.

- **EDIT-CUE:**
  - Split-screen: left iframe DOM, right preview. Red box on `#download`. SFX: page-flip on save.

---

### SCENE 5 — EXPLAIN B + LIMITS [03:10-03:50] (40s)
**Objective:** Explain same-origin + warn.

- **VO_SCRIPT:**
> "This only works because the iframe is same-origin. If it were cross-domain, the browser would block contentWindow access for security — that's CORS doing its job. Quick gotchas: if fetch returns 401, just refresh and re-login. If Chrome blocks files two and three, allow multiple downloads. And please — only download courses you're enrolled in, for personal study. Never paste passwords into Console, never save them in a text file next to your script."

- **ON-SCREEN TEXT:**
  - `Same-origin ✅ allows access | Cross-origin ❌ blocked`
  - `401? → Re-login | Blocked? → Allow multiple`
  - Warning banner: `For enrolled courses only. No credentials in Console.`

- **B-ROLL / SCREEN DIRECTION:**
  - Diagram B: Parent page arrow into iframe. Show 401 in Network then refresh fix (2s clip).

- **EDIT-CUE:**
  - Warning banner in amber, serious tone drop, music dips 3dB.

---

### SCENE 6 — OUTRO + CTA [03:50-04:20] (30s)
**Objective:** Recap + drive engagement.

- **VO_SCRIPT:**
> "So DevTools is your download manager. Hash to ID, fetch to JSON, anchor to file. Iframe to viewer app. If this saved you an afternoon of clicking, like and subscribe — I break down more frontend power tricks like this. Code links in the description. See you in the next one."

- **ON-SCREEN TEXT:**
  - `Recap: hash → fetch → <a download> | iframe → downloadOrSave()`
  - `Subscribe for Frontend Power Tricks`

- **B-ROLL / SCREEN DIRECTION:**
  - Montage replay 2x speed of both downloads. End card with 2 video placeholders.

- **EDIT-CUE:**
  - Upbeat outro sting, end-screen buttons fade in. Export thumbnail text: `10 Lines = Download All`.

---

## 3. FULL VO SCRIPT CONCATENATED (for TTS)

```
Your LMS lets you preview every file, but there's no Download All button. No direct link. Just endless clicking. What if I told you the browser already has the files, and ten lines of JavaScript in the DevTools console can bulk-download them with original filenames? No extensions. No Python. Let me show you how, and why it works from a frontend perspective.

Step one. Open your course activity page. The URL looks like this — hash, slash, activity, ID. That's important. Step two. Hit F12 to open DevTools, go to Console. Step three. Paste this async snippet and hit Enter. Watch — it grabs the activity ID from location dot hash, fetches slash api slash activities, gets the uploads JSON, then creates a hidden anchor tag for each file and clicks it. Chrome will ask to allow multiple downloads — click Allow. Done. Original filenames, full content.

Why does this work? Three frontend fundamentals. One, this portal is a Single Page App using hash routing, so the ID lives in location dot hash. Two, fetch sends your login cookies automatically because it's same-origin, so you talk directly to the same API the UI uses. Three, an anchor with download attribute tells the browser to save, not navigate. We just bypassed the UI and called the data layer.

Now PDFs. The preview is not a real PDF — it's PDF.js inside an iframe, and the toolbar is hidden. Right-click won't save it. So in Console, we grab the iframe, peek inside its contentWindow dot PDFViewerApplication, and call downloadOrSave. That's the viewer's own save function. If that global changed version, fallback — click the hashtag download button inside the iframe document. Same result — full PDF saved.

This only works because the iframe is same-origin. If it were cross-domain, the browser would block contentWindow access for security — that's CORS doing its job. Quick gotchas: if fetch returns 401, just refresh and re-login. If Chrome blocks files two and three, allow multiple downloads. And please — only download courses you're enrolled in, for personal study. Never paste passwords into Console, never save them in a text file next to your script.

So DevTools is your download manager. Hash to ID, fetch to JSON, anchor to file. Iframe to viewer app. If this saved you an afternoon of clicking, like and subscribe — I break down more frontend power tricks like this. Code links in the description. See you in the next one.
```

**Word count:** ~380 words = ~2.5 min at 150wpm + 1.5 min demo pauses = 4:00-4:20 total. Perfect.

## 4. YOUTUBE METADATA (auto-fill)

- **Title (pick 1):** Bulk-Download Course Files with 10 Lines of JS / No Download Button? Hack It with DevTools Console
- **Description:** Learn how 2 frontend snippets bulk-download LMS attachments (fetch + a.download) and force-save PDF.js iframes. For educational backup only. Code + timestamps inside. Chapters: 00:00 Hook 00:30 Demo A 01:45 How A works 02:20 Demo B 03:10 Limits 03:50 Outro
- **Tags:** frontend javascript devtools fetch pdf.js iframe download tronclass tutorial
- **Thumbnail prompt for image AI:** Dark Chrome DevTools console with yellow JS code, big white text "10 LINES = DOWNLOAD ALL", red download arrow, blurred course page behind, high contrast.

## 5. QA CHECKLIST FOR AI AGENT BEFORE EXPORT

- [ ] No real domain, ID, password, or student face visible (all blurred / mocked)?
- [ ] VO matches script verbatim, subtitles synced, code overlays readable for 5+ seconds?
- [ ] Zoom on Console at 150%, clicks highlighted?
- [ ] Music ducks under VO, no copyrighted track?
- [ ] End card + description disclaimer included: "For personal study / enrolled courses only"?

---
*Source snippets: Snippet A = activity API bulk download, Snippet B = iframe PDFViewerApplication.downloadOrSave() fallback to #download click. Redacted version — no credentials included.*

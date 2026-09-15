# GEENIX — Performance & Security Baseline Audit

> **Date:** September 15, 2026  
> **Environment Tested:** Production (`https://geenix.live/`) & Local Codebase (`d:\Projects\GEENIX`)  
> **Auditor:** Senior Performance & Security Engineering Team  

---

## 1. System & Architecture Overview

| Component | Discovered Technology / State |
|---|---|
| **Architecture** | Multi-Page Static Site (14 HTML pages + 1 404 page) |
| **Framework** | None (Pure Semantic HTML5, Vanilla JavaScript ES6+, Vanilla CSS3) |
| **Build System / Bundler** | None (Direct static file serving) |
| **Package Manager** | None (`package.json` absent; zero npm runtime dependencies) |
| **Hosting & Edge Infrastructure** | Cloudflare Pages (indicated by `cf-ray`, `cf-cache-status`, `_headers`) |
| **Rendering Strategy** | Static Site Generation / Static HTML (100% pre-rendered, crawlable) |
| **Backend APIs** | External 3rd-party services: Web3Forms (email form), Google Gemini API (chatbot) |
| **Fonts System** | Google Fonts CDN (`Inter` + `Outfit`, 11 weights requested) |
| **Icons System** | Font Awesome 6.4.0 via cdnjs CDN |

---

## 2. Quantitative Baseline Measurements

### A. Network & Transfer Payload (Live Homepage: `https://geenix.live/`)

*Measured with HTTP/2 and Brotli compression negotiation via edge node.*

| Resource | Type | Transfer Size | Raw Size | TTFB | Compression |
|---|---|---|---|---|---|
| **`/` (index.html)** | Document | 9.75 KB | 51.17 KB | 480 ms | Brotli (`br`) |
| **`style.css`** | CSS | 12.09 KB | 57.51 KB | 132 ms | Brotli (`br`) |
| **`script.js`** | JavaScript | 6.14 KB | 23.72 KB | 127 ms | Brotli (`br`) |
| **`chatbot.css`** | CSS | 3.70 KB | 16.16 KB | 127 ms | Brotli (`br`) |
| **`chatbot.js`** | JavaScript | 5.98 KB | 21.55 KB | 126 ms | Brotli (`br`) |
| **`images/favicon.png`** | Image (PNG) | 178.40 KB | 178.40 KB | 122 ms | None (`identity`) |
| **`images/geenix-logo.jpg`** | Image (JPEG) | 166.47 KB | 166.47 KB | 129 ms | None (`identity`) |
| **Font Awesome CSS** | External CSS | 18.31 KB | ~65 KB | 175 ms | Brotli (`br`) |
| **Google Fonts CSS** | External CSS | 2.38 KB | ~4.5 KB | 448 ms | None / gzip |
| **Google Fonts WOFF2** | Web Fonts | ~80–120 KB | ~80–120 KB | ~200–400 ms | WOFF2 |
| **Font Awesome WOFF2** | Web Fonts | ~150 KB | ~150 KB | ~250 ms | WOFF2 |
| **TOTALS (Initial Page Load)** | **Mixed** | **~570–650 KB** | **~850 KB+** | — | — |

*Note: In headless CLI environments without an active display server, browser-synthesized metrics (FCP, LCP, CLS, INP, Speed Index) cannot be directly recorded without synthetic emulation. They are derived from the critical rendering path waterfall below.*

---

## 3. Critical Path & Core Web Vitals Bottlenecks

### 1. Massive Image Over-Payload (88% of First-Party Page Weight)
- **`favicon.png`**: **178.40 KB** (512×512 raw uncompressed PNG). Browser tab favicons only need to be 32×32 or 48×48 PNG / SVG (< 2 KB).
- **`geenix-logo.jpg`**: **166.47 KB** (1024×1024 JPEG). Rendered at only 40×40 px in the header and 34×34 px in the footer. Serving a 1024px image for a 40px icon introduces significant network bloat and memory decoding overhead on mobile.
- **Combined image waste**: ~345 KB transferred over wire for two small UI elements.

### 2. Preloader Curtain Delays LCP (Largest Contentful Paint)
- The preloader in `script.js` attaches `body.preloader-active` and sets full-screen curtains (`#geenix-preloader`).
- Progress simulation uses artificial `setTimeout` intervals (up to 2,500ms safety limit) to tick the counter from 0% to 100%.
- Even when the DOM and styles are fully parsed, the LCP element (`#hero-heading`) remains occluded behind the preloader curtain until the animation completes.

### 3. Excessive Font Weights Requested (Google Fonts)
- The HTML requests 11 weights:
  - `Inter:wght@300;400;500;600;700`
  - `Outfit:wght@300;400;500;600;700;800`
- CSS audit demonstrates that weight `300` is **completely unused** across all stylesheets.
- Requesting unnecessary weights triggers extra round-trip DNS, connection, and font downloads from `fonts.gstatic.com`.

### 4. Third-Party Icon Library Payload (Font Awesome)
- Loading full Font Awesome 6.4.0 from `cdnjs.cloudflare.com` adds ~18.3 KB CSS and downloads large external font files (~150 KB).
- Although loaded with `media="print" onload="this.media='all'"`, it creates an external point of failure and delays icon rendering (causing Flash of Unstyled Content / FOIT on icons).

### 5. Chatbot Upfront Execution
- `chatbot.css` (16.2 KB) and `chatbot.js` (21.6 KB) are loaded eagerly on the homepage before any user interaction with the chat launcher.
- This consumes main-thread execution time and memory during the initial page bootstrap.

---

## 4. Security Audit Baseline

### Critical Vulnerabilities & Risks Discovered

| # | Vulnerability / Security Finding | Severity | Location |
|---|---|---|---|
| 1 | **Exposed AI API Key (Client-Side Obfuscation)** | 🔴 Critical | `chatbot.js` (Base64 split storage calling Gemini API directly) |
| 2 | **Content-Security-Policy Incomplete & Meta-Only** | 🟠 High | Missing from `_headers`; `meta` tag cannot enforce `frame-ancestors` |
| 3 | **Unsafe Inline Directives in CSP** | 🟠 High | `script-src 'unsafe-inline'` and `style-src 'unsafe-inline'` permit XSS |
| 4 | **Web3Forms Key in Client HTML** | 🟡 Medium | `access_key` in form input (standard for service, but requires domain lock) |
| 5 | **Missing Subdirectory Caching Headers** | 🟡 Medium | `_headers` specifies `/*.css` which in Cloudflare only matches root |
| 6 | **External CDN Reliance (cdnjs)** | 🟡 Medium | Potential supply chain vulnerability if CDN is compromised |

---

## 5. Performance Optimization Targets

| Metric | Current Baseline | Optimization Target |
|---|---|---|
| **Total Transfer Weight** | ~600 KB | **< 120 KB** (80% reduction) |
| **Image Assets Payload** | ~345 KB | **< 15 KB** (95% reduction) |
| **First-Party CSS** | 73.6 KB (raw) | **< 45 KB** (deduplicated & minified) |
| **First-Party JS** | 45.3 KB (raw) | **< 18 KB** (core deferred, chat on-demand) |
| **External Font Weights** | 11 weights | **4–5 essential weights** |
| **HTTP Requests (Initial)** | ~14 requests | **< 8 requests** |
| **LCP (Estimated)** | > 2.0s (gated by preloader) | **< 1.2s** (instant render) |
| **TTFB** | ~480 ms | **< 200 ms** (edge cached) |

/* =========================================================
   JAM GUEVARRA - ONLINE MAGAZINE (gallery/gallery.js)
   ---------------------------------------------------------
   1. Theme (shared with the main site)   5. Photo viewer
   2. Scroll progress                     6. Video player (Facebook + YouTube)
   3. Reveal on scroll                    7. Chapter counts + footer year
   4. Contents menu + overlay helpers
   ========================================================= */
(() => {
    "use strict";

    const root = document.documentElement;
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pad2 = (n) => String(n).padStart(2, "0");

    /* ---------- 1. THEME ---------- */
    $("#themeToggle").addEventListener("click", () => {
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) { /* storage blocked - ignore */ }
    });

    /* ---------- 2. SCROLL PROGRESS ---------- */
    const bar = $("#progress");
    const updateProgress = () => {
        const max = root.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();

    /* ---------- 3. REVEAL ON SCROLL ---------- */
    $$(".tile").forEach((t, i) => t.style.setProperty("--d", `${(i % 5) * 0.07}s`));
    const revealEls = $$(".reveal");
    if ("IntersectionObserver" in window && !reduceMotion) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("in");
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -5% 0px" });
        revealEls.forEach((el) => io.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add("in"));
    }

    /* ---------- 4. OVERLAY HELPERS (contents, photo viewer, video player) ---------- */
    const closeHooks = {};
    const returnFocus = new WeakMap();

    function openOverlay(el) {
        returnFocus.set(el, document.activeElement);
        el.classList.add("open");
        el.setAttribute("aria-hidden", "false");
        document.body.classList.add("lock");
        const btn = $("[data-close]", el);
        if (btn) btn.focus({ preventScroll: true });
    }

    function closeOverlay(el) {
        if (!el.classList.contains("open")) return;
        el.classList.remove("open");
        el.setAttribute("aria-hidden", "true");
        if (closeHooks[el.id]) closeHooks[el.id]();
        if (!$(".overlay.open")) document.body.classList.remove("lock");
        const back = returnFocus.get(el);
        if (back && back.focus) back.focus({ preventScroll: true });
    }

    $$(".overlay").forEach((ov) => {
        ov.addEventListener("click", (e) => {
            if (e.target === ov || e.target.closest("[data-close]")) closeOverlay(ov);
        });
    });

    document.addEventListener("keydown", (e) => {
        const open = $$(".overlay.open").pop();
        if (!open) return;
        if (e.key === "Escape") closeOverlay(open);
        if (open.id === "lightbox") {
            if (e.key === "ArrowLeft") stepLightbox(-1);
            if (e.key === "ArrowRight") stepLightbox(1);
        }
    });

    // Contents menu
    const toc = $("#toc");
    const tocBtn = $("#tocBtn");
    tocBtn.addEventListener("click", () => {
        openOverlay(toc);
        tocBtn.setAttribute("aria-expanded", "true");
    });
    closeHooks.toc = () => tocBtn.setAttribute("aria-expanded", "false");
    $$("a", toc).forEach((a) => a.addEventListener("click", () => closeOverlay(toc)));

    /* ---------- 5. PHOTO VIEWER ---------- */
    // If a photo is missing under its name, also try .jpeg / .png / .webp before giving up
    const EXTS = ["jpg", "jpeg", "png", "webp"];
    function withFallback(img, onFail) {
        const src = img.getAttribute("src");
        if (!src) { if (onFail) onFail(); return; }
        const base = src.replace(/\.[a-z0-9]+$/i, "");
        const current = ((src.match(/\.([a-z0-9]+)$/i) || [])[1] || "").toLowerCase();
        const queue = EXTS.filter((e) => e !== current);
        let n = 0;
        const handler = () => {
            if (n < queue.length) {
                img.src = `${base}.${queue[n++]}`;
            } else {
                img.removeEventListener("error", handler);
                if (onFail) onFail();
            }
        };
        img.addEventListener("error", handler);
        if (img.complete && img.naturalWidth === 0) handler();
    }

    const tiles = $$(".tile");
    tiles.forEach((tile) => {
        const img = $("img", tile);
        withFallback(img, () => tile.classList.add("missing"));
    });

    const lightbox = $("#lightbox");
    const lbImg = $("#lbImg");
    const lbCap = $("#lbCap");
    let lbList = [];
    let lbIndex = 0;

    function showLightbox(i) {
        lbIndex = (i + lbList.length) % lbList.length;
        const img = $("img", lbList[lbIndex]);
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt;
        lbCap.textContent = `${pad2(lbIndex + 1)} / ${pad2(lbList.length)}`;
    }
    function stepLightbox(dir) { showLightbox(lbIndex + dir); }

    function openPhoto(tile) {
        if (tile.classList.contains("missing")) return;
        lbList = tiles.filter((t) => !t.classList.contains("missing"));
        showLightbox(lbList.indexOf(tile));
        openOverlay(lightbox);
    }

    tiles.forEach((tile) => {
        tile.addEventListener("click", () => openPhoto(tile));
        tile.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPhoto(tile); }
        });
    });
    $(".lb-nav.prev").addEventListener("click", () => stepLightbox(-1));
    $(".lb-nav.next").addEventListener("click", () => stepLightbox(1));
    closeHooks.lightbox = () => { lbImg.removeAttribute("src"); };

    // swipe on phones
    let touchX = null;
    lightbox.addEventListener("touchstart", (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", (e) => {
        if (touchX === null) return;
        const dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1);
        touchX = null;
    }, { passive: true });

    /* ---------- 6. VIDEO PLAYER (Facebook + YouTube) ---------- */
    const ytId = (v) => {
        const m = (v || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
        return m ? m[1] : null;
    };
    const isFacebook = (v) => /facebook\.com|fb\.watch/i.test(v || "");
    // Facebook embeds are most reliable with a clean link: removes tracking bits like ?mibextid=...&rdid=...
    // and turns .../watch/?v=123&... into .../watch/?v=123
    const cleanFacebookUrl = (u) => {
        try {
            const url = new URL(u);
            if (!/(^|\.)facebook\.com$/i.test(url.hostname)) return u;      // fb.watch etc. are left alone
            const v = url.searchParams.get("v");
            if (v && /^\d+$/.test(v)) return `https://www.facebook.com/watch/?v=${v}`;
            return `https://www.facebook.com${url.pathname}`;                // reels, /videos/123/ ... minus the query
        } catch (e) { return u; }
    };
    const isPlaceholder = (v) => !v || /PASTE|LINK_HERE|VIDEO_ID/i.test(v);

    const vmodal = $("#vmodal");
    const vframe = $("#vframe");
    const vTitle = $("#vTitle");
    const vSub = $("#vSub");
    const vOpen = $("#vOpen");

    const note = (title, text) => {
        vframe.innerHTML = `<div class="vnote"><strong>${title}</strong><span>${text}</span></div>`;
    };

    function openVideo(card) {
        const raw = (card.dataset.video || "").trim();
        const title = ($("h3", card) || {}).textContent || "";
        const studio = ($("p b", card) || {}).textContent || "";

        vTitle.textContent = title;
        vSub.textContent = studio ? `with ${studio}` : "";
        vframe.className = "vframe" + (card.dataset.ratio === "vertical" ? " vertical" : "");
        vframe.innerHTML = "";
        vOpen.hidden = true;

        if (isPlaceholder(raw)) {
            note("Video coming soon", "Paste the Facebook or YouTube link into this card in gallery/index.html.");
        } else {
            const fb = isFacebook(raw);
            const fbUrl = fb ? cleanFacebookUrl(raw) : "";
            const id = fb ? null : ytId(raw);
            if (!fb && !id) {
                note("Link not recognised", "Use a full Facebook or YouTube video link.");
            } else {
                const iframe = document.createElement("iframe");
                iframe.src = fb
                    ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbUrl)}&show_text=false&autoplay=true`
                    : `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
                iframe.title = title || "Video";
                iframe.allow = "autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen";
                iframe.allowFullscreen = true;
                vframe.appendChild(iframe);
                vOpen.href = fb ? fbUrl : `https://www.youtube.com/watch?v=${id}`;
                vOpen.textContent = fb ? "Not playing? Open on Facebook ↗" : "Open on YouTube ↗";
                vOpen.hidden = false;
            }
        }
        openOverlay(vmodal);
    }
    closeHooks.vmodal = () => { vframe.innerHTML = ""; };

    $$(".reel").forEach((card) => {
        const title = ($("h3", card) || {}).textContent || "film";
        card.setAttribute("aria-label", `Play film: ${title}`);

        // thumbnail: YouTube = automatic when the <img> has no src; Facebook = your own cover image
        const img = $("img", card);
        const raw = (card.dataset.video || "").trim();
        if (img && !img.getAttribute("src") && ytId(raw)) {
            img.src = `https://img.youtube.com/vi/${ytId(raw)}/hqdefault.jpg`;
        } else if (img) {
            withFallback(img, () => { img.style.display = "none"; });
        }

        card.addEventListener("click", () => openVideo(card));
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openVideo(card); }
        });
    });

    /* ---------- 7. CHAPTER COUNTS + FOOTER YEAR ---------- */
    $$(".chapter").forEach((ch) => {
        const out = $("[data-count]", ch);
        const n = $$(".reel", ch).length;
        if (out) out.textContent = `${pad2(n)} ${n === 1 ? "film" : "films"}`;
    });
    const year = $("#year");
    if (year) year.textContent = new Date().getFullYear();
})();
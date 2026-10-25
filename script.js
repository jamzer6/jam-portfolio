/* =========================================================
   JAM GUEVARRA PORTFOLIO - script.js
   Sections:
   1.  Theme toggle (light / dark, remembered)
   2.  Mobile menu + navbar scroll state
   3.  Typing effect (edit ROLES below)
   4.  Scroll-reveal animations (Intersection Observer)
   5.  Active nav link highlighting
   6.  Portfolio filter (a card can sit in several tabs)
   6b. YouTube / Facebook video pop-up player
   6c. Cards that open a page (data-href)
   6d. Reels scroller (arrows + mouse drag)
   6e. Certificates: "More Certificates" expand
   6f. Image names: tries .jpg / .png / .jpeg / .webp automatically
   6g. Image viewer (certificates, design cards + CV with download button)
   6h. Tech & software stack: floating logos with gravity (edit STACK)
   7.  Contact form
   8.  Footer year
   ========================================================= */

(() => {
    "use strict";

    /* ---------- 1. THEME TOGGLE ---------- */
    const root = document.documentElement;
    const themeBtn = document.getElementById("themeToggle");

    themeBtn.addEventListener("click", () => {
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch (e) { /* storage blocked - ignore */ }
    });

    /* ---------- 2. MOBILE MENU + NAVBAR ---------- */
    const navbar = document.getElementById("navbar");
    const menuBtn = document.getElementById("menuBtn");
    const navLinks = document.getElementById("navLinks");

    const closeMenu = () => {
        navLinks.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
    };

    menuBtn.addEventListener("click", () => {
        const open = navLinks.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", String(open));
    });

    navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

    window.addEventListener("scroll", () => {
        navbar.classList.toggle("scrolled", window.scrollY > 30);
    }, { passive: true });

    /* ---------- 3. TYPING EFFECT ---------- */
    // >>> EDIT YOUR ROLES HERE <<<
    const ROLES = ["BSCS Student", "Freelancer", "Developer", "Director", "Visionary", "Artist", "UI/UX Designer"];

    const typedEl = document.getElementById("typed");
    const TYPE_SPEED = 80;     // ms per character typed
    const DELETE_SPEED = 45;   // ms per character deleted
    const HOLD = 1400;         // pause once a word is complete

    let roleIndex = 0, charIndex = 0, deleting = false;

    function type() {
        const word = ROLES[roleIndex];
        charIndex += deleting ? -1 : 1;
        typedEl.textContent = word.slice(0, charIndex);

        let delay = deleting ? DELETE_SPEED : TYPE_SPEED;

        if (!deleting && charIndex === word.length) {
            deleting = true;
            delay = HOLD;
        } else if (deleting && charIndex === 0) {
            deleting = false;
            roleIndex = (roleIndex + 1) % ROLES.length;
            delay = 350;
        }
        setTimeout(type, delay);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        typedEl.textContent = ROLES.join(" · ");   // no animation for users who prefer less motion
    } else {
        type();
    }

    /* ---------- 4. SCROLL REVEAL ---------- */
    const revealEls = document.querySelectorAll(".reveal");

    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    obs.unobserve(entry.target);   // animate once
                }
            });
        }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

        revealEls.forEach((el) => revealObserver.observe(el));
    } else {
        revealEls.forEach((el) => el.classList.add("visible"));   // old browsers: just show everything
    }

    /* ---------- 5. ACTIVE NAV LINK ---------- */
    const sections = document.querySelectorAll("main section[id]");
    const links = document.querySelectorAll(".nav-link");

    if ("IntersectionObserver" in window) {
        const spy = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    links.forEach((l) => l.classList.toggle("active", l.getAttribute("href") === "#" + entry.target.id));
                }
            });
        }, { threshold: 0.45 });
        sections.forEach((s) => spy.observe(s));
    }

    /* ---------- 6. PORTFOLIO FILTER ---------- */
    const filterBtns = document.querySelectorAll(".filter-btn");
    const cards = document.querySelectorAll("#portfolioGrid .work-card");   // only the portfolio grid (not the reels)
    const emptyEl = document.getElementById("filterEmpty");

    // A card can belong to several tabs: data-category="films editing"
    const cardMatches = (card, filter) =>
        filter === "all" || (card.dataset.category || "").split(/\s+/).includes(filter);

    filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const filter = btn.dataset.filter;
            let shown = 0;

            filterBtns.forEach((b) => {
                const active = b === btn;
                b.classList.toggle("active", active);
                b.setAttribute("aria-selected", String(active));
            });

            cards.forEach((card) => {
                const match = cardMatches(card, filter);
                if (match) shown++;

                if (match) {
                    card.classList.remove("hide");
                    // next frame -> remove fade-out so the transition plays
                    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove("fade-out")));
                } else {
                    card.classList.add("fade-out");
                    setTimeout(() => {
                        if (card.classList.contains("fade-out")) card.classList.add("hide");
                    }, 350);
                }
            });

            // Friendly message when a tab has no cards yet (for example "Developer")
            if (emptyEl) {
                if (shown === 0) {
                    emptyEl.textContent = `Nothing in “${btn.textContent.trim()}” yet - coming soon.`;
                    emptyEl.hidden = false;
                } else {
                    emptyEl.hidden = true;
                }
            }
        });
    });

    /* ---------- 6b. VIDEO CARDS + POP-UP PLAYER ----------
       Any card with data-video="..." opens that video when clicked.
       data-video accepts a YouTube link, a YouTube video ID, or a Facebook video link. */
    const modal = document.getElementById("videoModal");
    if (!modal) {
        // Safety net: if index.html is an older version without the pop-up, don't crash the rest of the page
        console.warn("videoModal not found - upload the latest index.html (it contains the video pop-up).");
    }
    if (modal) {
        const modalBody = document.getElementById("videoModalBody");
        const modalInner = modal.querySelector(".modal-inner");
        const modalClose = document.getElementById("videoClose");
        let lastFocused = null;

        // Pull the 11-character ID out of any YouTube link (watch, youtu.be, embed, shorts)
        function parseYouTubeId(input) {
            if (!input) return "";
            const match = input.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
            return match ? match[1] : input.trim();
        }
        const isPlaceholder = (id) => !id || /VIDEO_ID|YOUR_/i.test(id);
        // Facebook links (facebook.com or fb.watch) are embedded with Facebook's own player
        const isFacebook = (value) => /facebook\.com|fb\.watch/i.test(value || "");
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

        const videoCards = document.querySelectorAll(".work-card[data-video]");

        // Auto-fill thumbnails from YouTube (skipped if the <img> already has your own src)
        videoCards.forEach((card) => {
            const id = parseYouTubeId(card.dataset.video);
            const img = card.querySelector("img");
            // Facebook gives no automatic thumbnail, so Facebook cards need their own src="images/..." on the <img>
            if (img && !img.getAttribute("src") && !isPlaceholder(id) && !isFacebook(card.dataset.video)) {
                img.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
            }
        });

        function openVideo(card) {
            const raw = (card.dataset.video || "").trim();
            const fb = isFacebook(raw);
            const fbUrl = fb ? cleanFacebookUrl(raw) : "";
            const id = fb ? raw : parseYouTubeId(raw);
            const fallback = document.getElementById("videoFallback");
            lastFocused = document.activeElement;
            modalInner.classList.toggle("vertical", card.dataset.vertical === "true");
            modalBody.innerHTML = "";

            if (isPlaceholder(id)) {
                const note = document.createElement("p");
                note.className = "modal-note";
                note.textContent = "Add your YouTube or Facebook link to this card's data-video attribute in index.html.";
                modalBody.appendChild(note);
                fallback.hidden = true;
            } else {
                const frame = document.createElement("iframe");
                frame.src = fb
                    ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbUrl)}&show_text=false&autoplay=true`
                    : `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
                // Backup link in case a video refuses to embed
                fallback.href = fb ? fbUrl : `https://www.youtube.com/watch?v=${id}`;
                fallback.textContent = fb ? "Open on Facebook ↗" : "Open on YouTube ↗";
                fallback.hidden = false;
                frame.title = card.getAttribute("aria-label") || "Video";
                frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
                frame.allowFullscreen = true;
                frame.referrerPolicy = "strict-origin-when-cross-origin";
                modalBody.appendChild(frame);
            }

            modal.classList.add("open");
            modal.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
            modalClose.focus();
        }

        function closeVideo() {
            modal.classList.remove("open");
            modal.setAttribute("aria-hidden", "true");
            modalBody.innerHTML = "";            // removing the iframe stops the video
            document.body.style.overflow = "";
            if (lastFocused) lastFocused.focus();
        }

        videoCards.forEach((card) => {
            card.addEventListener("click", () => openVideo(card));
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openVideo(card); }
            });
        });

        modalClose.addEventListener("click", closeVideo);
        modal.addEventListener("click", (e) => { if (e.target === modal) closeVideo(); });   // click dark backdrop
        document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("open")) closeVideo(); });
    } // end if (modal)

    /* ---------- 6c. CARDS THAT OPEN A PAGE (data-href) ----------
       The whole card is clickable (works on phones too, where hover links are hidden). */
    document.querySelectorAll(".work-card[data-href]").forEach((card) => {
        const go = () => window.open(card.dataset.href, "_blank", "noopener");
        card.addEventListener("click", (e) => {
            if (e.target.closest("a")) return;   // the inner link already opens the page
            go();
        });
        card.addEventListener("keydown", (e) => {
            if ((e.key === "Enter" || e.key === " ") && e.target === card) { e.preventDefault(); go(); }
        });
    });

    /* ---------- 6d. REELS SCROLLER ---------- */
    const reelsTrack = document.getElementById("reelsTrack");
    if (reelsTrack) {
        const reelsPrev = document.getElementById("reelsPrev");
        const reelsNext = document.getElementById("reelsNext");
        const step = () => Math.max(reelsTrack.clientWidth * 0.8, 200);

        const updateReelArrows = () => {
            if (!reelsPrev || !reelsNext) return;
            const maxLeft = reelsTrack.scrollWidth - reelsTrack.clientWidth - 2;
            reelsPrev.disabled = reelsTrack.scrollLeft <= 2;
            reelsNext.disabled = reelsTrack.scrollLeft >= maxLeft;
        };

        if (reelsPrev) reelsPrev.addEventListener("click", () => reelsTrack.scrollBy({ left: -step(), behavior: "smooth" }));
        if (reelsNext) reelsNext.addEventListener("click", () => reelsTrack.scrollBy({ left: step(), behavior: "smooth" }));
        reelsTrack.addEventListener("scroll", updateReelArrows, { passive: true });
        window.addEventListener("resize", updateReelArrows);
        updateReelArrows();

        // Click-and-drag with a mouse (touch screens already swipe natively)
        let dragging = false, moved = false, startX = 0, startLeft = 0;

        reelsTrack.addEventListener("pointerdown", (e) => {
            if (e.pointerType !== "mouse" || e.button !== 0) return;
            dragging = true;
            moved = false;
            startX = e.clientX;
            startLeft = reelsTrack.scrollLeft;
        });

        window.addEventListener("pointermove", (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            if (!moved && Math.abs(dx) > 6) {
                moved = true;
                reelsTrack.classList.add("dragging");
            }
            if (moved) reelsTrack.scrollLeft = startLeft - dx;
        });

        const endDrag = () => {
            if (!dragging) return;
            dragging = false;
            reelsTrack.classList.remove("dragging");
        };
        window.addEventListener("pointerup", endDrag);
        window.addEventListener("pointercancel", endDrag);

        // A drag should not count as a click on a reel
        reelsTrack.addEventListener("click", (e) => {
            if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
        }, true);
    }

    /* ---------- 6e. CERTIFICATES: "MORE CERTIFICATES" ---------- */
    const certMoreBtn = document.getElementById("certMoreBtn");
    const certMore = document.getElementById("certMore");
    const certMoreText = document.getElementById("certMoreText");

    const availableExtras = () => (certMore ? certMore.querySelectorAll(".cert-extra:not(.missing)").length : 0);

    function updateCertMore() {
        if (!certMoreBtn || !certMore || !certMoreText) return;
        const n = availableExtras();
        if (!certMore.hidden) certMoreText.textContent = "Show Less";
        else certMoreText.textContent = n > 0 ? `+${n} More Certificates` : "More Coming Soon";
    }

    if (certMoreBtn && certMore) {
        certMoreBtn.addEventListener("click", () => {
            if (availableExtras() === 0) return;           // nothing to show yet
            const willOpen = certMore.hidden;
            certMore.hidden = !willOpen;
            certMoreBtn.setAttribute("aria-expanded", String(willOpen));
            updateCertMore();
            if (willOpen) certMore.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
        updateCertMore();
    }

    /* ---------- 6f. IMAGE NAMES: .jpg / .png / .jpeg / .webp ----------
       Images marked data-multi-ext (certificates, reels, new cards) try the other
       extensions automatically. So images/cert1.png works even though the HTML says cert1.jpg.
       Optional certificates (data-optional) with no image at all are removed from the page. */
    const EXTS = ["jpg", "png", "jpeg", "webp", "JPG", "PNG", "JPEG"];

    function tryExtensions(img, onFail) {
        const src = img.getAttribute("src") || "";
        if (!src) return;
        const base = src.replace(/\.[A-Za-z0-9]+$/, "");
        const tried = new Set([src]);

        const next = () => {
            const candidate = EXTS.map((e) => `${base}.${e}`).find((s) => !tried.has(s));
            if (!candidate) {
                img.style.display = "none";    // nothing found: the gradient placeholder shows instead
                if (onFail) onFail();
                return;
            }
            tried.add(candidate);
            img.src = candidate;
        };

        img.addEventListener("error", next);
        if (img.complete && img.naturalWidth === 0) next();   // it already failed before this script ran
    }

    document.querySelectorAll("img[data-multi-ext]").forEach((img) => {
        const holder = img.closest("[data-optional]");
        tryExtensions(img, () => {
            if (holder) holder.classList.add("missing");
            updateCertMore();
        });
    });

    /* ---------- 6g. IMAGE VIEWER (certificates + design cards) ---------- */
    const lightbox = document.getElementById("lightbox");
    if (lightbox) {
        const lbImg = document.getElementById("lightboxImg");
        const lbCap = document.getElementById("lightboxCaption");
        const lbPrev = document.getElementById("lightboxPrev");
        const lbNext = document.getElementById("lightboxNext");
        const lbClose = document.getElementById("lightboxClose");
        const lbDownload = document.getElementById("lightboxDownload");
        const lbItems = Array.from(document.querySelectorAll("[data-lightbox]"));
        let group = [], index = 0, lbLastFocus = null;

        // Only cards whose image really loaded can be opened
        const usable = (el) => {
            const img = el.querySelector("img");
            return !!img && img.style.display !== "none" && img.naturalWidth > 0;
        };
        const visibleInGroup = (name) => lbItems.filter((el) =>
            el.dataset.lightbox === name && el.offsetParent !== null &&
            !el.classList.contains("missing") && usable(el));

        function showAt(i) {
            index = (i + group.length) % group.length;
            const el = group[index];
            const img = el.querySelector("img");
            lbImg.src = img.currentSrc || img.src;
            lbImg.alt = img.alt || "";
            lbCap.textContent = el.dataset.caption || img.alt || "";
            const several = group.length > 1;
            lbPrev.hidden = !several;
            lbNext.hidden = !several;

            // Download button: only for items that have data-download (the CV)
            if (lbDownload) {
                const file = el.dataset.download;
                lbDownload.hidden = !file;
                if (file) {
                    lbDownload.href = file;
                    lbDownload.setAttribute("download", el.dataset.downloadName || "");
                }
            }
        }

        function openLightbox(el) {
            if (!usable(el)) return;
            group = visibleInGroup(el.dataset.lightbox);
            index = Math.max(0, group.indexOf(el));
            lbLastFocus = document.activeElement;
            showAt(index);
            lightbox.classList.add("open");
            lightbox.setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
            lbClose.focus();
        }

        function closeLightbox() {
            lightbox.classList.remove("open");
            lightbox.setAttribute("aria-hidden", "true");
            lbImg.removeAttribute("src");
            document.body.style.overflow = "";
            if (lbLastFocus) lbLastFocus.focus();
        }

        lbItems.forEach((el) => {
            el.addEventListener("click", () => openLightbox(el));
            el.addEventListener("keydown", (e) => {
                if ((e.key === "Enter" || e.key === " ") && e.target === el) { e.preventDefault(); openLightbox(el); }
            });
        });

        lbPrev.addEventListener("click", () => showAt(index - 1));
        lbNext.addEventListener("click", () => showAt(index + 1));
        lbClose.addEventListener("click", closeLightbox);
        lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
        document.addEventListener("keydown", (e) => {
            if (!lightbox.classList.contains("open")) return;
            if (e.key === "Escape") closeLightbox();
            else if (e.key === "ArrowLeft") showAt(index - 1);
            else if (e.key === "ArrowRight") showAt(index + 1);
        });
    }

    /* ---------- 6h. TECH & SOFTWARE STACK (floating logos with gravity) ----------
       >>> EDIT THE LOGOS HERE <<<
       name:  shown in the legend + tooltip
       group: "tech" or "software" (decides which legend row it appears in)
       file:  optional real logo -> images/logos/<file>.svg or .png (used automatically if it exists)
       bg / fg: colours of the built-in badge (used when no logo file is found)
       glyph: text on the badge       icon: optional inline SVG that replaces the glyph */
    const STACK = [
        { name: "Python", group: "tech", file: "python", bg: "linear-gradient(135deg,#3776ab 50%,#ffd43b 50%)", fg: "#ffffff", glyph: "Py" },
        { name: "Java", group: "tech", file: "java", bg: "#ffffff", fg: "#e76f00", glyph: "Java" },
        {
            name: "ReactJs", group: "tech", file: "react", bg: "#20232a", fg: "#61dafb",
            icon: '<svg viewBox="-12 -12 24 24" fill="none" stroke="#61dafb" stroke-width="1"><circle r="2" fill="#61dafb" stroke="none"/><ellipse rx="10" ry="4"/><ellipse rx="10" ry="4" transform="rotate(60)"/><ellipse rx="10" ry="4" transform="rotate(120)"/></svg>'
        },
        { name: "Node", group: "tech", file: "node", bg: "#2b2f2b", fg: "#8cc84b", glyph: "Node" },
        { name: "HTML", group: "tech", file: "html", bg: "#e34f26", fg: "#ffffff", glyph: "HTML" },
        { name: "CSS", group: "tech", file: "css", bg: "#1572b6", fg: "#ffffff", glyph: "CSS" },
        { name: "SQL", group: "tech", file: "sql", bg: "#00758f", fg: "#ffffff", glyph: "SQL" },
        { name: "Photoshop", group: "software", file: "photoshop", bg: "#001e36", fg: "#31a8ff", glyph: "Ps" },
        { name: "Premiere Pro", group: "software", file: "premiere", bg: "#00005b", fg: "#9999ff", glyph: "Pr" },
        { name: "After Effects", group: "software", file: "aftereffects", bg: "#00005b", fg: "#9999ff", glyph: "Ae" },
        { name: "DaVinci Resolve", group: "software", file: "davinci", bg: "radial-gradient(circle at 30% 30%,#3a3a3a,#111)", fg: "#ffffff", glyph: "DR" },
        { name: "CapCut", group: "software", file: "capcut", bg: "#000000", fg: "#ffffff", glyph: "CapCut" },
        { name: "Canva", group: "software", file: "canva", bg: "linear-gradient(135deg,#00c4cc,#7d2ae8)", fg: "#ffffff", glyph: "Canva" },
        { name: "Lightroom", group: "software", file: "lightroom", bg: "#001e36", fg: "#31a8ff", glyph: "Lr" }
    ];

    const stage = document.getElementById("stackStage");
    if (stage) {
        const legend = document.getElementById("stackLegend");
        const shakeBtn = document.getElementById("stackShake");
        const hint = document.getElementById("stackHint");
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        // --- Build the logo bubbles + the legend (both come from STACK) ---
        const bodies = STACK.map((item) => {
            const el = document.createElement("div");
            el.className = "stack-logo";
            el.title = item.name;
            el.style.background = item.bg;
            el.style.color = item.fg;
            el.innerHTML = item.icon || `<span class="stack-glyph">${item.glyph}</span>`;
            stage.appendChild(el);

            // Use a real logo file if one exists in images/logos/
            if (item.file) {
                const probe = new Image();
                const exts = ["svg", "png", "webp", "jpg"];
                let i = 0;
                probe.onload = () => {
                    probe.alt = item.name;
                    el.style.background = "#ffffff";
                    el.innerHTML = "";
                    el.appendChild(probe);
                };
                probe.onerror = () => { if (++i < exts.length) probe.src = `images/logos/${item.file}.${exts[i]}`; };
                probe.src = `images/logos/${item.file}.${exts[0]}`;
            }
            return { el, item, x: 0, y: 0, vx: 0, vy: 0, r: 40 };
        });

        [["tech", "Tech Stack"], ["software", "Software Stack"]].forEach(([group, title]) => {
            const row = document.createElement("div");
            row.className = "stack-legend-row";
            row.innerHTML = `<span class="stack-legend-title">${title}</span>` +
                STACK.filter((s) => s.group === group).map((s) => `<span class="stack-chip">${s.name}</span>`).join("");
            legend.appendChild(row);
        });

        // --- Physics world ---
        const GRAVITY = 1700;        // px/s^2 (higher = heavier)
        const BOUNCE_WALL = 0.55;    // 0 = no bounce, 1 = perfect bounce
        const BOUNCE_LOGO = 0.45;
        let W = 0, H = 0;
        let held = null, pointer = { x: 0, y: 0 };
        let running = false, last = 0, spawned = false;

        function measure() {
            W = stage.clientWidth;
            H = stage.clientHeight;
            const d = W < 520 ? 58 : W < 820 ? 72 : 88;
            stage.style.setProperty("--d", d + "px");
            bodies.forEach((b) => {
                b.r = d / 2;
                b.x = Math.min(Math.max(b.x, b.r), W - b.r);
                b.y = Math.min(b.y, H - b.r);
            });
        }

        function render() {
            bodies.forEach((b) => {
                const tilt = Math.max(-14, Math.min(14, b.vx / 40));
                b.el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0) rotate(${tilt}deg)`;
            });
        }

        function spawn() {
            // drop them in from above the stage, staggered, at random x
            bodies.forEach((b, i) => {
                b.x = b.r + Math.random() * Math.max(1, W - b.r * 2);
                b.y = -b.r - i * (b.r * 1.6);
                b.vx = (Math.random() - 0.5) * 240;
                b.vy = 0;
            });
            spawned = true;
        }

        function step(dt) {
            bodies.forEach((b) => {
                if (b === held) {
                    // the grabbed logo follows the pointer; its velocity becomes the "throw"
                    const tx = Math.min(Math.max(pointer.x, b.r), W - b.r);
                    const ty = Math.min(Math.max(pointer.y, b.r), H - b.r);
                    b.vx = (tx - b.x) * 22;
                    b.vy = (ty - b.y) * 22;
                    b.x += b.vx * dt;
                    b.y += b.vy * dt;
                    return;
                }
                b.vy += GRAVITY * dt;
                b.vx *= 0.9985;
                b.x += b.vx * dt;
                b.y += b.vy * dt;

                // walls (no ceiling, so new logos can drop in from above)
                if (b.x < b.r) { b.x = b.r; b.vx = -b.vx * BOUNCE_WALL; }
                else if (b.x > W - b.r) { b.x = W - b.r; b.vx = -b.vx * BOUNCE_WALL; }
                if (b.y > H - b.r) {
                    b.y = H - b.r;
                    b.vy = -b.vy * BOUNCE_WALL;
                    b.vx *= 0.985;                          // floor friction
                    if (Math.abs(b.vy) < 40) b.vy = 0;      // stop tiny jitter
                }
            });

            // logo-vs-logo collisions (a few passes so piles stay stable)
            for (let pass = 0; pass < 3; pass++) {
                for (let i = 0; i < bodies.length; i++) {
                    for (let j = i + 1; j < bodies.length; j++) {
                        const a = bodies[i], b = bodies[j];
                        const dx = b.x - a.x, dy = b.y - a.y;
                        const min = a.r + b.r;
                        const d2 = dx * dx + dy * dy;
                        if (d2 >= min * min) continue;
                        const dist = Math.sqrt(d2) || 0.001;
                        const nx = dx / dist, ny = dy / dist;
                        const overlap = min - dist;

                        // push apart (a held logo is immovable)
                        const aw = a === held ? 0 : 1, bw = b === held ? 0 : 1;
                        const tot = aw + bw || 1;
                        a.x -= nx * overlap * (aw / tot); a.y -= ny * overlap * (aw / tot);
                        b.x += nx * overlap * (bw / tot); b.y += ny * overlap * (bw / tot);

                        // bounce along the contact normal
                        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                        if (rel < 0) {
                            const imp = -(1 + BOUNCE_LOGO) * rel / tot;
                            a.vx -= nx * imp * aw; a.vy -= ny * imp * aw;
                            b.vx += nx * imp * bw; b.vy += ny * imp * bw;
                        }
                    }
                }
            }
        }

        function frame(now) {
            if (!running) return;
            const dt = Math.min((now - last) / 1000, 1 / 30);   // cap so a lag spike can't explode the sim
            last = now;
            step(dt / 2); step(dt / 2);                          // 2 sub-steps = fewer glitches
            render();
            requestAnimationFrame(frame);
        }

        function start() {
            if (running) return;
            running = true;
            last = performance.now();
            requestAnimationFrame(frame);
        }

        // --- Pointer input: mouse drags + throws; touch taps give a hop (so page scrolling keeps working) ---
        const localPoint = (e) => {
            const rect = stage.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };
        const hit = (p) => {
            for (let i = bodies.length - 1; i >= 0; i--) {
                const b = bodies[i];
                if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r) return b;
            }
            return null;
        };

        stage.addEventListener("pointerdown", (e) => {
            if (reduceMotion || e.target.closest("button")) return;
            const p = localPoint(e);
            const b = hit(p);
            if (!b) return;
            if (e.pointerType === "mouse") {
                held = b;
                pointer = p;
                b.el.classList.add("grabbed");
                stage.style.cursor = "grabbing";
                stage.setPointerCapture(e.pointerId);
                if (hint) hint.style.opacity = "0";
            } else {
                b.vy = -650;                                   // tap = little hop
                b.vx += (Math.random() - 0.5) * 500;
            }
        });

        stage.addEventListener("pointermove", (e) => {
            const p = localPoint(e);
            if (held) { pointer = p; return; }
            if (e.pointerType === "mouse" && !reduceMotion) stage.style.cursor = hit(p) ? "grab" : "";
        });

        const release = () => {
            if (!held) return;
            held.el.classList.remove("grabbed");
            held = null;
            stage.style.cursor = "";
        };
        stage.addEventListener("pointerup", release);
        stage.addEventListener("pointercancel", release);

        // Shake: throws everything upward
        shakeBtn.addEventListener("click", () => {
            bodies.forEach((b) => {
                b.vy = -(900 + Math.random() * 900);
                b.vx += (Math.random() - 0.5) * 900;
            });
        });

        // --- Start when scrolled into view, pause when off-screen (saves battery) ---
        measure();
        window.addEventListener("resize", () => { measure(); if (!running) render(); });

        if (reduceMotion) {
            // No animation: let the logos settle instantly and keep them still
            spawn();
            for (let i = 0; i < 600; i++) step(1 / 60);
            render();
            shakeBtn.hidden = true;
            if (hint) hint.hidden = true;
        } else if ("IntersectionObserver" in window) {
            new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        if (!spawned) { measure(); spawn(); }
                        start();
                    } else {
                        running = false;
                    }
                });
            }, { threshold: 0.25 }).observe(stage);
        } else {
            spawn();
            start();
        }
    }

    /* ---------- 7. CONTACT FORM ---------- */
    const form = document.getElementById("contactForm");
    const statusEl = document.getElementById("formStatus");

    // Messages from the contact form go to this email
    const CONTACT_EMAIL = "jamvincentguevarra@gmail.com";

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = form.name.value.trim();
        const email = form.email.value.trim();
        const message = form.message.value.trim();
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

        // Mark invalid fields
        [["name", name], ["email", emailOk && email], ["message", message]].forEach(([id, ok]) => {
            form[id].parentElement.classList.toggle("error", !ok);
        });

        if (!name || !emailOk || !message) {
            statusEl.textContent = "Please fill in all fields with a valid email.";
            statusEl.classList.add("error");
            return;
        }

        statusEl.classList.remove("error");
        statusEl.textContent = "Opening your email app…";

        /* DEFAULT BEHAVIOR: opens the visitor's email app with the message filled in.
           To receive real submissions without an email app, replace the lines below with
           a fetch() call to Formspree / Netlify Forms / EmailJS, e.g.:

           fetch("https://formspree.io/f/YOUR_ID", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ name, email, message })
           }).then(() => { statusEl.textContent = "Message sent. Thank you!"; form.reset(); });
        */
        const subject = encodeURIComponent(`Portfolio message from ${name}`);
        const body = encodeURIComponent(`${message}\n\nFrom: ${name} (${email})`);
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

        setTimeout(() => { statusEl.textContent = "Thank you! Your message is ready to send."; form.reset(); }, 800);
    });

    /* ---------- 8. FOOTER YEAR ---------- */
    document.getElementById("year").textContent = new Date().getFullYear();
})();
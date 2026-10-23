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
   6g. Image viewer (certificates + design cards)
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
                    ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=false&autoplay=true`
                    : `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
                // Backup link in case a video refuses to embed
                fallback.href = fb ? raw : `https://www.youtube.com/watch?v=${id}`;
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
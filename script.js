/* =========================================================
   JAM GUEVARRA PORTFOLIO - script.js
   Sections:
   1. Theme toggle (light / dark, remembered)
   2. Mobile menu + navbar scroll state
   3. Typing effect (edit ROLES below)
   4. Scroll-reveal animations (Intersection Observer)
   5. Active nav link highlighting
   6. Portfolio filter
   7. Contact form
   8. Footer year
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
    const cards = document.querySelectorAll(".work-card");

    filterBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            const filter = btn.dataset.filter;

            filterBtns.forEach((b) => {
                const active = b === btn;
                b.classList.toggle("active", active);
                b.setAttribute("aria-selected", String(active));
            });

            cards.forEach((card) => {
                const match = filter === "all" || card.dataset.category === filter;

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
        });
    });

    /* ---------- 6b. YOUTUBE VIDEO CARDS + POP-UP PLAYER ----------
       Any card with data-video="..." opens that video when clicked.
       data-video accepts a full YouTube link OR the 11-character video ID. */
    const modal = document.getElementById("videoModal");
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

    const videoCards = document.querySelectorAll(".work-card[data-video]");

    // Auto-fill thumbnails from YouTube (skipped if the <img> already has your own src)
    videoCards.forEach((card) => {
        const id = parseYouTubeId(card.dataset.video);
        const img = card.querySelector("img");
        if (img && !img.getAttribute("src") && !isPlaceholder(id)) {
            img.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
        }
    });

    function openVideo(card) {
        const id = parseYouTubeId(card.dataset.video);
        lastFocused = document.activeElement;
        modalInner.classList.toggle("vertical", card.dataset.vertical === "true");
        modalBody.innerHTML = "";

        if (isPlaceholder(id)) {
            const note = document.createElement("p");
            note.className = "modal-note";
            note.textContent = "Add your YouTube link or video ID to this card's data-video attribute in index.html.";
            modalBody.appendChild(note);
        } else {
            const frame = document.createElement("iframe");
            frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
            frame.title = card.getAttribute("aria-label") || "YouTube video";
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

    /* ---------- 7. CONTACT FORM ---------- */
    const form = document.getElementById("contactForm");
    const statusEl = document.getElementById("formStatus");

    // >>> CHANGE THIS to the email that should receive messages <<<
    const CONTACT_EMAIL = "your.email@example.com";

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
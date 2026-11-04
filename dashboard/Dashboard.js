document.addEventListener('DOMContentLoaded', function () {
    // Per-user data starts at zero for every new session. Real counts will
    // come from the backend later; for now the dashboard shows a clean slate
    // so each user sees their own numbers, not someone else's demo data.
    const dashboardData = {
        userName: 'User',
        profileStrength: 0,
        createResume: 0,    // Drafts & versions
        matchResume: 0,    // JD matches & analysis
        jobsApplied: 0,    // Applications sent
        jobsMatched: 0,     // Auto-matched opportunities
        notifications: 0,  // Resume / application alerts
        resumes: [],
        applications: [],
        chart: [],
        notes: []
    };

    const $ = (id) => document.getElementById(id);

    // Resolve the API base the same way the login/signup pages do.
    function getApiBase() {
      const origin = window.location.origin;
      if (location.protocol === "file:" ||
          origin.includes("localhost") ||
          origin.includes("127.0.0.1") ||
          origin.includes("0.0.0.0")) {
        return "http://localhost:3000";
      }
      return origin;
    }
    const API_BASE = getApiBase();

    // Fetch the logged-in user's real profile and greet them by name.
    // Falls back to the generic placeholder if no token is stored or the
    // request fails (e.g. session expired), so the dashboard still renders.
    async function loadUser() {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      try {
        const res = await fetch(API_BASE + "/api/auth/me", {
          headers: { Authorization: "Bearer " + token },
        });
        if (!res.ok) return;
        const body = await res.json();
        if (!body || !body.user) return;

        const user = body.user;
        const name = [user.firstName, user.middleName, user.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || user.email || "User";

        dashboardData.userName = name;
        $('userName').textContent = name;
        $('userName2').textContent = name;

        // Persist across navigations so the name stays visible.
        localStorage.setItem("resumecraft_user", JSON.stringify(user));
      } catch {
        // Network error or expired token — keep the placeholder.
      }
    }

    // Name + profile strength (set again after the async fetch resolves)
    function setName(name) {
      $('userName').textContent = name;
      $('userName2').textContent = name;
    }

    // Show name from localStorage immediately (signup/login already stored it)
    const storedUser = localStorage.getItem("resumecraft_user");
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        const name = [u.firstName, u.middleName, u.lastName].filter(Boolean).join(" ").trim() || u.email || "User";
        dashboardData.userName = name;
        setName(name);
      } catch { /* ignore parse errors */ }
    } else {
      setName(dashboardData.userName);
    }
    $('ring').style.setProperty('--p', dashboardData.profileStrength);
    $('ringPct').textContent = dashboardData.profileStrength + '%';

    // Profile dropdown
    const profileBtn = $('profileBtn');
    const dropdownMenu = $('dropdownMenu');
    profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
    });
    document.addEventListener('click', () => dropdownMenu.classList.remove('show'));
    dropdownMenu.addEventListener('click', (e) => e.stopPropagation());

    // Animated counts
    function animateCount(id, target) {
        const el = $(id);
        if (!el) return;
        const step = target / 50;
        let n = 0;
        const timer = setInterval(() => {
            n += step;
            if (n >= target) { n = target; clearInterval(timer); }
            el.textContent = Math.floor(n);
        }, 20);
    }

    // Resume cards
    function renderResumes(filter = '') {
        const list = dashboardData.resumes.filter(r => r.title.toLowerCase().includes(filter.toLowerCase()));
        $('resumeTrack').innerHTML = list.length ? list.map(r => `
            <article class="resume">
                <div class="thumb" style="background:${r.bg}"><i></i><i></i><i style="width:80%"></i><i style="width:60%"></i><i style="width:70%"></i></div>
                <span class="tag" style="background:${r.tagBg};color:${r.color}">${r.tag}</span>
                <h4>${r.title}</h4>
                <div class="bar"><span style="width:${r.progress}%"></span></div>
                <small>${r.progress}% complete · ${r.date}</small>
            </article>`).join('') : '<p class="muted" style="padding:24px">No resumes match your search.</p>';
    }

    // Applications table
    $('appsBody').innerHTML = dashboardData.applications.map(a => `
        <tr><td><b>${a.company}</b></td><td>${a.role}</td><td>${a.match}</td><td><span class="status ${a.cls}">${a.status}</span></td></tr>`).join('');

    // Bar chart
    const max = dashboardData.chart.length ? Math.max(...dashboardData.chart.map(c => c.value)) : 0;
    $('chart').innerHTML = dashboardData.chart.length ? dashboardData.chart.map((c, i) => `
        <div class="col ${c.value === max ? 'hi' : ''}"><span data-h="${Math.round(c.value / max * 100)}"></span>${c.label}</div>`).join('') : '<p class="muted" style="padding:24px">No data yet.</p>';
    requestAnimationFrame(() => {
        document.querySelectorAll('.col span').forEach(s => { s.style.height = (s.dataset.h * 0.78) + '%'; });
    });

    // Notifications
    $('notesList').innerHTML = dashboardData.notes.map(n => `
        <li><span class="dot">${n.initial}</span><div><b>${n.title}</b><small>${n.sub}</small></div></li>`).join('');

    // Carousel arrows
    const track = $('resumeTrack');
    $('nextBtn').addEventListener('click', () => track.scrollBy({ left: track.clientWidth / 2, behavior: 'smooth' }));
    $('prevBtn').addEventListener('click', () => track.scrollBy({ left: -track.clientWidth / 2, behavior: 'smooth' }));

    // Search
    $('searchInput').addEventListener('input', (e) => renderResumes(e.target.value));

    // Toast
    function showToast(message) {
        document.querySelector('.toast')?.remove();
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = message;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2500);
    }
    document.querySelectorAll('[data-toast]').forEach(el =>
        el.addEventListener('click', () => showToast(el.dataset.toast)));

    // Create Resume selector modal
    const createModal = $('createModal');
    const openCreateModal = () => {
        createModal.classList.add('open');
        createModal.setAttribute('aria-hidden', 'false');
    };
    const closeCreateModal = () => {
        createModal.classList.remove('open');
        createModal.setAttribute('aria-hidden', 'true');
    };
    document.querySelectorAll('[data-action="open-create-modal"]').forEach(el =>
        el.addEventListener('click', (e) => { e.preventDefault(); openCreateModal(); })
    );
    $('modalClose').addEventListener('click', closeCreateModal);
    createModal.addEventListener('click', (e) => { if (e.target === createModal) closeCreateModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && createModal.classList.contains('open')) closeCreateModal(); });
    createModal.querySelectorAll('.opt-card').forEach(card =>
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            closeCreateModal();
            showToast(mode === 'jd' ? 'Opening JD-Based Resume…' : 'Opening Auto-General Resume…');
        })
    );

    // Match & Score Resume selector modal
    const matchModal = $('matchModal');
    const openMatchModal = () => { matchModal.classList.add('open'); matchModal.setAttribute('aria-hidden', 'false'); };
    const closeMatchModal = () => { matchModal.classList.remove('open'); matchModal.setAttribute('aria-hidden', 'true'); };
    document.querySelectorAll('[data-action="open-match-modal"]').forEach(el =>
        el.addEventListener('click', (e) => { e.preventDefault(); openMatchModal(); })
    );
    $('matchModalClose').addEventListener('click', closeMatchModal);
    matchModal.addEventListener('click', (e) => { if (e.target === matchModal) closeMatchModal(); });
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (matchModal.classList.contains('open')) closeMatchModal();
        if (createModal.classList.contains('open')) closeCreateModal();
    });
    matchModal.querySelectorAll('.opt-card').forEach(card =>
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            closeMatchModal();
            showToast(mode === 'match-jd' ? 'Opening JD-Based Match…' : 'Opening Auto-General Match…');
        })
    );

    // Sidebar nav shortcuts
    document.querySelectorAll('.side-nav a').forEach(a => {
        const txt = a.textContent.trim();
        if (txt === 'Create Resume') a.addEventListener('click', (e) => { e.preventDefault(); openCreateModal(); });
        if (txt === 'Match &amp; Score Resume' || txt === 'Match & Score Resume') a.addEventListener('click', (e) => { e.preventDefault(); openMatchModal(); });
    });

    // Init
    renderResumes();
    animateCount('createResumeCount', dashboardData.createResume);
    animateCount('matchResumeCount', dashboardData.matchResume);
    animateCount('jobsAppliedCount', dashboardData.jobsApplied);
    animateCount('jobsMatchedCount', dashboardData.jobsMatched);
    animateCount('notificationCount', dashboardData.notifications);

    // Greet the user by their real name (async, non-blocking).
    loadUser();
});

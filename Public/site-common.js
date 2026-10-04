(function () {

    'use strict';


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const script =
        document.currentScript;


    const page =
        script
            ? (
                script.getAttribute(
                    'data-page'
                ) || ''
            )
            : '';


    const auth =
        script
            ? (
                script.getAttribute(
                    'data-auth'
                ) || 'none'
            )
            : 'none';


    const overlay =
        script &&
        script.hasAttribute(
            'data-overlay'
        );


    /*
       Use the original Air Kerala logo image.

       IMPORTANT:
       Do not add a background to this image.
       The image itself should contain the transparent
       background supplied with the original logo.
    */

    const LOGO =
        'airkeralalogo.png';


    const LINKS = [

        {
            key: 'home',
            label: 'Home',
            href: 'index.html'
        },

        {
            key: 'book',
            label: 'Book Ticket',
            href: 'flights.html'
        },

        {
            key: 'manage',
            label: 'Manage My Booking',
            href: 'manage-booking.html'
        },

        {
            key: 'contact',
            label: 'Contact',
            href: 'index.html#contact'
        }

    ];


    /* =====================================================
       LOAD SHARED CSS
    ===================================================== */

    if (
        !document.querySelector(
            'link[data-air-kerala-common]'
        )
    ) {

        const css =
            document.createElement(
                'link'
            );

        css.rel =
            'stylesheet';

        css.href =
            'site-common.css';

        css.setAttribute(
            'data-air-kerala-common',
            'true'
        );

        document.head.appendChild(
            css
        );
    }


    /* =====================================================
       NAVIGATION
    ===================================================== */

    function navigationHTML() {

        return LINKS
            .map(
                link => {

                    const active =
                        link.key === page;


                    return `

                        <a
                            href="${link.href}"
                            ${
                                active
                                    ? 'class="active" aria-current="page"'
                                    : ''
                            }
                        >
                            ${link.label}
                        </a>

                    `;
                }
            )
            .join('');
    }


    /* =====================================================
       AUTH BUTTON
    ===================================================== */

    function authHTML() {

        if (auth === 'none') {

            return '';
        }

        /*
           Initial state for every page that shows an auth button.
           The real state (Login vs Logout) is decided by the Express
           session via GET /api/auth/me - see renderAuthArea() below.
        */

        return `

            <button
                class="login-btn"
                data-ak-login
                type="button"
            >
                Login
            </button>

        `;
    }


    /* =====================================================
       HEADER
    ===================================================== */

    const header =
        document.createElement(
            'header'
        );


    header.id =
        'akHeader';


    header.className =
        'ak-header no-print' +
        (
            overlay
                ? ' ak-header--overlay'
                : ''
        );


    header.innerHTML = `

        <a
            class="ak-brand"
            href="index.html"
        >

            <img
                src="${LOGO}"
                alt="Air Kerala"
            >

        </a>


        <nav
            class="ak-links"
            id="akLinks"
        >

            ${navigationHTML()}

        </nav>


        <div class="ak-right">

            <div id="authArea"${auth !== 'none' ? ' class="ak-auth-pending"' : ''}>

                ${authHTML()}

            </div>


            <button
                class="ak-burger"
                id="akBurger"
                type="button"
                aria-label="Open navigation"
                aria-expanded="false"
            >

                <span></span>
                <span></span>
                <span></span>

            </button>

        </div>

    `;


    function insertHeader() {

        if (
            !document.getElementById(
                'akHeader'
            )
        ) {

            document.body.insertBefore(
                header,
                document.body.firstChild
            );
        }
    }


    insertHeader();


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    const burger =
        header.querySelector(
            '#akBurger'
        );


    const links =
        header.querySelector(
            '#akLinks'
        );


    function toggleMenu() {

        const open =
            header.classList.toggle(
                'ak-open'
            );


        burger.setAttribute(
            'aria-expanded',
            open
                ? 'true'
                : 'false'
        );
    }


    burger.addEventListener(
        'click',
        toggleMenu
    );


    links.addEventListener(
        'click',
        function (event) {

            if (
                event.target.tagName ===
                'A'
            ) {

                header.classList.remove(
                    'ak-open'
                );

                burger.setAttribute(
                    'aria-expanded',
                    'false'
                );
            }
        }
    );


    /* =====================================================
       SHARED AUTH (Express session is the source of truth)
    ===================================================== */

    const USER_KEYS = [
        'isLoggedIn',
        'userName',
        'userEmail',
        'userId'
    ];

    let pendingContinuation = null;
    let pendingCancel = null;


    function esc(value) {

        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }


    /* localStorage holds UI convenience values only - never proof of login */

    function saveUser(user) {

        try {

            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userName', user.name || '');
            localStorage.setItem('userEmail', user.email || '');

            if (user.id) {
                localStorage.setItem('userId', user.id);
            }

        } catch (e) { /* storage unavailable */ }
    }


    function clearUser() {

        try {

            USER_KEYS.forEach(function (key) {
                localStorage.removeItem(key);
            });

        } catch (e) { /* storage unavailable */ }
    }


    async function checkSession() {

        try {

            const res = await fetch(
                '/api/auth/me',
                { credentials: 'include' }
            );

            const data = await res.json().catch(function () {
                return {};
            });

            if (
                res.ok &&
                data.success &&
                data.authenticated &&
                data.user
            ) {

                saveUser(data.user);

                return data.user;
            }

        } catch (error) {

            console.error('Session check error:', error);
        }

        clearUser();

        return null;
    }


    function renderAuthArea(user) {

        const area =
            document.getElementById('authArea');

        if (!area || auth === 'none') {
            return;
        }

        if (user) {

            area.innerHTML = `

                <button
                    class="login-btn ak-user-btn"
                    id="akLogout"
                    type="button"
                    title="Logout"
                >
                    🚪 ${esc(user.name || 'Logout')}
                </button>

            `;

        } else {

            area.innerHTML = `

                <button
                    class="login-btn"
                    data-ak-login
                    type="button"
                >
                    Login
                </button>

            `;
        }

        area.classList.remove('ak-auth-pending');
    }


    /* ---------- Injected modal (pages without their own #loginModal) ---------- */

    function modalEl() {

        return document.getElementById('akAuthModal');
    }


    function setModalError(message) {

        const box =
            document.getElementById('akAuthAlert');

        if (!box) {
            return;
        }

        box.textContent = message || '';
        box.hidden = !message;
    }


    function showForm(signup) {

        setModalError('');

        document.getElementById('akAuthTitle')
            .textContent =
                signup
                    ? 'Create Account'
                    : 'User Login';

        document.getElementById('akLoginForm')
            .hidden = signup;

        document.getElementById('akSignupForm')
            .hidden = !signup;
    }


    function buildModal() {

        if (modalEl()) {
            return;
        }

        const wrap =
            document.createElement('div');

        wrap.id = 'akAuthModal';
        wrap.className = 'ak-modal no-print';
        wrap.hidden = true;

        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.setAttribute('aria-labelledby', 'akAuthTitle');

        wrap.innerHTML = `

            <div class="ak-modal-card">

                <button
                    type="button"
                    class="ak-modal-close"
                    id="akAuthClose"
                    aria-label="Close"
                >&times;</button>

                <h3 id="akAuthTitle">User Login</h3>

                <div
                    id="akAuthAlert"
                    class="ak-auth-alert"
                    role="alert"
                    hidden
                ></div>

                <form id="akLoginForm" novalidate>

                    <label for="akLoginEmail">EMAIL ADDRESS</label>
                    <input
                        type="email"
                        id="akLoginEmail"
                        autocomplete="email"
                        placeholder="Enter your email address"
                    >

                    <label for="akLoginPass">PASSWORD</label>
                    <input
                        type="password"
                        id="akLoginPass"
                        autocomplete="current-password"
                        placeholder="Enter your password"
                    >

                    <button type="submit" class="ak-modal-btn">
                        Login to Air Kerala
                    </button>

                    <p class="ak-modal-switch">
                        New here?
                        <a href="#" data-ak-switch="signup">Create an account</a>
                    </p>

                </form>

                <form id="akSignupForm" novalidate hidden>

                    <label for="akNewName">FULL NAME</label>
                    <input type="text" id="akNewName" autocomplete="name" placeholder="Full name as per ID">

                    <label for="akNewDOB">DATE OF BIRTH</label>
                    <input type="date" id="akNewDOB" autocomplete="bday">

                    <label for="akNewPhone">PHONE NUMBER</label>
                    <input type="tel" id="akNewPhone" autocomplete="tel" placeholder="+91 9876543210">

                    <label for="akNewEmail">EMAIL ADDRESS</label>
                    <input type="email" id="akNewEmail" autocomplete="email" placeholder="name@example.com">

                    <label for="akNewPass">PASSWORD</label>
                    <input type="password" id="akNewPass" autocomplete="new-password" placeholder="Create a password">

                    <label for="akNewConfirm">CONFIRM PASSWORD</label>
                    <input type="password" id="akNewConfirm" autocomplete="new-password" placeholder="Re-enter password">

                    <button type="submit" class="ak-modal-btn">
                        Create Account
                    </button>

                    <p class="ak-modal-switch">
                        Already have an account?
                        <a href="#" data-ak-switch="login">Login</a>
                    </p>

                </form>

            </div>

        `;

        document.body.appendChild(wrap);


        /* close: X button, backdrop, Esc */

        document.getElementById('akAuthClose')
            .addEventListener('click', cancelLogin);

        wrap.addEventListener('mousedown', function (event) {

            if (event.target === wrap) {
                cancelLogin();
            }
        });

        document.addEventListener('keydown', function (event) {

            if (event.key === 'Escape' && !wrap.hidden) {
                cancelLogin();
            }
        });

        wrap.addEventListener('click', function (event) {

            const link =
                event.target.closest('[data-ak-switch]');

            if (link) {

                event.preventDefault();

                showForm(
                    link.getAttribute('data-ak-switch') === 'signup'
                );
            }
        });

        document.getElementById('akLoginForm')
            .addEventListener('submit', submitLogin);

        document.getElementById('akSignupForm')
            .addEventListener('submit', submitSignup);
    }


    function showModal() {

        buildModal();

        showForm(false);

        modalEl().hidden = false;

        document.documentElement.classList.add('ak-modal-open');

        const first =
            document.getElementById('akLoginEmail');

        if (first) {
            setTimeout(function () { first.focus(); }, 30);
        }
    }


    function hideModal() {

        const el = modalEl();

        if (el) {
            el.hidden = true;
        }

        document.documentElement.classList.remove('ak-modal-open');
    }


    function cancelLogin() {

        const onCancel = pendingCancel;

        pendingContinuation = null;
        pendingCancel = null;

        hideModal();

        if (typeof onCancel === 'function') {
            onCancel();
        }
    }


    async function postAuth(url, body, button) {

        setModalError('');

        if (button) {
            button.disabled = true;
        }

        try {

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            const data = await res.json().catch(function () {
                return {};
            });

            if (!res.ok || !data.success) {

                setModalError(
                    data.message ||
                    data.error ||
                    'Request failed. Please try again.'
                );

                return null;
            }

            return data;

        } catch (error) {

            console.error('Auth request error:', error);

            setModalError(
                'Unable to connect to the server. Please make sure the Air Kerala server is running.'
            );

            return null;

        } finally {

            if (button) {
                button.disabled = false;
            }
        }
    }


    async function submitLogin(event) {

        event.preventDefault();

        const email =
            document.getElementById('akLoginEmail').value.trim();

        const password =
            document.getElementById('akLoginPass').value;

        if (!email || !password) {

            setModalError('Please enter your email and password.');

            return;
        }

        const data = await postAuth(
            '/api/auth/login',
            { email: email, password: password },
            event.target.querySelector('button[type=submit]')
        );

        if (data) {

            event.target.reset();

            loginSucceeded(data.user);
        }
    }


    async function submitSignup(event) {

        event.preventDefault();

        const value = function (id) {
            return document.getElementById(id).value;
        };

        const name = value('akNewName').trim();
        const dateOfBirth = value('akNewDOB');
        const phoneNumber = value('akNewPhone').trim();
        const email = value('akNewEmail').trim();
        const password = value('akNewPass');
        const confirmPassword = value('akNewConfirm');

        if (
            !name || !dateOfBirth || !phoneNumber ||
            !email || !password || !confirmPassword
        ) {

            setModalError('Please fill in all required fields.');

            return;
        }

        if (password !== confirmPassword) {

            setModalError('Passwords do not match.');

            return;
        }

        const data = await postAuth(
            '/api/auth/register',
            {
                name: name,
                dateOfBirth: dateOfBirth,
                phoneNumber: phoneNumber,
                email: email,
                password: password,
                confirmPassword: confirmPassword
            },
            event.target.querySelector('button[type=submit]')
        );

        if (data) {

            event.target.reset();

            loginSucceeded(data.user);
        }
    }


    /* ---------- Public API ---------- */

    /*
       Called after a successful login/signup (by the injected modal,
       or by index.html's own handleLogin). Runs the pending booking
       continuation ONLY if one was registered; a manual navbar login
       has none, so the user stays on the current page.
    */

    async function loginSucceeded(user) {

        /* capture + clear first so a late "modal hidden" event cannot cancel it */

        const next = pendingContinuation;

        pendingContinuation = null;
        pendingCancel = null;

        hideModal();

        const confirmed =
            await checkSession();

        renderAuthArea(confirmed || user || null);

        if (confirmed && typeof next === 'function') {
            next(confirmed);
        }
    }


    function openLogin(onSuccess, options) {

        pendingContinuation =
            typeof onSuccess === 'function'
                ? onSuccess
                : null;

        pendingCancel =
            options && typeof options.onCancel === 'function'
                ? options.onCancel
                : null;

        const own =
            document.getElementById('loginModal');

        /* index.html ships its own Bootstrap #loginModal - reuse it */

        if (own && window.bootstrap) {

            if (typeof window.toggleAuth === 'function') {
                window.toggleAuth(false);
            }

            window.bootstrap.Modal
                .getOrCreateInstance(own)
                .show();

            return;
        }

        showModal();
    }


    window.AKAuth = {
        check: checkSession,
        openLogin: openLogin,
        loginSucceeded: loginSucceeded
    };


    /* Bootstrap modal closed without logging in: drop pending action */

    document.addEventListener('hidden.bs.modal', function (event) {

        if (
            event.target &&
            event.target.id === 'loginModal' &&
            (pendingContinuation || pendingCancel)
        ) {

            const onCancel = pendingCancel;

            pendingContinuation = null;
            pendingCancel = null;

            if (typeof onCancel === 'function') {
                onCancel();
            }
        }
    });


    /* Header buttons (Login / Logout) */

    header.addEventListener('click', async function (event) {

        const loginBtn =
            event.target.closest('[data-ak-login]');

        if (loginBtn) {

            openLogin();

            return;
        }

        const logoutBtn =
            event.target.closest('#akLogout');

        if (logoutBtn) {

            try {

                await fetch(
                    '/api/auth/logout',
                    {
                        method: 'POST',
                        credentials: 'include'
                    }
                );

            } catch (error) {

                console.error(error);
            }

            clearUser();

            localStorage.removeItem('booking_id');

            window.location.href = 'index.html';
        }
    });


    /* Silent session check on every page - never opens a popup */

    if (auth !== 'none') {

        checkSession().then(renderAuthArea);
    }


    /* =====================================================
       SCROLL
    ===================================================== */

    function handleScroll() {

        header.classList.toggle(
            'ak-scrolled',
            window.scrollY > 40
        );
    }


    window.addEventListener(
        'scroll',
        handleScroll,
        {
            passive: true
        }
    );


    handleScroll();


    /* =====================================================
       FOOTER
    ===================================================== */

    function buildFooter() {

        if (
            document.getElementById(
                'contact'
            )
        ) {

            return;
        }


        const footer =
            document.createElement(
                'footer'
            );


        footer.id =
            'contact';


        footer.className =
            'ak-footer no-print';


        footer.innerHTML = `

            <div class="ak-footer-inner">

                <div class="ak-footer-grid">


                    <!-- BRAND -->

                    <div>

                        <img
                            class="ak-footer-logo"
                            src="${LOGO}"
                            alt="Air Kerala"
                        >

                        <p class="ak-footer-about">

                            Affordable Air Travel, Redefined.

                            <br><br>

                            Your journey begins with Air Kerala.

                        </p>

                    </div>


                    <!-- CONTACT -->

                    <div>

                        <div class="ak-footer-heading">
                            Contact Us
                        </div>


                        <div class="ak-contact-item">

                            <span>📍</span>

                            <div>

                                <strong>
                                    Corporate Office
                                </strong>

                                Air Kerala Corporate Office

                                <br>

                                Riverway Plaza

                                <br>

                                First Floor, XXIII/129

                                <br>

                                NH Service Road

                                <br>

                                Opp. Metro Station

                                <br>

                                Aluva – 683101

                                <br>

                                Ernakulam, Kerala, India

                            </div>

                        </div>


                    </div>


                    <!-- QUICK LINKS -->

                    <div>

                        <div class="ak-footer-heading">
                            Quick Links
                        </div>

                        <div class="ak-footer-links">

                            ${navigationHTML()}

                        </div>

                    </div>


                </div>


                <div class="ak-footer-bottom">

                    <span>

                        © ${new Date().getFullYear()}

                        Air Kerala.

                        All rights reserved.

                    </span>


                    <span>

                        Fly beyond.

                    </span>

                </div>

            </div>

        `;


        document.body.appendChild(
            footer
        );
    }


    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            buildFooter
        );

    } else {

        buildFooter();

    }

})();
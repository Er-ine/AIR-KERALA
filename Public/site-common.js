/* =====================================================
   AIR KERALA — SHARED NAVBAR + FOOTER
   ===================================================== */

(function () {

    const AK_CONTACT = {
        address: 'Air Kerala Headquarters, Cochin International Airport Complex, Nedumbassery, Kochi, Kerala 683111, India',
        phone: '+91 484 261 0115',
        tollFree: '1800 425 0333',
        email: 'support@airkerala.com'
    };

    /*
        IMPORTANT:
        This is the existing Air Kerala logo.
        Keep the actual file in Public/.
    */
    const LOGO = 'airkeralalogo.png';

    const script = document.currentScript;

    const page =
        (script && script.getAttribute('data-page')) || '';

    const auth =
        (script && script.getAttribute('data-auth')) || 'none';

    const overlay =
        !!(script && script.hasAttribute('data-overlay'));

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

    const AUTH_HTML = {
        modal:
            '<button class="login-btn" data-bs-toggle="modal" data-bs-target="#loginModal">👤 Login</button>',

        account:
            '<button class="login-btn" onclick="window.location.href=\'index.html\'">👤 Account</button>',

        logout:
            '<button class="login-btn" onclick="logout()">🚪 Logout</button>',

        none: ''
    };

    function linksHTML() {

        return LINKS.map(function (link) {

            const active =
                link.key === page;

            return `
                <a
                    href="${link.href}"
                    ${active ? 'class="active" aria-current="page"' : ''}
                >
                    ${link.label}
                </a>
            `;

        }).join('');
    }

    /* =====================================================
       HEADER
       ===================================================== */

    const header =
        document.createElement('header');

    header.id = 'akHeader';

    header.className =
        'ak-header no-print' +
        (overlay ? ' ak-header--overlay' : '');

    header.innerHTML = `

        <a
            class="ak-brand"
            href="index.html"
            aria-label="Air Kerala Home"
        >
            <img
                src="${LOGO}"
                alt="Air Kerala"
                onerror="this.style.display='none';"
            >
        </a>

        <nav
            class="ak-links"
            id="akLinks"
            aria-label="Main navigation"
        >
            ${linksHTML()}
        </nav>

        <div class="ak-right">

            <div id="authArea">
                ${AUTH_HTML[auth] || ''}
            </div>

            <button
                class="ak-burger"
                id="akBurger"
                type="button"
                aria-label="Toggle menu"
                aria-expanded="false"
                aria-controls="akLinks"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

        </div>
    `;

    document.body.insertBefore(
        header,
        document.body.firstChild
    );

    /* =====================================================
       MOBILE MENU
       ===================================================== */

    const burger =
        header.querySelector('#akBurger');

    function setOpen(open) {

        header.classList.toggle(
            'ak-open',
            open
        );

        burger.setAttribute(
            'aria-expanded',
            open ? 'true' : 'false'
        );
    }

    burger.addEventListener(
        'click',
        function () {

            setOpen(
                !header.classList.contains('ak-open')
            );

        }
    );

    header
        .querySelector('#akLinks')
        .addEventListener(
            'click',
            function (event) {

                if (
                    event.target.tagName === 'A'
                ) {
                    setOpen(false);
                }

            }
        );

    window.addEventListener(
        'resize',
        function () {

            if (window.innerWidth > 760) {
                setOpen(false);
            }

        }
    );

    /* =====================================================
       HEADER SCROLL
       ===================================================== */

    function onScroll() {

        header.classList.toggle(
            'ak-scrolled',
            window.scrollY > 40
        );

    }

    window.addEventListener(
        'scroll',
        onScroll,
        { passive: true }
    );

    onScroll();

    /* =====================================================
       FOOTER
       ===================================================== */

    function tel(number) {

        return 'tel:' +
            number.replace(
                /[^+\d]/g,
                ''
            );
    }

    function buildFooter() {

        if (
            document.getElementById('contact')
        ) {
            return;
        }

        const c = AK_CONTACT;

        const footer =
            document.createElement('footer');

        footer.id = 'contact';

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
                            onerror="this.style.display='none';"
                        >

                        <p class="ak-footer-about">
                            Fly Beyond — warm hospitality
                            and seamless domestic flight booking.
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
                                    Office Address
                                </strong>

                                ${c.address}

                            </div>

                        </div>

                        <div class="ak-contact-item">

                            <span>📞</span>

                            <div>

                                <strong>
                                    Phone
                                </strong>

                                <a href="${tel(c.phone)}">
                                    ${c.phone}
                                </a>

                                <br>

                                <span>
                                    Toll free:
                                </span>

                                <a href="${tel(c.tollFree)}">
                                    ${c.tollFree}
                                </a>

                            </div>

                        </div>

                        <div class="ak-contact-item">

                            <span>✉️</span>

                            <div>

                                <strong>
                                    Email
                                </strong>

                                <a href="mailto:${c.email}">
                                    ${c.email}
                                </a>

                            </div>

                        </div>

                    </div>

                    <!-- QUICK LINKS -->

                    <div>

                        <div class="ak-footer-heading">
                            Quick Links
                        </div>

                        <div class="ak-footer-links">

                            ${linksHTML()}

                        </div>

                    </div>

                </div>

                <div class="ak-credits-slot"></div>

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

        document.body.appendChild(footer);

        const credits =
            document.getElementById('ak-credits');

        if (credits) {

            const slot =
                footer.querySelector(
                    '.ak-credits-slot'
                );

            if (slot) {
                slot.appendChild(credits);
            }

        }
    }

    if (
        document.readyState === 'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            buildFooter
        );

    } else {

        buildFooter();

    }

})();
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

        if (
            auth ===
            'logout'
        ) {

            return `

                <button
                    class="login-btn"
                    id="akLogout"
                    type="button"
                >
                    Logout
                </button>

            `;
        }


        if (
            auth ===
            'account'
        ) {

            return `

                <button
                    class="login-btn"
                    onclick="window.location.href='index.html'"
                    type="button"
                >
                    Account
                </button>

            `;
        }


        if (
            auth ===
            'modal'
        ) {

            return `

                <button
                    class="login-btn"
                    data-bs-toggle="modal"
                    data-bs-target="#loginModal"
                    type="button"
                >
                    Login
                </button>

            `;
        }


        return '';
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

            <div id="authArea">

                ${authHTML()}

            </div>


            <button
                class="ak-burger"
                id="akBurger"
                type="button"
                aria-label="Open navigation"
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
            }
        }
    );


    /* =====================================================
       LOGOUT
    ===================================================== */

    const logoutButton =
        document.getElementById(
            'akLogout'
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            'click',
            async function () {

                try {

                    await fetch(
                        '/api/auth/logout',
                        {
                            method:
                                'POST',

                            credentials:
                                'include'
                        }
                    );

                } catch (error) {

                    console.error(
                        error
                    );
                }


                localStorage.removeItem(
                    'isLoggedIn'
                );

                localStorage.removeItem(
                    'booking_id'
                );


                window.location.href =
                    'index.html';
            }
        );
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


                    <div>

                        <div class="ak-footer-heading">
                            Contact Us
                        </div>

                        <div class="ak-contact-item">

                            <span>📍</span>

                            <div>

                                <strong>
                                    Office
                                </strong>

                                Air Kerala Headquarters

                            </div>

                        </div>


                        <div class="ak-contact-item">

                            <span>📞</span>

                            <div>

                                <strong>
                                    Support
                                </strong>

                                Air Kerala Customer Support

                            </div>

                        </div>


                        <div class="ak-contact-item">

                            <span>✉️</span>

                            <div>

                                <strong>
                                    Email
                                </strong>

                                <a href="mailto:support@airkerala.com">
                                    support@airkerala.com
                                </a>

                            </div>

                        </div>

                    </div>


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
                        Air Kerala. All rights reserved.
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
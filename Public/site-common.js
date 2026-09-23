/* =========================================================
   AIR KERALA - SHARED NAVBAR + FOOTER
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
       ===================================================== */

    const LOGO_PATH =
        "assets/air-kerala-logo.png";

    /*
       If your Manage Booking page has another filename,
       change this one line.
    */
    const MANAGE_BOOKING_PAGE =
        "manage-booking.html";


    /* =====================================================
       GET CURRENT PAGE
       ===================================================== */

    const currentScript =
        document.currentScript;

    const currentPage =
        currentScript?.dataset?.page || "";


    /* =====================================================
       NAVBAR
       ===================================================== */

    function createNavbar() {

        const header =
            document.createElement("header");

        header.className =
            "ak-navbar";


        header.innerHTML = `

            <a
                href="index.html"
                class="ak-brand"
                aria-label="Air Kerala Home"
            >

                <img
                    src="${LOGO_PATH}"
                    class="ak-logo"
                    alt="Air Kerala"
                    onerror="
                        this.style.display='none';
                        this.nextElementSibling.style.display='flex';
                    "
                >

                <div
                    class="ak-logo-fallback"
                    style="display:none;"
                >

                    <div class="ak-logo-symbol">
                        ✈
                    </div>

                    <div class="ak-logo-text">
                        AIR KERALA
                    </div>

                </div>

            </a>


            <button
                class="ak-menu-button"
                id="akMenuButton"
                aria-label="Open navigation menu"
                aria-expanded="false"
            >
                ☰
            </button>


            <nav
                class="ak-nav"
                id="akNavigation"
                aria-label="Main navigation"
            >

                <a
                    href="index.html"
                    class="ak-nav-link"
                    data-page="home"
                >
                    Home
                </a>


                <a
                    href="flights.html"
                    class="ak-nav-link"
                    data-page="flights"
                >
                    Book Ticket
                </a>


                <a
                    href="${MANAGE_BOOKING_PAGE}"
                    class="ak-nav-link"
                    data-page="manage"
                >
                    Manage My Booking
                </a>


                <a
                    href="index.html#contact"
                    class="ak-nav-link"
                    data-page="contact"
                >
                    Contact
                </a>

            </nav>

        `;


        /*
           Put navbar at the beginning
           of the body.
        */

        document.body.prepend(header);


        setActiveNavigation();


        setupMobileMenu();

    }


    /* =====================================================
       ACTIVE NAVIGATION
       ===================================================== */

    function setActiveNavigation() {

        const links =
            document.querySelectorAll(
                ".ak-nav-link"
            );


        links.forEach(function (link) {

            link.classList.remove(
                "active"
            );


            const page =
                link.dataset.page;


            if (
                page &&
                page === currentPage
            ) {

                link.classList.add(
                    "active"
                );

            }

        });


        /*
           Contact becomes active when the
           page is index.html#contact.
        */

        if (
            currentPage === "home" &&
            window.location.hash === "#contact"
        ) {

            const contact =
                document.querySelector(
                    '.ak-nav-link[data-page="contact"]'
                );


            if (contact) {

                contact.classList.add(
                    "active"
                );

            }

        }

    }


    /* =====================================================
       MOBILE MENU
       ===================================================== */

    function setupMobileMenu() {

        const button =
            document.getElementById(
                "akMenuButton"
            );


        const navigation =
            document.getElementById(
                "akNavigation"
            );


        if (
            !button ||
            !navigation
        ) {
            return;
        }


        button.addEventListener(
            "click",
            function () {

                const opened =
                    navigation.classList.toggle(
                        "open"
                    );


                button.setAttribute(
                    "aria-expanded",
                    opened ? "true" : "false"
                );


                button.textContent =
                    opened ? "✕" : "☰";

            }
        );


        /*
           Close mobile menu after
           clicking a navigation item.
        */

        navigation
            .querySelectorAll("a")
            .forEach(function (link) {

                link.addEventListener(
                    "click",
                    function () {

                        navigation.classList.remove(
                            "open"
                        );

                        button.setAttribute(
                            "aria-expanded",
                            "false"
                        );

                        button.textContent =
                            "☰";

                    }
                );

            });

    }


    /* =====================================================
       FOOTER
       ===================================================== */

    function createFooter() {

        /*
           Don't create a second footer if the
           page already has one.
        */

        if (
            document.getElementById(
                "contact"
            )
        ) {
            return;
        }


        const footer =
            document.createElement(
                "footer"
            );


        footer.className =
            "ak-footer";


        footer.id =
            "contact";


        footer.innerHTML = `

            <div class="ak-footer-container">


                <div>

                    <div class="ak-footer-brand">
                        AIR KERALA
                    </div>

                    <p class="ak-footer-description">
                        Affordable Air Travel, Redefined.
                        Connecting Kerala and beyond with
                        a simple, reliable and comfortable
                        flying experience.
                    </p>

                </div>


                <div>

                    <div class="ak-footer-title">
                        Quick Links
                    </div>


                    <a
                        href="index.html"
                        class="ak-footer-link"
                    >
                        Home
                    </a>


                    <a
                        href="flights.html"
                        class="ak-footer-link"
                    >
                        Book Ticket
                    </a>


                    <a
                        href="${MANAGE_BOOKING_PAGE}"
                        class="ak-footer-link"
                    >
                        Manage My Booking
                    </a>

                </div>


                <div>

                    <div class="ak-footer-title">
                        Contact
                    </div>


                    <p class="ak-footer-text">
                        Air Kerala
                    </p>


                    <p class="ak-footer-text">
                        Kerala, India
                    </p>


                    <p class="ak-footer-text">
                        Email: support@airkerala.com
                    </p>


                    <p class="ak-footer-text">
                        Phone: +91 XXXXX XXXXX
                    </p>

                </div>


            </div>


            <div class="ak-footer-bottom">

                <span>
                    © ${new Date().getFullYear()}
                    Air Kerala. All rights reserved.
                </span>


                <span>
                    Affordable Air Travel, Redefined
                </span>

            </div>

        `;


        document.body.appendChild(
            footer
        );

    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function initialize() {

        createNavbar();

        createFooter();

    }


    /*
       The script is loaded inside the body,
       so DOMContentLoaded is safe and prevents
       footer from appearing before page content.
    */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    }
    else {

        initialize();

    }

})();
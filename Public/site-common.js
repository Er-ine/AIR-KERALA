/* =====================================================
   AIR KERALA — shared navbar + footer
   Usage (first thing inside <body>):
   <script src="site-common.js" data-page="home" data-auth="modal" data-overlay></script>

   data-page    home | book | manage   (which nav item is highlighted)
   data-auth    modal | account | logout | none   (default content of #authArea;
                each page's own script still updates #authArea as before)
   data-overlay homepage only: transparent over the hero, solid after scrolling
===================================================== */

(function () {

    /* ---------- EDIT CONTACT DETAILS HERE (footer, all pages) ---------- */
    var AK_CONTACT = {
        address:  'Air Kerala Headquarters, Cochin International Airport Complex, Nedumbassery, Kochi, Kerala 683111, India',
        phone:    '+91 484 261 0115',
        tollFree: '1800 425 0333',
        email:    'support@airkerala.com'
    };

    var LOGO = 'airkeralalogo.png';

    var LINKS = [
        { key: 'home',   label: 'Home',              href: 'index.html' },
        { key: 'book',   label: 'Book Ticket',       href: 'flights.html' },
        { key: 'manage', label: 'Manage My Booking', href: 'manage-booking.html' },
        { key: 'contact', label: 'Contact',          href: '#contact' }
    ];

    var script  = document.currentScript;
    var page    = (script && script.getAttribute('data-page')) || '';
    var auth    = (script && script.getAttribute('data-auth')) || 'none';
    var overlay = !!(script && script.hasAttribute('data-overlay'));

    var AUTH_HTML = {
        modal:   '<button class="login-btn" data-bs-toggle="modal" data-bs-target="#loginModal">👤 Login</button>',
        account: '<button class="login-btn" onclick="window.location.href=\'index.html\'">👤 Account</button>',
        logout:  '<button class="login-btn" onclick="logout()">🚪 Logout</button>',
        none:    ''
    };

    function linksHTML(cls) {
        return LINKS.map(function (l) {
            var active = l.key === page;
            return '<a href="' + l.href + '"' +
                (active ? ' class="active" aria-current="page"' : '') + '>' + l.label + '</a>';
        }).join('');
    }

    /* ---------- HEADER (inserted immediately, no flash) ---------- */

    var header = document.createElement('header');
    header.id = 'akHeader';
    header.className = 'ak-header no-print' + (overlay ? ' ak-header--overlay' : '');
    header.innerHTML =
        '<a class="ak-brand" href="index.html" aria-label="Air Kerala home">' +
            '<img src="' + LOGO + '" alt="Air Kerala">' +
        '</a>' +
        '<nav class="ak-links" id="akLinks" aria-label="Main">' + linksHTML() + '</nav>' +
        '<div class="ak-right">' +
            '<div id="authArea">' + (AUTH_HTML[auth] || '') + '</div>' +
            '<button class="ak-burger" id="akBurger" type="button" aria-label="Toggle menu" ' +
                'aria-expanded="false" aria-controls="akLinks"><span></span><span></span><span></span></button>' +
        '</div>';

    document.body.insertBefore(header, document.body.firstChild);

    var burger = header.querySelector('#akBurger');

    function setOpen(open) {
        header.classList.toggle('ak-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    burger.addEventListener('click', function () {
        setOpen(!header.classList.contains('ak-open'));
    });

    header.querySelector('#akLinks').addEventListener('click', function (e) {
        if (e.target.tagName === 'A') setOpen(false);
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth > 900) setOpen(false);
    });

    function onScroll() {
        header.classList.toggle('ak-scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- FOOTER / CONTACT (after the page has parsed) ---------- */

    function tel(n) { return 'tel:' + n.replace(/[^+\d]/g, ''); }

    function buildFooter() {
        if (document.getElementById('contact')) return;

        var c = AK_CONTACT;
        var footer = document.createElement('footer');
        footer.id = 'contact';
        footer.className = 'ak-footer no-print';
        footer.innerHTML =
            '<div class="ak-footer-inner">' +
                '<div class="ak-footer-grid">' +
                    '<div>' +
                        '<img class="ak-footer-logo" src="' + LOGO + '" alt="Air Kerala">' +
                        '<p class="ak-footer-about">Fly Beyond — warm hospitality and seamless domestic flight booking.</p>' +
                    '</div>' +
                    '<div>' +
                        '<div class="ak-footer-heading">Contact Us</div>' +
                        '<div class="ak-contact-item"><span>📍</span><div><strong>Office Address</strong>' + c.address + '</div></div>' +
                        '<div class="ak-contact-item"><span>📞</span><div><strong>Phone</strong>' +
                            '<a href="' + tel(c.phone) + '">' + c.phone + '</a>' +
                            ' &nbsp;·&nbsp; Toll free: <a href="' + tel(c.tollFree) + '">' + c.tollFree + '</a></div></div>' +
                        '<div class="ak-contact-item"><span>✉️</span><div><strong>Email</strong>' +
                            '<a href="mailto:' + c.email + '">' + c.email + '</a></div></div>' +
                    '</div>' +
                    '<div>' +
                        '<div class="ak-footer-heading">Quick Links</div>' +
                        '<div class="ak-footer-links">' + linksHTML() + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="ak-credits-slot"></div>' +
                '<div class="ak-footer-bottom">' +
                    '<span>© ' + new Date().getFullYear() + ' Air Kerala. All rights reserved.</span>' +
                    '<span>Fly beyond.</span>' +
                '</div>' +
            '</div>';

        document.body.appendChild(footer);

        // Homepage: move the existing image-credit block into the footer
        var credits = document.getElementById('ak-credits');
        if (credits) footer.querySelector('.ak-credits-slot').appendChild(credits);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildFooter);
    } else {
        buildFooter();
    }

})();
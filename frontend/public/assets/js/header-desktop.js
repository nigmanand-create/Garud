/**
 * Desktop Header JavaScript
 * Handles mega menu, sticky, scroll behaviors
 */

(function() {
    'use strict';

    // Elements
    let header = null;
    let megaParents = null;

    // State
    let lastScrollTop = 0;
    let headerHeight = 0;
    let isSticky = false;
    let scrollBehavior = 'sticky';

    /**
     * Initialize
     */
    function init() {
        header = document.querySelector('.header-desktop');
        
        if (!header) {
            return;
        }

        megaParents = header.querySelectorAll('.menu-item.has-mega');
        headerHeight = header.offsetHeight;
        isSticky = header.classList.contains('header-sticky');
        scrollBehavior = header.dataset.scrollBehavior || 'sticky';

        // Mega menu hover intent
        initMegaMenus();

        // Scroll behavior
        if (isSticky && scrollBehavior !== 'static') {
            initScrollBehavior();
        }

        // Dropdown keyboard navigation
        initKeyboardNav();
    }

    /**
     * Initialize mega menus with hover intent
     */
    function initMegaMenus() {
        megaParents.forEach(function(parent) {
            let timeout = null;
            const dropdown = parent.querySelector('.mega-dropdown');

            if (!dropdown) return;

            // Mouse enter
            parent.addEventListener('mouseenter', function() {
                clearTimeout(timeout);
                
                // Close other mega menus
                megaParents.forEach(function(other) {
                    if (other !== parent) {
                        other.classList.remove('mega-open');
                    }
                });

                parent.classList.add('mega-open');
            });

            // Mouse leave with delay
            parent.addEventListener('mouseleave', function() {
                timeout = setTimeout(function() {
                    parent.classList.remove('mega-open');
                }, 150);
            });

            // Keep open when hovering dropdown
            dropdown.addEventListener('mouseenter', function() {
                clearTimeout(timeout);
            });

            dropdown.addEventListener('mouseleave', function() {
                timeout = setTimeout(function() {
                    parent.classList.remove('mega-open');
                }, 150);
            });
        });
    }

    /**
     * Initialize scroll behavior
     */
    function initScrollBehavior() {
        const topbar = document.querySelector('.header-topbar');
        const topbarHeight = topbar ? topbar.offsetHeight : 0;

        window.addEventListener('scroll', throttle(function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

            switch (scrollBehavior) {
                case 'shrink':
                    handleShrink(scrollTop);
                    break;
                case 'hide-show':
                    handleHideShow(scrollTop, topbarHeight);
                    break;
                default:
                    handleSticky(scrollTop, topbarHeight);
            }

            lastScrollTop = scrollTop;
        }, 10));
    }

    /**
     * Handle sticky behavior
     */
    function handleSticky(scrollTop, topbarHeight) {
        if (scrollTop > topbarHeight) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
    }

    /**
     * Handle shrink behavior
     */
    function handleShrink(scrollTop) {
        if (scrollTop > 100) {
            header.classList.add('header-shrink');
        } else {
            header.classList.remove('header-shrink');
        }
    }

    /**
     * Handle hide/show on scroll
     */
    function handleHideShow(scrollTop, topbarHeight) {
        const scrollDiff = scrollTop - lastScrollTop;

        if (scrollTop <= topbarHeight) {
            // At top - show header
            header.classList.remove('header-hidden');
            header.classList.remove('header-scrolled');
        } else if (scrollDiff > 5 && scrollTop > headerHeight) {
            // Scrolling down - hide header
            header.classList.add('header-hidden');
        } else if (scrollDiff < -5) {
            // Scrolling up - show header
            header.classList.remove('header-hidden');
            header.classList.add('header-scrolled');
        }
    }

    /**
     * Initialize keyboard navigation
     */
    function initKeyboardNav() {
        const menuItems = header.querySelectorAll('.menu-item');

        menuItems.forEach(function(item) {
            const link = item.querySelector('.menu-link');
            const dropdown = item.querySelector('.dropdown-menu, .mega-dropdown');

            if (!link || !dropdown) return;

            // Arrow down opens dropdown
            link.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    item.classList.add('dropdown-open');
                    const firstLink = dropdown.querySelector('a');
                    if (firstLink) {
                        firstLink.focus();
                    }
                }
            });

            // Escape closes dropdown
            dropdown.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    item.classList.remove('dropdown-open');
                    link.focus();
                }

                // Tab navigation within dropdown
                if (e.key === 'Tab') {
                    const focusable = dropdown.querySelectorAll('a, button');
                    const first = focusable[0];
                    const last = focusable[focusable.length - 1];

                    if (e.shiftKey && document.activeElement === first) {
                        e.preventDefault();
                        link.focus();
                        item.classList.remove('dropdown-open');
                    } else if (!e.shiftKey && document.activeElement === last) {
                        item.classList.remove('dropdown-open');
                    }
                }
            });
        });
    }

    /**
     * Throttle helper
     */
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const context = this;
            const args = arguments;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(function() {
                    inThrottle = false;
                }, limit);
            }
        };
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

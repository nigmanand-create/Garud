/**
 * Mobile Menu JavaScript
 * Handles fullscreen & drawer templates
 */

(function() {
    'use strict';

    // Elements
    let mobileToggle = null;
    let mobileMenu = null;
    let mobileBackdrop = null;
    let mobileClose = null;
    let submenuToggles = null;

    // State
    let isOpen = false;

    /**
     * Initialize mobile menu
     */
    function init() {
        mobileToggle = document.querySelector('.header-mobile-toggle');
        mobileMenu = document.getElementById('mobileMenu');
        mobileBackdrop = document.getElementById('mobileBackdrop');
        mobileClose = document.querySelector('.mobile-menu-close');
        submenuToggles = document.querySelectorAll('.mobile-submenu-toggle');

        if (!mobileToggle || !mobileMenu) {
            return;
        }

        // Bind events
        mobileToggle.addEventListener('click', toggleMenu);
        
        if (mobileClose) {
            mobileClose.addEventListener('click', closeMenu);
        }

        if (mobileBackdrop) {
            mobileBackdrop.addEventListener('click', closeMenu);
        }

        // Submenu toggles
        submenuToggles.forEach(function(toggle) {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                toggleSubmenu(this);
            });
        });

        // Close on link click (if enabled)
        const closeOnClick = mobileMenu.dataset.closeOnClick !== 'false';
        if (closeOnClick) {
            const menuLinks = mobileMenu.querySelectorAll('.mobile-menu-link:not(.mobile-menu-parent .mobile-menu-link), .mobile-submenu-link');
            menuLinks.forEach(function(link) {
                link.addEventListener('click', function() {
                    // Small delay for visual feedback
                    setTimeout(closeMenu, 150);
                });
            });
        }

        // Close on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && isOpen) {
                closeMenu();
            }
        });

        // Handle resize
        window.addEventListener('resize', debounce(function() {
            if (window.innerWidth > 991 && isOpen) {
                closeMenu();
            }
        }, 150));
    }

    /**
     * Toggle menu open/close
     */
    function toggleMenu() {
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    /**
     * Open menu
     */
    function openMenu() {
        isOpen = true;
        
        mobileMenu.classList.add('active');
        
        if (mobileBackdrop) {
            mobileBackdrop.classList.add('active');
        }

        if (mobileToggle.classList.contains('hamburger-animated')) {
            mobileToggle.classList.add('is-active');
        }

        document.body.classList.add('mobile-menu-open');

        // Focus trap
        mobileMenu.setAttribute('aria-hidden', 'false');
        
        // Focus first focusable element
        const firstFocusable = mobileMenu.querySelector('button, a, input');
        if (firstFocusable) {
            setTimeout(function() {
                firstFocusable.focus();
            }, 100);
        }
    }

    /**
     * Close menu
     */
    function closeMenu() {
        isOpen = false;
        
        mobileMenu.classList.remove('active');
        
        if (mobileBackdrop) {
            mobileBackdrop.classList.remove('active');
        }

        if (mobileToggle.classList.contains('hamburger-animated')) {
            mobileToggle.classList.remove('is-active');
        }

        document.body.classList.remove('mobile-menu-open');

        mobileMenu.setAttribute('aria-hidden', 'true');

        // Close all submenus
        const openSubmenus = mobileMenu.querySelectorAll('.mobile-menu-item.submenu-open');
        openSubmenus.forEach(function(item) {
            item.classList.remove('submenu-open');
        });
    }

    /**
     * Toggle submenu
     */
    function toggleSubmenu(toggle) {
        const menuItem = toggle.closest('.mobile-menu-item');
        const submenu = menuItem.querySelector('.mobile-submenu');
        const isOpening = !menuItem.classList.contains('submenu-open');

        // Close other submenus (accordion behavior)
        const siblings = menuItem.parentElement.querySelectorAll('.mobile-menu-item.submenu-open');
        siblings.forEach(function(sibling) {
            if (sibling !== menuItem) {
                sibling.classList.remove('submenu-open');
            }
        });

        // Toggle current
        menuItem.classList.toggle('submenu-open');

        // Animate height
        if (submenu) {
            if (isOpening) {
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
            } else {
                submenu.style.maxHeight = '0';
            }
        }
    }

    /**
     * Debounce helper
     */
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

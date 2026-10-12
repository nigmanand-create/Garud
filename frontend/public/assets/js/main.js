/**
 * Main JavaScript file - COMPREHENSIVE DROPDOWN FIX
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Comprehensive dropdown fix starting...');

    // Enable Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Enable Bootstrap popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // CRITICAL FIX: Enable Bootstrap dropdowns - COMPREHENSIVE APPROACH
    function initializeAllDropdowns() {
        // Method 1: Standard Bootstrap 5 dropdowns
        var dropdownTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="dropdown"]'));
        var dropdownList = dropdownTriggerList.map(function(dropdownTriggerEl) {
            return new bootstrap.Dropdown(dropdownTriggerEl);
        });
        console.log('✅ Initialized', dropdownList.length, 'standard dropdowns');

        // Method 2: Fix any dropdown-toggle elements missing data-bs-toggle
        var dropdownToggles = document.querySelectorAll('.dropdown-toggle');
        var fixedCount = 0;
        dropdownToggles.forEach(function(toggle) {
            if (!toggle.getAttribute('data-bs-toggle')) {
                toggle.setAttribute('data-bs-toggle', 'dropdown');
                toggle.setAttribute('role', 'button');
                toggle.setAttribute('aria-expanded', 'false');
                new bootstrap.Dropdown(toggle);
                fixedCount++;
            }
        });
        console.log('✅ Fixed and initialized', fixedCount, 'missing dropdown attributes');

        // Method 3: Manual event handling for stubborn dropdowns
        dropdownToggles.forEach(function(toggle) {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();

                var dropdownMenu = this.nextElementSibling;
                if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
                    var isOpen = dropdownMenu.classList.contains('show');

                    // Close all other dropdowns
                    document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
                        if (menu !== dropdownMenu) {
                            menu.classList.remove('show');
                            var otherToggle = menu.previousElementSibling;
                            if (otherToggle) {
                                otherToggle.setAttribute('aria-expanded', 'false');
                            }
                        }
                    });

                    // Toggle current dropdown
                    if (isOpen) {
                        dropdownMenu.classList.remove('show');
                        this.setAttribute('aria-expanded', 'false');
                    } else {
                        dropdownMenu.classList.add('show');
                        this.setAttribute('aria-expanded', 'true');
                    }
                }
            });
        });
        console.log('✅ Added manual click handlers for all dropdown toggles');
    }

    // Initialize all dropdowns
    initializeAllDropdowns();

    // Re-initialize dropdowns when new content is loaded (for dynamic content)
    var observer = new MutationObserver(function(mutations) {
        var hasNewDropdowns = false;
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element node
                        var newDropdowns = node.querySelectorAll('.dropdown-toggle, [data-bs-toggle="dropdown"]');
                        if (newDropdowns.length > 0) {
                            hasNewDropdowns = true;
                        }
                    }
                });
            }
        });

        if (hasNewDropdowns) {
            setTimeout(initializeAllDropdowns, 100);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Global click handler to close dropdowns when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
                menu.classList.remove('show');
                var toggle = menu.previousElementSibling;
                if (toggle) {
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });
        }
    });

    // Escape key handler
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            document.querySelectorAll('.dropdown-menu.show').forEach(function(menu) {
                menu.classList.remove('show');
                var toggle = menu.previousElementSibling;
                if (toggle) {
                    toggle.setAttribute('aria-expanded', 'false');
                    toggle.focus();
                }
            });
        }
    });

    // Smooth scrolling for anchor links - FIXED: Exclude Bootstrap toggle elements
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            // CRITICAL FIX: Skip if this is a Bootstrap toggle (collapse, dropdown, tab, etc.)
            if (this.hasAttribute('data-bs-toggle') || 
                this.classList.contains('navbar-toggler') ||
                this.classList.contains('dropdown-toggle') ||
                this.closest('.navbar-toggler')) {
                return; // Let Bootstrap handle it
            }
            
            const targetId = this.getAttribute('href');
            if (targetId === '#' || targetId === '') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add active class to navbar items based on current page
    const currentUrl = window.location.href;
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');

    navLinks.forEach(link => {
        if (link.href === currentUrl) {
            link.classList.add('active');

            // If it's in a dropdown, also set the parent active
            const dropdownParent = link.closest('.dropdown');
            if (dropdownParent) {
                dropdownParent.querySelector('.dropdown-toggle').classList.add('active');
            }
        }
    });

    // Handle contact form validation
    const contactForm = document.querySelector('form[name="contact-form"]');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            let isValid = true;
            const requiredFields = contactForm.querySelectorAll('[required]');

            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('is-invalid');
                } else {
                    field.classList.remove('is-invalid');
                }

                // Email validation
                if (field.type === 'email' && field.value.trim()) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(field.value.trim())) {
                        isValid = false;
                        field.classList.add('is-invalid');
                    }
                }
            });

            if (!isValid) {
                e.preventDefault();
                alert('Please fill in all required fields correctly.');
            }
        });
    }

    // ADDED: Close mobile menu when clicking a nav link (for better UX)
    const navbarCollapse = document.getElementById('navbarMain');
    if (navbarCollapse) {
        const navLinksInCollapse = navbarCollapse.querySelectorAll('.nav-link:not(.dropdown-toggle)');
        navLinksInCollapse.forEach(link => {
            link.addEventListener('click', function() {
                // Check if menu is open and we're on mobile
                if (navbarCollapse.classList.contains('show') && window.innerWidth < 992) {
                    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                    if (bsCollapse) {
                        bsCollapse.hide();
                    }
                }
            });
        });
    }

    console.log('✅ All dropdown fixes applied successfully');
});

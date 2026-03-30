/**
 * Mugiwara Dashboard v2 — Core UI interactions.
 * Sidebar toggle, drawer open/close, toast auto-dismiss, HTMX event hooks.
 */

(function () {
    'use strict';

    /* ------------------------------------------------------------------ */
    /*  Sidebar                                                            */
    /* ------------------------------------------------------------------ */

    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function () {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
        });

        // Restore state from localStorage
        if (localStorage.getItem('sidebar-collapsed') === 'true') {
            sidebar.classList.add('collapsed');
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Drawer                                                             */
    /* ------------------------------------------------------------------ */

    const drawer = document.getElementById('drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawerClose = document.getElementById('drawer-close');
    const drawerBody = document.getElementById('drawer-body');
    const drawerTitle = document.getElementById('drawer-title');

    function openDrawer(title, contentHtml) {
        if (!drawer) return;
        if (title && drawerTitle) drawerTitle.textContent = title;
        if (contentHtml && drawerBody) drawerBody.innerHTML = contentHtml;
        drawer.classList.add('open');
        if (drawerOverlay) drawerOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        // Focus trap — focus close button
        if (drawerClose) drawerClose.focus();
    }

    function closeDrawer() {
        if (!drawer) return;
        drawer.classList.remove('open');
        if (drawerOverlay) drawerOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (drawerClose) {
        drawerClose.addEventListener('click', closeDrawer);
    }
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', closeDrawer);
    }

    // Escape key closes drawer
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) {
            closeDrawer();
        }
    });

    // Expose globally for HTMX usage
    window.MugiDrawer = { open: openDrawer, close: closeDrawer };

    /* ------------------------------------------------------------------ */
    /*  HTMX → Drawer integration                                         */
    /* ------------------------------------------------------------------ */

    // When an element with [data-drawer-url] is clicked, fetch via HTMX into drawer
    document.addEventListener('click', function (e) {
        const trigger = e.target.closest('[data-drawer-url]');
        if (!trigger) return;
        e.preventDefault();
        var url = trigger.getAttribute('data-drawer-url');
        var title = trigger.getAttribute('data-drawer-title') || 'Detail';
        openDrawer(title, '<div class="drawer-loading"><span class="neon-spinner"></span></div>');
        // Use HTMX to fetch content into drawer body
        if (window.htmx && drawerBody) {
            htmx.ajax('GET', url, { target: '#drawer-body', swap: 'innerHTML' });
        }
    });

    // After HTMX swaps content into drawer, re-init any charts
    document.addEventListener('htmx:afterSwap', function (e) {
        if (e.detail.target && e.detail.target.id === 'drawer-body') {
            // Reinitialize D3 charts in new content
            if (window.MugiCharts && window.MugiCharts.initChartsInContainer) {
                window.MugiCharts.initChartsInContainer(e.detail.target);
            }
        }
    });

    /* ------------------------------------------------------------------ */
    /*  Toasts                                                             */
    /* ------------------------------------------------------------------ */

    function initToasts() {
        document.querySelectorAll('.toast[data-auto-dismiss]').forEach(function (toast) {
            var delay = parseInt(toast.getAttribute('data-auto-dismiss'), 10) || 5000;

            // Close button
            var closeBtn = toast.querySelector('.toast__close');
            if (closeBtn) {
                closeBtn.addEventListener('click', function () {
                    dismissToast(toast);
                });
            }

            // Auto dismiss
            setTimeout(function () {
                dismissToast(toast);
            }, delay);
        });
    }

    function dismissToast(toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(function () {
            toast.remove();
        }, 300);
    }

    initToasts();

    /* ------------------------------------------------------------------ */
    /*  HTMX global error handler                                          */
    /* ------------------------------------------------------------------ */

    document.addEventListener('htmx:responseError', function (e) {
        showToast('Request failed: ' + (e.detail.xhr ? e.detail.xhr.status : 'network error'), 'error');
    });

    function showToast(message, type) {
        var container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        var toast = document.createElement('div');
        toast.className = 'toast toast--' + (type || 'info');
        toast.setAttribute('role', 'alert');
        toast.setAttribute('data-auto-dismiss', '5000');
        toast.innerHTML = '<span class="toast__text">' + message + '</span>' +
            '<button class="toast__close" aria-label="Dismiss">&times;</button>';
        container.appendChild(toast);

        var closeBtn = toast.querySelector('.toast__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function () { dismissToast(toast); });
        }
        setTimeout(function () { dismissToast(toast); }, 5000);
    }

    window.MugiToast = showToast;

    /* ------------------------------------------------------------------ */
    /*  Project action helpers (used by cards and detail page)             */
    /* ------------------------------------------------------------------ */

    window.projectAction = function (url) {
        fetch(url, { method: 'POST' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data.ok) {
                    showToast('Action launched: ' + (data.action || 'ok'), 'success');
                } else {
                    showToast('Error: ' + (data.error || 'unknown'), 'error');
                }
            })
            .catch(function () {
                showToast('Network error', 'error');
            });
    };

    window.openAgentPicker = function (projectName, url) {
        var overlay = document.getElementById('agent-picker-overlay');
        if (overlay) {
            document.getElementById('agent-picker-url').value = url;
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    };

    window.closeAgentPicker = function () {
        var overlay = document.getElementById('agent-picker-overlay');
        if (overlay) {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    };

})();

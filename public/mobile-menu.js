// Mobile menu toggle
(function() {
  function initMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('mobileMenu');
    const closeBtn = document.getElementById('mobileMenuClose');

    if (!menuBtn || !menu || !closeBtn) {
      console.warn('Mobile menu elements not found');
      return;
    }

    menuBtn.addEventListener('click', () => {
      console.log('Menu button clicked');
      menu.classList.toggle('open');
    });

    closeBtn.addEventListener('click', () => {
      console.log('Close button clicked');
      menu.classList.remove('open');
    });

    // Close when clicking outside
    menu.addEventListener('click', (e) => {
      if (e.target === menu) {
        menu.classList.remove('open');
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
  } else {
    initMobileMenu();
  }
})();

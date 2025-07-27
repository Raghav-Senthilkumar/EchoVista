
    const navLinks = document.querySelectorAll('.nav-link');
    const tabSections = document.querySelectorAll('.tab-section');

    function showTab(targetTab) {
      // Hide all sections
      tabSections.forEach(section => section.classList.remove('active'));
      
      // Show target section
      const targetSection = document.getElementById(targetTab + '-section');
      if (targetSection) {
        targetSection.classList.add('active');
      }
    }

    navLinks.forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        
        // Update nav active state
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Show corresponding tab
        const tab = link.getAttribute('data-tab');
        showTab(tab);
      });
    });

window.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const section = this.getAttribute('href').replace('#', '');
      showSection(section);
      navLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');
    });
  });
}); 
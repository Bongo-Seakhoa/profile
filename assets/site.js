document.addEventListener("DOMContentLoaded", () => {
  // --- Staggered Reveal Animations ---
  const revealContainers = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    revealContainers.forEach((node) => {
      node.classList.add("is-visible");
      node.querySelectorAll("[data-delay]").forEach((c) => c.removeAttribute("data-delay"));
    });
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    revealContainers.forEach((node) => observer.observe(node));
  }

  // Auto-assign stagger delay attributes to card children
  document.querySelectorAll(
    ".card-grid, .stats-grid, .credentials-grid, .projects-grid, .entry-grid, .link-grid, .timeline"
  ).forEach((grid) => {
    const children = grid.querySelectorAll(
      ".info-card, .project-card, .credential-card, .timeline-item, .link-pill, .stat-card, .coursework-card, .entry-card"
    );
    children.forEach((child, i) => {
      child.setAttribute("data-delay", String(Math.min(i + 1, 8)));
    });
  });

  // --- Floating Particles ---
  const canvas = document.getElementById("particles-canvas");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    let particles = [];
    let w, ht;
    const PARTICLE_COUNT = 45;

    function resize() {
      w = canvas.width = window.innerWidth;
      ht = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function createParticle() {
      return {
        x: Math.random() * w,
        y: Math.random() * ht,
        r: Math.random() * 1.8 + 0.4,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.1,
        color: Math.random() > 0.5 ? "116,208,198" : "255,209,138",
      };
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }

    function drawParticles() {
      ctx.clearRect(0, 0, w, ht);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;

        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = ht + 10;
        if (p.y > ht + 10) p.y = -10;
      });

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(116,208,198,${0.06 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(drawParticles);
    }

    // Only animate particles if not a resume page
    if (!document.body.classList.contains("resume-page")) {
      drawParticles();
    }
  }

  // --- Header scroll effect ---
  const header = document.querySelector(".site-header");
  if (header) {
    let lastScroll = 0;
    window.addEventListener("scroll", () => {
      const current = window.scrollY;
      if (current > 100) {
        header.style.background = "rgba(8, 14, 24, 0.85)";
      } else {
        header.style.background = "rgba(8, 14, 24, 0.55)";
      }
      lastScroll = current;
    }, { passive: true });
  }
});

document.addEventListener('DOMContentLoaded', () => {
  // Load portfolio data
  loadPortfolioData();

  // Smooth scrolling for navigation links
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});

async function loadPortfolioData() {
  try {
    const response = await fetch('/api/portfolio');
    const data = await response.json();
    renderProjects(data.projects);
  } catch (error) {
    console.error('Error loading portfolio data:', error);
    document.getElementById('projects-container').innerHTML = 
      '<p>Failed to load projects. Please try again later.</p>';
  }
}

function renderProjects(projects) {
  const container = document.getElementById('projects-container');
  container.innerHTML = '';

  projects.forEach(project => {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    projectCard.innerHTML = `
      <h3>${project.title}</h3>
      <p>${project.description}</p>
      <a href="${project.link}" class="project-link">View Project</a>
    `;
    container.appendChild(projectCard);
  });
}
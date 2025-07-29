// public/router.js
const routes = {
  '/': 'index.html',
  '/login': 'login.html',
  '/admin-dashboard': 'admin-dashboard.html',
  '/student-dashboard': 'student-dashboard.html',
  '/chat': 'chat.html',
  '/lend-resource': 'lend-resource.html',
  '/my-resources': 'my-resources.html',
  '/resources': 'resources.html',
  '/admin-chat': 'admin-chat.html'
};

// Ensure window.__env exists (fallback if config.js fails)
if (!window.__env) {
  console.warn('Config not loaded! Using fallback API_BASE');
  window.__env = { 
    API_BASE: 'https://your-render-backend.onrender.com' 
  };
}

// Initialize router
function initRouter() {
  // Create app container safely
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('App container not found!');
    return;
  }

  // Load initial page
  loadPage(window.location.pathname);

  // Handle navigation
  document.addEventListener('click', handleLinkClick);
  window.addEventListener('popstate', () => {
    loadPage(window.location.pathname);
  });
}

// Safe page loader
async function loadPage(path) {
  const appContainer = document.getElementById('app');
  if (!appContainer) return;

  try {
    const pagePath = routes[path] || routes['/'];
    const response = await fetch(pagePath);
    
    if (!response.ok) throw new Error(`Failed to load ${pagePath}`);
    
    const html = await response.text();
    const bodyContent = extractBodyContent(html);
    
    appContainer.innerHTML = bodyContent;
    initPageScripts(); // Initialize scripts for the new page
    scrollTo(0, 0);

  } catch (error) {
    console.error('Page load error:', error);
    if (path !== '/') loadPage('/'); // Fallback to home
  }
}

// Extract content between <body> tags
function extractBodyContent(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

// Handle link clicks
function handleLinkClick(event) {
  const link = event.target.closest('a[href]');
  if (!link) return;

  const href = link.getAttribute('href');
  
  // Ignore external links or anchors
  if (href.startsWith('http') || href.startsWith('#')) return;
  
  event.preventDefault();
  history.pushState({}, '', href);
  loadPage(href);
}

// Initialize scripts for the loaded page
function initPageScripts() {
  // Dark mode toggle
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', toggleDarkMode);
  }

  // Safe form handling
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', handleFormSubmit);
  });
}

// Dark mode toggle
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const icon = this.querySelector('i');
  if (icon) {
    icon.classList.toggle('fa-sun');
    icon.classList.toggle('fa-moon');
  }
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// Form submission handler
async function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');

  try {
    if (submitButton) {
      submitButton.disabled = true;
      const spinner = submitButton.querySelector('.spinner-border') || createSpinner();
      submitButton.appendChild(spinner);
    }

    const formData = new FormData(form);
    const response = await fetch(form.action || `${window.__env.API_BASE}${form.dataset.action}`, {
      method: form.method || 'POST',
      body: form.enctype === 'multipart/form-data' ? formData : JSON.stringify(Object.fromEntries(formData)),
      headers: { 'Content-Type': form.enctype || 'application/json' }
    });

    const result = await response.json();
    showToast(result.message || 'Action completed', result.error ? 'danger' : 'success');

  } catch (error) {
    showToast('Request failed', 'danger');
    console.error('Form error:', error);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      const spinner = submitButton.querySelector('.spinner-border');
      if (spinner) spinner.remove();
    }
  }
}

// Helper to show toast messages
function showToast(message, type = 'primary') {
  const toast = document.getElementById('toast') || createToast();
  toast.textContent = message;
  toast.className = `toast show bg-${type}`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// Start the router when DOM is ready
document.addEventListener('DOMContentLoaded', initRouter);

// Make navigateTo available globally
window.navigateTo = (path) => {
  history.pushState({}, '', path);
  loadPage(path);
};
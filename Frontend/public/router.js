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

// DOM elements
const appContainer = document.getElementById('app') || createAppContainer();
let currentPath = window.location.pathname;

// Initialize router
function initRouter() {
  // Create app container if it doesn't exist
  if (!document.getElementById('app')) {
    document.body.appendChild(createAppContainer());
  }

  // Load initial page
  loadPage(currentPath);

  // Handle back/forward navigation
  window.addEventListener('popstate', handlePopState);

  // Intercept all link clicks
  document.addEventListener('click', handleLinkClick);
}

// Create app container if missing
function createAppContainer() {
  const appDiv = document.createElement('div');
  appDiv.id = 'app';
  document.body.appendChild(appDiv);
  return appDiv;
}

// Handle page loading
async function loadPage(path) {
  try {
    currentPath = path;
    const pagePath = routes[path] || routes['/'];
    
    // Show loading state for initial load
    if (path === '/' && !appContainer.innerHTML.includes('skeleton-loader')) {
      appContainer.innerHTML = `
        <div id="skeletonLoader" style="display:block;">
          <div class="skeleton skeleton-box w-100"></div>
        </div>
      `;
    }

    // Fetch and load page content
    const response = await fetch(pagePath);
    if (!response.ok) throw new Error('Page not found');
    
    const html = await response.text();
    const bodyContent = extractBodyContent(html);
    
    appContainer.innerHTML = bodyContent;
    window.scrollTo(0, 0);
    
    // Initialize page-specific scripts
    initializePageScripts();
    
  } catch (error) {
    console.error('Page load error:', error);
    if (path !== '/') loadPage('/'); // Fallback to home
  }
}

// Extract body content from HTML
function extractBodyContent(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

// Handle link clicks
function handleLinkClick(event) {
  const link = event.target.closest('a[href]');
  if (!link) return;
  
  const href = link.getAttribute('href');
  
  // Skip if it's an external link or anchor
  if (href.startsWith('http') || href.startsWith('#')) return;
  
  event.preventDefault();
  navigateTo(href);
}

// Programmatic navigation
function navigateTo(path) {
  if (path === currentPath) return;
  
  history.pushState({}, '', path);
  loadPage(path);
}

// Handle browser back/forward
function handlePopState() {
  if (window.location.pathname !== currentPath) {
    loadPage(window.location.pathname);
  }
}

// Initialize page-specific scripts
function initializePageScripts() {
  // Dark mode initialization
  initializeDarkMode();
  
  // Form handling
  initializeForms();
}

function initializeDarkMode() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (!darkModeToggle) return;

  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  document.body.classList.toggle('dark-mode', isDarkMode);
  
  const icon = darkModeToggle.querySelector('i');
  if (icon) {
    icon.classList.toggle('fa-sun', isDarkMode);
    icon.classList.toggle('fa-moon', !isDarkMode);
  }

  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
    
    if (icon) {
      icon.classList.toggle('fa-sun', isDark);
      icon.classList.toggle('fa-moon', !isDark);
    }
  });
}

function initializeForms() {
  document.querySelectorAll('form').forEach(form => {
    if (form.hasAttribute('data-no-intercept')) return;
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitButton = form.querySelector('button[type="submit"]');
      
      try {
        // Show loading state
        if (submitButton) {
          submitButton.disabled = true;
          const spinner = submitButton.querySelector('.spinner-border') || 
                         document.createElement('span');
          spinner.className = 'spinner-border spinner-border-sm ms-2';
          spinner.style.verticalAlign = 'middle';
          submitButton.appendChild(spinner);
        }
        
        // Handle form submission
        const formData = new FormData(form);
        const response = await fetch(form.action || window.__env.API_BASE + form.getAttribute('data-action'), {
          method: form.method || 'POST',
          body: form.enctype === 'multipart/form-data' ? formData : JSON.stringify(Object.fromEntries(formData)),
          headers: {
            'Content-Type': form.enctype || 'application/json'
          }
        });
        
        const result = await response.json();
        
        // Handle response
        if (result.error) {
          showToast(result.error, 'danger');
        } else {
          if (result.redirect) {
            navigateTo(result.redirect);
          } else if (result.message) {
            showToast(result.message, 'success');
          }
        }
      } catch (error) {
        showToast('An error occurred', 'danger');
        console.error('Form error:', error);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          const spinner = submitButton.querySelector('.spinner-border');
          if (spinner) spinner.remove();
        }
      }
    });
  });
}

function showToast(message, type = 'primary') {
  const toast = document.getElementById('hotToast') || createToastElement();
  const toastMsg = toast.querySelector('#hotToastMsg');
  
  toastMsg.textContent = message;
  toast.className = `toast align-items-center text-white bg-${type} border-0 show`;
  toast.style.display = 'block';
  
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

function createToastElement() {
  const toast = document.createElement('div');
  toast.id = 'hotToast';
  toast.className = 'toast align-items-center text-white bg-primary border-0';
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.right = '20px';
  toast.style.zIndex = '1100';
  toast.style.display = 'none';
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body" id="hotToastMsg"></div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button>
    </div>
  `;
  
  toast.querySelector('button').addEventListener('click', () => {
    toast.style.display = 'none';
  });
  
  document.body.appendChild(toast);
  return toast;
}

// Start the router
document.addEventListener('DOMContentLoaded', initRouter);

// Make navigateTo available globally
window.navigateTo = navigateTo;
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { RouteInfo, getRouteInfo, getSystemInfo, SystemInfo } from '../utils/routeInfo';

const router = Router();

/**
 * GET /
 * Dashboard route that displays API health and endpoint information
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get all route information
    const routeInfo = getRouteInfo();
    
    // Get system information
    const sysInfo = getSystemInfo();
    
    // Generate HTML dashboard
    const html = generateDashboardHTML(routeInfo, sysInfo);
    
    // Send the HTML response
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to generate dashboard' 
    });
  }
});

/**
 * Generates the HTML for the dashboard
 */
function generateDashboardHTML(routeInfo: RouteInfo[], sysInfo: SystemInfo): string {
  const isDev = sysInfo.environment !== 'production';
  const serverVersion = sysInfo.version;
  const nodeVersion = sysInfo.nodeVersion;
  const uptime = formatUptime(sysInfo.uptime);
  const memoryUsage = sysInfo.memoryUsage.heapUsed;
  const totalMemory = sysInfo.memoryUsage.heapTotal;
  const rssMemory = sysInfo.memoryUsage.rss;
  const dbStatus = sysInfo.databaseStatus;
  const startTime = sysInfo.startTime.toLocaleString();
  
  // Group routes by category
  const routesByCategory: { [key: string]: RouteInfo[] } = {};
  routeInfo.forEach(route => {
    const category = route.category || 'Other';
    if (!routesByCategory[category]) {
      routesByCategory[category] = [];
    }
    routesByCategory[category].push(route);
  });
  
  return `
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ServiceFix API Dashboard</title>
  <style>
    :root {
      --primary: #3498db;
      --secondary: #2ecc71;
      --danger: #e74c3c;
      --warning: #f39c12;
      --info: #1abc9c;
      --dark: #34495e;
      --light: #ecf0f1;
      --text: #2c3e50;
      --light-hover: #bdc3c7;
      --border: #ddd;
      --card-bg: #fff;
      --body-bg: #ecf0f1;
    }
    
    [data-theme="dark"] {
      --primary: #3498db;
      --secondary: #2ecc71;
      --danger: #e74c3c;
      --warning: #f39c12;
      --info: #1abc9c;
      --dark: #2c3e50;
      --light: #2c3e50;
      --text: #ecf0f1;
      --light-hover: #34495e;
      --border: #34495e;
      --card-bg: #34495e;
      --body-bg: #1a1a1a;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
      line-height: 1.6;
      color: var(--text);
      background-color: var(--body-bg);
      padding: 20px;
      transition: all 0.3s ease;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 15px;
      border-bottom: 2px solid var(--primary);
    }
    
    h1 {
      color: var(--primary);
      font-size: 2.5rem;
      margin-bottom: 10px;
    }
    
    h2 {
      color: var(--dark);
      margin-bottom: 15px;
      font-size: 1.8rem;
    }
    
    .badge {
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: bold;
      display: inline-block;
      margin-left: 10px;
    }
    
    .badge-success {
      background-color: var(--secondary);
      color: white;
    }
    
    .badge-danger {
      background-color: var(--danger);
      color: white;
    }
    
    .badge-info {
      background-color: var(--info);
      color: white;
    }
    
    .badge-warning {
      background-color: var(--warning);
      color: white;
    }
    
    .status-section {
      background-color: var(--card-bg);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .info-item {
      background-color: var(--light);
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s;
    }
    
    .info-item:hover {
      transform: translateY(-3px);
    }
    
    .info-title {
      font-size: 0.9rem;
      color: var(--dark);
      margin-bottom: 5px;
      font-weight: bold;
    }
    
    .info-value {
      font-size: 1.1rem;
      font-weight: 500;
    }
    
    .routes-section {
      background-color: var(--card-bg);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .route-group {
      margin-bottom: 30px;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    
    .route-group-title {
      font-size: 1.3rem;
      padding: 15px;
      color: var(--dark);
      background-color: var(--light);
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .route-group-title:hover {
      background-color: var(--light-hover);
    }
    
    .route-group-content {
      display: block;
    }
    
    .route-group-content.collapsed {
      display: none;
    }
    
    .route-count {
      background-color: var(--primary);
      color: white;
      border-radius: 20px;
      padding: 2px 10px;
      font-size: 0.8rem;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      text-align: left;
      padding: 12px 15px;
      border-bottom: 1px solid var(--border);
    }
    
    th {
      background-color: var(--light);
      color: var(--dark);
      position: sticky;
      top: 0;
    }
    
    tr:hover {
      background-color: var(--light-hover);
    }
    
    .method {
      font-weight: bold;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      min-width: 70px;
      text-align: center;
    }
    
    .GET {
      color: white;
      background-color: var(--primary);
    }
    
    .POST {
      color: white;
      background-color: var(--secondary);
    }
    
    .PUT {
      color: white;
      background-color: var(--warning);
    }
    
    .DELETE {
      color: white;
      background-color: var(--danger);
    }
    
    .PATCH {
      color: white;
      background-color: var(--info);
    }
    
    .auth-required {
      display: inline-block;
      background-color: var(--warning);
      color: white;
      font-size: 0.7rem;
      padding: 2px 5px;
      border-radius: 3px;
      margin-left: 8px;
      vertical-align: middle;
    }
    
    .search-container {
      margin-bottom: 20px;
      display: flex;
      align-items: center;
    }
    
    .search-input {
      padding: 10px 15px;
      border: 1px solid var(--border);
      border-radius: 4px;
      width: 100%;
      font-size: 1rem;
      background-color: var(--card-bg);
      color: var(--text);
    }
    
    .search-input:focus {
      outline: none;
      border-color: var(--primary);
    }
    
    .theme-toggle {
      background-color: var(--light);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-left: 15px;
      color: var(--dark);
      font-size: 1.2rem;
      transition: background-color 0.3s;
    }
    
    .theme-toggle:hover {
      background-color: var(--light-hover);
    }
    
    .endpoint-actions {
      display: flex;
      gap: 10px;
    }
    
    .btn {
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: opacity 0.3s;
    }
    
    .btn:hover {
      opacity: 0.8;
    }
    
    .btn-try {
      background-color: var(--primary);
      color: white;
    }
    
    .btn-copy {
      background-color: var(--dark);
      color: white;
    }
    
    .params-list {
      margin-top: 5px;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    
    .param-tag {
      background-color: var(--light);
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 0.8rem;
      color: var(--dark);
    }
    
    .endpoint-test-panel {
      padding: 15px;
      background-color: var(--light);
      border-radius: 8px;
      margin-top: 10px;
      display: none;
    }
    
    .endpoint-test-panel.active {
      display: block;
    }
    
    .param-input-container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .param-input-group {
      display: flex;
      flex-direction: column;
    }
    
    .param-label {
      font-size: 0.9rem;
      margin-bottom: 5px;
      color: var(--dark);
    }
    
    .param-input {
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 4px;
      font-size: 0.9rem;
      background-color: var(--card-bg);
      color: var(--text);
    }
    
    .test-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    
    .btn-send {
      background-color: var(--primary);
      color: white;
      padding: 8px 16px;
    }
    
    .btn-cancel {
      background-color: var(--light);
      color: var(--dark);
      padding: 8px 16px;
    }
    
    .test-result {
      margin-top: 15px;
      padding: 15px;
      border-radius: 8px;
      background-color: var(--dark);
      color: white;
      overflow-x: auto;
      display: none;
    }
    
    .test-result.active {
      display: block;
    }
    
    .system-status {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    
    .status-indicator {
      width: 15px;
      height: 15px;
      border-radius: 50%;
      display: inline-block;
    }
    
    .status-connected {
      background-color: var(--secondary);
    }
    
    .status-disconnected {
      background-color: var(--danger);
    }
    
    .status-unknown {
      background-color: var(--warning);
    }
    
    footer {
      text-align: center;
      margin-top: 30px;
      color: var(--dark);
      font-size: 0.9rem;
    }
    
    @media (max-width: 768px) {
      .info-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (max-width: 480px) {
      .info-grid {
        grid-template-columns: 1fr;
      }
      
      .endpoint-actions {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>ServiceFix API Dashboard</h1>
        <p>API monitoring and documentation</p>
      </div>
      <div class="system-status">
        <span class="badge badge-${dbStatus === 'connected' ? 'success' : dbStatus === 'disconnected' ? 'danger' : 'warning'}">
          <span class="status-indicator status-${dbStatus}"></span>
          ${dbStatus === 'connected' ? 'API Online' : dbStatus === 'disconnected' ? 'DB Disconnected' : 'Status Unknown'}
        </span>
        <button id="themeToggle" class="theme-toggle">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </button>
      </div>
    </header>
    
    <div class="status-section">
      <h2>System Status</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-title">Environment</div>
          <div class="info-value">${isDev ? 'Development' : 'Production'}</div>
        </div>
        <div class="info-item">
          <div class="info-title">Server Version</div>
          <div class="info-value">${serverVersion}</div>
        </div>
        <div class="info-item">
          <div class="info-title">Node.js Version</div>
          <div class="info-value">${nodeVersion}</div>
        </div>
        <div class="info-item">
          <div class="info-title">Start Time</div>
          <div class="info-value">${startTime}</div>
        </div>
        <div class="info-item">
          <div class="info-title">Uptime</div>
          <div class="info-value">${uptime}</div>
        </div>
        <div class="info-item">
          <div class="info-title">Memory Usage</div>
          <div class="info-value">${memoryUsage} MB / ${totalMemory} MB</div>
        </div>
        <div class="info-item">
          <div class="info-title">Database Status</div>
          <div class="info-value">
            <span class="status-indicator status-${dbStatus}"></span>
            ${dbStatus.charAt(0).toUpperCase() + dbStatus.slice(1)}
          </div>
        </div>
        <div class="info-item">
          <div class="info-title">RSS Memory</div>
          <div class="info-value">${rssMemory} MB</div>
        </div>
      </div>
    </div>
    
    <div class="routes-section">
      <h2>API Endpoints</h2>
      
      <div class="search-container">
        <input type="text" id="searchEndpoints" class="search-input" placeholder="Search endpoints by path, method, or description...">
      </div>
      
      ${Object.keys(routesByCategory).sort().map(category => `
        <div class="route-group" data-category="${category}">
          <div class="route-group-title">
            <span>${category}</span>
            <span class="route-count">${routesByCategory[category].length}</span>
          </div>
          <div class="route-group-content">
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${routesByCategory[category].sort((a, b) => a.path.localeCompare(b.path)).map(route => `
                  <tr class="endpoint-row" data-path="${route.path}" data-method="${route.method}">
                    <td>
                      <span class="method ${route.method}">${route.method}</span>
                      ${route.requiresAuth ? '<span class="auth-required">Auth</span>' : ''}
                    </td>
                    <td>${route.path}</td>
                    <td>
                      ${route.description || '-'}
                      ${route.params && route.params.length > 0 ? 
                        `<div class="params-list">
                          ${route.params.map(param => `<span class="param-tag">${param}</span>`).join('')}
                        </div>` : ''}
                    </td>
                    <td>
                      <div class="endpoint-actions">
                        <button class="btn btn-try" data-action="try">Try it</button>
                        <button class="btn btn-copy" data-action="copy">Copy URL</button>
                      </div>
                      <div class="endpoint-test-panel" id="test-${route.path.replace(/\//g, '-').replace(/:/g, '-')}-${route.method}">
                        <h4>Test Endpoint</h4>
                        ${route.params && route.params.length > 0 ? 
                          `<div class="param-input-container">
                            ${route.params.map(param => `
                              <div class="param-input-group">
                                <label class="param-label" for="param-${param}">${param}:</label>
                                <input class="param-input" type="text" id="param-${param}" name="${param}" placeholder="${param}">
                              </div>
                            `).join('')}
                          </div>` : ''}
                        <div class="test-actions">
                          <button class="btn btn-cancel" data-action="cancel-test">Cancel</button>
                          <button class="btn btn-send" data-action="send-request">Send Request</button>
                        </div>
                        <div class="test-result" id="result-${route.path.replace(/\//g, '-').replace(/:/g, '-')}-${route.method}">
                          <pre><code></code></pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  
  <footer>
    <p>© ${new Date().getFullYear()} ServiceFix. All rights reserved.</p>
  </footer>
  
  <script>
    // Theme toggle functionality
    const themeToggle = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;
    
    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      htmlElement.setAttribute('data-theme', savedTheme);
      updateThemeIcon(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      htmlElement.setAttribute('data-theme', 'dark');
      updateThemeIcon('dark');
    }
    
    themeToggle.addEventListener('click', () => {
      const currentTheme = htmlElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      htmlElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeIcon(newTheme);
    });
    
    function updateThemeIcon(theme) {
      if (theme === 'dark') {
        themeToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
      } else {
        themeToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
      }
    }
    
    // Route group collapsing
    const routeGroupTitles = document.querySelectorAll('.route-group-title');
    routeGroupTitles.forEach(title => {
      title.addEventListener('click', () => {
        const content = title.nextElementSibling;
        content.classList.toggle('collapsed');
      });
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchEndpoints');
    const endpointRows = document.querySelectorAll('.endpoint-row');
    const routeGroups = document.querySelectorAll('.route-group');
    
    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase();
      
      endpointRows.forEach(row => {
        const path = row.getAttribute('data-path').toLowerCase();
        const method = row.getAttribute('data-method').toLowerCase();
        const description = row.querySelector('td:nth-child(3)').textContent.toLowerCase();
        
        const matches = path.includes(searchTerm) || 
                        method.includes(searchTerm) || 
                        description.includes(searchTerm);
        
        row.style.display = matches ? '' : 'none';
      });
      
      // Show/hide groups based on visible rows
      routeGroups.forEach(group => {
        const visibleRows = group.querySelectorAll('.endpoint-row[style=""]').length;
        const anyVisibleRows = group.querySelectorAll('.endpoint-row:not([style="display: none;"])').length;
        group.style.display = anyVisibleRows > 0 ? '' : 'none';
        
        // Update count
        const countElement = group.querySelector('.route-count');
        if (countElement) {
          countElement.textContent = anyVisibleRows;
        }
      });
    });
    
    // Endpoint testing functionality
    const actionButtons = document.querySelectorAll('.btn[data-action]');
    actionButtons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action');
        const row = button.closest('.endpoint-row');
        const path = row.getAttribute('data-path');
        const method = row.getAttribute('data-method');
        
        if (action === 'try') {
          const panelId = \`test-\${path.replace(/\\//g, '-').replace(/:/g, '-')}-\${method}\`;
          const panel = document.getElementById(panelId);
          
          // Close all other panels first
          document.querySelectorAll('.endpoint-test-panel.active').forEach(p => {
            if (p.id !== panelId) {
              p.classList.remove('active');
            }
          });
          
          panel.classList.toggle('active');
        } else if (action === 'copy') {
          const baseUrl = window.location.origin;
          navigator.clipboard.writeText(\`\${baseUrl}\${path}\`)
            .then(() => {
              const originalText = button.textContent;
              button.textContent = 'Copied!';
              setTimeout(() => {
                button.textContent = originalText;
              }, 2000);
            });
        } else if (action === 'cancel-test') {
          const panel = button.closest('.endpoint-test-panel');
          panel.classList.remove('active');
        } else if (action === 'send-request') {
          const row = button.closest('.endpoint-row');
          const path = row.getAttribute('data-path');
          const method = row.getAttribute('data-method');
          const panel = button.closest('.endpoint-test-panel');
          const resultId = \`result-\${path.replace(/\\//g, '-').replace(/:/g, '-')}-\${method}\`;
          const resultPanel = document.getElementById(resultId);
          const codeElement = resultPanel.querySelector('code');
          
          // Collect parameters
          const inputs = panel.querySelectorAll('.param-input');
          const params = {};
          inputs.forEach(input => {
            params[input.name] = input.value;
          });
          
          // Interpolate path parameters
          let interpolatedPath = path;
          Object.keys(params).forEach(key => {
            if (interpolatedPath.includes(\`:\${key}\`)) {
              interpolatedPath = interpolatedPath.replace(\`:\${key}\`, params[key]);
            }
          });
          
          // Show loading state
          codeElement.textContent = 'Loading...';
          resultPanel.classList.add('active');
          
          // Prepare fetch options
          const options = {
            method: method.includes('/') ? 'GET' : method, // Handle combined methods
            headers: {
              'Content-Type': 'application/json'
            }
          };
          
          // Add body for POST/PUT/PATCH methods
          if (['POST', 'PUT', 'PATCH'].includes(options.method)) {
            const bodyParams = {};
            Object.keys(params).forEach(key => {
              if (!interpolatedPath.includes(\`:\${key}\`)) {
                bodyParams[key] = params[key];
              }
            });
            options.body = JSON.stringify(bodyParams);
          }
          
          // Make the request
          fetch(interpolatedPath, options)
            .then(response => response.text())
            .then(text => {
              try {
                // Try to parse as JSON for nice formatting
                const json = JSON.parse(text);
                codeElement.textContent = JSON.stringify(json, null, 2);
              } catch (e) {
                // If not JSON, show as plain text
                codeElement.textContent = text;
              }
            })
            .catch(error => {
              codeElement.textContent = \`Error: \${error.message}\`;
            });
        }
      });
    });
    
    // Update the data in real-time
    function updateRealTimeData() {
      fetch('/health')
        .then(response => response.json())
        .then(data => {
          // Update uptime
          const uptimeElements = document.querySelectorAll('.info-value');
          uptimeElements.forEach(el => {
            if (el.previousElementSibling && el.previousElementSibling.textContent === 'Uptime') {
              fetch(window.location.href)
                .then(response => response.text())
                .then(() => {
                  // Just trigger a check to see if the server is still up
                });
            }
          });
        })
        .catch(error => {
          console.error('Error updating health data:', error);
        });
    }
    
    // Update every 30 seconds
    setInterval(updateRealTimeData, 30000);
  </script>
</body>
</html>
  `;
}

/**
 * Format the uptime in a readable format
 */
function formatUptime(uptimeInSeconds: number): string {
  const days = Math.floor(uptimeInSeconds / (24 * 60 * 60));
  const hours = Math.floor((uptimeInSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((uptimeInSeconds % (60 * 60)) / 60);
  const seconds = Math.floor(uptimeInSeconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  
  return parts.join(' ');
}

export default router; 
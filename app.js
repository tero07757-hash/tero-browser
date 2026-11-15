/* ==========================================
   TERO BROWSER — Application Logic
   ========================================== */

// ==========================================
// State Management
// ==========================================
const state = {
  tabs: [],
  activeTabId: null,
  nextTabId: 1,
  bookmarks: JSON.parse(localStorage.getItem('tero-bookmarks') || '[]'),
  history: JSON.parse(localStorage.getItem('tero-history') || '[]'),
  downloads: [],
  sidebarOpen: false,
  downloadsOpen: false,
  searchEngine: localStorage.getItem('tero-search-engine') || 'google',
  defaultShortcuts: [
    { name: 'Google', url: 'https://www.google.com', icon: '🔍' },
    { name: 'YouTube', url: 'https://www.youtube.com', icon: '▶️' },
    { name: 'GitHub', url: 'https://www.github.com', icon: '🐙' },
    { name: 'Reddit', url: 'https://www.reddit.com', icon: '🤖' },
    { name: 'Twitter', url: 'https://www.x.com', icon: '🐦' },
    { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: '📚' },
    { name: 'Gmail', url: 'https://mail.google.com', icon: '📧' },
    { name: 'Netflix', url: 'https://www.netflix.com', icon: '🎬' }
  ]
};

// Search Engine Config
const searchEngines = {
  google: {
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    icon: '🔍'
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
    icon: '🦆'
  },
  bing: {
    name: 'Bing',
    url: 'https://www.bing.com/search?q=',
    icon: '🅱️'
  }
};

function getActiveSearchEngineName() {
  return searchEngines[state.searchEngine].name;
}

function getSearchUrl(query) {
  return searchEngines[state.searchEngine].url + encodeURIComponent(query);
}

function updateSearchEngineUI() {
  const engine = searchEngines[state.searchEngine];
  const iconEl = document.getElementById('current-engine-icon');
  if (iconEl) {
    iconEl.textContent = engine.icon;
  }
  const inputEl = document.getElementById('ntp-search-input');
  if (inputEl) {
    inputEl.placeholder = `Pesquisar na web com o ${engine.name}...`;
  }
}

// ==========================================
// DOM References
// ==========================================
const dom = {
  tabsContainer: document.getElementById('tabs-container'),
  btnNewTab: document.getElementById('btn-new-tab'),
  btnBack: document.getElementById('btn-back'),
  btnForward: document.getElementById('btn-forward'),
  btnReload: document.getElementById('btn-reload'),
  btnHome: document.getElementById('btn-home'),
  urlInput: document.getElementById('url-input'),
  securityIcon: document.getElementById('security-icon'),
  btnBookmark: document.getElementById('btn-bookmark'),
  btnDownloads: document.getElementById('btn-downloads'),
  btnSidebarToggle: document.getElementById('btn-sidebar-toggle'),
  btnMenu: document.getElementById('btn-menu'),
  webviewContainer: document.getElementById('webview-container'),
  newTabPage: document.getElementById('new-tab-page'),
  ntpSearchInput: document.getElementById('ntp-search-input'),
  ntpShortcuts: document.getElementById('ntp-shortcuts'),
  sidebar: document.getElementById('sidebar'),
  bookmarksList: document.getElementById('bookmarks-list'),
  historyList: document.getElementById('history-list'),
  downloadsPanel: document.getElementById('downloads-panel'),
  downloadsList: document.getElementById('downloads-list'),
  btnClearHistory: document.getElementById('btn-clear-history'),
  btnCloseDownloads: document.getElementById('btn-close-downloads'),
  contextMenu: document.getElementById('context-menu'),
  btnMinimize: document.getElementById('btn-minimize'),
  btnMaximize: document.getElementById('btn-maximize'),
  btnClose: document.getElementById('btn-close'),
  btnAdShield: document.getElementById('btn-adshield'),
  adshieldPanel: document.getElementById('adshield-panel'),
  adshieldToggleCb: document.getElementById('adshield-toggle-cb'),
  adshieldBlockedCount: document.getElementById('adshield-blocked-count'),
  btnCloseAdShield: document.getElementById('btn-close-adshield'),
  bookmarksBar: document.getElementById('bookmarks-bar'),
  bookmarksBarList: document.getElementById('bookmarks-bar-list'),
};

// ==========================================
// Tab Management
// ==========================================
function createTab(url = null) {
  const tabId = state.nextTabId++;
  const tab = {
    id: tabId,
    url: url,
    title: 'Nova aba',
    favicon: null,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    webview: null
  };

  state.tabs.push(tab);

  // Create tab element
  const tabEl = document.createElement('div');
  tabEl.className = 'tab animate-in';
  tabEl.dataset.tabId = tabId;
  tabEl.innerHTML = `
    <div class="tab-favicon">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/></svg>
    </div>
    <span class="tab-title">Nova aba</span>
    <button class="tab-close" title="Fechar aba">
      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    </button>
  `;

  tabEl.addEventListener('click', (e) => {
    if (!e.target.closest('.tab-close')) {
      switchToTab(tabId);
    }
  });

  tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tabId);
  });

  // Middle-click to close
  tabEl.addEventListener('auxclick', (e) => {
    if (e.button === 1) {
      e.preventDefault();
      closeTab(tabId);
    }
  });

  dom.tabsContainer.appendChild(tabEl);

  // Create webview if URL is provided
  if (url) {
    createWebview(tab, url);
  }

  switchToTab(tabId);
  return tab;
}

function createWebview(tab, url) {
  const webview = document.createElement('webview');
  webview.setAttribute('src', url);
  webview.setAttribute('allowpopups', '');
  webview.setAttribute('webpreferences', 'contextIsolation=yes');
  webview.style.width = '100%';
  webview.style.height = '100%';

  // Event listeners
  webview.addEventListener('did-start-loading', () => {
    tab.isLoading = true;
    updateTabLoading(tab.id, true);
    if (tab.id === state.activeTabId) {
      updateReloadButton(true);
    }
  });

  webview.addEventListener('did-stop-loading', () => {
    tab.isLoading = false;
    updateTabLoading(tab.id, false);
    if (tab.id === state.activeTabId) {
      updateReloadButton(false);
    }
  });

  webview.addEventListener('page-title-updated', (e) => {
    tab.title = e.title;
    updateTabTitle(tab.id, e.title);
    if (tab.id === state.activeTabId) {
      document.title = `${e.title} — Tero Browser`;
    }
  });

  webview.addEventListener('page-favicon-updated', (e) => {
    if (e.favicons && e.favicons.length > 0) {
      tab.favicon = e.favicons[0];
      updateTabFavicon(tab.id, e.favicons[0]);
    }
  });

  webview.addEventListener('did-navigate', (e) => {
    tab.url = e.url;
    tab.canGoBack = webview.canGoBack();
    tab.canGoForward = webview.canGoForward();
    if (tab.id === state.activeTabId) {
      updateNavState(tab);
    }
    addToHistory(e.url, tab.title);
  });

  webview.addEventListener('did-navigate-in-page', (e) => {
    tab.url = e.url;
    tab.canGoBack = webview.canGoBack();
    tab.canGoForward = webview.canGoForward();
    if (tab.id === state.activeTabId) {
      updateNavState(tab);
    }
  });

  webview.addEventListener('new-window', (e) => {
    createTab(e.url);
  });

  webview.addEventListener('context-menu', (e) => {
    e.preventDefault();
    const params = e.params;
    const menuItems = [];

    if (params.linkURL) {
      menuItems.push({
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        label: 'Abrir link em nova aba',
        action: () => createTab(params.linkURL)
      });
      menuItems.push({
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.5"/></svg>',
        label: 'Copiar endereço do link',
        action: () => navigator.clipboard.writeText(params.linkURL)
      });
    }

    if (params.selectionText && params.selectionText.trim()) {
      if (menuItems.length > 0) menuItems.push({ separator: true });
      menuItems.push({
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" stroke-width="1.5"/></svg>',
        label: 'Copiar',
        shortcut: 'Ctrl+C',
        action: () => webview.copy()
      });
      menuItems.push({
        icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
        label: `Pesquisar por "${params.selectionText.substring(0, 15)}..."`,
        action: () => createTab(getSearchUrl(params.selectionText))
      });
    }

    if (params.isEditable) {
      if (menuItems.length > 0) menuItems.push({ separator: true });
      menuItems.push({
        label: 'Colar',
        shortcut: 'Ctrl+V',
        action: () => webview.paste()
      });
      menuItems.push({
        label: 'Recortar',
        shortcut: 'Ctrl+X',
        action: () => webview.cut()
      });
      menuItems.push({
        label: 'Selecionar tudo',
        shortcut: 'Ctrl+A',
        action: () => webview.selectAll()
      });
    }

    // General actions
    if (menuItems.length > 0) menuItems.push({ separator: true });
    
    menuItems.push({
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      label: 'Voltar',
      action: () => { if (webview.canGoBack()) webview.goBack(); }
    });
    menuItems.push({
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      label: 'Avançar',
      action: () => { if (webview.canGoForward()) webview.goForward(); }
    });
    menuItems.push({
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      label: 'Recarregar',
      action: () => webview.reload()
    });

    menuItems.push({ separator: true });
    menuItems.push({
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/><line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" stroke-width="2"/></svg>',
      label: 'Inspecionar Elemento',
      action: () => {
        webview.inspectElement(params.x, params.y);
      }
    });

    showContextMenu(e.clientX, e.clientY, menuItems);
  });

  tab.webview = webview;
  if (tab.id === state.activeTabId) {
    webview.classList.add('active');
  }
  dom.webviewContainer.appendChild(webview);
}

function switchToTab(tabId) {
  const prevTabId = state.activeTabId;
  state.activeTabId = tabId;

  // Update tab UI
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
  if (tabEl) tabEl.classList.add('active');

  // Update webview visibility
  document.querySelectorAll('#webview-container webview').forEach(wv => wv.classList.remove('active'));

  const tab = state.tabs.find(t => t.id === tabId);
  if (tab) {
    if (tab.webview) {
      tab.webview.classList.add('active');
      dom.newTabPage.classList.remove('active');
    } else {
      dom.newTabPage.classList.add('active');
    }
    updateNavState(tab);
    document.title = tab.url ? `${tab.title} — Tero Browser` : 'Tero Browser';
  }
}

function closeTab(tabId) {
  const tabIndex = state.tabs.findIndex(t => t.id === tabId);
  if (tabIndex === -1) return;

  const tab = state.tabs[tabIndex];

  // Remove webview
  if (tab.webview) {
    tab.webview.remove();
  }

  // Remove tab element
  const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
  if (tabEl) tabEl.remove();

  // Remove from state
  state.tabs.splice(tabIndex, 1);

  // If this was the active tab, switch to another
  if (state.activeTabId === tabId) {
    if (state.tabs.length > 0) {
      const newIndex = Math.min(tabIndex, state.tabs.length - 1);
      switchToTab(state.tabs[newIndex].id);
    } else {
      // No tabs left, create a new one
      createTab();
    }
  }
}

function updateTabTitle(tabId, title) {
  const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"] .tab-title`);
  if (tabEl) tabEl.textContent = title;
}

function updateTabFavicon(tabId, faviconUrl) {
  const faviconEl = document.querySelector(`.tab[data-tab-id="${tabId}"] .tab-favicon`);
  if (faviconEl) {
    faviconEl.innerHTML = `<img src="${faviconUrl}" alt="" onerror="this.style.display='none'">`;
  }
}

function updateTabLoading(tabId, isLoading) {
  const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
  if (tabEl) {
    if (isLoading) {
      tabEl.classList.add('loading');
    } else {
      tabEl.classList.remove('loading');
    }
  }
}

// ==========================================
// Navigation
// ==========================================
function navigate(input) {
  if (!input || !input.trim()) return;

  input = input.trim();
  let url;

  // Check if it's a URL
  if (isURL(input)) {
    url = input.startsWith('http') ? input : `https://${input}`;
  } else {
    // Search with selected engine
    url = getSearchUrl(input);
  }

  const tab = state.tabs.find(t => t.id === state.activeTabId);
  if (!tab) return;

  if (tab.webview) {
    tab.webview.loadURL(url);
  } else {
    createWebview(tab, url);
    dom.newTabPage.classList.remove('active');
  }

  tab.url = url;
  dom.urlInput.blur();
}

function isURL(str) {
  // Check for common URL patterns
  if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('file://')) {
    return true;
  }
  // Check for domain-like patterns
  const domainRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
  if (domainRegex.test(str)) return true;
  // Check for localhost
  if (str.startsWith('localhost') || str.match(/^\d+\.\d+\.\d+\.\d+/)) return true;
  return false;
}

function goBack() {
  const tab = state.tabs.find(t => t.id === state.activeTabId);
  if (tab && tab.webview && tab.webview.canGoBack()) {
    tab.webview.goBack();
  }
}

function goForward() {
  const tab = state.tabs.find(t => t.id === state.activeTabId);
  if (tab && tab.webview && tab.webview.canGoForward()) {
    tab.webview.goForward();
  }
}

function reload() {
  const tab = state.tabs.find(t => t.id === state.activeTabId);
  if (tab && tab.webview) {
    if (tab.isLoading) {
      tab.webview.stop();
    } else {
      tab.webview.reload();
    }
  }
}

function goHome() {
  const tab = state.tabs.find(t => t.id === state.activeTabId);
  if (tab) {
    if (tab.webview) {
      tab.webview.remove();
      tab.webview = null;
    }
    tab.url = null;
    tab.title = 'Nova aba';
    tab.favicon = null;
    tab.canGoBack = false;
    tab.canGoForward = false;
    updateTabTitle(tab.id, 'Nova aba');
    const faviconEl = document.querySelector(`.tab[data-tab-id="${tab.id}"] .tab-favicon`);
    if (faviconEl) {
      faviconEl.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/></svg>`;
    }
    dom.newTabPage.classList.add('active');
    updateNavState(tab);
    document.title = 'Tero Browser';
    dom.urlInput.value = '';
  }
}

function updateNavState(tab) {
  if (!tab) return;

  dom.btnBack.disabled = !tab.canGoBack;
  dom.btnForward.disabled = !tab.canGoForward;

  if (tab.url) {
    dom.urlInput.value = tab.url;
    updateSecurityIcon(tab.url);
    updateBookmarkButton(tab.url);
  } else {
    dom.urlInput.value = '';
    dom.securityIcon.className = 'url-icon';
  }

  updateReloadButton(tab.isLoading);
}

function updateSecurityIcon(url) {
  if (url && url.startsWith('https://')) {
    dom.securityIcon.className = 'url-icon secure';
    dom.securityIcon.title = 'Conexão segura';
  } else if (url && url.startsWith('http://')) {
    dom.securityIcon.className = 'url-icon insecure';
    dom.securityIcon.title = 'Conexão não segura';
  } else {
    dom.securityIcon.className = 'url-icon';
    dom.securityIcon.title = '';
  }
}

function updateReloadButton(isLoading) {
  if (isLoading) {
    dom.btnReload.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
    dom.btnReload.title = 'Parar (Esc)';
  } else {
    dom.btnReload.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    dom.btnReload.title = 'Recarregar (Ctrl+R)';
  }
}

// ==========================================
// Bookmarks
// ==========================================
function toggleBookmark() {
  const tab = state.tabs.find(t => t.id === state.activeTabId);
  if (!tab || !tab.url) return;

  const existingIndex = state.bookmarks.findIndex(b => b.url === tab.url);
  if (existingIndex >= 0) {
    state.bookmarks.splice(existingIndex, 1);
  } else {
    state.bookmarks.push({
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      addedAt: Date.now()
    });
  }

  saveBookmarks();
  updateBookmarkButton(tab.url);
  renderBookmarks();
}

function updateBookmarkButton(url) {
  const isBookmarked = state.bookmarks.some(b => b.url === url);
  if (isBookmarked) {
    dom.btnBookmark.classList.add('bookmarked');
    dom.btnBookmark.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
  } else {
    dom.btnBookmark.classList.remove('bookmarked');
    dom.btnBookmark.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
  }
}

function saveBookmarks() {
  localStorage.setItem('tero-bookmarks', JSON.stringify(state.bookmarks));
  renderBookmarksBar();
}

function renderBookmarksBar() {
  const bar = dom.bookmarksBar;
  const list = dom.bookmarksBarList;
  if (!bar || !list) return;

  const isVisible = localStorage.getItem('tero-bookmarks-bar-visible') !== 'false';
  bar.classList.toggle('hidden', !isVisible);

  if (state.bookmarks.length === 0) {
    list.innerHTML = `<span style="font-size:11px;color:var(--text-tertiary);padding:4px 8px;opacity:0.6;">Nenhum favorito salvo</span>`;
    return;
  }

  list.innerHTML = state.bookmarks.map((b, i) => `
    <div class="bookmarks-bar-item" data-url="${escapeHtml(b.url)}">
      <img class="bookmarks-bar-favicon" src="${b.favicon || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(getHostname(b.url))}&sz=16`}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23333%22/></svg>'">
      <span>${escapeHtml(b.title)}</span>
    </div>
  `).join('');

  list.querySelectorAll('.bookmarks-bar-item').forEach(item => {
    item.addEventListener('click', () => {
      navigate(item.dataset.url);
    });
  });
}

function renderBookmarks() {
  const list = dom.bookmarksList;
  const emptyMsg = list.parentElement.querySelector('.panel-empty');

  if (state.bookmarks.length === 0) {
    list.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'flex';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  list.innerHTML = state.bookmarks.map((b, i) => `
    <div class="panel-item" data-url="${escapeHtml(b.url)}" data-index="${i}">
      <img class="panel-item-favicon" src="${b.favicon || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(b.url).hostname)}&sz=32`}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23333%22/></svg>'">
      <div class="panel-item-info">
        <div class="panel-item-title">${escapeHtml(b.title)}</div>
        <div class="panel-item-url">${escapeHtml(b.url)}</div>
      </div>
      <button class="panel-item-delete" data-action="delete-bookmark" data-index="${i}" title="Remover">
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>
  `).join('');

  // Event listeners
  list.querySelectorAll('.panel-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.panel-item-delete')) return;
      const url = item.dataset.url;
      navigate(url);
    });
  });

  list.querySelectorAll('[data-action="delete-bookmark"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      state.bookmarks.splice(index, 1);
      saveBookmarks();
      renderBookmarks();
      const tab = state.tabs.find(t => t.id === state.activeTabId);
      if (tab && tab.url) updateBookmarkButton(tab.url);
    });
  });
}

// ==========================================
// History
// ==========================================
function addToHistory(url, title) {
  if (!url || url === 'about:blank') return;

  // Don't duplicate if same as last entry
  if (state.history.length > 0 && state.history[0].url === url) {
    state.history[0].title = title;
    state.history[0].visitedAt = Date.now();
    saveHistory();
    return;
  }

  state.history.unshift({
    url: url,
    title: title || url,
    visitedAt: Date.now()
  });

  // Keep last 500 entries
  if (state.history.length > 500) {
    state.history = state.history.slice(0, 500);
  }

  saveHistory();
  renderHistory();
}

function saveHistory() {
  localStorage.setItem('tero-history', JSON.stringify(state.history));
}

function clearHistory() {
  state.history = [];
  saveHistory();
  renderHistory();
}

function renderHistory() {
  const list = dom.historyList;
  const emptyMsg = list.parentElement.querySelector('.panel-empty');

  if (state.history.length === 0) {
    list.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'flex';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  // Group by date
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  list.innerHTML = state.history.slice(0, 100).map((h, i) => {
    const date = new Date(h.visitedAt).toDateString();
    let dateLabel = '';
    if (date === today) dateLabel = 'Hoje';
    else if (date === yesterday) dateLabel = 'Ontem';
    else dateLabel = new Date(h.visitedAt).toLocaleDateString('pt-BR');

    const time = new Date(h.visitedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="panel-item" data-url="${escapeHtml(h.url)}">
        <img class="panel-item-favicon" src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(getHostname(h.url))}&sz=32" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22><circle cx=%2212%22 cy=%2212%22 r=%2210%22 fill=%22%23333%22/></svg>'">
        <div class="panel-item-info">
          <div class="panel-item-title">${escapeHtml(h.title)}</div>
          <div class="panel-item-url">${time} · ${escapeHtml(getHostname(h.url))}</div>
        </div>
      </div>
    `;
  }).join('');

  // Click to navigate
  list.querySelectorAll('.panel-item').forEach(item => {
    item.addEventListener('click', () => {
      navigate(item.dataset.url);
    });
  });
}

// ==========================================
// Downloads
// ==========================================
function toggleDownloadsPanel() {
  state.downloadsOpen = !state.downloadsOpen;
  dom.downloadsPanel.classList.toggle('hidden', !state.downloadsOpen);
  dom.btnDownloads.classList.toggle('active', state.downloadsOpen);
}

function renderDownloads() {
  if (state.downloads.length === 0) {
    dom.downloadsList.innerHTML = `
      <div class="panel-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="1.5" opacity="0.3"/><polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="1.5" opacity="0.3"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" opacity="0.3"/></svg>
        <p>Nenhum download</p>
      </div>
    `;
    return;
  }

  dom.downloadsList.innerHTML = state.downloads.map(d => `
    <div class="download-item">
      <div class="download-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="download-info">
        <div class="download-name">${escapeHtml(d.filename)}</div>
        <div class="download-status">${d.state === 'completed' ? 'Concluído' : d.state === 'cancelled' ? 'Cancelado' : `${Math.round(d.progress || 0)}%`}</div>
        ${d.state !== 'completed' && d.state !== 'cancelled' ? `
          <div class="download-progress">
            <div class="download-progress-bar" style="width: ${d.progress || 0}%"></div>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// ==========================================
// Sidebar
// ==========================================
function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  dom.sidebar.classList.toggle('hidden', !state.sidebarOpen);
  dom.btnSidebarToggle.classList.toggle('active', state.sidebarOpen);
}

// ==========================================
// New Tab Page
// ==========================================
function renderShortcuts() {
  dom.ntpShortcuts.innerHTML = state.defaultShortcuts.map(s => `
    <div class="shortcut-item" data-url="${s.url}" title="${s.name}">
      <div class="shortcut-icon">
        <span>${s.icon}</span>
      </div>
      <span class="shortcut-name">${s.name}</span>
    </div>
  `).join('');

  dom.ntpShortcuts.querySelectorAll('.shortcut-item').forEach(item => {
    item.addEventListener('click', () => {
      navigate(item.dataset.url);
    });
  });
}

// ==========================================
// Utility Functions
// ==========================================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ==========================================
// Event Listeners
// ==========================================

// Window controls
dom.btnMinimize.addEventListener('click', () => window.teroAPI.minimize());
dom.btnMaximize.addEventListener('click', () => window.teroAPI.maximize());
dom.btnClose.addEventListener('click', () => window.teroAPI.close());

// Navigation buttons
dom.btnBack.addEventListener('click', goBack);
dom.btnForward.addEventListener('click', goForward);
dom.btnReload.addEventListener('click', reload);
dom.btnHome.addEventListener('click', goHome);
dom.btnNewTab.addEventListener('click', () => createTab());
dom.btnBookmark.addEventListener('click', toggleBookmark);
dom.btnDownloads.addEventListener('click', toggleDownloadsPanel);
dom.btnSidebarToggle.addEventListener('click', toggleSidebar);
dom.btnCloseDownloads.addEventListener('click', toggleDownloadsPanel);

// URL input
dom.urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    navigate(dom.urlInput.value);
  } else if (e.key === 'Escape') {
    const tab = state.tabs.find(t => t.id === state.activeTabId);
    if (tab && tab.url) {
      dom.urlInput.value = tab.url;
    }
    dom.urlInput.blur();
  }
});

dom.urlInput.addEventListener('focus', () => {
  dom.urlInput.select();
});

// NTP search
dom.ntpSearchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    navigate(dom.ntpSearchInput.value);
    dom.ntpSearchInput.value = '';
  }
});

// Sidebar tabs
document.querySelectorAll('.sidebar-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById(`panel-${tab.dataset.panel}`);
    if (panel) panel.classList.add('active');
  });
});

// Clear history
dom.btnClearHistory.addEventListener('click', clearHistory);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl+T: New tab
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault();
    createTab();
  }
  // Ctrl+W: Close tab
  if (e.ctrlKey && e.key === 'w') {
    e.preventDefault();
    if (state.activeTabId) closeTab(state.activeTabId);
  }
  // Ctrl+L: Focus URL bar
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    dom.urlInput.focus();
    dom.urlInput.select();
  }
  // Ctrl+R or F5: Reload
  if ((e.ctrlKey && e.key === 'r') || e.key === 'F5') {
    e.preventDefault();
    reload();
  }
  // Alt+Left: Back
  if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    goBack();
  }
  // Alt+Right: Forward
  if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    goForward();
  }
  // Escape: Stop loading
  if (e.key === 'Escape') {
    const tab = state.tabs.find(t => t.id === state.activeTabId);
    if (tab && tab.webview && tab.isLoading) {
      tab.webview.stop();
    }
  }
  // Ctrl+Tab: Next tab
  if (e.ctrlKey && e.key === 'Tab') {
    e.preventDefault();
    const currentIndex = state.tabs.findIndex(t => t.id === state.activeTabId);
    const nextIndex = (currentIndex + 1) % state.tabs.length;
    switchToTab(state.tabs[nextIndex].id);
  }
  // Ctrl+Shift+Tab: Previous tab
  if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
    e.preventDefault();
    const currentIndex = state.tabs.findIndex(t => t.id === state.activeTabId);
    const prevIndex = (currentIndex - 1 + state.tabs.length) % state.tabs.length;
    switchToTab(state.tabs[prevIndex].id);
  }
  // Ctrl+1-9: Switch to tab by index
  if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
    e.preventDefault();
    const index = parseInt(e.key) - 1;
    if (index < state.tabs.length) {
      switchToTab(state.tabs[index].id);
    }
  }
});

// Close context menu on click
document.addEventListener('click', () => {
  dom.contextMenu.classList.add('hidden');
});

// Download events from main process
if (window.teroAPI) {
  window.teroAPI.onDownloadStarted((data) => {
    state.downloads.unshift({
      filename: data.filename,
      filesize: data.filesize,
      url: data.url,
      progress: 0,
      state: 'downloading'
    });
    renderDownloads();
    if (!state.downloadsOpen) toggleDownloadsPanel();
  });

  window.teroAPI.onDownloadProgress((data) => {
    const dl = state.downloads.find(d => d.filename === data.filename);
    if (dl) {
      dl.progress = data.progress;
      renderDownloads();
    }
  });

  window.teroAPI.onDownloadComplete((data) => {
    const dl = state.downloads.find(d => d.filename === data.filename);
    if (dl) {
      dl.state = data.state;
      dl.progress = 100;
      renderDownloads();
    }
  });

  window.teroAPI.onMaximizedChange((isMaximized) => {
    // Could update maximize button icon here
  });
}

// ==========================================
// Menu
// ==========================================
dom.btnMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  const rect = dom.btnMenu.getBoundingClientRect();
  showContextMenu(rect.right - 220, rect.bottom + 4, [
    {
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      label: 'Nova aba',
      shortcut: 'Ctrl+T',
      action: () => createTab()
    },
    { separator: true },
    {
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
      label: 'Favoritos',
      action: () => { if (!state.sidebarOpen) toggleSidebar(); document.querySelector('[data-panel="bookmarks"]').click(); }
    },
    {
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/><polyline points="12 6 12 12 16 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      label: 'Histórico',
      action: () => { if (!state.sidebarOpen) toggleSidebar(); document.querySelector('[data-panel="history"]').click(); }
    },
    {
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" stroke-width="1.5"/><polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="1.5"/></svg>',
      label: 'Downloads',
      action: () => { if (!state.downloadsOpen) toggleDownloadsPanel(); }
    },
    {
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" stroke-width="1.5"/></svg>',
      label: 'Barra de favoritos',
      action: () => {
        const isVisible = localStorage.getItem('tero-bookmarks-bar-visible') !== 'false';
        localStorage.setItem('tero-bookmarks-bar-visible', !isVisible);
        renderBookmarksBar();
      }
    },
    { separator: true },
    {
      icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      label: 'Sobre o Tero Browser',
      action: () => { navigate('https://www.chromium.org'); }
    }
  ]);
});

function showContextMenu(x, y, items) {
  dom.contextMenu.innerHTML = items.map(item => {
    if (item.separator) {
      return '<div class="context-menu-separator"></div>';
    }
    return `
      <div class="context-menu-item">
        ${item.icon || ''}
        <span>${item.label}</span>
        ${item.shortcut ? `<span style="margin-left:auto;opacity:0.4;font-size:11px">${item.shortcut}</span>` : ''}
      </div>
    `;
  }).join('');

  // Position
  dom.contextMenu.style.left = `${Math.min(x, window.innerWidth - 240)}px`;
  dom.contextMenu.style.top = `${Math.min(y, window.innerHeight - 300)}px`;
  dom.contextMenu.classList.remove('hidden');

  // Add click handlers
  let itemIndex = 0;
  dom.contextMenu.querySelectorAll('.context-menu-item').forEach((el) => {
    // Find the matching non-separator item
    while (items[itemIndex] && items[itemIndex].separator) itemIndex++;
    const item = items[itemIndex];
    if (item && item.action) {
      el.addEventListener('click', () => {
        item.action();
        dom.contextMenu.classList.add('hidden');
      });
    }
    itemIndex++;
  });
}

// ==========================================
// AdShield Panel Logic
// ==========================================
let adShieldOpen = false;

function toggleAdShieldPanel() {
  adShieldOpen = !adShieldOpen;
  dom.adshieldPanel.classList.toggle('hidden', !adShieldOpen);
  dom.btnAdShield.classList.toggle('active', adShieldOpen);
}

function updateAdShieldIcon(enabled) {
  if (enabled) {
    dom.btnAdShield.classList.add('active-shield');
    dom.btnAdShield.classList.remove('inactive-shield');
    dom.btnAdShield.title = "AdShield: Ativo";
  } else {
    dom.btnAdShield.classList.remove('active-shield');
    dom.btnAdShield.classList.add('inactive-shield');
    dom.btnAdShield.title = "AdShield: Inativo";
  }
}

// Set up AdShield event listeners
if (dom.btnAdShield) {
  dom.btnAdShield.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleAdShieldPanel();
    if (state.downloadsOpen) toggleDownloadsPanel();
  });
}

if (dom.btnCloseAdShield) {
  dom.btnCloseAdShield.addEventListener('click', toggleAdShieldPanel);
}

if (dom.adshieldToggleCb) {
  dom.adshieldToggleCb.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    if (window.teroAPI) {
      window.teroAPI.toggleAdShield(enabled);
    }
    updateAdShieldIcon(enabled);
  });
}

// ==========================================
// Search Engine Selector Logic
// ==========================================
const ntpSelector = document.getElementById('ntp-search-engine-selector');
const ntpDropdown = document.getElementById('ntp-search-engines-dropdown');

if (ntpSelector && ntpDropdown) {
  ntpSelector.addEventListener('click', (e) => {
    e.stopPropagation();
    ntpDropdown.classList.toggle('hidden');
  });

  document.querySelectorAll('.search-engine-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const engine = option.dataset.engine;
      state.searchEngine = engine;
      localStorage.setItem('tero-search-engine', engine);
      updateSearchEngineUI();
      ntpDropdown.classList.add('hidden');
    });
  });
}

// Close panels on clicking outside
document.addEventListener('click', (e) => {
  if (ntpDropdown && ntpSelector && !ntpSelector.contains(e.target) && !ntpDropdown.contains(e.target)) {
    ntpDropdown.classList.add('hidden');
  }
  if (adShieldOpen && dom.adshieldPanel && !dom.adshieldPanel.contains(e.target) && !dom.btnAdShield.contains(e.target)) {
    toggleAdShieldPanel();
  }
});

// ==========================================
// Initialize
// ==========================================
function init() {
  renderShortcuts();
  renderBookmarks();
  renderHistory();
  renderBookmarksBar();
  updateSearchEngineUI();
  createTab(); // Open first empty tab

  // Get initial AdShield status
  if (window.teroAPI) {
    window.teroAPI.getAdShieldStatus().then(status => {
      if (dom.adshieldToggleCb) dom.adshieldToggleCb.checked = status.enabled;
      if (dom.adshieldBlockedCount) dom.adshieldBlockedCount.textContent = status.blockedCount;
      updateAdShieldIcon(status.enabled);
    });

    window.teroAPI.onAdShieldBlocked((count) => {
      if (dom.adshieldBlockedCount) dom.adshieldBlockedCount.textContent = count;
    });
  }

  // Focus NTP search when a new tab is opened
  setTimeout(() => {
    dom.ntpSearchInput.focus();
  }, 100);
}

init();

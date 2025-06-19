// --- Prism.js-compatible marked.js renderer for code blocks ---
function escapeHtml(html) {
    return html.replace(/[&<>"']/g, function(tag) {
        const charsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return charsToReplace[tag] || tag;
    });
}

// Utility to capitalize first letter
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Icon map for sidebar sections and files
const sectionIcons = {
    python: 'terminal',
    azure: 'cloud',
    sql: 'storage',
    javascript: 'javascript',
    jquery: 'extension',
    ai: 'psychology',
    genai: 'auto_awesome',
    resources: 'menu_book',
    contribute: 'volunteer_activism',
    home: 'home',
};
const fileIcons = {
    guide: 'school',
    topics: 'list',
    basics: 'school',
    advanced: 'auto_awesome',
    functions: 'functions',
    oop: 'hub',
    regex: 'find_in_page',
    interview: 'quiz',
    questions: 'quiz',
    data: 'data_object',
    default: 'description',
};

// Dynamically load sidebar from menu.json (remote GitHub URL)
async function loadSidebarFromMenuJson() {
    const sidebarMenu = document.getElementById('sidebarMenu');
    if (!sidebarMenu) return;
    let menuData;
    try {
        const res = await fetch('https://raw.githubusercontent.com/sureshsiddana/techcontent/main/menu.json');
        menuData = await res.json();
    } catch (e) {
        sidebarMenu.innerHTML = '<div style="color:red">Failed to load menu.json</div>';
        return;
    }
    let html = '';
    Object.keys(menuData).forEach((section, idx) => {
        const collapseId = `sidebar-expand-${idx}`;
        const sectionIcon = sectionIcons[section.toLowerCase()] || 'folder';
        html += `
        <div class="sidebar-category">
            <button class="sidebar-category-btn" data-collapse="${collapseId}" aria-expanded="false">
                <span class="sidebar-icon material-icons">${sectionIcon}</span>
                <span>${capitalize(section)}</span>
                <span class="sidebar-chevron material-icons">expand_more</span>
            </button>
            <div class="sidebar-submenu" id="${collapseId}" style="max-height:0;">
                ${menuData[section].map(item => {
                    // Try to pick a file icon based on title or path
                    let iconKey = (item.title || '').toLowerCase().split(' ')[0];
                    const icon = fileIcons[iconKey] || fileIcons.default;
                    return `<a href="#${section}-${item.title.replace(/\s+/g, '_')}" class="sidebar-link" data-section="${section}" data-title="${item.title}" data-path="${item.path}"><span class="sidebar-icon material-icons">${icon}</span>${item.title}</a>`;
                }).join('')}
            </div>
        </div>`;
    });
    sidebarMenu.innerHTML = html;

    // Expand/collapse logic with smooth animation
    sidebarMenu.querySelectorAll('.sidebar-category-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const collapseId = this.getAttribute('data-collapse');
            const submenu = document.getElementById(collapseId);
            const expanded = this.getAttribute('aria-expanded') === 'true';
            this.setAttribute('aria-expanded', !expanded);
            if (!expanded) {
                submenu.style.maxHeight = submenu.scrollHeight + 'px';
                this.querySelector('.sidebar-chevron').style.transform = 'rotate(180deg)';
            } else {
                submenu.style.maxHeight = '0';
                this.querySelector('.sidebar-chevron').style.transform = '';
            }
        });
    });

    // Highlight active link and fetch markdown
    sidebarMenu.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', async function(e) {
            sidebarMenu.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            const mdPath = this.getAttribute('data-path');
            try {
                const res = await fetch('https://raw.githubusercontent.com/sureshsiddana/techcontent/main/' + mdPath);
                if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
                const md = await res.text();
                let html;
                try {
                    html = marked.parse(md);
                } catch (parseErr) {
                    let safeMd = typeof md === 'string' ? md : '';
                    safeMd = safeMd.replace(/[&<>"']/g, function(tag) {
                        const charsToReplace = {
                            '&': '&amp;',
                            '<': '&lt;',
                            '>': '&gt;',
                            '"': '&quot;',
                            "'": '&#39;'
                        };
                        return charsToReplace[tag] || tag;
                    });
                    html = `<pre>${safeMd}</pre>`;
                }
                if (typeof html !== 'string') html = String(html || '');
                document.getElementById('content').innerHTML = html;
                setTimeout(() => { if (window.Prism) Prism.highlightAll(); }, 0);
                if (typeof generateTOC === 'function') generateTOC();
            } catch (err) {
                document.getElementById('content').innerHTML = `<div style='color:red'>Failed to load <b>${mdPath}</b><br>${err.message}</div>`;
            }
        });
    });
}

// --- Enhanced Search Bar with Live Suggestions ---
let allSearchItems = [];
async function fetchAllMarkdownTitles() {
    // Fetch menu.json and build a flat list of {section, title, path}
    try {
        const res = await fetch('https://raw.githubusercontent.com/sureshsiddana/techcontent/main/menu.json');
        const menu = await res.json();
        let items = [];
        Object.keys(menu).forEach(section => {
            menu[section].forEach(item => {
                items.push({
                    section,
                    title: item.title,
                    path: item.path
                });
            });
        });
        allSearchItems = items;
    } catch (e) {
        allSearchItems = [];
    }
}

function showSearchSuggestions(query) {
    let dropdown = document.getElementById('searchDropdown');
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'searchDropdown';
        dropdown.className = 'search-dropdown';
        document.querySelector('.navbar-search').appendChild(dropdown);
    }
    dropdown.innerHTML = '';
    if (!query) { dropdown.style.display = 'none'; return; }
    const matches = allSearchItems.filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
    if (!matches.length) { dropdown.style.display = 'none'; return; }
    matches.slice(0, 8).forEach(item => {
        const el = document.createElement('div');
        el.className = 'search-suggestion';
        el.textContent = item.title;
        el.onclick = () => {
            document.getElementById('searchInput').value = '';
            dropdown.style.display = 'none';
            // Highlight topic in horizontal menu and update sidebar
            document.querySelectorAll('.topic-link').forEach(l => {
                if (l.getAttribute('data-section') === item.section) {
                    l.classList.add('active');
                } else {
                    l.classList.remove('active');
                }
            });
            renderSidebarForSection(item.section);
            // Wait for sidebar to render, then highlight the correct sidebar link
            setTimeout(() => {
                const sidebarMenu = document.getElementById('sidebarMenu');
                if (sidebarMenu) {
                    sidebarMenu.querySelectorAll('.sidebar-link').forEach(l => {
                        l.classList.remove('active');
                        if (l.getAttribute('data-path') === item.path) {
                            l.classList.add('active');
                        }
                    });
                }
                // Remove topicClass from content card
                const contentCard = document.getElementById('content');
                if (contentCard) {
                    contentCard.className = 'content-card';
                }
            }, 0);
            loadAndDisplayMarkdown(item.path, item.section);
        };
        dropdown.appendChild(el);
    });
    dropdown.style.display = 'block';
}

async function loadAndDisplayMarkdown(mdPath, section, isMobileNav) {
    const sidebarMenu = document.getElementById('sidebarMenu');
    if (sidebarMenu && !isMobileView()) {
        sidebarMenu.querySelectorAll('.sidebar-link').forEach(l => {
            l.classList.remove('active');
            if (l.getAttribute('data-path') === mdPath) {
                l.classList.add('active');
            }
        });
    }
    try {
        const res = await fetch('https://raw.githubusercontent.com/sureshsiddana/techcontent/main/' + mdPath);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const md = await res.text();
        const normalizedMd = md.replace(/\r\n/g, '\n');
        let html;
        try {
            html = marked.parse(normalizedMd);
        } catch (parseErr) {
            let safeMd = typeof md === 'string' ? md : '';
            safeMd = safeMd.replace(/[&<>"]'/g, function(tag) {
                const charsToReplace = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                };
                return charsToReplace[tag] || tag;
            });
            html = `<pre>${safeMd}</pre>`;
        }
        if (typeof html !== 'string') html = String(html || '');
        const contentDiv = document.getElementById('content');
        if (contentDiv) {
            contentDiv.innerHTML = html;
            contentDiv.className = 'content-card';
            setTimeout(() => { if (window.Prism) Prism.highlightAll(); }, 0);
        }
        if (typeof generateTOC === 'function') generateTOC();
        // Add mobile nav if needed
        if (isMobileView() && isMobileNav) {
            renderMobileTopicNav();
        }
    } catch (err) {
        document.getElementById('content').innerHTML = `<div style='color:red'>Failed to load <b>${mdPath}</b><br>${err.message}</div>`;
    }
}

// --- Mobile topic navigation ---
let mobileTopicList = [];
let mobileTopicIndex = 0;

function isMobileView() {
    return window.innerWidth <= 900;
}

function renderMobileTopicNav() {
    if (!isMobileView() || !mobileTopicList.length) return;
    const contentDiv = document.getElementById('content');
    // Remove any existing navs
    contentDiv.querySelectorAll('.mobile-topic-nav').forEach(el => el.remove());
    // Top nav with topic name
    const navDivTop = document.createElement('div');
    navDivTop.className = 'mobile-topic-nav';
    navDivTop.innerHTML = `
        <button id="mobilePrevBtnTop" ${mobileTopicIndex === 0 ? 'disabled' : ''}>Previous</button>
        <span class="mobile-topic-title">${mobileTopicList[mobileTopicIndex].title}</span>
        <button id="mobileNextBtnTop" ${mobileTopicIndex === mobileTopicList.length - 1 ? 'disabled' : ''}>Next</button>
    `;
    // Bottom nav without topic name
    const navDivBottom = document.createElement('div');
    navDivBottom.className = 'mobile-topic-nav';
    navDivBottom.innerHTML = `
        <button id="mobilePrevBtnBottom" ${mobileTopicIndex === 0 ? 'disabled' : ''}>Previous</button>
        <span class="mobile-topic-title" style="visibility:hidden;flex:1;">.</span>
        <button id="mobileNextBtnBottom" ${mobileTopicIndex === mobileTopicList.length - 1 ? 'disabled' : ''}>Next</button>
    `;
    // Insert at top and bottom
    contentDiv.prepend(navDivTop);
    contentDiv.appendChild(navDivBottom);
    // Attach events for both sets of buttons
    function attachNavHandlers(prefix) {
        document.getElementById(`mobilePrevBtn${prefix}`).onclick = () => {
            if (mobileTopicIndex > 0) {
                mobileTopicIndex--;
                loadAndDisplayMarkdown(mobileTopicList[mobileTopicIndex].path, mobileTopicList[mobileTopicIndex].section, true);
            }
        };
        document.getElementById(`mobileNextBtn${prefix}`).onclick = () => {
            if (mobileTopicIndex < mobileTopicList.length - 1) {
                mobileTopicIndex++;
                loadAndDisplayMarkdown(mobileTopicList[mobileTopicIndex].path, mobileTopicList[mobileTopicIndex].section, true);
            }
        };
    }
    attachNavHandlers('Top');
    attachNavHandlers('Bottom');
}

async function setupMobileTopics() {
    // Build flat topic list from menuDataCache
    if (!menuDataCache) return;
    mobileTopicList = [];
    Object.keys(menuDataCache).forEach(section => {
        menuDataCache[section].forEach(item => {
            mobileTopicList.push({ ...item, section });
        });
    });
    mobileTopicIndex = 0;
    if (mobileTopicList.length) {
        await loadAndDisplayMarkdown(mobileTopicList[0].path, mobileTopicList[0].section, true);
    }
}

// --- TOC Generation (assumes marked.js output) ---
function generateTOC() {
    const content = document.getElementById('content');
    const toc = document.getElementById('toc');
    if (!content || !toc) return;
    const headers = content.querySelectorAll('h2, h3');
    let html = '<div class="toc-title">On this page</div>';
    headers.forEach(header => {
        const text = header.textContent;
        const id = text.replace(/\s+/g, '_');
        header.id = id;
        html += `<a href="#${id}" class="toc-link toc-${header.tagName.toLowerCase()}">${text}</a>`;
    });
    toc.innerHTML = html;
    // Scroll to anchor on click
    toc.querySelectorAll('.toc-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.getElementById(this.getAttribute('href').substring(1));
            if (target) {
                window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
            }
        });
    });
}

// --- Dark Mode Toggle ---
document.getElementById('darkModeToggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
});
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

// --- Search Input Events ---
document.getElementById('searchInput').addEventListener('input', function() {
    showSearchSuggestions(this.value);
});
document.addEventListener('click', function(e) {
    if (!e.target.closest('.navbar-search')) {
        const dropdown = document.getElementById('searchDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
});

// --- Sidebar mobile toggle ---
document.getElementById('sidebarToggle').addEventListener('click', function(e) {
    e.stopPropagation();
    document.body.classList.toggle('sidebar-open');
    if (document.body.classList.contains('sidebar-open')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
});
// Close sidebar when clicking a sidebar link (on mobile)
document.addEventListener('click', function(e) {
    if (window.innerWidth <= 900 && document.body.classList.contains('sidebar-open')) {
        if (e.target.closest('.sidebar-link')) {
            document.body.classList.remove('sidebar-open');
            document.body.style.overflow = '';
        }
    }
});
// Close sidebar on resize if desktop
window.addEventListener('resize', function() {
    if (window.innerWidth > 900) {
        document.body.classList.remove('sidebar-open');
        document.body.style.overflow = '';
    }
});

// --- Initial Load ---
window.addEventListener('DOMContentLoaded', async function() {
    await fetchAllMarkdownTitles();
    await renderTopicsMenu();
    if (isMobileView()) {
        setupMobileTopics();
        document.querySelector('.sidebar').style.display = 'none';
    }
    // Desktop hover-to-open sidebar logic (ensure elements exist)
    const sidebarHotspot = document.querySelector('.sidebar-hover-hotspot');
    const sidebar = document.querySelector('.sidebar');
    if (sidebarHotspot && sidebar) {
        sidebarHotspot.addEventListener('mouseenter', function() {
            if (window.innerWidth > 900) {
                document.body.classList.add('sidebar-open');
            }
        });
        sidebar.addEventListener('mouseleave', function() {
            if (window.innerWidth > 900) {
                document.body.classList.remove('sidebar-open');
            }
        });
    }
});

// Render horizontal topics menu and update sidebar on topic click
async function renderTopicsMenu() {
    let menuData;
    try {
        const res = await fetch('https://raw.githubusercontent.com/sureshsiddana/techcontent/main/menu.json');
        menuData = await res.json();
        menuDataCache = menuData;
    } catch (e) {
        document.getElementById('topicsMenu').innerHTML = '<div style="color:red">Failed to load menu.json</div>';
        return;
    }
    const topicsMenu = document.getElementById('topicsMenu');
    topicsMenu.innerHTML = '';
    Object.keys(menuData).forEach((section, idx) => {
        const link = document.createElement('a');
        link.className = 'topic-link' + (idx === 0 ? ' active' : '');
        link.textContent = capitalize(section);
        link.setAttribute('data-section', section);
        link.href = '#';
        link.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.topic-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            if (isMobileView()) {
                // On mobile, update mobile topic list to this section only
                mobileTopicList = menuData[section].map(item => ({ ...item, section }));
                mobileTopicIndex = 0;
                loadAndDisplayMarkdown(mobileTopicList[0].path, section, true);
            } else {
                renderSidebarForSection(section);
            }
        };
        topicsMenu.appendChild(link);
    });
    // Show sidebar for first topic by default (desktop)
    if (!isMobileView()) {
        const firstSection = Object.keys(menuData)[0];
        currentTopic = firstSection;
        renderSidebarForSection(firstSection);
    }
}

// Render sidebar for a given section (desktop)
function renderSidebarForSection(section) {
    currentTopic = section;
    const sidebarMenu = document.getElementById('sidebarMenu');
    if (!sidebarMenu || !menuDataCache) return;
    const items = menuDataCache[section];
    let html = '';
    if (Array.isArray(items)) {
        html += `<div class="sidebar-category">
            <div class="sidebar-category-btn" style="font-weight:700;font-size:1.1em;cursor:default;">
                <span>${capitalize(section)}</span>
            </div>
            <div class="sidebar-submenu" style="max-height:none;">
                ${items.map(item => {
                    let iconKey = (item.title || '').toLowerCase().split(' ')[0];
                    const icon = fileIcons[iconKey] || fileIcons.default;
                    return `<a href="#${section}-${item.title.replace(/\s+/g, '_')}" class="sidebar-link" data-section="${section}" data-title="${item.title}" data-path="${item.path}"><span class="sidebar-icon material-icons">${icon}</span>${item.title}</a>`;
                }).join('')}
            </div>
        </div>`;
    }
    sidebarMenu.innerHTML = html;
    // Remove topicClass from content card
    const contentCard = document.getElementById('content');
    if (contentCard) {
        contentCard.className = 'content-card';
    }
    // Add click event listeners to sidebar links
    sidebarMenu.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', async function(e) {
            sidebarMenu.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            const mdPath = this.getAttribute('data-path');
            try {
                const res = await fetch('https://raw.githubusercontent.com/sureshsiddana/techcontent/main/' + mdPath);
                if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
                const md = await res.text();
                const normalizedMd = md.replace(/\r\n/g, '\n');
                let html;
                try {
                    html = marked.parse(normalizedMd);
                } catch (parseErr) {
                    let safeMd = typeof md === 'string' ? md : '';
                    safeMd = safeMd.replace(/[&<>"]'/g, function(tag) {
                        const charsToReplace = {
                            '&': '&amp;',
                            '<': '&lt;',
                            '>': '&gt;',
                            '"': '&quot;',
                            "'": '&#39;'
                        };
                        return charsToReplace[tag] || tag;
                    });
                    html = `<pre>${safeMd}</pre>`;
                }
                if (typeof html !== 'string') html = String(html || '');
                document.getElementById('content').innerHTML = html;
                setTimeout(() => { if (window.Prism) Prism.highlightAll(); }, 0);
                if (typeof generateTOC === 'function') generateTOC();
            } catch (err) {
                document.getElementById('content').innerHTML = `<div style='color:red'>Failed to load <b>${mdPath}</b><br>${err.message}</div>`;
            }
        });
    });
    // Display guide by default, or first file if no guide
    if (Array.isArray(items) && items.length > 0) {
        let guideItem = items.find(item => (item.title || '').toLowerCase() === 'guide');
        if (!guideItem) guideItem = items[0];
        if (guideItem) {
            // Highlight the correct sidebar link
            setTimeout(() => {
                sidebarMenu.querySelectorAll('.sidebar-link').forEach(l => {
                    l.classList.remove('active');
                    if (l.getAttribute('data-path') === guideItem.path) {
                        l.classList.add('active');
                    }
                });
            }, 0);
            loadAndDisplayMarkdown(guideItem.path, section);
        }
    }
}

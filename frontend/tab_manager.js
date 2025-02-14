class TabManager {
    constructor() {
        this.tabs = new Map();
        this.models = new Map();
        this.activeTab = null;
        this.tabContainer = document.getElementById('editor-tabs');
        this.initializeTabContainer();
    }

    // ... existing code ...

    updateStatusBar(language) {
        const languageElement = document.querySelector('#status-bar .language-name');
        if (languageElement) {
            // Convert language ID to display name
            const displayName = this.getLanguageDisplayName(language);
            languageElement.textContent = displayName;
            
            // Update icon based on language
            const icon = languageElement.parentElement.querySelector('i');
            icon.className = this.getLanguageIcon(language);
        }
    }

    getLanguageDisplayName(language) {
        const languageMap = {
            'javascript': 'JavaScript',
            'typescript': 'TypeScript',
            'html': 'HTML',
            'css': 'CSS',
            'scss': 'SCSS',
            'less': 'Less',
            'json': 'JSON',
            'xml': 'XML',
            'python': 'Python',
            'java': 'Java',
            'cpp': 'C++',
            'c': 'C',
            'csharp': 'C#',
            'go': 'Go',
            'rust': 'Rust',
            'ruby': 'Ruby',
            'php': 'PHP',
            'shell': 'Shell Script',
            'yaml': 'YAML',
            'toml': 'TOML',
            'ini': 'INI',
            'sql': 'SQL',
            'markdown': 'Markdown',
            'plaintext': 'Plain Text'
        };
        return languageMap[language] || language;
    }

    getLanguageIcon(language) {
        const iconMap = {
            'javascript': 'fab fa-js',
            'typescript': 'fab fa-js',
            'html': 'fab fa-html5',
            'css': 'fab fa-css3',
            'scss': 'fab fa-sass',
            'less': 'fab fa-css3',
            'python': 'fab fa-python',
            'java': 'fab fa-java',
            'php': 'fab fa-php',
            'ruby': 'fab fa-ruby',
            'markdown': 'fas fa-file-alt',
            'shell': 'fas fa-terminal',
            'sql': 'fas fa-database'
        };
        return iconMap[language] || 'fas fa-code';
    }

    createTab(filePath, content, language) {
        if (this.tabs.has(filePath)) {
            this.activateTab(filePath);
            return;
        }

        const fileName = filePath.split('/').pop();
        const tab = document.createElement('div');
        tab.className = 'editor-tab';
        tab.innerHTML = `
            <span class="tab-name">${fileName}</span>
            <button class="close-tab">×</button>
        `;

        this.tabContainer.appendChild(tab);
        
        // Create model for the file
        const model = monaco.editor.createModel(content, language);
        this.models.set(filePath, model);
        
        // Store tab information
        this.tabs.set(filePath, {
            element: tab,
            model: model,
            language: language
        });

        // Add click handler for the tab
        tab.addEventListener('click', (e) => {
            if (!e.target.matches('.close-tab')) {
                this.activateTab(filePath);
            }
        });

        // Add click handler for the close button
        tab.querySelector('.close-tab').addEventListener('click', () => {
            this.closeTab(filePath);
        });

        // Activate the new tab
        this.activateTab(filePath);
    }

    activateTab(filePath) {
        if (this.activeTab) {
            this.tabs.get(this.activeTab).element.classList.remove('active');
        }

        const tab = this.tabs.get(filePath);
        if (tab) {
            tab.element.classList.add('active');
            this.activeTab = filePath;
            window.editor.setModel(tab.model);
            
            // Update status bar with current language
            this.updateStatusBar(tab.language);
        }
    }

    // ... rest of existing code ...
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Renderer.js Loaded and DOM Ready!");

    // Initialize status bar
    initializeStatusBar();

    // Configure Monaco editor paths
    require.config({ paths: { vs: 'node_modules/monaco-editor/min/vs' } });

    // Rest of your existing initialization code...
});

function initializeStatusBar() {
    // Ensure status bar exists in the DOM
    let statusBar = document.getElementById('status-bar');
    if (!statusBar) {
        statusBar = document.createElement('div');
        statusBar.id = 'status-bar';
        statusBar.innerHTML = `
            <div class="status-item language">
                <i class="fas fa-code"></i>
                <span class="language-name">plaintext</span>
            </div>
            <div class="status-item encoding">
                <i class="fas fa-file-alt"></i>
                <span>UTF-8</span>
            </div>
            <div class="status-item line-ending">
                <i class="fas fa-level-down-alt"></i>
                <span>LF</span>
            </div>
        `;
        document.body.appendChild(statusBar);
    }

    // Initialize with default values
    updateStatusBar('plaintext');
}

function updateStatusBar(language) {
    const languageElement = document.querySelector('#status-bar .language-name');
    if (languageElement) {
        // Convert language ID to display name
        const displayName = getLanguageDisplayName(language);
        languageElement.textContent = displayName;
        
        // Update icon based on language
        const icon = languageElement.parentElement.querySelector('i');
        icon.className = getLanguageIcon(language);
    }
}

function getLanguageDisplayName(language) {
    const languageMap = {
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'html': 'HTML',
        'css': 'CSS',
        'scss': 'SCSS',
        'less': 'Less',
        'json': 'JSON',
        'xml': 'XML',
        'python': 'Python',
        'java': 'Java',
        'cpp': 'C++',
        'c': 'C',
        'csharp': 'C#',
        'go': 'Go',
        'rust': 'Rust',
        'ruby': 'Ruby',
        'php': 'PHP',
        'shell': 'Shell Script',
        'yaml': 'YAML',
        'toml': 'TOML',
        'ini': 'INI',
        'sql': 'SQL',
        'markdown': 'Markdown',
        'plaintext': 'Plain Text'
    };
    return languageMap[language] || language;
}

function getLanguageIcon(language) {
    const iconMap = {
        'javascript': 'fab fa-js',
        'typescript': 'fab fa-js',
        'html': 'fab fa-html5',
        'css': 'fab fa-css3',
        'scss': 'fab fa-sass',
        'less': 'fab fa-css3',
        'python': 'fab fa-python',
        'java': 'fab fa-java',
        'php': 'fab fa-php',
        'ruby': 'fab fa-ruby',
        'markdown': 'fas fa-file-alt',
        'shell': 'fas fa-terminal',
        'sql': 'fas fa-database'
    };
    return iconMap[language] || 'fas fa-code';
} 
class TabManager {
    constructor() {
        this.tabs = new Map(); // Map of file paths to tab elements
        this.activeTab = null;
        this.tabList = document.querySelector('.tab-list');
        this.initializeCloseAllButton();
        this.models = new Map(); // Store Monaco editor models
        this.defaultModel = null;
        this.initializeDefaultModel();
    }

    initializeDefaultModel() {
        // Create a default model with welcome message
        this.defaultModel = monaco.editor.createModel(
            '// Welcome to AI-Supported IDE\n' +
            '// Open a file from the explorer or create a new file to get started\n\n' +
            '// Quick Tips:\n' +
            '// - Use the file explorer on the left to open files\n' +
            '// - Use the terminal below for commands\n' +
            '// - Use the chat panel on the right for AI assistance',
            'javascript'
        );
    }

    initializeCloseAllButton() {
        const closeAllBtn = document.querySelector('.tab-action-btn[title="Close All Tabs"]');
        closeAllBtn.addEventListener('click', () => this.closeAllTabs());
    }

    createTab(filePath, content, language) {
        // If tab already exists, just activate it
        if (this.tabs.has(filePath)) {
            this.activateTab(filePath);
            return;
        }

        // Create tab element
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.path = filePath;

        // Get file name from path
        const fileName = filePath.split('/').pop();

        // Get appropriate icon
        const fileExtension = fileName.split('.').pop().toLowerCase();
        const iconClass = this.getFileIcon(fileExtension);

        tab.innerHTML = `
            <span class="tab-icon"><i class="${iconClass}"></i></span>
            <span class="tab-title">${fileName}</span>
            <span class="tab-close"><i class="fas fa-times"></i></span>
        `;

        // Add event listeners
        tab.addEventListener('click', () => this.activateTab(filePath));
        tab.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(filePath);
        });

        // Add tab to DOM
        this.tabList.appendChild(tab);
        this.tabs.set(filePath, tab);

        // Create and store editor model
        const model = monaco.editor.createModel(content, language);
        this.models.set(filePath, model);

        // Activate the new tab and ensure editor is in editable state
        this.activateTab(filePath);
        window.editor.updateOptions({
            readOnly: false,
            renderLineHighlight: 'all',
            renderIndentGuides: true,
            minimap: {
                enabled: true
            }
        });
    }

    activateTab(filePath) {
        // Deactivate current tab
        if (this.activeTab) {
            this.activeTab.classList.remove('active');
        }

        // Activate new tab
        const tab = this.tabs.get(filePath);
        tab.classList.add('active');
        this.activeTab = tab;

        // Set editor model
        const model = this.models.get(filePath);
        if (model && window.editor) {
            window.editor.setModel(model);
            window.editor.focus();
        }
    }

    closeTab(filePath) {
        const tab = this.tabs.get(filePath);
        if (!tab) return;

        // Remove tab element
        tab.remove();
        this.tabs.delete(filePath);

        // Dispose of the model
        const model = this.models.get(filePath);
        if (model) {
            model.dispose();
            this.models.delete(filePath);
        }

        // If this was the active tab, activate another one
        if (this.activeTab === tab) {
            this.activeTab = null;
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.activateTab(remainingTabs[remainingTabs.length - 1]);
            } else {
                // No tabs left, show default welcome message
                if (window.editor) {
                    window.editor.setModel(this.defaultModel);
                    window.editor.updateOptions({
                        readOnly: true,
                        renderLineHighlight: 'none',
                        renderIndentGuides: false,
                        minimap: {
                            enabled: false
                        }
                    });
                }
            }
        }
    }

    closeAllTabs() {
        Array.from(this.tabs.keys()).forEach(filePath => this.closeTab(filePath));
    }

    getFileIcon(extension) {
        const iconMap = {
            'js': 'fab fa-js',
            'py': 'fab fa-python',
            'html': 'fab fa-html5',
            'css': 'fab fa-css3',
            'json': 'fas fa-code',
            'md': 'fas fa-file-alt',
            'txt': 'fas fa-file-alt'
        };
        return iconMap[extension] || 'fas fa-file-code';
    }
}

// Initialize tab manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.tabManager = new TabManager();
}); 
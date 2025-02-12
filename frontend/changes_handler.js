// changes_handler.js
class ChangesHandler {
    constructor() {
        this.pendingChanges = null;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.container = document.getElementById('code-changes-container');
        this.preview = document.getElementById('changes-preview');
        this.acceptBtn = document.getElementById('accept-changes');
        this.rejectBtn = document.getElementById('reject-changes');
    }

    bindEvents() {
        this.acceptBtn.addEventListener('click', () => this.acceptChanges());
        this.rejectBtn.addEventListener('click', () => this.rejectChanges());
    }

    showChanges(changes) {
        this.pendingChanges = changes;
        this.container.classList.remove('hidden');
        this.preview.innerHTML = this.formatChanges(changes);
    }

    async acceptChanges() {
        if (!this.pendingChanges) return;

        try {
            // Handle different types of changes
            for (const change of this.pendingChanges) {
                if (change.type === 'create') {
                    await this.createNewFile(change.path, change.content);
                } else if (change.type === 'update') {
                    await this.updateExistingFile(change.path, change.content);
                }
            }

            this.hideChanges();
            // Show success notification
            this.showNotification('Changes applied successfully', 'success');
        } catch (error) {
            console.error('Error applying changes:', error);
            this.showNotification('Failed to apply changes: ' + error.message, 'error');
        }
    }

    async createNewFile(path, content) {
        // Send to main process to create file
        return window.electron.ipcRenderer.invoke('create-file', {
            path,
            content
        });
    }

    async updateExistingFile(path, content) {
        // Send to main process to update file
        return window.electron.ipcRenderer.invoke('update-file', {
            path,
            content
        });
    }

    rejectChanges() {
        this.hideChanges();
        this.showNotification('Changes rejected', 'info');
    }

    hideChanges() {
        this.pendingChanges = null;
        this.container.classList.add('hidden');
        this.preview.innerHTML = '';
    }

    showNotification(message, type) {
        // Implementation for showing notifications
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    formatChanges(changes) {
        let html = '';
        
        for (const change of changes) {
            html += `<div class="change-item">`;
            html += `<div class="change-header">${change.type === 'create' ? 'New File' : 'Update'}: ${change.path}</div>`;
            html += `<pre class="code-preview">`;
            
            if (change.type === 'update' && change.diff) {
                // Show diff for updates
                change.diff.forEach(line => {
                    if (line.startsWith('+')) {
                        html += `<span class="diff-added">${this.escapeHtml(line)}</span>\n`;
                    } else if (line.startsWith('-')) {
                        html += `<span class="diff-removed">${this.escapeHtml(line)}</span>\n`;
                    } else {
                        html += this.escapeHtml(line) + '\n';
                    }
                });
            } else {
                // Show full content for new files
                html += this.escapeHtml(change.content);
            }
            
            html += `</pre></div>`;
        }
        
        return html;
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showUpdateDialog({ path, content, language }) {
        // Create a modal dialog for editing
        const modal = document.createElement('div');
        modal.className = 'update-modal';
        
        const editor = monaco.editor.create(modal, {
            value: content,
            language: language,
            theme: 'vs-dark',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollbar: {
                vertical: 'visible',
                horizontal: 'visible'
            },
            lineHeight: 19,
            contextmenu: true,
            fontSize: 14,
            folding: true
        });

        const actions = document.createElement('div');
        actions.className = 'modal-actions';
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'action-btn accept';
        saveBtn.textContent = 'Save';
        saveBtn.onclick = () => {
            const updatedContent = editor.getValue();
            this.acceptChanges({
                type: 'update',
                path: path,
                content: updatedContent,
                language: language
            });
            document.body.removeChild(modal);
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'action-btn reject';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => document.body.removeChild(modal);

        actions.appendChild(saveBtn);
        actions.appendChild(cancelBtn);
        modal.appendChild(actions);
        document.body.appendChild(modal);

        // Adjust editor size after modal is visible
        editor.layout();
    }
}

// Initialize the handler
window.changesHandler = new ChangesHandler();

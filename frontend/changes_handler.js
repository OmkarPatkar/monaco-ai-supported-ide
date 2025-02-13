// changes_handler.js
class ChangesHandler {
    constructor() {
        this.pendingChanges = [];
    }

    showChanges(changes) {
        this.pendingChanges = changes;
        
        // Create or get the changes container
        let container = document.getElementById('code-changes-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'code-changes-container';
            document.getElementById('chat-container').appendChild(container);
        }

        // Clear previous content
        container.innerHTML = '';
        container.classList.remove('hidden');

        // Create header
        const header = document.createElement('div');
        header.className = 'changes-header';
        header.innerHTML = `
            <h3>Proposed Changes</h3>
            <div class="changes-actions">
                <button class="action-btn accept" onclick="window.changesHandler.applyChanges()">
                    <i class="fas fa-check"></i> Apply Changes
                </button>
                <button class="action-btn reject" onclick="window.changesHandler.rejectChanges()">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        `;
        container.appendChild(header);

        // Create changes preview
        const preview = document.createElement('div');
        preview.id = 'changes-preview';
        
        changes.forEach(change => {
            const changeElement = document.createElement('div');
            changeElement.className = 'change-item';
            changeElement.innerHTML = `
                <div class="change-header">
                    <span class="change-type">${change.type}</span>
                    <span class="change-path">${change.path}</span>
                </div>
                <pre><code class="language-${change.language || 'plaintext'}">${this.escapeHtml(change.content)}</code></pre>
            `;
            preview.appendChild(changeElement);
        });

        container.appendChild(preview);
    }

    async applyChanges() {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/apply_changes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ changes: this.pendingChanges })
            });

            if (!response.ok) {
                throw new Error('Failed to apply changes');
            }

            this.hideChanges();
            showToast('Changes applied successfully');
            
            // Refresh the file tree if it exists
            if (typeof loadFileTree === 'function') {
                loadFileTree();
            }
        } catch (error) {
            console.error('Error applying changes:', error);
            showToast('Failed to apply changes: ' + error.message);
        }
    }

    rejectChanges() {
        this.hideChanges();
        this.pendingChanges = [];
        showToast('Changes rejected');
    }

    hideChanges() {
        const container = document.getElementById('code-changes-container');
        if (container) {
            container.classList.add('hidden');
        }
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    async executeCommand(command) {
        try {
            const response = await fetch('http://127.0.0.1:5000/api/execute_command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command })
            });

            if (!response.ok) {
                throw new Error('Failed to execute command');
            }

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error executing command:', error);
            throw error;
        }
    }
}

// Initialize the changes handler
window.changesHandler = new ChangesHandler();

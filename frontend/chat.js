// chat.js - Handles chat and code changes integration
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const rightSidebar = document.getElementById('right-sidebar');

    // Initialize chat container if it doesn't exist
    if (!document.getElementById('chat-container')) {
        const chatContainer = document.createElement('div');
        chatContainer.id = 'chat-container';
        chatContainer.innerHTML = `
            <div id="chat-messages"></div>
            <div class="chat-input-container">
                <textarea id="user-input" placeholder="Ask me anything..."></textarea>
                <button id="send-button">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
        `;
        rightSidebar.insertBefore(chatContainer, rightSidebar.firstChild);
    }

    // Initialize code changes container if it doesn't exist
    if (!document.getElementById('code-changes-container')) {
        const changesContainer = document.createElement('div');
        changesContainer.id = 'code-changes-container';
        changesContainer.className = 'hidden';
        changesContainer.innerHTML = `
            <h3>Proposed Code Changes</h3>
            <div id="changes-preview"></div>
            <div class="changes-actions">
                <button id="accept-changes" class="btn btn-success">Accept Changes</button>
                <button id="reject-changes" class="btn btn-danger">Reject Changes</button>
            </div>
        `;
        rightSidebar.insertBefore(changesContainer, rightSidebar.firstChild);
    }

    class ChatHandler {
        constructor() {
            this.initializeChat();
            this.bindEvents();
            this.loadAvailableModels();
        }

        initializeChat() {
            // Ensure right sidebar exists
            const rightSidebar = document.getElementById('right-sidebar');
            if (!rightSidebar) {
                console.error('Right sidebar not found');
                return;
            }

            // Initialize chat container if it doesn't exist
            if (!document.getElementById('chat-container')) {
                const chatContainer = document.createElement('div');
                chatContainer.id = 'chat-container';
                chatContainer.innerHTML = `
                    <div id="chat-messages"></div>
                    <div class="chat-input-container">
                        <textarea id="user-input" placeholder="Ask me anything..."></textarea>
                        <button id="send-button">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                `;
                rightSidebar.insertBefore(chatContainer, rightSidebar.firstChild);
            }

            this.chatMessages = document.getElementById('chat-messages');
            this.userInput = document.getElementById('user-input');
            this.sendButton = document.getElementById('send-button');
        }

        bindEvents() {
            if (!this.sendButton || !this.userInput) return;

            this.sendButton.addEventListener('click', () => this.sendMessage());
            this.userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        async loadAvailableModels() {
            try {
                const response = await fetch('/api/models');
                const models = await response.json();
                this.updateModelSelector(models);
            } catch (error) {
                console.error('Error loading models:', error);
            }
        }

        updateModelSelector(models) {
            const selector = document.getElementById('model-selector');
            if (!selector) return;

            selector.innerHTML = models.map(model => 
                `<option value="${model.id}">${model.name}</option>`
            ).join('');
        }

        async sendMessage() {
            const message = this.userInput.value.trim();
            if (!message) return;

            // Disable input while processing
            this.userInput.disabled = true;
            this.sendButton.disabled = true;

            try {
                // Add user message to chat
                this.appendMessage('user', message);
                this.userInput.value = '';

                // Safely get editor content if available
                let editorContent = '';
                if (window.editor && typeof window.editor.getValue === 'function') {
                    try {
                        editorContent = window.editor.getValue();
                    } catch (e) {
                        console.warn('Failed to get editor content:', e);
                    }
                }
                
                // Get selected model
                const selectedModel = document.getElementById('model-selector').value;

                // Show loading indicator
                this.appendMessage('system', 'Loading response...');

                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message,
                        model: selectedModel,
                        context: editorContent
                    })
                });

                // Remove loading message
                this.chatMessages.removeChild(this.chatMessages.lastChild);

                if (!response.ok) {
                    throw new Error('Failed to get response from model');
                }

                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }

                // Display the AI response
                this.appendMessage('ai', data.response);

                // Handle code changes if any
                if (data.codeChanges && data.codeChanges.length > 0) {
                    window.changesHandler.showChanges(data.codeChanges);
                }

            } catch (error) {
                console.error('Error:', error);
                this.appendMessage('system', `Error: ${error.message}`);
            } finally {
                // Re-enable input
                this.userInput.disabled = false;
                this.sendButton.disabled = false;
            }
        }

        appendMessage(role, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message ${role}`;
            
            // Format code blocks in the message
            const formattedContent = this.formatMessageContent(content);
            messageDiv.innerHTML = formattedContent;
            
            this.chatMessages.appendChild(messageDiv);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }

        formatMessageContent(content) {
            // Replace code blocks with formatted HTML
            return content.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, language, code) => {
                return `
                    <div class="code-block">
                        ${language ? `<div class="code-language">${language}</div>` : ''}
                        <pre><code class="language-${language || 'plaintext'}">${this.escapeHtml(code.trim())}</code></pre>
                    </div>
                `;
            });
        }

        escapeHtml(text) {
            return text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }
    }

    // Initialize chat when the document is ready
    window.chatHandler = new ChatHandler();
});

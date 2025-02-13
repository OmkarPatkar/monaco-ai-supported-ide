from flask import Flask, request, jsonify
from langchain.callbacks.manager import CallbackManager
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain_community.llms import Ollama
import os
import re
import json

app = Flask(__name__)

class DeepSeekHandler:
    def __init__(self):
        self.model = None
        self.current_model_name = None

    def get_model(self, model_name="deepseek-coder:6.7b"):
        # Only create new model instance if model name changes
        if self.model is None or self.current_model_name != model_name:
            self.model = Ollama(
                model=model_name,
                temperature=0.7,
                top_p=0.8,
                callback_manager=None
            )
            self.current_model_name = model_name
        return self.model

deepseek_handler = DeepSeekHandler()

# Initialize Ollama with DeepSeek R1 1.5B
def get_llm():
    return Ollama(
        model="deepseek-r1:1.5b",  # Specifically use DeepSeek R1 1.5B
        callback_manager=CallbackManager([StreamingStdOutCallbackHandler()]),
        temperature=0.7,
        top_p=0.8
    )

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        message = data.get('message', '')
        context = data.get('context', '')

        # Format the prompt
        prompt = f"""Context (if any):
{context}

User: {message}
"""
        
        # Get model instance
        model = get_llm()
        
        # Get response from model
        response = model.invoke(prompt)
        
        # Process the response
        processed_response = process_response(response)
        
        return jsonify({
            'response': processed_response,
            'codeChanges': extract_code_changes(processed_response)
        })

    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")  # Debug logging
        return jsonify({'error': str(e)}), 500

def format_prompt(message, context=''):
    """Format the prompt for DeepSeek model"""
    if context:
        return f"""Context (Current code or file content):
```
{context}
```

User Question: {message}

Please provide a detailed response. If suggesting code changes, use the format:
```language:filepath
code content
```
"""
    else:
        return f"User Question: {message}"

def process_response(response):
    """Process and clean the model's response"""
    if not response:
        return "No response from model"
    
    # Clean up any potential formatting issues
    response = response.strip()
    
    # Ensure code blocks are properly formatted
    response = re.sub(r'```(\w+)\n', r'```\1:\n', response)
    
    return response

def extract_code_changes(response):
    """Extract code changes from the response"""
    changes = []
    
    # Match code blocks with language and optional filepath
    code_blocks = re.finditer(r'```(?:(\w+):)?([^\n]+)?\n([\s\S]+?)```', response)
    
    for match in code_blocks:
        language = match.group(1) or 'plaintext'
        filepath = match.group(2) or f'new_file.{language}'
        code = match.group(3).strip()
        
        changes.append({
            'type': 'update' if os.path.exists(filepath) else 'create',
            'path': filepath,
            'language': language,
            'content': code
        })
    
    return changes

@app.route('/api/models', methods=['GET'])
def get_available_models():
    """Get list of available Ollama models"""
    try:
        # You might want to implement actual model detection here
        models = [
            {"id": "deepseek-coder:6.7b", "name": "DeepSeek Coder 6.7B"},
            {"id": "deepseek-coder:33b", "name": "DeepSeek Coder 33B"},
        ]
        return jsonify(models)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 
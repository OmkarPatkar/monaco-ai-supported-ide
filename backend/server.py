# # # server.py
import os
import re
import subprocess
import sys
import together
import requests
from flask import Flask, request, jsonify
from langchain_ollama import OllamaLLM
from openai import OpenAI
import chromadb
from chromadb.utils import embedding_functions
import json
from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
import difflib
import tempfile
import shlex
import shutil

# Load environment variables from .env
load_dotenv()

# Access environment variables
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = os.getenv("DEEPSEEK_API_URL")
TOGETHER_URL = os.getenv("TOGETHER_URL")
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "deepseek-r1:1.5b")
FLASK_ENV = os.getenv("FLASK_ENV", "Development")  # Default to production if not set
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

print(f"🔹 Flask Mode: {FLASK_ENV}")
print(f"🔹 Debug Mode: {DEBUG}")
print(f"🔹 DeepSeek API Key Loaded: {DEEPSEEK_API_KEY[:5]}******")  # Masked for security

app = Flask(__name__)
app.config["DEBUG"] = DEBUG

# Initialize ChromaDB Client
chroma_client = chromadb.PersistentClient(path="./vector_db")
collection = chroma_client.get_or_create_collection(name="code_snippets")

# Load SentenceTransformer Embedding Function
embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# ✅ Text Splitter to Break Files into Chunks
text_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=80)

# Set your project directory (change this if needed)
BASE_DIR = './'

# Store chat history
chat_history = []

# Function to check if model exists in Ollama
def is_model_installed(model_name):
    try:
        installed_models = subprocess.run(['ollama', 'list'], capture_output=True, text=True, check=True)
        return model_name in installed_models.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error checking installed models: {e}")
        return False

# Function to download model if missing
def download_model(model_name):
    try:
        print(f"Checking for model: {model_name}")
        if not is_model_installed(model_name):
            print(f"Model {model_name} not found. Downloading...")
            subprocess.run(['ollama', 'pull', model_name], check=True, encoding='utf-8')
            print(f"Model {model_name} downloaded successfully.")
        else:
            print(f"Model {model_name} is already installed.")
    except subprocess.CalledProcessError as e:
        print(f"Error downloading model {model_name}: {e}")
        sys.exit(1)


# Function to clean AI response
def clean_response(response_text):
    # Remove <think>...</think> blocks
    cleaned_text = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL).strip()
    return cleaned_text

# ✅ Function to Store File Content in ChromaDB
def store_file_in_chromadb(file_name, file_content):
    chunks = text_splitter.split_text(file_content)  # 🔹 Split file content into chunks
    chunk_embeddings = embedding_function(chunks)   # 🔹 Convert chunks into embeddings

    for i, chunk in enumerate(chunks):
        doc_id = f"{file_name}_chunk_{i}"
        collection.add(ids=[doc_id], embeddings=[chunk_embeddings[i]], metadatas=[{"file_name": file_name, "chunk": chunk}])

    print(f"✅ File '{file_name}' stored in ChromaDB with {len(chunks)} chunks.")


# Function to Store Code Snippets
def store_code_snippet(file_name, code):
    doc_id = file_name
    embedding = embedding_function([code])[0]  # Generate embedding
    collection.add(ids=[doc_id], embeddings=[embedding], metadatas=[{"file_name": file_name, "code": code}])
    print(f"✅ Code stored in ChromaDB: {file_name}")

# Function to Retrieve Relevant Code Snippets
def retrieve_code_snippets(query, top_k=3):
    query_embedding = embedding_function([query])[0]
    results = collection.query(query_embeddings=[query_embedding], n_results=top_k)
    if results["ids"]:
        retrieved_snippets = [meta["chunk"] for meta in results["metadatas"][0]]
        return "\n".join(retrieved_snippets)
    return None

# Function to list files recursively
def list_files_recursive(directory):
    """ Recursively fetch files and folders inside a directory. """
    items = []
    try:
        for entry in os.scandir(directory):
            item = {
                "name": entry.name,
                "type": "folder" if entry.is_dir() else "file",
                "path": entry.path
            }

            if entry.is_dir():
                item["children"] = list_files_recursive(entry.path)  # 🔹 Recursion for subfolders

            items.append(item)
    except PermissionError:
        pass  # Handle folders without permission access
    return items

# ✅ Function to format history as context
def format_history_for_prompt(history):
    prompt = ""
    for msg in history[-5:]:  # Limit context to last 5 messages
        role = "User" if msg["role"] == "user" else "AI"
        prompt += f"{role}: {msg['content']}\n"
    prompt += "AI: "
    return prompt


@app.route('/chat', methods=['POST'])
def chat():
    print("/Chat request received!")

    if not request.is_json:
        return jsonify({'error': 'Unsupported Media Type'}), 415

    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()
        model_name = data.get("model", DEFAULT_MODEL)
        editor_context = data.get("context", "")  # Get editor context from request

        if not user_message:
            return jsonify({"error": "Message cannot be empty."}), 400
        if not model_name:
            return jsonify({"error": "Model name is required."}), 400

        print(f"🤖 Model: {model_name}")

        # Retrieve relevant code snippets
        retrieved_context = retrieve_code_snippets(user_message)
        
        # Format the prompt with context and history
        if model_name == "deepseek-r1:8b":
            # For 8B model, we'll use a more comprehensive prompt
            system_prompt = """You are an AI coding assistant with access to the project's codebase. 
            Analyze the context and previous conversation to provide accurate and relevant responses.
            If you need to write code, make it production-ready and well-documented.
            If you're unsure about something, ask for clarification."""
            
            # Combine all context
            all_context = []
            if retrieved_context:
                all_context.append("Retrieved code context:\n" + retrieved_context)
            if editor_context:
                all_context.append("Current editor context:\n" + editor_context)
            
            context_str = "\n\n".join(all_context) if all_context else ""
            
            # Format conversation history
            conversation_history = "\nPrevious conversation:\n"
            for msg in chat_history[-5:]:  # Get last 5 messages
                role = "User" if msg["role"] == "user" else "Assistant"
                conversation_history += f"{role}: {msg['content']}\n"
            
            formatted_prompt = f"{system_prompt}\n\n"
            if context_str:
                formatted_prompt += f"Context:\n{context_str}\n\n"
            formatted_prompt += f"{conversation_history}\nUser: {user_message}\nAssistant:"
        else:
            # For 1.5B model, use simpler prompt
            system_instruction = "Please respond in English. Be clear and concise."
            formatted_prompt = f"System: {system_instruction}\n\n"
            if retrieved_context:
                formatted_prompt += f"Context:\n{retrieved_context}\n\n"
            if editor_context:
                formatted_prompt += f"Current editor context:\n{editor_context}\n\n"
            formatted_prompt += f"User Query:\n{user_message}"

        # Append user message to history
        chat_history.append({"role": "user", "content": user_message})

        try:
            # Ensure model is downloaded
            download_model(model_name)
            
            # Initialize Ollama with appropriate parameters based on model
            if model_name == "deepseek-r1:8b":
                llm = OllamaLLM(
                    model=model_name,
                    temperature=0.7,
                    top_p=0.9,
                    top_k=40,
                    num_ctx=4096  # Larger context window for 8B model
                )
            else:
                llm = OllamaLLM(model=model_name)
            
            # Get AI response
            ai_response = llm.invoke(formatted_prompt)
            
            # Clean the response
            ai_response = clean_response(ai_response)
            
            # Append AI response to history
            chat_history.append({"role": "assistant", "content": ai_response})
            
            return jsonify({"response": ai_response}), 200
        except Exception as e:
            print(f"❌ Error with local model: {str(e)}")
            return jsonify({"error": f"Error with local model: {str(e)}"}), 500

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    

# Upload Code Snippet Endpoint
@app.route('/upload', methods=['POST'])
def upload_file():
    print(f'/upload endpoint called')

    if 'file' not in request.files:
        print(f'No file uploaded')
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    file_name = file.filename
    file_content = file.read().decode("utf-8")

    # store_code_snippet(file_name, file_content)
    store_file_in_chromadb(file_name, file_content)  # 🔹 Store in ChromaDB
    return jsonify({"message": f"File '{file_name}' uploaded and stored successfully."}), 200


@app.route('/files', methods=['GET'])
def list_files():
    path = request.args.get("path", BASE_DIR)  # Get path from query param, default to BASE_DIR
    file_tree = []

    try:
        for entry in os.scandir(path):
            item = {
                "name": entry.name,
                "type": "folder" if entry.is_dir() else "file",
                "path": entry.path
            }
            
            # If it's a folder, recursively get its contents
            if entry.is_dir():
                item["children"] = list_files_recursive(entry.path)  # 🔹 Call recursive function
            
            file_tree.append(item)

    except PermissionError:
        pass  # Handle permission errors safely

    return jsonify(file_tree)



def create_diff(original_content, new_content):
    """Create a line-by-line diff between original and new content"""
    original_lines = original_content.splitlines()
    new_lines = new_content.splitlines()
    diff = []
    
    for line in difflib.unified_diff(original_lines, new_lines, lineterm=''):
        if line.startswith('+++') or line.startswith('---') or line.startswith('@@'):
            continue
        diff.append(line)
    
    return diff

@app.route('/api/propose_changes', methods=['POST'])
def propose_changes():
    data = request.json
    changes = []
    
    for change in data['changes']:
        if change['type'] == 'update':
            try:
                with open(change['path'], 'r') as f:
                    original_content = f.read()
                diff = create_diff(original_content, change['content'])
                change['diff'] = diff
            except FileNotFoundError:
                return jsonify({'error': f"File not found: {change['path']}"}), 404
        
        changes.append(change)
    
    return jsonify({'changes': changes})

@app.route('/api/execute_command', methods=['POST'])
def execute_command():
    data = request.json
    if not data or 'command' not in data:
        return jsonify({"error": "No command provided"}), 400

    try:
        # Split command into arguments safely
        args = shlex.split(data['command'])
        
        # Execute command and capture output
        process = subprocess.Popen(
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=os.getcwd()  # Use the current working directory
        )
        
        stdout, stderr = process.communicate()
        
        return jsonify({
            "success": process.returncode == 0,
            "stdout": stdout,
            "stderr": stderr,
            "code": process.returncode
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/apply_changes', methods=['POST'])
def apply_changes():
    data = request.json
    if not data or 'changes' not in data:
        return jsonify({"error": "No changes provided"}), 400

    try:
        for change in data['changes']:
            file_path = change['path']
            content = change['content']
            
            # Ensure the directory exists
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            
            # Write the content to a temporary file first
            with tempfile.NamedTemporaryFile(mode='w', delete=False) as temp_file:
                temp_file.write(content)
            
            # Then move the temporary file to the target location
            os.replace(temp_file.name, file_path)
        
        return jsonify({"message": "Changes applied successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/file', methods=['GET'])
def get_file_content():
    file_path = request.args.get('path')
    if not file_path:
        return jsonify({"error": "No file path provided"}), 400

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return jsonify({"content": content}), 200
    except Exception as e:
        print(f"Error reading file: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/files', methods=['GET'])
def get_directory_contents():
    try:
        # Get the path from query parameters, default to current directory
        requested_path = request.args.get('path', os.getcwd())
        
        # Ensure the path exists and is a directory
        if not os.path.exists(requested_path):
            return jsonify({"error": "Path does not exist"}), 404
        if not os.path.isdir(requested_path):
            return jsonify({"error": "Path is not a directory"}), 400
            
        entries = []
        for entry in os.scandir(requested_path):
            try:
                item = {
                    "name": entry.name,
                    "type": "folder" if entry.is_dir() else "file",
                    "path": entry.path
                }
                entries.append(item)
            except PermissionError:
                continue  # Skip entries we can't access
            
        # Sort entries: folders first, then files, both alphabetically
        entries.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))
        
        return jsonify(entries)
    except Exception as e:
        print(f"Error reading directory: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_directory_tree(directory):
    """Recursively get directory contents"""
    try:
        entries = []
        for entry in os.scandir(directory):
            try:
                item = {
                    "name": entry.name,
                    "type": "folder" if entry.is_dir() else "file",
                    "path": entry.path
                }
                entries.append(item)
            except PermissionError:
                continue
            
        # Sort entries: folders first, then files
        entries.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))
        return entries
    except PermissionError:
        return []  # Return empty list for directories we can't access

@app.route('/api/files', methods=['POST'])
def create_file():
    try:
        data = request.get_json()
        file_path = data.get('path')
        content = data.get('content', '')
        
        if not file_path:
            return jsonify({"error": "File path is required"}), 400
            
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Create and write to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        return jsonify({"message": f"File created: {file_path}"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/files', methods=['PUT'])
def update_file():
    try:
        data = request.get_json()
        file_path = data.get('path')
        content = data.get('content')
        
        if not file_path or content is None:
            return jsonify({"error": "File path and content are required"}), 400
            
        # Update file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
            
        return jsonify({"message": f"File updated: {file_path}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/files', methods=['DELETE'])
def delete_file():
    try:
        data = request.get_json()
        file_path = data.get('path')
        
        if not file_path:
            return jsonify({"error": "File path is required"}), 400
            
        # Delete file
        if os.path.isfile(file_path):
            os.remove(file_path)
        elif os.path.isdir(file_path):
            shutil.rmtree(file_path)
        else:
            return jsonify({"error": "File or directory not found"}), 404
            
        return jsonify({"message": f"Deleted: {file_path}"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/directories', methods=['POST'])
def create_directory():
    try:
        data = request.get_json()
        dir_path = data.get('path')
        
        if not dir_path:
            return jsonify({"error": "Directory path is required"}), 400
            
        # Create directory
        os.makedirs(dir_path, exist_ok=True)
        
        return jsonify({"message": f"Directory created: {dir_path}"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

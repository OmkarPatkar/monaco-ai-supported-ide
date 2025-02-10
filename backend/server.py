# # # server.py
# import re
# from flask import Flask, request, jsonify
# from langchain_ollama import OllamaLLM
# import subprocess
# import sys

# app = Flask(__name__)

# def normalize_model_name(model_name):
#     """Ensure model name has a tag"""
#     if ':' not in model_name:
#         return f"{model_name}:latest"
#     return model_name

# def is_model_installed(model_name):
#     try:
#         result = subprocess.run(['ollama', 'list'],
#                               capture_output=True,
#                               text=True,
#                               check=True)
#         installed_models = [line.split()[0] for line in result.stdout.split('\n')[1:] if line.strip()]
#         print(f"Installed models: {installed_models}")
#         return model_name in installed_models
#     except Exception as e:
#         print(f"Error checking models: {str(e)}")
#         return False

# def download_model(model_name):
#     try:
#         print(f"Downloading model: {model_name}")
#         result = subprocess.run(['ollama', 'pull', model_name],
#                               check=True,
#                               capture_output=True,
#                               text=True)
#         print(f"Download output:\n{result.stdout}")
#         return True
#     except subprocess.CalledProcessError as e:
#         print(f"Download failed!\nError: {e.stderr}\nOutput: {e.stdout}")
#         return False

# @app.route('/chat', methods=['POST'])
# def chat():
#     try:
#         data = request.get_json()
#         user_message = data.get("message", "").strip()
#         raw_model_name = data.get('model', '').strip()
        
#         if not user_message:
#             return jsonify({"error": "Message cannot be empty"}), 400
#         if not raw_model_name:
#             return jsonify({"error": "Model name is required"}), 400

#         # Normalize model name
#         model_name = normalize_model_name(raw_model_name)
#         print(f"Processing request for model: {model_name}")

#         # Check model installation
#         if not is_model_installed(model_name):
#             print(f"Model {model_name} not found, attempting download...")
#             if not download_model(model_name):
#                 return jsonify({
#                     "error": f"Failed to download model {model_name}",
#                     "solution": [
#                         "Check if the model exists: https://ollama.ai/library",
#                         "Try manual installation: 'ollama pull {model_name}'",
#                         "Verify network connection"
#                     ]
#                 }), 400

#         # Generate response
#         try:
#             llm = OllamaLLM(model=model_name, timeout=120)
#             response = llm.invoke(user_message)
#             return jsonify({"response": response}), 200
#         except Exception as e:
#             print(f"Generation error: {str(e)}")
#             return jsonify({"error": "Model response failed", "details": str(e)}), 500

#     except Exception as e:
#         print(f"Server error: {str(e)}")
#         return jsonify({"error": "Internal server error", "details": str(e)}), 500

# if __name__ == '__main__':
#     app.run(host='0.0.0.0', port=5000, debug=True)


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

app = Flask(__name__)

# Initialize ChromaDB Client
chroma_client = chromadb.PersistentClient(path="./vector_db")
collection = chroma_client.get_or_create_collection(name="code_snippets")

# Load SentenceTransformer Embedding Function
embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# Default AI model
DEFAULT_MODEL = 'deepseek-r1:1.5b'
# Set your project directory (change this if needed)
BASE_DIR = './'

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

def generate_prompt(history):
    """
    Generate a structured prompt for the AI model based on chat history.
    """
    prompt = ""
    for msg in history:
        role = "User" if msg["role"] == "user" else "AI"
        prompt += f"{role}: {msg['content']}\n"
    prompt += "AI: "
    return prompt

# Function to Store Code Snippets
def store_code_snippet(file_name, code):
    doc_id = file_name
    embedding = embedding_function([code])[0]  # Generate embedding
    collection.add(ids=[doc_id], embeddings=[embedding], metadatas=[{"file_name": file_name, "code": code}])
    print(f"✅ Code stored in ChromaDB: {file_name}")

# Function to Retrieve Relevant Code Snippets
def retrieve_code_snippets(query):
    query_embedding = embedding_function([query])[0]
    results = collection.query(query_embeddings=[query_embedding], n_results=3)
    if results["ids"]:
        retrieved_snippets = [meta["code"] for meta in results["metadatas"][0]]
        return "\n".join(retrieved_snippets)
    return None

# Store chat history

chat_history = []
TOGETHER_API_KEY = ""
DEEPSEEK_API_KEY = ""  # 🔹 Replace with your actual DeepSeek API key
DEEPSEEK_API_URL = "https://openrouter.ai/api/v1"
TOGETHER_URL = "https://api.together.xyz/v1/completions"


@app.route('/chat', methods=['POST'])
def chat():
    print("/Chat request received!")

    if not request.is_json:
        return jsonify({'error': 'Unsupported Media Type'}), 415

    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()
        model_name = data.get("model", DEFAULT_MODEL)

        if not user_message:
            return jsonify({"error": "Message cannot be empty."}), 400
        if not model_name:
            return jsonify({"error": "Model name is required."}), 400

        # print(f"👤 User: {user_message}")
        print(f"🤖 Model: {model_name}")

        # # Retrieve relevant code snippets
        # retrieved_code = retrieve_code_snippets(user_message)
        # if retrieved_code:
        #     user_message = f"Context:\n{retrieved_code}\n\nUser Query:\n{user_message}"


        # Append user message to history
        chat_history.append({"role": "user", "content": user_message})
        print(f'Updated chat history: {chat_history}')

        if model_name == "mistral-7b":
            # Construct the prompt from chat history
            prompt = '\n'.join([f"{msg['role']}: {msg['content']}" for msg in chat_history])
            print(f'prompt : {prompt}')

            # Prepare payload for Together AI API
            payload = {
                'model': 'mistralai/Mixtral-8x7B-v0.1',
                'prompt': prompt,
                'max_tokens': 300,
                'stop': ['</s>']
            }

            headers = {
                'Authorization': f'Bearer {TOGETHER_API_KEY}',
                'Content-Type': 'application/json'
            }

            # Make request to Together AI API
            response = requests.post(TOGETHER_URL, json=payload, headers=headers)
            result = response.json()
            print(f'result : {result}')

            if 'error' in result:
                return jsonify({'error': result['error']}), 500

            # Extract AI response
            ai_message = result['choices'][0]['text'].strip()

            print(ai_message)

            # Append AI response to chat history
            chat_history.append({'role': 'assistant', 'content': ai_message})

            return jsonify({'response': ai_message}), 200

        elif model_name == "deepseek-r1:1.5b":

            client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_API_URL)

            # Call the DeepSeek API with full chat history
            chat = client.chat.completions.create(
                model="deepseek/deepseek-r1:free",
                messages=chat_history  # ✅ Pass full chat history
            )
            print(f'chat : {chat}')

            # ✅ Handle API response errors
            # if hasattr(chat, "error") and chat.error:
            #     print(f"❌ API Error: {chat.error['message']}")
            #     return jsonify({"error": chat.error["message"]}), 400

            # ✅ Extract AI response safely
            if not chat.choices or not chat.choices[0].message.content:
                return jsonify({"error": "Empty response from AI"}), 500
            
            # Extract AI response content
            print(f'chat.choices : {chat.choices[0]}')
            ai_response = chat.choices[0].message.content.strip() if chat.choices else "No response from AI."
            if ai_response == "":
                ai_response = "Sorry, No response from api."
            print(f'AI Response: {ai_response}')

            # Append AI response to history
            chat_history.append({"role": "assistant", "content": ai_response})

            return jsonify({"response": ai_response}), 200
        
        elif model_name == "deepseek":
            model_name = "deepseek-r1:1.5b"
            print(f'Local AI model: {model_name}')

            # Ensure model is installed
            download_model(model_name)

            # Format history properly for the model
            formatted_history = [{"role": msg["role"], "content": msg["content"]} for msg in chat_history]
            
            # Load and use the selected AI model
            llm = OllamaLLM(model=model_name)
            ai_response = llm.invoke(formatted_history)

            # Clean AI response
            ai_response = clean_response(ai_response)

            # Append AI response to history
            chat_history.append({"role": "assistant", "content": ai_response})
            
            # print(f"🎯 AI Response: {ai_response}")
            return jsonify({"response": ai_response}), 200

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({"error": "An error occurred", "details": str(e)}), 500
    

# Upload Code Snippet Endpoint
@app.route('/upload', methods=['POST'])
def upload_file():
    print(f'/upload endpoint called')

    if 'file' not in request.files:
        print(f'No file uploaded')
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    file_name = file.filename
    code_content = file.read().decode("utf-8")

    store_code_snippet(file_name, code_content)
    return jsonify({"message": f"File '{file_name}' uploaded and stored successfully."}), 200


@app.route('/files', methods=['GET'])
def list_files():
    files = []
    for entry in os.scandir(BASE_DIR):
        files.append({
            "name": entry.name,
            "type": "folder" if entry.is_dir() else "file",
            "path": entry.path
        })
    return jsonify(files)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

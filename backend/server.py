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
from flask import Flask, request, jsonify
from langchain_ollama import OllamaLLM

app = Flask(__name__)

# Default AI model
DEFAULT_MODEL = 'deepseek-r1:1.5b'

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
        # print(f"🤖 Model: {model_name}")

        # Ensure model is installed
        download_model(model_name)

        # Load and use the selected AI model
        llm = OllamaLLM(model=model_name)
        ai_response = llm.invoke(user_message)

        # Clean AI response
        ai_response = clean_response(ai_response)
        
        # print(f"🎯 AI Response: {ai_response}")
        return jsonify({"response": ai_response}), 200

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({"error": "An error occurred", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

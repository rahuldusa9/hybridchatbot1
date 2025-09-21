import requests
import json
import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv


load_dotenv()


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# API URLs
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key="
OLLAMA_API_URL = "http://localhost:11434/api/generate"

# Ollama model to use. You must have this model pulled locally.
# Example: `ollama pull llama3.1`
OLLAMA_MODEL = "llama3.1"

# Ollama Chatbot Function

def send_to_ollama(prompt):
    """
    Sends a text prompt to a local Ollama server and returns the response.
    Returns a tuple: (response_text, success_status)
    """
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }
    try:
        # Increased timeout to 60 seconds to allow for longer local generation times.
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=600)
        response.raise_for_status()
        
        data = response.json()
        if 'response' in data:
            return data['response'], True
        
        return "Empty or malformed response from Ollama.", False
    
    except requests.exceptions.ConnectionError:
        return f"Error: Could not connect to Ollama server at {OLLAMA_API_URL}.", False
    except requests.exceptions.RequestException as e:
        return f"An error occurred with the Ollama request: {e}", False


# Gemini Chatbot Function (Fallback)

def send_to_gemini(prompt):
    """
    Sends a text prompt to the Gemini API and returns the generated response.
    Returns a tuple: (response_text, success_status)
    """
    # Check if the API key is set before making the request
    if not GEMINI_API_KEY:
        return "Gemini API key is not configured.", False
    
    headers = {"Content-Type": "application/json"}
    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    try:
        response = requests.post(f"{GEMINI_API_URL}{GEMINI_API_KEY}", headers=headers, data=json.dumps(payload))
        response.raise_for_status()
        data = response.json()

        if "candidates" in data and data["candidates"]:
            parts = data["candidates"][0].get("content", {}).get("parts", [])
            if parts and "text" in parts[0]:
                return parts[0]["text"], True

        return "Sorry, I received an empty or malformed response from the Gemini API.", False

    except requests.exceptions.RequestException as e:
        return f"An error occurred with the Gemini API: {e}", False

# Flask App Setup

# Configure Flask to serve static files from the 'static' directory and
# templates from the 'templates' directory.
app = Flask(__name__, template_folder='templates', static_folder='static')

# Route to serve the main HTML page
@app.route("/")
def index():
    """Serves the main chat interface HTML page from the templates folder."""
    return render_template('index.html')

# Route to handle chat messages
@app.route("/chat", methods=["POST"])
def chat():
    """Handles chat messages and returns responses."""
    data = request.get_json()
    prompt = data.get("prompt")
    bot_choice = data.get("bot")

    if not prompt:
        return jsonify({"response": "Please provide a prompt."}), 400

    if bot_choice == "ollama":
        response, success = send_to_ollama(prompt)
        if not success and "Could not connect" in response:
            # Fallback to Gemini if Ollama fails
            response = f"{response}\nFalling back to Gemini..."
            response, success = send_to_gemini(prompt)
    elif bot_choice == "gemini":
        response, success = send_to_gemini(prompt)
    else:
        response = "Invalid bot selected."
        success = False

    return jsonify({"response": response, "success": success})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)


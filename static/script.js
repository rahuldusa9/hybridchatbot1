const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const botRadios = document.getElementsByName('bot-choice');
const loadingSpinner = document.getElementById('loading-spinner');

// This function handles rendering the response, including code blocks
function renderAndAppendMessage(sender, messageText) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('p-3', 'rounded-xl', 'max-w-[75%]', 'break-words', 'font-mono');
    
    if (sender === 'You') {
        messageElement.classList.add('user-message', 'ml-auto');
    } else {
        messageElement.classList.add('bot-message');
    }

    const senderSpan = document.createElement('span');
    senderSpan.classList.add('font-bold', 'text-[var(--accent-color)]', 'drop-shadow-[0_0_2px_var(--accent-color)]');
    senderSpan.textContent = `${sender}: `;

    messageElement.appendChild(senderSpan);

    // Split the message by code block fences (```)
    const parts = messageText.split('```');
    let isCodeBlock = false;
    parts.forEach(part => {
        if (isCodeBlock) {
            const preElement = document.createElement('pre');
            preElement.classList.add('bg-gray-800', 'p-2', 'rounded-md', 'mt-2', 'overflow-x-auto');
            
            const codeElement = document.createElement('code');
            const lines = part.split('\\n');
            const language = lines[0].trim();
            const codeContent = lines.slice(1).join('\\n');
            codeElement.textContent = codeContent;

            // Corrected line: only add the language name as a class
            // Check if language is a valid class name before adding it
            if (language && /^[a-zA-Z0-9_-]+$/.test(language)) {
                codeElement.classList.add(`language-${language}`);
            }
            
            preElement.appendChild(codeElement);
            messageElement.appendChild(preElement);
        } else {
            const textNode = document.createTextNode(part);
            messageElement.appendChild(textNode);
        }
        isCodeBlock = !isCodeBlock;
    });

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function sendMessage() {
    const prompt = userInput.value.trim();
    if (prompt === '') return;

    // Display user message
    renderAndAppendMessage('You', prompt);
    userInput.value = '';
    
    // Disable input and button, show loading spinner
    sendButton.disabled = true;
    sendButton.classList.add('hidden');
    userInput.disabled = true;
    loadingSpinner.classList.remove('hidden');
    
    try {
        // Get selected bot
        let selectedBot = 'ollama';
        for (const radio of botRadios) {
            if (radio.checked) {
                selectedBot = radio.value;
                break;
            }
        }

        // Send request to Flask backend
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt, bot: selectedBot })
        });

        const data = await response.json();
        
        // Display bot response
        // Check for a success status from the backend to handle errors gracefully
        if (data.success) {
            renderAndAppendMessage('Bot', data.response);
        } else {
            // Display the error message provided by the backend
            renderAndAppendMessage('Bot', data.response);
        }

    } catch (error) {
        console.error('Error:', error);
        renderAndAppendMessage('Bot', 'An error occurred. Please try again.');
    } finally {
        // Re-enable input and button, hide loading spinner
        sendButton.disabled = false;
        sendButton.classList.remove('hidden');
        userInput.disabled = false;
        loadingSpinner.classList.add('hidden');
        userInput.focus();
    }
}

sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// -------------------------
// Quantum Nexus Chat JS
// -------------------------

const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const botRadios = document.getElementsByName("bot-choice");
const loadingSpinner = document.getElementById("loading-spinner");

let currentChatId = null;

// -------------------------
// Initialize / Load Chats
// -------------------------
window.addEventListener("load", () => {
    const chats = JSON.parse(localStorage.getItem("quantumNexusChats") || "{}");
    if (!currentChatId) {
        const ids = Object.keys(chats);
        currentChatId = ids.length ? ids[ids.length - 1] : createNewChat();
    }
    renderChat(chats[currentChatId]);
});

// -------------------------
// Create New Chat
// -------------------------
function createNewChat() {
    const id = Date.now().toString();
    const chats = JSON.parse(localStorage.getItem("quantumNexusChats") || "{}");
    chats[id] = { messages: [] };
    localStorage.setItem("quantumNexusChats", JSON.stringify(chats));
    return id;
}

// -------------------------
// Render Chat Messages
// -------------------------
function renderChat(chat) {
    chatContainer.innerHTML = "";

    chat.messages.forEach(m => {
        renderAndAppendMessage("You", m.user);
        renderAndAppendMessage("Bot", m.bot);
    });

    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// -------------------------
// Render Single Message
// Handles code blocks (```)
// -------------------------
function renderAndAppendMessage(sender, messageText) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("p-3", "rounded-xl", "max-w-[75%]", "break-words", "font-mono", "mb-2");

    if (sender === "You") {
        messageElement.classList.add("user-message", "ml-auto");
    } else {
        messageElement.classList.add("bot-message");
    }

    const senderSpan = document.createElement("span");
    senderSpan.classList.add("font-bold", "text-[var(--accent-color)]", "drop-shadow-[0_0_2px_var(--accent-color)]");
    senderSpan.textContent = `${sender}: `;
    messageElement.appendChild(senderSpan);

    // Split by code fences ```
    const parts = messageText.split("```");
    let isCodeBlock = false;
    parts.forEach(part => {
        if (isCodeBlock) {
            const preElement = document.createElement("pre");
            preElement.classList.add("bg-gray-800", "p-2", "rounded-md", "mt-2", "overflow-x-auto");

            const codeElement = document.createElement("code");
            const lines = part.split("\n");
            const language = lines[0].trim();
            const codeContent = lines.slice(1).join("\n");
            codeElement.textContent = codeContent;

            if (language && /^[a-zA-Z0-9_-]+$/.test(language)) {
                codeElement.classList.add(`language-${language}`);
            }

            preElement.appendChild(codeElement);
            messageElement.appendChild(preElement);
        } else {
            // Regular text
            const textNode = document.createTextNode(part);
            messageElement.appendChild(textNode);
        }
        isCodeBlock = !isCodeBlock;
    });

    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// -------------------------
// Send Message
// -------------------------
async function sendMessage() {
    const prompt = userInput.value.trim();
    if (!prompt) return;

    // Determine selected bot
    let selectedBot = "ollama";
    for (const radio of botRadios) {
        if (radio.checked) {
            selectedBot = radio.value;
            break;
        }
    }

    // Display user message immediately
    renderAndAppendMessage("You", prompt);

    // Save placeholder bot message
    const chats = JSON.parse(localStorage.getItem("quantumNexusChats") || "{}");
    if (!chats[currentChatId]) chats[currentChatId] = { messages: [] };
    chats[currentChatId].messages.push({ user: prompt, bot: "..." });
    localStorage.setItem("quantumNexusChats", JSON.stringify(chats));

    // Clear input and show loading
    userInput.value = "";
    userInput.disabled = true;
    sendButton.disabled = true;
    loadingSpinner.classList.remove("hidden");

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, bot: selectedBot })
        });

        const data = await response.json();

        // Update last bot message
        chats[currentChatId].messages[chats[currentChatId].messages.length - 1].bot = data.response;
        localStorage.setItem("quantumNexusChats", JSON.stringify(chats));

        renderChat(chats[currentChatId]);
    } catch (err) {
        console.error("Error:", err);
        chats[currentChatId].messages[chats[currentChatId].messages.length - 1].bot = "Error: Could not reach server";
        localStorage.setItem("quantumNexusChats", JSON.stringify(chats));
        renderChat(chats[currentChatId]);
    } finally {
        userInput.disabled = false;
        sendButton.disabled = false;
        loadingSpinner.classList.add("hidden");
        userInput.focus();
    }
}

// -------------------------
// Event Listeners
// -------------------------
sendButton.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
});

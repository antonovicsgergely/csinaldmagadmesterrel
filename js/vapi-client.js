import Vapi from "https://esm.sh/@vapi-ai/web";

// Vapi.ai Configuration
const VAPI_PUBLIC_KEY = "d3e5091d-6390-49b4-ab6e-a94e3246c801";
const ASSISTANT_ID = "bd6e2c58-8e5c-4c23-9638-7083eb9291c1"; 

// Vapi példány inicializálása
const vapi = new Vapi(VAPI_PUBLIC_KEY);

let isCallActive = false;
let isMuted = false;

// UI Elemek
const callOverlay = document.getElementById('call-overlay');
const callStatusText = document.getElementById('call-status-text');
const pulseIndicator = document.getElementById('pulse-indicator');
const minimizeBtn = document.getElementById('minimize-call-btn');
const transcriptContainer = document.getElementById('transcript-container');
const muteBtn = document.getElementById('mute-btn');
const endCallBtn = document.getElementById('end-call-btn');
const waveformBars = document.querySelectorAll('.waveform .bar');

// Chat elemek
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat-btn');

// Gombok állapotának frissítése a weboldalon (fő gombok)
function updateButtonsState(isActive) {
    const buttons = document.querySelectorAll('.vapi-booking-btn');
    buttons.forEach(btn => {
        if (isActive) {
            btn.textContent = "Hívás folyamatban...";
            btn.style.opacity = "0.7";
            btn.style.pointerEvents = "none";
            btn.classList.remove('pulse-btn');
        } else {
            btn.innerHTML = "<i class=\"fa-solid fa-phone\"></i> Telefonos foglalás (AI)";
            btn.style.opacity = "1";
            btn.style.pointerEvents = "auto";
        }
    });
}

// UI Reset (Hívás vége)
function resetCallUI() {
    if(callOverlay) {
        callOverlay.classList.add('hidden');
        callOverlay.classList.remove('minimized');
        transcriptContainer.innerHTML = '<div class="transcript-msg system-msg">Az asszisztens csatlakozott.</div>';
        isMuted = false;
        muteBtn.classList.remove('muted');
        waveformBars.forEach(bar => bar.style.height = '4px');
        if (chatInput) chatInput.value = '';
    }
}

// Új transcript üzenet hozzáadása
function addTranscript(role, text) {
    if (!text || text.trim() === '') return;
    if(!transcriptContainer) return;
    
    // Check if the last message is from the same role to append, or create new
    const lastMsg = transcriptContainer.lastElementChild;
    const isSameRole = lastMsg && lastMsg.classList.contains(role === 'user' ? 'user-msg' : 'ai-msg');
    
    if (isSameRole) {
        lastMsg.textContent = text; // Update the ongoing transcript text
    } else {
        const msgDiv = document.createElement('div');
        msgDiv.className = `transcript-msg ${role === 'user' ? 'user-msg' : 'ai-msg'}`;
        msgDiv.textContent = text;
        transcriptContainer.appendChild(msgDiv);
    }
    
    // Auto scroll to bottom
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
}

// Vapi eseménykezelők
vapi.on('call-start', () => {
    console.log("Vapi hívás elindult!");
    isCallActive = true;
    updateButtonsState(true);
    if(callOverlay) callOverlay.classList.remove('hidden');
    if(callStatusText) callStatusText.textContent = "Hívás folyamatban...";
    if(pulseIndicator) pulseIndicator.style.backgroundColor = "#22c55e"; // Zöld
});

vapi.on('call-end', () => {
    console.log("Vapi hívás befejeződött!");
    isCallActive = false;
    updateButtonsState(false);
    resetCallUI();
});

vapi.on('error', (e) => {
    console.error("Vapi hiba történt:", e);
    isCallActive = false;
    updateButtonsState(false);
    resetCallUI();
});

// Transcript (Élő felirat) kezelése
vapi.on('message', (message) => {
    if (message.type === 'transcript') {
        const role = message.role; // 'user' vagy 'assistant'
        const text = message.transcript;
        addTranscript(role, text);
    }
});

// Hangszint animáció (Volume Level)
vapi.on('volume-level', (volume) => {
    const isSpeaking = volume > 0.05;
    
    if (isSpeaking) {
        if(callStatusText) callStatusText.textContent = "Az asszisztens beszél...";
        if(pulseIndicator) pulseIndicator.style.backgroundColor = "var(--primary)"; // Projekt főszín
        
        if (waveformBars) waveformBars.forEach((bar, index) => {
            const rand = Math.random();
            const height = Math.max(4, volume * 150 * rand);
            bar.style.height = `${height}px`;
        });
    } else {
        if(callStatusText) callStatusText.textContent = "Hívás folyamatban...";
        if(pulseIndicator) pulseIndicator.style.backgroundColor = "#22c55e"; // Zöld
        if (waveformBars) waveformBars.forEach(bar => bar.style.height = '4px');
    }
});

// --- Overlay Gombok Eseménykezelői ---
if(minimizeBtn) minimizeBtn.addEventListener('click', () => callOverlay.classList.toggle('minimized'));

if(muteBtn) muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    vapi.setMuted(isMuted);
    if (isMuted) muteBtn.classList.add('muted');
    else muteBtn.classList.remove('muted');
});

if(endCallBtn) endCallBtn.addEventListener('click', () => {
    if (isCallActive) {
        vapi.stop();
        if(callStatusText) callStatusText.textContent = "Befejezés...";
        if(pulseIndicator) pulseIndicator.style.backgroundColor = "#ef4444"; // Piros
    }
});

function sendChatMessage() {
    if(!chatInput) return;
    const text = chatInput.value.trim();
    if (text === '' || !isCallActive) return;

    vapi.send({
        type: 'add-message',
        message: { role: 'user', content: text }
    });
    addTranscript('user', text);
    chatInput.value = '';
}

if(sendChatBtn) sendChatBtn.addEventListener('click', sendChatMessage);
if(chatInput) chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

document.addEventListener('DOMContentLoaded', () => {
    const bookingButtons = document.querySelectorAll('.vapi-booking-btn');
    
    bookingButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!isCallActive) {
                button.textContent = "Kapcsolódás...";
                
                try {
                    vapi.start(ASSISTANT_ID);
                } catch (error) {
                    console.error("Nem sikerült elindítani a Vapi hívást:", error);
                    button.innerHTML = "<i class=\"fa-solid fa-phone\"></i> Telefonos foglalás (AI)";
                }
            }
        });
    });
});

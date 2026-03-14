const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

// Extended word list
const WORDS = [
    "APPLE", "CRANE", "TRAIN", "HOUSE", "MOUSE", 
    "BRICK", "GHOST", "BLIMP", "CHAMP", "PLAID",
    "REACT", "VITES", "AURAL", "BEATS", "AUDIO",
    "LIGHT", "SMART", "FRAME", "GLASS", "SHINE",
    "TIGER", "EAGLE", "ROBOT", "WATER", "EARTH",
    "SPACE", "STARS", "MOONS", "DREAM", "SLEEP",
    "MUSIC", "PIANO", "FLUTE", "GUITAR", "DRUMS"
];

// State variables
let targetWord = "";
let currentGuess = "";
let currentRow = 0;
let gameOver = false;
let letterStates = {}; // Map to track letter states on keyboard
let revealedHints = new Set(); // To track hints given

// Load settings & stats from local storage
let stats = JSON.parse(localStorage.getItem('luminary_stats')) || {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    guesses: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, fail: 0 }
};

let settings = JSON.parse(localStorage.getItem('luminary_settings')) || {
    hardMode: false,
    highContrast: false
};

// DOM Elements
const board = document.getElementById('board');
const keyboard = document.getElementById('keyboard');
const toastContainer = document.getElementById('toast-container');

// Modals
const modalOverlay = document.getElementById('modal-overlay');
const gameOverModal = document.getElementById('game-over-modal');
const statsModal = document.getElementById('stats-modal');
const settingsModal = document.getElementById('settings-modal');

// Buttons & Toggles
const btnHint = document.getElementById('btn-hint');
const btnStats = document.getElementById('btn-stats');
const btnSettings = document.getElementById('btn-settings');
const closeBtns = document.querySelectorAll('.close-btn');

// Initialize Game
function initGame() {
    board.innerHTML = '';
    currentGuess = "";
    currentRow = 0;
    gameOver = false;
    revealedHints.clear();
    btnHint.style.opacity = "1";
    btnHint.style.pointerEvents = "auto";
    
    // Pick new word
    targetWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    console.log("Target:", targetWord); // For debug
    
    // Reset keyboard
    document.querySelectorAll('.key').forEach(key => key.removeAttribute('data-state'));
    letterStates = {};
    
    closeAllModals();
    
    // Create Grid
    for (let i = 0; i < MAX_GUESSES; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        row.id = `row-${i}`;
        
        for (let j = 0; j < WORD_LENGTH; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${i}-${j}`;
            tile.setAttribute('data-state', 'tbd');
            row.appendChild(tile);
        }
        board.appendChild(row);
    }
    
    applySettings();
}

// Input Handling
function handleInput(key) {
    if (gameOver) return;

    if (key === 'Enter') {
        submitGuess();
    } else if (key === 'Backspace' || key === 'Delete') {
        deleteLetter();
    } else if (/^[A-Z]$/.test(key)) {
        addLetter(key);
    }
}

function addLetter(letter) {
    if (currentGuess.length < WORD_LENGTH) {
        const tile = document.getElementById(`tile-${currentRow}-${currentGuess.length}`);
        tile.textContent = letter;
        tile.setAttribute('data-state', 'active');
        currentGuess += letter;
    }
}

function deleteLetter() {
    if (currentGuess.length > 0) {
        currentGuess = currentGuess.slice(0, -1);
        const tile = document.getElementById(`tile-${currentRow}-${currentGuess.length}`);
        tile.textContent = '';
        tile.setAttribute('data-state', 'tbd');
    }
}

function submitGuess() {
    if (currentGuess.length !== WORD_LENGTH) {
        showToast("Not enough letters");
        shakeRow();
        return;
    }
    
    if (settings.hardMode) {
        // Validation: must use all hints
        const currentGuessArr = currentGuess.split('');
        let missingHint = false;
        
        revealedHints.forEach(hintLetter => {
            if (!currentGuessArr.includes(hintLetter)) {
                missingHint = true;
            }
        });
        
        if (missingHint) {
            showToast("Hard Mode: You must use revealed hints!");
            shakeRow();
            return;
        }
    }
    
    checkGuess();
}

function provideHint() {
    if (gameOver) return;
    
    // Find unrevealed letters in candidate word
    const targetArr = targetWord.split('');
    const unrevealed = targetArr.filter(letter => letterStates[letter] !== 'correct');
    
    if (unrevealed.length === 0) {
        showToast("No more hints needed!");
        return;
    }
    
    // Pick random unrevealed
    const hintLetter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    
    // If it's already a hint but not revealed correctly by guess, don't spam.
    if (!revealedHints.has(hintLetter)) {
        revealedHints.add(hintLetter);
        showToast(`Hint: word contains '${hintLetter}'`);
        
        // Disable hint button for rest of game
        btnHint.style.opacity = "0.5";
        btnHint.style.pointerEvents = "none";
        
        if (letterStates[hintLetter] !== 'present') {
             updateKeyState(hintLetter, 'present');
        }
    }
}

function shakeRow() {
    const row = document.getElementById(`row-${currentRow}`);
    row.classList.remove('shake');
    void row.offsetWidth;
    row.classList.add('shake');
}

function showToast(message) {
    // Only keep 1 active toast for cleaner UI
    toastContainer.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function checkGuess() {
    const row = document.getElementById(`row-${currentRow}`);
    const guessArr = currentGuess.split('');
    const targetArr = targetWord.split('');
    const tileStates = new Array(WORD_LENGTH).fill('absent');
    
    // First pass: Find exact matches
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] === targetArr[i]) {
            tileStates[i] = 'correct';
            targetArr[i] = null;
            guessArr[i] = null;
        }
    }
    
    // Second pass: Find present letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] !== null && targetArr.includes(guessArr[i])) {
            tileStates[i] = 'present';
            targetArr[targetArr.indexOf(guessArr[i])] = null;
        }
    }
    
    // Animate
    const tiles = row.querySelectorAll('.tile');
    
    tiles.forEach((tile, index) => {
        setTimeout(() => {
            tile.classList.add('flip-out');
            
            setTimeout(() => {
                tile.classList.remove('flip-out');
                tile.setAttribute('data-state', tileStates[index]);
                tile.classList.add('flip-in');
                
                updateKeyState(currentGuess[index], tileStates[index]);
                
                if (index === WORD_LENGTH - 1) {
                    setTimeout(() => checkGameState(), 300);
                }
            }, 250);
            
        }, index * 200);
    });
}

function updateKeyState(letter, state) {
    const key = document.querySelector(`.key[data-key="${letter}"]`);
    if (!key) return;
    
    const currentState = letterStates[letter];
    if (currentState === 'correct') return;
    if (currentState === 'present' && state === 'absent') return;
    
    letterStates[letter] = state;
    key.setAttribute('data-state', state);
}

function checkGameState() {
    if (currentGuess === targetWord) {
        endGame(true);
        return;
    }
    
    if (currentRow === MAX_GUESSES - 1) {
        endGame(false);
        return;
    }
    
    currentRow++;
    currentGuess = "";
}

function endGame(won) {
    gameOver = true;
    updateStats(won ? currentRow + 1 : 'fail');
    
    setTimeout(() => {
        setupGameOverModal(won);
        openModal(gameOverModal);
    }, 500);
}

// Stats & LocalStorage
function updateStats(attempts) {
    stats.played += 1;
    
    if (attempts !== 'fail') {
        stats.wins += 1;
        stats.currentStreak += 1;
        stats.guesses[attempts] += 1;
        if (stats.currentStreak > stats.maxStreak) {
            stats.maxStreak = stats.currentStreak;
        }
    } else {
        stats.currentStreak = 0;
        stats.guesses.fail += 1;
    }
    
    localStorage.setItem('luminary_stats', JSON.stringify(stats));
}

function populateStatsModal() {
    const winPct = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;
    
    document.getElementById('stat-played').textContent = stats.played;
    document.getElementById('stat-win-pct').textContent = winPct;
    document.getElementById('stat-streak').textContent = stats.currentStreak;
    document.getElementById('stat-max-streak').textContent = stats.maxStreak;
    
    // Draw chart
    const chartContainer = document.getElementById('guess-distribution');
    chartContainer.innerHTML = '';
    
    const maxGuesses = Math.max(...Object.values(stats.guesses), 1);
    
    for (let i = 1; i <= 6; i++) {
        const val = stats.guesses[i];
        const widthPct = Math.max((val / maxGuesses) * 100, 8); // min 8%
        
        const row = document.createElement('div');
        row.className = 'graph-container';
        
        row.innerHTML = `
            <div class="graph-label">${i}</div>
            <div class="graph-bar ${val > 0 && currentRow + 1 === i && gameOver ? 'highlight' : ''}" style="width: ${widthPct}%">${val}</div>
        `;
        chartContainer.appendChild(row);
    }
}

function resetStats() {
    stats = {
        played: 0, wins: 0, currentStreak: 0, maxStreak: 0,
        guesses: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, fail: 0 }
    };
    localStorage.setItem('luminary_stats', JSON.stringify(stats));
    populateStatsModal();
    showToast("Statistics Reset");
}

// UI Modals & Settings
function openModal(modal) {
    closeAllModals(); // ensure clean state
    modal.classList.remove('hidden');
    modalOverlay.classList.add('visible');
}

function closeAllModals() {
    modalOverlay.classList.remove('visible');
    gameOverModal.classList.add('hidden');
    statsModal.classList.add('hidden');
    settingsModal.classList.add('hidden');
}

function setupGameOverModal(won) {
    const title = document.getElementById('modal-title');
    title.textContent = won ? "You Won!" : "Game Over";
    title.style.background = won ? "linear-gradient(135deg, #10b981, #fff)" : "linear-gradient(135deg, #ef4444, #fff)";
    title.style.webkitBackgroundClip = "text";
    
    document.getElementById('stat-attempts').textContent = won ? currentRow + 1 : "X";
    document.getElementById('stat-word').textContent = targetWord;
}

function toggleSetting(settingName, value) {
    settings[settingName] = value;
    localStorage.setItem('luminary_settings', JSON.stringify(settings));
    applySettings();
}

function applySettings() {
    document.getElementById('hard-mode-toggle').checked = settings.hardMode;
    document.getElementById('high-contrast-toggle').checked = settings.highContrast;
    
    if (settings.highContrast) {
        document.body.classList.add('high-contrast');
    } else {
        document.body.classList.remove('high-contrast');
    }
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    
    // Close modal with Escape
    if (e.key === 'Escape') {
        closeAllModals();
        return;
    }
    
    // Don't accept typing if a modal is open
    if (modalOverlay.classList.contains('visible')) return;

    const key = e.key;
    if (/^[a-zA-Z]$/.test(key)) {
        handleInput(key.toUpperCase());
    } else if (key === 'Enter' || key === 'Backspace' || key === 'Delete') {
        handleInput(key === 'Delete' ? 'Backspace' : key);
    }
});

keyboard.addEventListener('click', (e) => {
    const target = e.target.closest('.key');
    if (target) {
        handleInput(target.getAttribute('data-key'));
    }
});

// App flow listeners
btnHint.addEventListener('click', provideHint);

btnStats.addEventListener('click', () => {
    populateStatsModal();
    openModal(statsModal);
});

btnSettings.addEventListener('click', () => {
    applySettings();
    openModal(settingsModal);
});

document.getElementById('play-again').addEventListener('click', initGame);
document.getElementById('reset-stats-btn').addEventListener('click', resetStats);

document.getElementById('hard-mode-toggle').addEventListener('change', (e) => toggleSetting('hardMode', e.target.checked));
document.getElementById('high-contrast-toggle').addEventListener('change', (e) => toggleSetting('highContrast', e.target.checked));

closeBtns.forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});

modalOverlay.addEventListener('click', (e) => {
    // click OUTSIDE modals closes them
    if (e.target === modalOverlay) {
        closeAllModals();
    }
});

// Start game on load
initGame();

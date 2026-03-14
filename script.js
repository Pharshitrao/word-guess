const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

// A small word list with semantic hints
const WORDS = [
    { word: "APPLE", hint: "A crunchy round fruit that can be red, green, or yellow." },
    { word: "CRANE", hint: "A tall bird with long legs, or a machine used for lifting." },
    { word: "TRAIN", hint: "A series of connected railway carriages pulled by an engine." },
    { word: "HOUSE", hint: "A building for human habitation, especially one that is lived in by a family." },
    { word: "MOUSE", hint: "A small rodent with a pointed snout, or a computer peripheral." },
    { word: "BRICK", hint: "A rectangular block of hard material used in building." },
    { word: "GHOST", hint: "An ethereal apparition of a dead person." },
    { word: "CHAMP", hint: "Someone who has won a competition or contest." },
    { word: "REACT", hint: "To respond to a stimulus, or a popular UI library." },
    { word: "AURAL", hint: "Relating to the sense of hearing." },
    { word: "AUDIO", hint: "Sound, especially when recorded, transmitted, or reproduced." },
    { word: "SPACE", hint: "The vast, seemingly empty region beyond Earth's atmosphere." },
    { word: "ROBOT", hint: "A machine capable of carrying out a complex series of actions automatically." },
    { word: "LIGHT", hint: "The natural agent that stimulates sight and makes things visible." }
];

// Target word and hint
let targetData = WORDS[Math.floor(Math.random() * WORDS.length)];
let targetWord = targetData.word;
let targetHint = targetData.hint;
console.log("Target:", targetWord); // For debugging purposes

let currentGuess = "";
let currentRow = 0;
let gameOver = false;

// DOM Elements
const board = document.getElementById('board');
const keyboard = document.getElementById('keyboard');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const statAttempts = document.getElementById('stat-attempts');
const statWord = document.getElementById('stat-word');
const playAgainBtn = document.getElementById('play-again');
const toastContainer = document.getElementById('toast-container');
const hintBtn = document.getElementById('hint-btn');
const hintText = document.getElementById('hint-text');

// Map to track letter states on keyboard
const letterStates = {};

// Initialize Game
function initGame() {
    board.innerHTML = '';
    currentGuess = "";
    currentRow = 0;
    gameOver = false;
    
    // Pick new word and hint
    targetData = WORDS[Math.floor(Math.random() * WORDS.length)];
    targetWord = targetData.word;
    targetHint = targetData.hint;
    
    // Reset keyboard keys UI
    document.querySelectorAll('.key').forEach(key => {
        key.removeAttribute('data-state');
    });
    
    // Clear letter states map
    for (let key in letterStates) {
        delete letterStates[key];
    }
    
    modalOverlay.classList.remove('visible');
    
    // Reset Hint
    hintText.classList.add('hidden');
    hintText.textContent = 'Click for a clue...';
    hintBtn.disabled = false;
    hintBtn.style.opacity = '1';
    hintBtn.style.cursor = 'pointer';
    
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
        // Update DOM
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
    
    // Optional: check if word is in dictionary. Skipping for simplicity here, accepting any 5 letters.
    
    checkGuess();
}

function shakeRow() {
    const row = document.getElementById(`row-${currentRow}`);
    row.classList.remove('shake');
    // Trigger reflow
    void row.offsetWidth;
    row.classList.add('shake');
}

function showToast(message) {
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
    
    // First pass: Find exact matches (correct)
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] === targetArr[i]) {
            tileStates[i] = 'correct';
            targetArr[i] = null; // Mark as consumed
            guessArr[i] = null; // Mark as consumed
        }
    }
    
    // Second pass: Find present letters
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessArr[i] !== null && targetArr.includes(guessArr[i])) {
            tileStates[i] = 'present';
            targetArr[targetArr.indexOf(guessArr[i])] = null; // Consume
        }
    }
    
    // Animate row revelation
    const tiles = row.querySelectorAll('.tile');
    
    tiles.forEach((tile, index) => {
        setTimeout(() => {
            // Flip out
            tile.classList.add('flip-out');
            
            setTimeout(() => {
                // Update state mid-flip
                tile.classList.remove('flip-out');
                tile.setAttribute('data-state', tileStates[index]);
                tile.classList.add('flip-in');
                
                // Update keyboard key state
                updateKeyState(currentGuess[index], tileStates[index]);
                
                // Check win/loss at the end of final tile animation
                if (index === WORD_LENGTH - 1) {
                    setTimeout(() => checkGameState(), 300);
                }
            }, 250); // Mid point of flip
            
        }, index * 200); // Stagger animations
    });
}

function updateKeyState(letter, state) {
    const key = document.querySelector(`.key[data-key="${letter}"]`);
    if (!key) return; // Happens if key is not on our custom board
    
    const currentState = letterStates[letter];
    
    // Only upgrade states: absent -> present -> correct
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
    setTimeout(() => {
        modalTitle.textContent = won ? "You Won!" : "Game Over";
        modalTitle.style.background = won ? "linear-gradient(135deg, #10b981, #fff)" : "linear-gradient(135deg, #ef4444, #fff)";
        modalTitle.style.webkitBackgroundClip = "text";
        statAttempts.textContent = won ? currentRow + 1 : "X";
        statWord.textContent = targetWord;
        modalOverlay.classList.add('visible');
    }, 500);
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
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

playAgainBtn.addEventListener('click', initGame);

// Hint Logic
hintBtn.addEventListener('click', () => {
    if (gameOver) return;
    
    showHint(`CLUE: ${targetHint}`);
    
    // Disable hint after one use per game
    hintBtn.disabled = true;
    hintBtn.style.opacity = '0.5';
    hintBtn.style.cursor = 'default';
});

function showHint(message) {
    hintText.textContent = message;
    hintText.classList.remove('hidden');
    hintText.classList.add('reveal-animation');
    
    setTimeout(() => {
        hintText.classList.remove('reveal-animation');
    }, 300);
}

// Start game on load
initGame();

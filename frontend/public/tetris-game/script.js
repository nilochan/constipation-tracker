// Pinko's Tetris Game with Cony & Brown Theme
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// Game constants
const BOARD_WIDTH = 13; // Increased from 10 to 13 to use full 320px width (13 × 24px = 312px)
const BOARD_HEIGHT = 15; // Reduced from 20 to 15 to fit visible area
const BLOCK_SIZE = 24; // 15 rows × 24px = 360px height, 13 cols × 24px = 312px width

// Game state
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let lines = 0;
let level = 1;
let gameRunning = false;
let gamePaused = false;
let dropTimer = 0;
let dropInterval = 1000; // milliseconds
let lastTime = 0;

// Cony & Brown themed Tetris pieces with cute colors
const PIECES = {
    I: {
        shape: [
            [1,1,1,1]
        ],
        color: '#FF69B4', // Hot pink for Cony
        name: 'Cony Line',
        emoji: '🐰'
    },
    O: {
        shape: [
            [1,1],
            [1,1]
        ],
        color: '#8B4513', // Brown for Brown
        name: 'Brown Block',
        emoji: '🐻'
    },
    T: {
        shape: [
            [0,1,0],
            [1,1,1]
        ],
        color: '#FFB6C1', // Light pink
        name: 'Sally T',
        emoji: '🦆'
    },
    S: {
        shape: [
            [0,1,1],
            [1,1,0]
        ],
        color: '#DDA0DD', // Plum
        name: 'Choco S',
        emoji: '🐱'
    },
    Z: {
        shape: [
            [1,1,0],
            [0,1,1]
        ],
        color: '#F0E68C', // Khaki
        name: 'James Z',
        emoji: '🐧'
    },
    J: {
        shape: [
            [1,0,0],
            [1,1,1]
        ],
        color: '#87CEEB', // Sky blue
        name: 'Leonard J',
        emoji: '🐸'
    },
    L: {
        shape: [
            [0,0,1],
            [1,1,1]
        ],
        color: '#98FB98', // Pale green
        name: 'Boss L',
        emoji: '🐹'
    }
};

// Romantic messages with Cony & Brown theme (text only)
const LOVE_MESSAGES = {
    10: "🐰 Cony says: Great start, my love! Keep stacking those blocks! 💕",
    25: "🐻 Brown whispers: You're doing amazing! My heart is full of joy! 💝",
    50: "🐰💕 Cony & Brown together: Look at you go! We're so proud! 🌟",
    100: "🐻❤️ Brown's love note: Every cleared line is like a love letter to my heart! 💌",
    200: "🐰✨ Cony's magic: You're a Tetris wizard! Casting spells of love! 🪄💖",
    300: "🐻🏆 Brown celebrates: Champion level reached! You make my world complete! 🌍💕",
    500: "🐰🎉 Cony's party: INCREDIBLE! Let's dance under the stars tonight! 💃✨",
    750: "🐻👑 Brown crowns you: My queen of blocks! My heart belongs to you! 👸💖",
    1000: "🐰💫 Cony's dream: 1000 lines! You've reached the stars in my heart! 🌟❤️",
    1500: "🐻🌹 Brown's garden: Like flowers blooming, your skills grow more beautiful! 🌸💕"
};

// Initialize game
function init() {
    // Initialize empty board
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        board[y] = [];
        for (let x = 0; x < BOARD_WIDTH; x++) {
            board[y][x] = 0;
        }
    }
    
    // Create first pieces
    nextPiece = createRandomPiece();
    spawnNewPiece();
    
    // Set up event listeners
    setupControls();
    
    // Hide loading and show game
    document.getElementById('loading').classList.remove('show');
    document.getElementById('gameBoard').classList.remove('hidden');
    
    updateDisplay();
    draw();
}

function createRandomPiece() {
    const pieceTypes = Object.keys(PIECES);
    const randomType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
    const pieceData = PIECES[randomType];
    
    return {
        type: randomType,
        shape: JSON.parse(JSON.stringify(pieceData.shape)), // Deep copy
        color: pieceData.color,
        name: pieceData.name,
        emoji: pieceData.emoji,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(pieceData.shape[0].length / 2),
        y: 0
    };
}

function spawnNewPiece() {
    currentPiece = nextPiece;
    nextPiece = createRandomPiece();
    
    // Check game over
    if (isCollision(currentPiece)) {
        gameOver();
        return false;
    }
    
    drawNextPiece();
    return true;
}

function rotatePiece(piece) {
    const shape = piece.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    
    // Create rotated matrix: transpose and reverse each row
    const rotated = [];
    for (let i = 0; i < cols; i++) {
        rotated[i] = [];
        for (let j = 0; j < rows; j++) {
            rotated[i][j] = shape[rows - 1 - j][i];
        }
    }
    
    console.log('Rotation:', {
        original: `${rows}x${cols}`,
        rotated: `${rotated.length}x${rotated[0].length}`,
        originalShape: shape,
        rotatedShape: rotated
    });
    
    return rotated;
}

function isCollision(piece, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;
                
                if (newX < 0 || newX >= BOARD_WIDTH || 
                    newY >= BOARD_HEIGHT || 
                    (newY >= 0 && board[newY][newX])) {
                    return true;
                }
            }
        }
    }
    return false;
}

function placePiece() {
    console.log('🔧 Placing piece and checking for line clears...');
    
    // Place the piece on the board
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = {
                        color: currentPiece.color,
                        emoji: currentPiece.emoji
                    };
                }
            }
        }
    }
    
    // Force immediate redraw to show placed piece
    draw();
    
    // Clear lines immediately after placing
    console.log('🔧 Calling clearLines() immediately after piece placement...');
    clearLines();
    
    // Force another redraw after clearing
    draw();
    
    // Then spawn new piece
    spawnNewPiece();
}

function clearLines() {
    let linesCleared = 0;
    let linesToClear = [];
    
    console.log('🔍 Checking board for complete lines...');
    
    // First pass: identify all complete lines with bulletproof logic
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        let filledCells = 0;
        let fullLine = true;
        
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x] && board[y][x] !== 0 && typeof board[y][x] === 'object') {
                filledCells++;
            } else {
                fullLine = false;
                break;
            }
        }
        
        if (fullLine && filledCells === BOARD_WIDTH) {
            console.log(`✅ FULL LINE DETECTED at row ${y} (${filledCells}/${BOARD_WIDTH} cells)`);
            linesToClear.push(y);
        } else if (filledCells > 0) {
            console.log(`⚪ Row ${y}: ${filledCells}/${BOARD_WIDTH} cells filled`);
        }
    }
    
    // Immediately clear lines without animation delays
    if (linesToClear.length > 0) {
        console.log(`🧹 Clearing ${linesToClear.length} lines immediately:`, linesToClear);
        
        // Sort lines from bottom to top for proper removal (CRITICAL!)
        linesToClear.sort((a, b) => b - a);
        console.log(`📝 Sorted lines to clear (bottom to top):`, linesToClear);
        
        // Remove lines one by one, accounting for array shifting
        // CRITICAL: No safety checks - trust the initial detection!
        for (let i = 0; i < linesToClear.length; i++) {
            const originalLineY = linesToClear[i];
            // After removing previous lines, the current line shifts up by the number removed
            const currentLineY = originalLineY - i;
            
            console.log(`🗑️ Removing line ${originalLineY} (now at index ${currentLineY}) from board...`);
            console.log(`🔍 Board state before removal:`, board[currentLineY] ? `Row has ${board[currentLineY].filter(cell => cell && cell !== 0).length} filled cells` : 'Row not found');
            
            // Remove the line without verification (trust initial detection)
            if (board[currentLineY]) {
                board.splice(currentLineY, 1);
                // Add new empty line at top
                board.unshift(new Array(BOARD_WIDTH).fill(0));
                
                linesCleared++;
                console.log(`✅ Line ${originalLineY} (index ${currentLineY}) removed successfully!`);
            } else {
                console.log(`❌ ERROR: Line ${currentLineY} doesn't exist!`);
            }
            
            // Force immediate screen update after each line removal
            draw();
        }
        
        // Score calculation with Cony & Brown bonus
        const baseScore = [0, 100, 300, 500, 800][linesCleared];
        const bonusScore = baseScore * level;
        score += bonusScore;
        lines += linesCleared;
        
        // Level up every 10 lines with proper Tetris speed progression
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            // Standard Tetris speed progression: faster each level but not too extreme
            dropInterval = Math.max(50, Math.pow(0.8, level - 1) * 1000);
            showSmartMessage(`🆙 Level ${level}! Speed increased! 🚀`, 1500);
        }
        
        updateDisplay();
        
        // Smart celebration that doesn't block screen
        celebrateSmartClear(linesCleared);
        checkLoveMilestone();
        
        // Force redraw immediately
        draw();
    }
}

function flashLineClear(lineY) {
    // Quick flash effect for immediate feedback
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(0, lineY * BLOCK_SIZE, canvas.width, BLOCK_SIZE);
    ctx.restore();
}

// Smart message system - prevents screen blocking
let activeMessages = [];
let messageQueue = [];

function showSmartMessage(message, duration = 1500) {
    // Limit concurrent messages to prevent screen blocking
    if (activeMessages.length >= 2) {
        // Queue the message if too many are showing
        messageQueue.push({ message, duration });
        return;
    }
    
    showMessageNow(message, duration);
}

function showMessageNow(message, duration) {
    const msgDiv = document.createElement('div');
    const messageId = Date.now() + Math.random();
    
    // Offset messages so they don't overlap
    const offset = activeMessages.length * 60;
    
    msgDiv.style.cssText = `
        position: fixed;
        top: calc(40% + ${offset}px);
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 107, 157, 0.95);
        color: white;
        padding: 12px 20px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: bold;
        z-index: 9999;
        pointer-events: none;
        animation: smartFadeInOut ${duration}ms ease-in-out;
        text-align: center;
        max-width: 70%;
        line-height: 1.2;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);
    
    // Track active message
    activeMessages.push({ id: messageId, element: msgDiv });
    
    setTimeout(() => {
        if (document.body.contains(msgDiv)) {
            document.body.removeChild(msgDiv);
        }
        
        // Remove from active messages
        activeMessages = activeMessages.filter(msg => msg.id !== messageId);
        
        // Show next queued message
        if (messageQueue.length > 0) {
            const next = messageQueue.shift();
            setTimeout(() => showMessageNow(next.message, next.duration), 200);
        }
    }, duration);
}

function celebrateSmartClear(linesCleared) {
    // Smart celebration that doesn't block screen
    const celebrations = {
        1: "🐰 Nice clear! 💕",
        2: "🐻 Double! Amazing! 💝", 
        3: "🐰✨ Triple! On fire! 🔥",
        4: "🐻🎉 TETRIS! Incredible! 👑"
    };
    
    // Shorter duration for line clears to prevent blocking
    showSmartMessage(celebrations[linesCleared] || "Great job! 💕", 1200);
}

function checkLoveMilestone() {
    if (LOVE_MESSAGES[lines]) {
        showLoveMessage(lines);
    }
}

function showLoveMessage(milestone) {
    const message = LOVE_MESSAGES[milestone];
    
    // Use smart message system - shorter and less blocking
    showSmartMessage(message, 2500); // Reduced from 4 seconds to 2.5 seconds
    
    // Show in love display panel briefly without blocking gameplay
    const loveDisplay = document.getElementById('loveDisplay');
    const loveMessage = document.getElementById('loveMessage');
    
    if (loveDisplay && loveMessage) {
        loveMessage.textContent = message;
        loveDisplay.classList.remove('hidden');
        
        // Hide sooner to not block screen
        setTimeout(() => {
            loveDisplay.classList.add('hidden');
        }, 3500); // Reduced from 6 seconds to 3.5 seconds
    }
}

// Legacy function - redirect to smart message system
function showTemporaryMessage(message, duration = 1500) {
    showSmartMessage(message, duration);
}

function movePiece(dx, dy) {
    if (!gameRunning || gamePaused) return;
    
    if (!isCollision(currentPiece, dx, dy)) {
        currentPiece.x += dx;
        currentPiece.y += dy;
        draw();
    } else if (dy > 0) {
        // Piece hit bottom, place it
        placePiece();
    }
}

function rotate() {
    if (!gameRunning || gamePaused) return;
    
    const rotated = rotatePiece(currentPiece);
    const originalShape = currentPiece.shape;
    currentPiece.shape = rotated;
    
    // Wall kicks
    let kicked = false;
    for (let kick of [0, -1, 1, -2, 2]) {
        if (!isCollision(currentPiece, kick, 0)) {
            currentPiece.x += kick;
            kicked = true;
            break;
        }
    }
    
    if (!kicked) {
        currentPiece.shape = originalShape; // Revert rotation
    }
    
    draw();
}

function draw() {
    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw board pieces with Cony & Brown theme
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x]) {
                drawBlock(x, y, board[y][x].color, board[y][x].emoji);
            }
        }
    }
    
    // Draw current piece
    if (currentPiece) {
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    drawBlock(
                        currentPiece.x + x, 
                        currentPiece.y + y, 
                        currentPiece.color,
                        currentPiece.emoji
                    );
                }
            }
        }
    }
    
    // Ghost piece removed as requested - no more shadow hint
}

function drawBlock(x, y, color, emoji = '') {
    const pixelX = x * BLOCK_SIZE;
    const pixelY = y * BLOCK_SIZE;
    
    // Draw block background with gradient
    const gradient = ctx.createLinearGradient(pixelX, pixelY, pixelX + BLOCK_SIZE, pixelY + BLOCK_SIZE);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, adjustBrightness(color, -20));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(pixelX, pixelY, BLOCK_SIZE, BLOCK_SIZE);
    
    // Draw border - darker for white background
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pixelX, pixelY, BLOCK_SIZE, BLOCK_SIZE);
    
    // Draw emoji in center
    if (emoji) {
        ctx.font = '12px Arial'; // Reduced from 16px to fit smaller blocks
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black'; // Change to black for visibility on white background
        ctx.fillText(emoji, pixelX + BLOCK_SIZE/2, pixelY + BLOCK_SIZE/2);
    }
}

function drawGhostPiece() {
    if (!currentPiece) return;
    
    let ghostY = currentPiece.y;
    while (!isCollision(currentPiece, 0, ghostY - currentPiece.y + 1)) {
        ghostY++;
    }
    
    ctx.save();
    ctx.globalAlpha = 0.3;
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                drawBlock(
                    currentPiece.x + x, 
                    ghostY + y, 
                    currentPiece.color,
                    currentPiece.emoji
                );
            }
        }
    }
    ctx.restore();
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (!nextPiece) return;
    
    const blockSize = 16;
    const offsetX = (nextCanvas.width - nextPiece.shape[0].length * blockSize) / 2;
    const offsetY = (nextCanvas.height - nextPiece.shape.length * blockSize) / 2;
    
    for (let y = 0; y < nextPiece.shape.length; y++) {
        for (let x = 0; x < nextPiece.shape[y].length; x++) {
            if (nextPiece.shape[y][x]) {
                nextCtx.fillStyle = nextPiece.color;
                nextCtx.fillRect(
                    offsetX + x * blockSize, 
                    offsetY + y * blockSize, 
                    blockSize, 
                    blockSize
                );
                
                // Draw emoji
                nextCtx.font = '10px Arial';
                nextCtx.textAlign = 'center';
                nextCtx.textBaseline = 'middle';
                nextCtx.fillStyle = 'white';
                nextCtx.fillText(
                    nextPiece.emoji,
                    offsetX + x * blockSize + blockSize/2,
                    offsetY + y * blockSize + blockSize/2
                );
            }
        }
    }
}

function adjustBrightness(color, amount) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * amount);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function updateDisplay() {
    document.getElementById('scoreValue').textContent = score.toLocaleString();
    document.getElementById('linesValue').textContent = lines.toLocaleString();
    document.getElementById('levelValue').textContent = level;
}

function gameLoop(currentTime) {
    if (gameRunning && !gamePaused) {
        const deltaTime = currentTime - lastTime;
        dropTimer += deltaTime;
        
        if (dropTimer >= dropInterval) {
            movePiece(0, 1);
            dropTimer = 0;
        }
        
        draw();
    }
    lastTime = currentTime;
    requestAnimationFrame(gameLoop);
}

function startGame() {
    if (gameRunning) return;
    
    gameRunning = true;
    gamePaused = false;
    dropTimer = 0; // Reset drop timer
    lastTime = 0; // Reset last time
    document.getElementById('startBtn').textContent = '🎮 Running...';
    document.getElementById('pauseBtn').style.display = 'inline-block';
    
    showSmartMessage("🐰💕 Let's play together! 🐻💖", 1500);
    
    requestAnimationFrame(gameLoop);
}

function pauseGame() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    document.getElementById('pauseBtn').textContent = gamePaused ? '▶️ Resume' : '⏸️ Pause';
    
    if (gamePaused) {
        showSmartMessage("🐰😴 Game Paused 💤", 1200);
    } else {
        showSmartMessage("🐻💪 Let's continue! 🎮", 1200);
    }
}

function restartGame() {
    gameRunning = false;
    gamePaused = false;
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    dropTimer = 0;
    
    // Clear board
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            board[y][x] = 0;
        }
    }
    
    // Reset UI
    document.getElementById('startBtn').textContent = '🎮 Start Game';
    document.getElementById('pauseBtn').textContent = '⏸️ Pause';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('loveDisplay').classList.add('hidden');
    
    updateDisplay();
    
    // Create new pieces
    nextPiece = createRandomPiece();
    spawnNewPiece();
    draw();
    
    showSmartMessage("🐰🔄 Fresh start! Ready? 💕", 1500);
}

function gameOver() {
    gameRunning = false;
    
    // Save score to leaderboard
    saveScore(score, lines, level);
    
    // Show game over modal
    const modal = document.createElement('div');
    modal.className = 'game-over-modal';
    
    const gameOverTitle = lines >= 100 ? 
        "🐰🏆 Cony & Brown are amazed!" : 
        "🐻💕 Brown says: Great effort!";
    
    const motivationalMessage = lines >= 100 ?
        "You've stacked so many love blocks! Our hearts are full! 💖" :
        "Every block you placed was filled with love! Try again? 💕";
    
    modal.innerHTML = `
        <div class="game-over-title">${gameOverTitle}</div>
        <div class="game-over-score">
            <div>💎 Score: ${score.toLocaleString()}</div>
            <div>📏 Lines: ${lines.toLocaleString()}</div>
            <div>⭐ Level: ${level}</div>
        </div>
        <div style="margin: 15px 0; font-size: 14px; opacity: 0.9;">
            ${motivationalMessage}
        </div>
        <button class="modal-btn restart-game-btn">🐰 Play Again</button>
        <button class="modal-btn back-home-btn">🐻 Back to Menu</button>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.restart-game-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        restartGame();
        startGame();
    });
    
    modal.querySelector('.back-home-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        restartGame();
    });
}

// Leaderboard functions
async function saveScore(score, lines, level) {
    try {
        const user = window.parent.getCurrentUser ? window.parent.getCurrentUser() : null;
        if (!user) {
            console.log('No user logged in, score not saved');
            return;
        }

        const token = window.parent.localStorage ? window.parent.localStorage.getItem('authToken') : localStorage.getItem('authToken');
        const response = await fetch('/api/tetris/score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                score: score,
                lines: lines,
                level: level
            })
        });

        if (response.ok) {
            console.log('Score saved successfully');
        } else {
            console.error('Failed to save score');
        }
    } catch (error) {
        console.error('Error saving score:', error);
    }
}

async function loadLeaderboard() {
    try {
        const token = window.parent.localStorage ? window.parent.localStorage.getItem('authToken') : localStorage.getItem('authToken');
        const response = await fetch('/api/tetris/leaderboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const leaderboard = await response.json();
            return leaderboard;
        } else {
            console.error('Failed to load leaderboard');
            return [];
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        return [];
    }
}

function showLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    modal.classList.remove('hidden');
    loadLeaderboardContent();
}

function hideLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    modal.classList.add('hidden');
}

async function loadLeaderboardContent() {
    const content = document.getElementById('leaderboardContent');
    content.innerHTML = '<div style="text-align: center; padding: 20px;"><div>🐰</div><div>Loading scores...</div></div>';
    
    const leaderboard = await loadLeaderboard();
    
    if (leaderboard.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 20px; opacity: 0.7;">
                <div style="font-size: 24px; margin-bottom: 10px;">🎮</div>
                <div>No scores yet!</div>
                <div style="font-size: 12px; margin-top: 5px;">Be the first to set a high score!</div>
            </div>
        `;
        return;
    }

    let html = '<div style="text-align: left;">';
    leaderboard.forEach((entry, index) => {
        const rank = index + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
        const date = new Date(entry.created_at);
        const sgTime = new Date(date.getTime() + (8 * 60 * 60 * 1000)); // Convert to Singapore time
        
        html += `
            <div style="background: rgba(255,255,255,0.1); margin: 5px 0; padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: bold;">${medal} ${entry.username}</div>
                    <div style="font-size: 12px; opacity: 0.8;">Lines: ${entry.lines} | Level: ${entry.level}</div>
                    <div style="font-size: 10px; opacity: 0.6;">${sgTime.toLocaleDateString()} ${sgTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
                <div style="font-size: 18px; font-weight: bold; color: #ff6b9d;">${entry.score.toLocaleString()}</div>
            </div>
        `;
    });
    html += '</div>';
    
    content.innerHTML = html;
}

function setupControls() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (!gameRunning) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                movePiece(-1, 0);
                break;
            case 'ArrowRight':
                e.preventDefault();
                movePiece(1, 0);
                break;
            case 'ArrowDown':
                e.preventDefault();
                movePiece(0, 1);
                break;
            case 'ArrowUp':
            case ' ':
                e.preventDefault();
                rotate();
                break;
        }
    });
    
    // Touch controls
    document.getElementById('leftBtn').addEventListener('click', () => movePiece(-1, 0));
    document.getElementById('rightBtn').addEventListener('click', () => movePiece(1, 0));
    document.getElementById('downBtn').addEventListener('click', () => movePiece(0, 1));
    document.getElementById('rotateBtn').addEventListener('click', rotate);
    
    // Game controls
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('pauseBtn').addEventListener('click', pauseGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('leaderboardBtn').addEventListener('click', showLeaderboard);
    document.getElementById('closeLeaderboardBtn').addEventListener('click', hideLeaderboard);
}

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
    
    @keyframes smartFadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        15% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
        85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    }
`;
document.head.appendChild(style);

// Initialize game when page loads
window.addEventListener('load', () => {
    console.log('🎮 Tetris Game Loading - Version 2.3 (TRUST INITIAL DETECTION)');
    setTimeout(init, 1000); // Show loading animation for 1 second
});
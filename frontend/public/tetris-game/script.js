// Pinko's Tetris Game with Cony & Brown Theme
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// Game constants
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 32;

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
        name: 'Love T',
        emoji: '💕'
    },
    S: {
        shape: [
            [0,1,1],
            [1,1,0]
        ],
        color: '#DDA0DD', // Plum
        name: 'Heart S',
        emoji: '💜'
    },
    Z: {
        shape: [
            [1,1,0],
            [0,1,1]
        ],
        color: '#F0E68C', // Khaki
        name: 'Star Z',
        emoji: '⭐'
    },
    J: {
        shape: [
            [1,0,0],
            [1,1,1]
        ],
        color: '#87CEEB', // Sky blue
        name: 'Dream J',
        emoji: '💙'
    },
    L: {
        shape: [
            [0,0,1],
            [1,1,1]
        ],
        color: '#98FB98', // Pale green
        name: 'Hope L',
        emoji: '💚'
    }
};

// Romantic messages with Cony & Brown theme
const LOVE_MESSAGES = {
    10: {
        message: "🐰 Cony says: Great start, my love! Keep stacking those blocks! 💕",
        image: "../snake-game/images/love1.jpg"
    },
    25: {
        message: "🐻 Brown whispers: You're doing amazing! My heart is full of joy! 💝",
        image: "../snake-game/images/love2.jpg"
    },
    50: {
        message: "🐰💕 Cony & Brown together: Look at you go! We're so proud! 🌟",
        image: "../snake-game/images/love3.jpg"
    },
    100: {
        message: "🐻❤️ Brown's love note: Every cleared line is like a love letter to my heart! 💌",
        image: "../snake-game/images/love4.jpg"
    },
    200: {
        message: "🐰✨ Cony's magic: You're a Tetris wizard! Casting spells of love! 🪄💖",
        image: "../snake-game/images/love5.jpg"
    },
    300: {
        message: "🐻🏆 Brown celebrates: Champion level reached! You make my world complete! 🌍💕",
        image: "../snake-game/images/love6.jpg"
    },
    500: {
        message: "🐰🎉 Cony's party: INCREDIBLE! Let's dance under the stars tonight! 💃✨",
        image: "../snake-game/images/love7.jpg"
    },
    750: {
        message: "🐻👑 Brown crowns you: My queen of blocks! My heart belongs to you! 👸💖",
        image: "../snake-game/images/love8.jpg"
    },
    1000: {
        message: "🐰💫 Cony's dream: 1000 lines! You've reached the stars in my heart! 🌟❤️",
        image: "../snake-game/images/love9.jpg"
    },
    1500: {
        message: "🐻🌹 Brown's garden: Like flowers blooming, your skills grow more beautiful! 🌸💕",
        image: "../snake-game/images/love10.jpg"
    }
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
    const rotated = [];
    const N = piece.shape.length;
    
    for (let i = 0; i < N; i++) {
        rotated[i] = [];
        for (let j = 0; j < N; j++) {
            rotated[i][j] = piece.shape[N - 1 - j][i];
        }
    }
    
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
    
    clearLines();
    spawnNewPiece();
}

function clearLines() {
    let linesCleared = 0;
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        let fullLine = true;
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (!board[y][x]) {
                fullLine = false;
                break;
            }
        }
        
        if (fullLine) {
            // Add sparkle effect for cleared lines
            animateLineClear(y);
            
            board.splice(y, 1);
            board.unshift(new Array(BOARD_WIDTH).fill(0));
            linesCleared++;
            y++; // Check the same line again
        }
    }
    
    if (linesCleared > 0) {
        // Score calculation with Cony & Brown bonus
        const baseScore = [0, 100, 300, 500, 800][linesCleared];
        const bonusScore = baseScore * level;
        score += bonusScore;
        lines += linesCleared;
        
        // Level up every 10 lines
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        updateDisplay();
        checkLoveMilestone();
        
        // Play celebration sound effect (visual feedback)
        celebrateClear(linesCleared);
    }
}

function animateLineClear(lineY) {
    // Visual feedback for line clearing
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(0, lineY * BLOCK_SIZE, canvas.width, BLOCK_SIZE);
    ctx.restore();
}

function celebrateClear(linesCleared) {
    // Show celebration based on lines cleared
    const celebrations = {
        1: "🐰 Cony: Nice clear! 💕",
        2: "🐻 Brown: Double clear! Amazing! 💝",
        3: "🐰✨ Cony: Triple! You're on fire! 🔥",
        4: "🐻🎉 Brown: TETRIS! Incredible! 👑"
    };
    
    showTemporaryMessage(celebrations[linesCleared] || "Great job! 💕");
}

function checkLoveMilestone() {
    if (LOVE_MESSAGES[lines]) {
        showLoveMessage(lines);
    }
}

function showLoveMessage(milestone) {
    const loveData = LOVE_MESSAGES[milestone];
    const loveDisplay = document.getElementById('loveDisplay');
    const loveImage = document.getElementById('loveImage');
    const loveMessage = document.getElementById('loveMessage');
    
    loveImage.src = loveData.image;
    loveMessage.textContent = loveData.message;
    loveDisplay.classList.remove('hidden');
    
    // Hide after 5 seconds
    setTimeout(() => {
        loveDisplay.classList.add('hidden');
    }, 5000);
}

function showTemporaryMessage(message) {
    // Create temporary floating message
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 107, 157, 0.9);
        color: white;
        padding: 15px 25px;
        border-radius: 25px;
        font-size: 18px;
        font-weight: bold;
        z-index: 9999;
        pointer-events: none;
        animation: fadeInOut 2s ease-in-out;
    `;
    msgDiv.textContent = message;
    document.body.appendChild(msgDiv);
    
    setTimeout(() => {
        document.body.removeChild(msgDiv);
    }, 2000);
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
    // Clear canvas
    ctx.fillStyle = 'rgba(30, 60, 114, 0.1)';
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
    
    // Draw ghost piece (preview where piece will land)
    if (currentPiece) {
        drawGhostPiece();
    }
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
    
    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pixelX, pixelY, BLOCK_SIZE, BLOCK_SIZE);
    
    // Draw emoji in center
    if (emoji) {
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
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
    document.getElementById('startBtn').textContent = '🎮 Running...';
    document.getElementById('pauseBtn').style.display = 'inline-block';
    
    showTemporaryMessage("🐰💕 Cony & Brown: Let's play together! 🐻💖");
    
    requestAnimationFrame(gameLoop);
}

function pauseGame() {
    if (!gameRunning) return;
    
    gamePaused = !gamePaused;
    document.getElementById('pauseBtn').textContent = gamePaused ? '▶️ Resume' : '⏸️ Pause';
    
    if (gamePaused) {
        showTemporaryMessage("🐰😴 Game Paused - Take a break! 💤");
    } else {
        showTemporaryMessage("🐻💪 Let's continue! 🎮");
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
    
    showTemporaryMessage("🐰🔄 Fresh start! Ready for more love blocks? 💕");
}

function gameOver() {
    gameRunning = false;
    
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
}

// Add CSS for fade animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
`;
document.head.appendChild(style);

// Initialize game when page loads
window.addEventListener('load', () => {
    setTimeout(init, 1000); // Show loading animation for 1 second
});
// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const box = 20;

// Game state
let snake = [{ x: 9 * box, y: 9 * box }];
let direction = 'RIGHT';
let food = { x: Math.floor(Math.random() * 30) * box, y: Math.floor(Math.random() * 30) * box };
let score = 0;
let game;
let baseSpeed = 200;
let currentSpeed = baseSpeed;
let speedBoostActive = false;
let speedBoostFactor = 0.5;
let isPaused = false;
let lives = 3;
let isImmune = false;
let immunityDuration = 2000;
let portals = [];

// Extended image mappings with ranges
const _0xj6q7 = {
    // 5-9: love1.jpg
    5: "images/love1.jpg",
    6: "images/love1.jpg",
    7: "images/love1.jpg",
    8: "images/love1.jpg",
    9: "images/love1.jpg",
    // 10-14: love2.jpg
    10: "images/love2.jpg",
    11: "images/love2.jpg",
    12: "images/love2.jpg",
    13: "images/love2.jpg",
    14: "images/love2.jpg",
    // 15-19: love3.jpg
    15: "images/love3.jpg",
    16: "images/love3.jpg",
    17: "images/love3.jpg",
    18: "images/love3.jpg",
    19: "images/love3.jpg",
    // 20-24: love4.jpg
    20: "images/love4.jpg",
    21: "images/love4.jpg",
    22: "images/love4.jpg",
    23: "images/love4.jpg",
    24: "images/love4.jpg",
    // 25-27: love5.jpg
    25: "images/love5.jpg",
    26: "images/love5.jpg",
    27: "images/love5.jpg",
    // 28-34: love6.jpg
    28: "images/love6.jpg",
    29: "images/love6.jpg",
    30: "images/love6.jpg",
    31: "images/love6.jpg",
    32: "images/love6.jpg",
    33: "images/love6.jpg",
    34: "images/love6.jpg",
    // 35-39: love7.jpg
    35: "images/love7.jpg",
    36: "images/love7.jpg",
    37: "images/love7.jpg",
    38: "images/love7.jpg",
    39: "images/love7.jpg",
    // 40-44: love8.jpg
    40: "images/love8.jpg",
    41: "images/love8.jpg",
    42: "images/love8.jpg",
    43: "images/love8.jpg",
    44: "images/love8.jpg",
    // Continue pattern for remaining ranges...
    // 45-49: love9.jpg
    45: "images/love9.jpg",
    46: "images/love9.jpg",
    47: "images/love9.jpg",
    48: "images/love9.jpg",
    49: "images/love9.jpg",
    // 50-54: love10.jpg
    50: "images/love10.jpg",
    51: "images/love10.jpg",
    52: "images/love10.jpg",
    53: "images/love10.jpg",
    54: "images/love10.jpg",
	55: "images/love11.jpg",
    56: "images/love11.jpg",
    57: "images/love11.jpg",
    58: "images/love11.jpg",
    59: "images/love11.jpg",
	60: "images/love12.jpg",
	61: "images/love12.jpg",
	62: "images/love12.jpg",
	63: "images/love12.jpg",
    64: "images/love12.jpg",
	65: "images/love13.jpg",
	66: "images/love13.jpg",
    67: "images/love13.jpg",
	68: "images/love13.jpg",
	69: "images/love13.jpg",
	70: "images/love14.jpg",
	71: "images/love14.jpg",
	72: "images/love14.jpg",
	73: "images/love14.jpg",
	74: "images/love14.jpg",
	75: "images/love15.jpg",
	76: "images/love15.jpg",
	77: "images/love15.jpg",
	78: "images/love15.jpg",
	79: "images/love15.jpg",
	80: "images/love16.jpg",
	81: "images/love16.jpg",
	82: "images/love16.jpg",
	83: "images/love16.jpg",
	84: "images/love16.jpg",
	85: "images/love17.jpg",
	86: "images/love17.jpg",
	87: "images/love17.jpg",
	88: "images/love17.jpg",
	89: "images/love17.jpg",
	90: "images/love18.jpg",
	91: "images/love18.jpg",
	92: "images/love18.jpg",
	93: "images/love18.jpg",
	94: "images/love18.jpg",
	95: "images/love19.jpg",
	96: "images/love19.jpg",
	97: "images/love19.jpg",
	98: "images/love19.jpg",
	99: "images/love19.jpg",
    // Final milestone
    100: "images/love20.jpg"
};

// Updated messages with ranges
const _0xi5p6 = {
    // 4-9
    4: btoa("You are doing great!"),
    // 10-14
    10: btoa("Keep going, my dear"),
    // 15-19
    15: btoa("Not bad, mummy !!!!"),
    // 20-24
    20: btoa("I am watching you ohhhhhh"),
    // 25-27
    25: btoa("You pro at Brawl star, this is sup sup water for you!"),
    // 28-34
    28: btoa("Happy Birthday, Mummy"),
    // 35-39
    35: btoa("I'm doing inspection while watching you playing"),
    // 40-44
    40: btoa("Gambateh, let me \"hey\" for a while"),
    // 45-49
    45: btoa("Wow, mummy is here !!!!!"),
    // 50-54
    50: btoa("Can't wait to see you in next photo"),
    // 55-59
    55: btoa("Hello, mummy is very strong, you can play until this steps !"),
    // 60-64
    60: btoa("Let me prepare some bread for Daddy"),
    // 65-69
    65: btoa("Previously i played until this height / score"),
    // 70-74
    70: btoa("But, i believe mummy can do it (Snoring)"),
    // 75-79
    75: btoa("Good scores !!!"),
    // 80-84
    80: btoa("No worries, I'm still here !!"),
    // 85-89
    85: btoa("Let's get ready to witness the winner"),
    // 90-94
    90: btoa("Yes, i'm ready !!!"),
    // 95-99
    95: btoa("As far as you come, do you still remember me ?"),
    // 100
    100: btoa("Hello, you win the games ! We all know that you can do it.")
};

function decryptMessage(encrypted) {
    try {
        return atob(encrypted);
    } catch {
        return "Keep going!";
    }
}

function getSegmentLetter(position, score) {
    // Original message patterns remain unchanged
    if (score >= 4 && score < 9) {
        const pattern = 'nilo';
        return position < pattern.length ? pattern[position] : '';
    }
    
    if (score >= 9 && score < 18) {
        const pattern = 'nilo loves';
        return position < pattern.length ? pattern[position] : '';
    }
    
    if (score >= 18 && score < 23) {
        const pattern = 'nilo loves adeline';
        return position < pattern.length ? pattern[position] : '';
    }
    
    if (score >= 23 && score < 28) {
        const pattern = ['宝', '贝', '兔', '，', '加', '油', '哦'];
        const totalLength = pattern.length;
        const startPos = Math.floor((snake.length - totalLength) / 2);
        if (position >= startPos && position < startPos + totalLength) {
            return pattern[position - startPos];
        }
        return '';
    }
    
    if (score >= 28 && score < 39) {
        const pattern = ['今', '天', '是', '2', '8', '号', '，', '生', '日', '快', '乐', '哦', '，', '希', '望', '你', '喜', '欢', '这', '个', '小', '蛇', '❤️', '❤️', '❤️'];
        return position < pattern.length ? pattern[position] : '';
    }
    
    if (score >= 39) {
        const pattern = 'Brownie loves Cony';
        return position < pattern.length ? pattern[position] : '';
    }
    
    return '';
}

function setupPortals() {
    portals = [
        { x: 0, y: Math.floor(Math.random() * 30) * box },
        { x: 29 * box, y: Math.floor(Math.random() * 30) * box },
        { x: Math.floor(Math.random() * 30) * box, y: 0 },
        { x: Math.floor(Math.random() * 30) * box, y: 29 * box },
        { x: Math.floor(Math.random() * 28 + 1) * box, y: Math.floor(Math.random() * 28 + 1) * box }
    ];
}

function handleCollision() {
    if (isImmune) return false;
    
    if (lives > 1) {
        lives--;
        updateLivesDisplay();
        activateImmunity();
        return false;
    }
    return true;
}

function activateImmunity() {
    isImmune = true;
    setTimeout(() => {
        isImmune = false;
    }, immunityDuration);
}

function updateLivesDisplay() {
    const hearts = document.querySelectorAll('.life-heart');
    hearts.forEach((heart, index) => {
        heart.style.opacity = index < lives ? '1' : '0.3';
    });
}

function checkPortals(head) {
    for (let i = 0; i < portals.length; i++) {
        if (head.x === portals[i].x && head.y === portals[i].y) {
            const availablePortals = portals.filter((p, idx) => idx !== i);
            const destination = availablePortals[Math.floor(Math.random() * availablePortals.length)];
            return { x: destination.x, y: destination.y };
        }
    }
    return head;
}

function showGameOverModal(score) {
    const modal = document.createElement('div');
    modal.className = 'game-over-modal';
    
    // Special message for score 100
    if (score >= 100) {
        modal.innerHTML = `
            <div class="game-over-text">Winner !!!! 宝贝，你有一份神秘的礼物！</div>
            <div class="game-over-score">得分: ${score}</div>
            <button class="game-over-button" onclick="restartGame()">再试一次</button>
            <button class="game-over-button" onclick="goHome()">回主页</button>
        `;
    } else {
        modal.innerHTML = `
            <div class="game-over-text">宝贝，没关系，加油再试！</div>
            <div class="game-over-score">得分: ${score}</div>
            <button class="game-over-button" onclick="restartGame()">再试一次</button>
            <button class="game-over-button" onclick="goHome()">回主页</button>
        `;
    }
    
    document.body.appendChild(modal);
}

function draw() {
    if (isPaused) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw portals
    portals.forEach(portal => {
        ctx.beginPath();
        ctx.arc(portal.x + box/2, portal.y + box/2, box/2, 0, Math.PI * 2);
        ctx.fillStyle = isImmune ? 'rgba(74, 144, 226, 0.5)' : 'rgba(74, 144, 226, 0.8)';
        ctx.fill();
    });

    // Draw food
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x, food.y, box, box);

    // Draw snake
    for (let i = 0; i < snake.length; i++) {
        // Special pink color for birthday message
        if (score >= 28 && score < 39) {
            ctx.fillStyle = (i === 0) ? '#FFB6C1' : '#FFC0CB';
        } else {
            ctx.fillStyle = (i === 0) ? 'green' : 'lightgreen';
        }
        
        ctx.fillRect(snake[i].x, snake[i].y, box, box);
        ctx.strokeStyle = 'black';
        ctx.strokeRect(snake[i].x, snake[i].y, box, box);

        const letter = getSegmentLetter(i, score);
        if (letter) {
            if (score >= 28 && score < 39) {
                ctx.fillStyle = 'black';
            } else {
                ctx.fillStyle = 'white';
            }

            if (score >= 23 && score < 39) {
                ctx.font = '18px "Microsoft YaHei", "SimHei", Arial';
            } else {
                ctx.font = '14px Arial';
            }
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(letter, snake[i].x + box/2, snake[i].y + box/2);
        }
    }

    // Immunity effect
    if (isImmune) {
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2;
        snake.forEach(segment => {
            ctx.strokeRect(segment.x, segment.y, box, box);
        });
    }

    // Snake movement
    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    if (direction === 'LEFT') snakeX -= box;
    if (direction === 'UP') snakeY -= box;
    if (direction === 'RIGHT') snakeX += box;
    if (direction === 'DOWN') snakeY += box;

    const teleported = checkPortals({ x: snakeX, y: snakeY });
    snakeX = teleported.x;
    snakeY = teleported.y;

    // Food collision
    if (snakeX === food.x && snakeY === food.y) {
        food = { 
            x: Math.floor(Math.random() * 30) * box, 
            y: Math.floor(Math.random() * 30) * box 
        };
        score++;
        document.getElementById('scoreDisplay').innerText = `Score: ${score}`;

        if (_0xi5p6[score]) {
            document.getElementById('message').innerText = decryptMessage(_0xi5p6[score]);
        }
        if (_0xj6q7[score]) {
            document.getElementById('loveImage').src = _0xj6q7[score];
            document.getElementById('loveImage').classList.remove('hidden');
        }

        baseSpeed = Math.max(150, baseSpeed - 5);
        currentSpeed = speedBoostActive ? baseSpeed * speedBoostFactor : baseSpeed;
        clearInterval(game);
        game = setInterval(draw, currentSpeed);
    } else {
        snake.pop();
    }

    const newHead = { x: snakeX, y: snakeY };
    
    if (snakeX < 0 || snakeY < 0 || snakeX >= canvas.width || snakeY >= canvas.height || collision(newHead, snake)) {
        if (handleCollision()) {
            clearInterval(game);
            saveScore(score);
            showGameOverModal(score);
            return;
        }
    }

    snake.unshift(newHead);
}

function collision(head, array) {
    for (let i = 1; i < array.length; i++) {
        if (head.x === array[i].x && head.y === array[i].y) {
            return true;
        }
    }
    return false;
}

// Game Control Functions
function saveScore(finalScore) {
    const date = new Date().toLocaleDateString();
    const scores = getScores();
    scores.push({ score: finalScore, date: date });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('snakeGameScores', JSON.stringify(scores));
    updateLeaderboard();
}

function getScores() {
    const scores = localStorage.getItem('snakeGameScores');
    return scores ? JSON.parse(scores) : [];
}

function updateLeaderboard() {
    const leaderboardBody = document.querySelector('.leaderboard-table tbody');
    const scores = getScores();
    const top5Scores = scores.slice(0, 5);
    
    let html = '';
    top5Scores.forEach((record, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${record.score}</td>
                <td>${record.date}</td>
            </tr>
        `;
    });
    
    for (let i = top5Scores.length; i < 5; i++) {
        html += `
            <tr>
                <td>${i + 1}</td>
                <td>-</td>
                <td>-</td>
            </tr>
        `;
    }
    
    leaderboardBody.innerHTML = html;
}

function startGame() {
    document.getElementById('entryPage').classList.add('hidden');
    document.getElementById('gamePage').classList.remove('hidden');
    setupPortals();
    updateLeaderboard();
    restartGame();
}

function goHome() {
    clearInterval(game);
    const modal = document.querySelector('.game-over-modal');
    if (modal) modal.remove();
    document.getElementById('gamePage').classList.add('hidden');
    document.getElementById('entryPage').classList.remove('hidden');
    snake = [{ x: 9 * box, y: 9 * box }];
    direction = 'RIGHT';
    score = 0;
    lives = 3;
    isPaused = false;
    document.getElementById('pauseBtn').textContent = 'Pause';
    document.getElementById('message').innerText = "";
    document.getElementById('scoreDisplay').innerText = "Score: 0";
    document.getElementById('loveImage').classList.add('hidden');
    updateLivesDisplay();
}

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? 'Resume' : 'Pause';
if (isPaused) {
        clearInterval(game);
    } else {
        game = setInterval(draw, currentSpeed);
    }
}

function restartGame() {
    const modal = document.querySelector('.game-over-modal');
    if (modal) modal.remove();
    
    snake = [{ x: 9 * box, y: 9 * box }];
    direction = 'RIGHT';
    food = { x: Math.floor(Math.random() * 30) * box, y: Math.floor(Math.random() * 30) * box };
    score = 0;
    lives = 3;
    isImmune = false;
    baseSpeed = 200;
    currentSpeed = baseSpeed;
    speedBoostActive = false;
    isPaused = false;
    document.getElementById('pauseBtn').textContent = 'Pause';
    setupPortals();
    clearInterval(game);
    game = setInterval(draw, currentSpeed);
    document.getElementById('message').innerText = "";
    document.getElementById('scoreDisplay').innerText = "Score: 0";
    document.getElementById('loveImage').classList.add('hidden');
    updateLivesDisplay();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        const directions = {
            'ArrowLeft': 'LEFT',
            'ArrowUp': 'UP',
            'ArrowRight': 'RIGHT',
            'ArrowDown': 'DOWN'
        };

        const newDirection = directions[event.key];
        if (newDirection) {
            const opposites = {
                'LEFT': 'RIGHT',
                'RIGHT': 'LEFT',
                'UP': 'DOWN',
                'DOWN': 'UP'
            };
            
            if (direction !== opposites[newDirection]) {
                direction = newDirection;
            }

            if (!speedBoostActive && !isPaused) {
                speedBoostActive = true;
                currentSpeed = baseSpeed * speedBoostFactor;
                clearInterval(game);
                game = setInterval(draw, currentSpeed);
            }
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.key.startsWith('Arrow')) {
            speedBoostActive = false;
            currentSpeed = baseSpeed;
            if (!isPaused) {
                clearInterval(game);
                game = setInterval(draw, currentSpeed);
            }
        }
    });

    // Touch/Click controls for arrow buttons
    document.querySelectorAll('.arrow-btn').forEach(button => {
        // Mouse events
        button.addEventListener('mousedown', (e) => {
            const newDirection = button.dataset.direction;
            const opposites = {
                'LEFT': 'RIGHT',
                'RIGHT': 'LEFT',
                'UP': 'DOWN',
                'DOWN': 'UP'
            };
            
            if (direction !== opposites[newDirection]) {
                direction = newDirection;
            }

            if (!speedBoostActive && !isPaused) {
                speedBoostActive = true;
                currentSpeed = baseSpeed * speedBoostFactor;
                clearInterval(game);
                game = setInterval(draw, currentSpeed);
            }
        });

        button.addEventListener('mouseup', () => {
            speedBoostActive = false;
            currentSpeed = baseSpeed;
            if (!isPaused) {
                clearInterval(game);
                game = setInterval(draw, currentSpeed);
            }
        });

        // Touch events
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const newDirection = button.dataset.direction;
            const opposites = {
                'LEFT': 'RIGHT',
                'RIGHT': 'LEFT',
                'UP': 'DOWN',
                'DOWN': 'UP'
            };
            
            if (direction !== opposites[newDirection]) {
                direction = newDirection;
            }

            if (!speedBoostActive && !isPaused) {
                speedBoostActive = true;
                currentSpeed = baseSpeed * speedBoostFactor;
                clearInterval(game);
                game = setInterval(draw, currentSpeed);
            }
        });

        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            speedBoostActive = false;
            currentSpeed = baseSpeed;
            if (!isPaused) {
                clearInterval(game);
                game = setInterval(draw, currentSpeed);
            }
        });

        // Handle touch/mouse leave
        ['mouseleave', 'touchcancel'].forEach(eventType => {
            button.addEventListener(eventType, () => {
                speedBoostActive = false;
                currentSpeed = baseSpeed;
                if (!isPaused) {
                    clearInterval(game);
                    game = setInterval(draw, currentSpeed);
                }
            });
        });
    });

    // Game control buttons
    document.getElementById('startGameBtn').addEventListener('click', startGame);
    document.getElementById('homeBtn').addEventListener('click', goHome);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);

    // Initialize game
    setupPortals();
    updateLeaderboard();
});
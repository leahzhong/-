// 游戏配置常量
const GRID_SIZE = 20; // 网格大小(每个格子的像素)
const GRID_COUNT = 20; // 网格数量(20x20)
const CANVAS_SIZE = GRID_SIZE * GRID_COUNT; // 画布总大小
const INITIAL_SPEED = 150; // 初始速度(毫秒)

// 方向常量
const DIRECTION = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
};

// 游戏状态
let snake = []; // 蛇的身体数组
let direction = DIRECTION.RIGHT; // 当前移动方向
let nextDirection = DIRECTION.RIGHT; // 下一个方向(防止快速按键导致反向)
let food = {}; // 食物位置
let score = 0; // 当前分数
let bestScore = 0; // 最高分
let gameLoop = null; // 游戏循环定时器
let isGameRunning = false; // 游戏是否运行中
let particles = []; // 粒子效果数组

// 音效系统
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('bestScore');
const finalScoreElement = document.getElementById('finalScore');
const gameOverScreen = document.getElementById('gameOver');
const startScreen = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');
const startBtn = document.getElementById('startBtn');

// 音效函数 - 吃到食物
function playEatSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// 音效函数 - 撞墙失败
function playGameOverSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// 粒子类
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.size = Math.random() * 4 + 2;
        this.color = ['#FFD700', '#FFA500', '#4CAF50', '#81C784'][Math.floor(Math.random() * 4)];
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1; // 重力效果
        this.life -= 0.02;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

// 创建粒子效果
function createParticles(x, y, count = 15) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y));
    }
}

// 更新粒子
function updateParticles() {
    particles = particles.filter(particle => {
        particle.update();
        return !particle.isDead();
    });
}

// 绘制粒子
function drawParticles() {
    particles.forEach(particle => particle.draw(ctx));
}

// 初始化游戏
function initGame() {
    // 初始化蛇(从中间开始,长度为3)
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];

    direction = DIRECTION.RIGHT;
    nextDirection = DIRECTION.RIGHT;
    score = 0;
    particles = []; // 清空粒子

    // 加载最高分
    loadBestScore();

    // 生成第一个食物
    generateFood();

    // 更新显示
    updateScore();

    // 绘制初始状态
    draw();
}

// 生成食物
function generateFood() {
    let newFood;
    let isOnSnake;

    do {
        isOnSnake = false;
        newFood = {
            x: Math.floor(Math.random() * GRID_COUNT),
            y: Math.floor(Math.random() * GRID_COUNT)
        };

        // 检查食物是否生成在蛇身上
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                isOnSnake = true;
                break;
            }
        }
    } while (isOnSnake);

    food = newFood;
}

// 游戏主循环
function gameStep() {
    // 更新方向
    direction = nextDirection;

    // 计算新的蛇头位置
    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    // 检查碰撞
    if (checkCollision(head)) {
        gameOver();
        return;
    }

    // 添加新蛇头
    snake.unshift(head);

    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score++;
        updateScore();

        // 播放吃到食物的音效
        playEatSound();

        // 创建粒子特效
        const particleX = food.x * GRID_SIZE + GRID_SIZE / 2;
        const particleY = food.y * GRID_SIZE + GRID_SIZE / 2;
        createParticles(particleX, particleY, 20);

        generateFood();
        // 吃到食物不移除尾巴,蛇变长
    } else {
        // 没吃到食物,移除尾巴
        snake.pop();
    }

    // 更新粒子
    updateParticles();

    // 绘制游戏画面
    draw();
}

// 检查碰撞
function checkCollision(head) {
    // 检查是否撞墙
    if (head.x < 0 || head.x >= GRID_COUNT ||
        head.y < 0 || head.y >= GRID_COUNT) {
        return true;
    }

    // 检查是否撞到自己
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            return true;
        }
    }

    return false;
}

// 绘制游戏画面
function draw() {
    // 绘制草坪背景
    for (let i = 0; i < GRID_COUNT; i++) {
        for (let j = 0; j < GRID_COUNT; j++) {
            // 棋盘格效果的草坪
            if ((i + j) % 2 === 0) {
                ctx.fillStyle = '#7EC850'; // 浅绿色草坪
            } else {
                ctx.fillStyle = '#72B946'; // 深绿色草坪
            }
            ctx.fillRect(i * GRID_SIZE, j * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        }
    }

    // 添加草坪纹理效果（随机小草点）
    ctx.fillStyle = 'rgba(100, 150, 60, 0.3)';
    for (let i = 0; i < GRID_COUNT; i++) {
        for (let j = 0; j < GRID_COUNT; j++) {
            // 每个格子随机画几个小点模拟草
            const grassCount = 3;
            for (let k = 0; k < grassCount; k++) {
                const x = i * GRID_SIZE + Math.random() * GRID_SIZE;
                const y = j * GRID_SIZE + Math.random() * GRID_SIZE;
                ctx.fillRect(x, y, 1, 2);
            }
        }
    }

    // 绘制蛇
    snake.forEach((segment, index) => {
        if (index === 0) {
            // 蛇头 - 使用渐变色
            const gradient = ctx.createLinearGradient(
                segment.x * GRID_SIZE,
                segment.y * GRID_SIZE,
                (segment.x + 1) * GRID_SIZE,
                (segment.y + 1) * GRID_SIZE
            );
            gradient.addColorStop(0, '#FFD700');
            gradient.addColorStop(1, '#FFA500');
            ctx.fillStyle = gradient;

            // 绘制蛇头圆角矩形
            drawRoundRect(
                segment.x * GRID_SIZE + 1,
                segment.y * GRID_SIZE + 1,
                GRID_SIZE - 2,
                GRID_SIZE - 2,
                6
            );

            // 绘制卡通眼睛和表情
            const headCenterX = segment.x * GRID_SIZE + GRID_SIZE / 2;
            const headCenterY = segment.y * GRID_SIZE + GRID_SIZE / 2;

            // 根据移动方向调整眼睛位置
            let eyeOffsetX = 0;
            let eyeOffsetY = -3;

            if (direction === DIRECTION.LEFT) {
                eyeOffsetX = -3;
                eyeOffsetY = 0;
            } else if (direction === DIRECTION.RIGHT) {
                eyeOffsetX = 3;
                eyeOffsetY = 0;
            } else if (direction === DIRECTION.DOWN) {
                eyeOffsetY = 3;
            }

            // 绘制两只眼睛（白色底）
            ctx.fillStyle = '#FFFFFF';
            // 左眼
            ctx.beginPath();
            ctx.arc(headCenterX - 4 + eyeOffsetX, headCenterY - 2 + eyeOffsetY, 3, 0, Math.PI * 2);
            ctx.fill();
            // 右眼
            ctx.beginPath();
            ctx.arc(headCenterX + 4 + eyeOffsetX, headCenterY - 2 + eyeOffsetY, 3, 0, Math.PI * 2);
            ctx.fill();

            // 绘制眼珠（黑色）
            ctx.fillStyle = '#000000';
            // 左眼珠
            ctx.beginPath();
            ctx.arc(headCenterX - 4 + eyeOffsetX + 1, headCenterY - 2 + eyeOffsetY, 1.5, 0, Math.PI * 2);
            ctx.fill();
            // 右眼珠
            ctx.beginPath();
            ctx.arc(headCenterX + 4 + eyeOffsetX + 1, headCenterY - 2 + eyeOffsetY, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // 绘制微笑嘴巴
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(headCenterX + eyeOffsetX, headCenterY + 3 + eyeOffsetY, 3, 0.2 * Math.PI, 0.8 * Math.PI);
            ctx.stroke();

        } else {
            // 蛇身 - 纯色
            ctx.fillStyle = '#FFA500';

            // 绘制圆角矩形
            drawRoundRect(
                segment.x * GRID_SIZE + 1,
                segment.y * GRID_SIZE + 1,
                GRID_SIZE - 2,
                GRID_SIZE - 2,
                4
            );
        }
    });

    // 绘制食物(绿色苹果)
    const appleCenterX = food.x * GRID_SIZE + GRID_SIZE / 2;
    const appleCenterY = food.y * GRID_SIZE + GRID_SIZE / 2;
    const appleRadius = GRID_SIZE / 2 - 3;

    // 绘制苹果主体(绿色)
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    // 左半边
    ctx.arc(
        appleCenterX - 1,
        appleCenterY,
        appleRadius,
        0.2 * Math.PI,
        1.8 * Math.PI
    );
    // 右半边
    ctx.arc(
        appleCenterX + 1,
        appleCenterY,
        appleRadius,
        1.2 * Math.PI,
        0.8 * Math.PI
    );
    ctx.closePath();
    ctx.fill();

    // 绘制苹果柄(棕色)
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(appleCenterX, appleCenterY - appleRadius);
    ctx.lineTo(appleCenterX + 2, appleCenterY - appleRadius - 3);
    ctx.stroke();

    // 绘制叶子(深绿色)
    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.ellipse(
        appleCenterX + 4,
        appleCenterY - appleRadius - 2,
        3,
        2,
        Math.PI / 4,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // 绘制高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(
        appleCenterX - 2,
        appleCenterY - 2,
        3,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // 绘制粒子特效
    drawParticles();
}

// 绘制圆角矩形辅助函数
function drawRoundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// 更新分数显示
function updateScore() {
    scoreElement.textContent = score;

    // 更新最高分
    if (score > bestScore) {
        bestScore = score;
        bestScoreElement.textContent = bestScore;
        saveBestScore();
    }
}

// 保存最高分到本地存储
function saveBestScore() {
    localStorage.setItem('snakeBestScore', bestScore);
}

// 加载最高分
function loadBestScore() {
    const saved = localStorage.getItem('snakeBestScore');
    bestScore = saved ? parseInt(saved) : 0;
    bestScoreElement.textContent = bestScore;
}

// 开始游戏
function startGame() {
    if (isGameRunning) return;

    initGame();
    isGameRunning = true;
    startScreen.classList.remove('show');
    gameOverScreen.classList.remove('show');

    // 开始游戏循环
    gameLoop = setInterval(gameStep, INITIAL_SPEED);
}

// 游戏结束
function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoop);

    // 播放游戏结束音效
    playGameOverSound();

    finalScoreElement.textContent = score;
    gameOverScreen.classList.add('show');
}

// 键盘控制
document.addEventListener('keydown', (e) => {
    // 如果游戏未开始,方向键也可以开始游戏
    if (!isGameRunning && (e.key.startsWith('Arrow') || e.key === 'Enter')) {
        if (startScreen.classList.contains('show')) {
            startGame();
            return;
        }
    }

    if (!isGameRunning) return;

    switch(e.key) {
        case 'ArrowUp':
            e.preventDefault();
            // 防止反向移动
            if (direction !== DIRECTION.DOWN) {
                nextDirection = DIRECTION.UP;
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (direction !== DIRECTION.UP) {
                nextDirection = DIRECTION.DOWN;
            }
            break;
        case 'ArrowLeft':
            e.preventDefault();
            if (direction !== DIRECTION.RIGHT) {
                nextDirection = DIRECTION.LEFT;
            }
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (direction !== DIRECTION.LEFT) {
                nextDirection = DIRECTION.RIGHT;
            }
            break;
    }
});

// 按钮事件监听
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// 页面加载完成后显示开始界面
window.addEventListener('load', () => {
    initGame();
    startScreen.classList.add('show');
});

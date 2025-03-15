const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;
const GRID_SIZE = 100;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let player = { x: 100, y: 100, radius: 20, health: 100 };
let players = {};
let projectiles = [];
let keys = {};
let isDead = false;

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});
document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && !isDead) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const cameraX = player.x - canvas.width / 2;
        const cameraY = player.y - canvas.height / 2;
        createProjectile(player, mouseX, mouseY, cameraX, cameraY, socket);
    }
});

function update() {
    if (!isDead) {
        const speed = 8;
        let dx = 0;
        let dy = 0;

        if (keys['w']) dy -= speed;
        if (keys['s']) dy += speed;
        if (keys['a']) dx -= speed;
        if (keys['d']) dx += speed;

        if (dx !== 0 && dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            dx = (dx / length) * speed;
            dy = (dy / length) * speed;
        }

        player.x += dx;
        player.y += dy;

        player.x = Math.max(player.radius, Math.min(WORLD_WIDTH - player.radius, player.x));
        player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT - player.radius, player.y));

        socket.emit('move', { x: player.x, y: player.y, radius: player.radius });
    }
}

socket.on('updatePlayers', (serverPlayers) => {
    for (let id in serverPlayers) {
        if (id === socket.id) {
            player.health = serverPlayers[id].health;
            players[id] = { ...serverPlayers[id], x: player.x, y: player.y };
        } else if (!players[id]) {
            players[id] = serverPlayers[id];
        } else {
            players[id].x += (serverPlayers[id].x - players[id].x) * 0.2;
            players[id].y += (serverPlayers[id].y - players[id].y) * 0.2;
            players[id].health = serverPlayers[id].health;
        }
    }
    for (let id in players) {
        if (!serverPlayers[id]) {
            delete players[id];
        }
    }
});

socket.on('updateProjectiles', (serverProjectiles) => {
    projectiles = serverProjectiles;
});

socket.on('playerDead', () => {
    isDead = true;
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cameraX = player.x - canvas.width / 2;
    const cameraY = player.y - canvas.height / 2;

    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    ctx.fillStyle = '#333333';
    ctx.fillRect(-canvas.width, -canvas.height, WORLD_WIDTH * 2, WORLD_HEIGHT * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD_WIDTH; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD_WIDTH, y);
        ctx.stroke();
    }

    drawProjectiles(ctx, projectiles);

    for (let id in players) {
        if (id !== socket.id) {
            const p = players[id];
            ctx.beginPath();
            let pulse = Math.sin(Date.now() * 0.005) * 1 + 20;
            ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.closePath();

            ctx.fillStyle = 'black';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`HP: ${p.health}`, p.x, p.y - 30);
        }
    }

    ctx.beginPath();
    let pulse = Math.sin(Date.now() * 0.005) * 1 + 20;
    ctx.arc(player.x, player.y, pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = 'black';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`HP: ${player.health}`, player.x, player.y - 30);

    ctx.restore();

    if (isDead) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Вы умерли!', canvas.width / 2, canvas.height / 2 - 50);

        ctx.font = '20px Arial';
        ctx.fillText('Нажмите "Возродиться"', canvas.width / 2, canvas.height / 2 + 20);

        ctx.fillStyle = 'green';
        ctx.fillRect(canvas.width / 2 - 100, canvas.height / 2 + 50, 200, 50);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('Возродиться', canvas.width / 2, canvas.height / 2 + 80);
    }
}

// Основной игровой цикл с фиксированными 30 FPS
function gameLoop() {
    update(); // Обновляем движение игрока
    draw();   // Рисуем кадр
}

setInterval(gameLoop, 1000 / 60); // Запускаем цикл на 30 FPS

canvas.addEventListener('click', (e) => {
    if (isDead) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const buttonX = canvas.width / 2 - 100;
        const buttonY = canvas.height / 2 + 50;
        const buttonWidth = 200;
        const buttonHeight = 50;

        if (clickX >= buttonX && clickX <= buttonX + buttonWidth &&
            clickY >= buttonY && clickY <= buttonY + buttonHeight) {
            isDead = false;
            player = { x: 100, y: 100, radius: 20, health: 100 };
            socket.emit('respawn');
            socket.emit('move', { x: player.x, y: player.y, radius: player.radius });
        }
    }
});
import { WORLD_WIDTH, WORLD_HEIGHT, player, socket } from './main.js';
import { createProjectile } from './shoot.js';

export let keys = {};
export let isDead = false; // Локальная переменная, синхронизируемая с main.js

export function initPlayerControls(canvas, socket) {
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
                player.x = 100;
                player.y = 100;
                player.radius = 20;
                player.health = 100;
                socket.emit('respawn');
                socket.emit('move', { x: player.x, y: player.y, radius: player.radius });
            }
        }
    });
}

export function updatePlayer() {
    if (!isDead) {
        const speed = 8;
        let dx = 0;
        let dy = 0;

        if (keys['w'] || keys['ц']) dy -= speed;
        if (keys['s'] || keys['ы']) dy += speed;
        if (keys['a'] || keys['ф']) dx -= speed;
        if (keys['d'] || keys['в']) dx += speed;

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

// Функция для синхронизации isDead
export function setIsDead(value) {
    isDead = value;
}
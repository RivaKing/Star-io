import { WORLD_WIDTH, WORLD_HEIGHT, player, socket } from './main.js';
import { requestShoot } from './shoot.js';

export let keys = {};
export let isDead = false;
const speed = 6;

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
            requestShoot(player, mouseX, mouseY, cameraX, cameraY, socket); // Добавляем выстрел в очередь
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
        let dx = 0, dy = 0;
        const move = keys['w'] || keys['ц'] ? -speed : keys['s'] || keys['ы'] ? speed : 0;
        const strafe = keys['a'] || keys['ф'] ? -speed : keys['d'] || keys['в'] ? speed : 0;

        if (move || strafe) {
            dx = strafe;
            dy = move;
            if (dx && dy) {
                const len = Math.sqrt(dx * dx + dy * dy);
                dx = (dx / len) * speed;
                dy = (dy / len) * speed;
            }
            player.x = Math.max(player.radius, Math.min(WORLD_WIDTH - player.radius, player.x + dx));
            player.y = Math.max(player.radius, Math.min(WORLD_HEIGHT - player.radius, player.y + dy));
            socket.emit('move', { x: player.x, y: player.y, radius: player.radius });
        }
    }
}

export function setIsDead(value) {
    isDead = value;
}
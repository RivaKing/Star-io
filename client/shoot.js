const SHOOT_SPEED = 20;
const SHOOT_RADIUS = 13;
const SHOOT_COOLDOWN = 500;
let lastShotTime = 0;
const shootQueue = []; // Очередь выстрелов

export function requestShoot(player, mouseX, mouseY, cameraX, cameraY, socket) {
    shootQueue.push({ player, mouseX, mouseY, cameraX, cameraY, socket });
}

export function processShoots() {
    const currentTime = Date.now();
    if (currentTime - lastShotTime < SHOOT_COOLDOWN || shootQueue.length === 0) {
        return;
    }

    const { player, mouseX, mouseY, cameraX, cameraY, socket } = shootQueue.shift();
    const worldMouseX = mouseX + cameraX;
    const worldMouseY = mouseY + cameraY;

    const dx = worldMouseX - player.x;
    const dy = worldMouseY - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const vx = (dx / distance) * SHOOT_SPEED;
    const vy = (dy / distance) * SHOOT_SPEED;

    const projectile = {
        x: player.x,
        y: player.y,
        vx, vy,
        radius: SHOOT_RADIUS,
        owner: socket.id,
        ttl: 2000
    };

    socket.emit('shoot', projectile);
    lastShotTime = currentTime;
}

export function drawProjectiles(ctx, projectiles) {
    projectiles.forEach((proj) => {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    });
}
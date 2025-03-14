const SHOOT_SPEED = 10;
const SHOOT_RADIUS = 10;

function createProjectile(player, mouseX, mouseY, cameraX, cameraY, socket) {
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
        vx: vx,
        vy: vy,
        radius: SHOOT_RADIUS,
        owner: socket.id
    };

    socket.emit('shoot', projectile);
}

function drawProjectiles(ctx, projectiles) {
    projectiles.forEach((proj) => {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.fill();
        ctx.closePath();
    });
}
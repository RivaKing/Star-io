import { WORLD_WIDTH, WORLD_HEIGHT, GRID_SIZE, player, players, projectiles, isDead, socket } from './main.js'; // Убедитесь, что socket импортирован
import { drawProjectiles } from './shoot.js';

export function draw(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const cameraX = player.x - ctx.canvas.width / 2;
    const cameraY = player.y - ctx.canvas.height / 2;

    ctx.save();
    ctx.translate(-cameraX, -cameraY);

    // Отрисовка фона и сетки
    ctx.fillStyle = '#333333';
    ctx.fillRect(-ctx.canvas.width, -ctx.canvas.height, WORLD_WIDTH * 2, WORLD_HEIGHT * 2);
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

    // Отрисовка других игроков
    for (let id in players) {
        if (id !== socket.id) { // Здесь используется socket.id
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

    // Отрисовка текущего игрока
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

    // Экран смерти
    if (isDead) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Вы умерли!', ctx.canvas.width / 2, ctx.canvas.height / 2 - 50);

        ctx.font = '20px Arial';
        ctx.fillText('Нажмите "Возродиться"', ctx.canvas.width / 2, ctx.canvas.height / 2 + 20);

        ctx.fillStyle = 'green';
        ctx.fillRect(ctx.canvas.width / 2 - 100, ctx.canvas.height / 2 + 50, 200, 50);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText('Возродиться', ctx.canvas.width / 2, ctx.canvas.height / 2 + 80);
    }
}
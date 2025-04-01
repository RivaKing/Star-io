import { WORLD_WIDTH, WORLD_HEIGHT, GRID_SIZE, player, players, projectiles, socket } from './main.js';
import { isDead } from './player.js';
import { drawProjectiles } from './shoot.js';

const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d');

// Кэш для текста здоровья
const healthTextCache = new Map(); // Хранит изображения текста здоровья
const TEXT_WIDTH = 60; // Ширина текста (примерно, зависит от шрифта)
const TEXT_HEIGHT = 20; // Высота текста
const MAX_CACHE_SIZE = 200; // Максимальный размер кэша

// Функция для инициализации фона
export function initBackground() {
    offscreenCanvas.width = WORLD_WIDTH;
    offscreenCanvas.height = WORLD_HEIGHT;

    offscreenCtx.fillStyle = '#333333';
    offscreenCtx.fillRect(-WORLD_WIDTH, -WORLD_HEIGHT, WORLD_WIDTH * 2, WORLD_HEIGHT * 2);
    offscreenCtx.fillStyle = '#ffffff';
    offscreenCtx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    offscreenCtx.strokeStyle = '#cccccc';
    offscreenCtx.lineWidth = 1;

    for (let x = 0; x <= WORLD_WIDTH; x += GRID_SIZE) {
        offscreenCtx.beginPath();
        offscreenCtx.moveTo(x, 0);
        offscreenCtx.lineTo(x, WORLD_HEIGHT);
        offscreenCtx.stroke();
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += GRID_SIZE) {
        offscreenCtx.beginPath();
        offscreenCtx.moveTo(0, y);
        offscreenCtx.lineTo(WORLD_WIDTH, y);
        offscreenCtx.stroke();
    }
}

// Функция для создания кэшированного текста здоровья
function getHealthText(health) {
    const key = `HP: ${health}`;
    if (!healthTextCache.has(key)) {
        // Очистка кэша, если превышен лимит
        if (healthTextCache.size >= MAX_CACHE_SIZE) {
            healthTextCache.clear();
            console.log('Health text cache cleared due to size limit');
        }

        const canvas = document.createElement('canvas');
        canvas.width = TEXT_WIDTH;
        canvas.height = TEXT_HEIGHT;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(key, TEXT_WIDTH / 2, TEXT_HEIGHT / 2);

        healthTextCache.set(key, canvas);
    }
    return healthTextCache.get(key);
}

// Функция для предварительного заполнения кэша здоровья (0, 10, 20, ..., 100)
export function initHealthTextCache() {
    for (let health = 0; health <= 100; health += 10) {
        getHealthText(health);
    }
    console.log('Health text cache initialized');
}

// Кэшируем значение пульсации
let pulse = 20;
//setInterval(() => {
//    pulse = Math.sin(Date.now() * 0.005) * 1 + 20;
//}, 100); // Обновляем раз в 100 мс

// Основная функция отрисовки игрового мира
export function draw(ctx) {
    const cameraX = player.x - ctx.canvas.width / 2;
    const cameraY = player.y - ctx.canvas.height / 2;

    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    ctx.clearRect(cameraX, cameraY, ctx.canvas.width, ctx.canvas.height); // Очистка только видимой области
    ctx.drawImage(offscreenCanvas, 0, 0);

    drawProjectiles(ctx, projectiles);

    // Отрисовка других игроков
    for (let id in players) {
        if (id !== socket.id) {
            const p = players[id];
            ctx.beginPath();
            ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
            ctx.fillStyle = 'red';
            ctx.fill();
            ctx.closePath();

            // Используем кэшированный текст здоровья
            const healthText = getHealthText(p.health);
            ctx.drawImage(healthText, p.x - TEXT_WIDTH / 2, p.y - 30 - TEXT_HEIGHT / 2);
        }
    }

    // Отрисовка текущего игрока
    ctx.beginPath();
    ctx.arc(player.x, player.y, pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.closePath();

    // Используем кэшированный текст здоровья для текущего игрока
    const playerHealthText = getHealthText(player.health);
    ctx.drawImage(playerHealthText, player.x - TEXT_WIDTH / 2, player.y - 30 - TEXT_HEIGHT / 2);

    ctx.restore();

    // Вызов экрана смерти, если игрок мёртв
    if (isDead) {
        drawDeathScreen(ctx);
    }
}

// Функция для отрисовки экрана смерти
function drawDeathScreen(ctx) {
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
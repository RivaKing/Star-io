import { resizeCanvas } from './utils.js';
import { initPlayerControls, updatePlayer } from './player.js';
import { draw } from './render.js';
import { initSocketListeners } from './network.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
export const socket = io(); // Экспортируем socket

export const WORLD_WIDTH = 5000;
export const WORLD_HEIGHT = 5000;
export const GRID_SIZE = 100;

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

export let player = { x: 100, y: 100, radius: 20, health: 100 };
export let players = {};
export let projectiles = [];
export let isDead = false;

initPlayerControls(canvas, socket);
initSocketListeners(socket);

function gameLoop() {
    updatePlayer();
    draw(ctx);
}

setInterval(gameLoop, 1000 / 60);
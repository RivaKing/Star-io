import { resizeCanvas } from './utils.js';
import { initPlayerControls, updatePlayer, isDead } from './player.js';
import { draw, initBackground } from './render.js';
import { initSocketListeners } from './network.js';
import { processShoots } from './shoot.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
export const socket = io();

export const WORLD_WIDTH = 6000;
export const WORLD_HEIGHT = 6000;
export const GRID_SIZE = 600;

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

export let player = { x: 100, y: 100, radius: 20, health: 100 };
export let players = {};
export let projectiles = [];

const worker = new Worker('projectileWorker.js');

initPlayerControls(canvas, socket);
initSocketListeners(socket);
initBackground();

let lastTime = performance.now();

worker.onmessage = (e) => {
    const { updatedProjectiles, updatedPlayers } = e.data;
    projectiles = updatedProjectiles;
    for (let id in updatedPlayers) {
        if (id !== socket.id) players[id] = updatedPlayers[id];
    }
    draw(ctx);
};

function gameLoop(time) {
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;

    updatePlayer();
    processShoots();

    worker.postMessage({ projectiles, players, deltaTime });
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const msgpack = require('msgpack-lite');
const Cell = require('./cell.js');

const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 6000;
const GRID_SIZE = 600;
const UPDATE_RATE = 1000 / 30; // 30 FPS для обновлений
const BROADCAST_INTERVAL = 1000 / 15; // 15 FPS для вещания

let players = new Map(); // Заменяем объект на Map
let grid = new Map(); // Заменяем объект на Map
let activeCells = new Set();
let gameStateBuffer = new Map(); // Буфер для состояния игры
let prevGameState = new Map(); // Для дельта-обновлений

app.use(express.static('../client'));

function initializeGrid() {
    for (let x = 0; x < WORLD_WIDTH / GRID_SIZE; x++) {
        for (let y = 0; y < WORLD_HEIGHT / GRID_SIZE; y++) {
            const key = `${x},${y}`;
            grid.set(key, new Cell(x, y));
        }
    }

    for (let x = 0; x < WORLD_WIDTH / GRID_SIZE; x++) {
        for (let y = 0; y < WORLD_HEIGHT / GRID_SIZE; y++) {
            const key = `${x},${y}`;
            const cell = grid.get(key);
            cell.neighbors = getNeighborCells(x, y);
        }
    }
}

function getCell(x, y) {
    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);
    return grid.get(`${gridX},${gridY}`);
}

function getNeighborCells(gridX, gridY) {
    const neighbors = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const key = `${gridX + dx},${gridY + dy}`;
            const cell = grid.get(key);
            if (cell) neighbors.push(cell);
        }
    }
    return neighbors;
}

function updatePlayerCell(playerId, oldX, oldY, newX, newY) {
    const oldCell = getCell(oldX, oldY);
    const newCell = getCell(newX, newY);
    if (oldCell !== newCell) {
        oldCell.removePlayer(playerId);
        newCell.addPlayer(playerId);
        updateActiveCells(oldCell);
        updateActiveCells(newCell);
    }
}

function updateActiveCells(cell) {
    if (cell.players.size > 0 || cell.projectiles.length > 0) {
        activeCells.add(cell);
    } else {
        activeCells.delete(cell);
    }
}

initializeGrid();

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);

    if (players.size >= 10) {
        socket.disconnect();
        return;
    }

    players.set(socket.id, { x: 100, y: 100, health: 50, radius: 20 });
    const startCell = getCell(100, 100);
    startCell.addPlayer(socket.id);
    updateActiveCells(startCell);
    io.emit('updatePlayers', Object.fromEntries(players));

    socket.on('move', (data) => {
        const player = players.get(socket.id);
        if (player) {
            const oldX = player.x;
            const oldY = player.y;
            player.x = data.x;
            player.y = data.y;
            updatePlayerCell(socket.id, oldX, oldY, player.x, player.y);
            io.emit('updatePlayers', Object.fromEntries(players));
        }
    });

    socket.on('shoot', (projectile) => {
        if (players.has(socket.id)) {
            projectile.owner = socket.id;
            projectile.createdAt = Date.now();
            const cell = getCell(projectile.x, projectile.y);
            cell.addProjectile(projectile);
            updateActiveCells(cell);
        }
    });

    socket.on('respawn', () => {
        console.log('Игрок возродился:', socket.id);
        players.set(socket.id, { x: 100, y: 100, health: 50, radius: 20 });
        const startCell = getCell(100, 100);
        startCell.addPlayer(socket.id);
        updateActiveCells(startCell);
        io.emit('updatePlayers', Object.fromEntries(players));
    });

    socket.on('disconnect', () => {
        console.log('Игрок отключился:', socket.id);
        const player = players.get(socket.id);
        if (player) {
            const cell = getCell(player.x, player.y);
            cell.removePlayer(socket.id);
            updateActiveCells(cell);
        }
        players.delete(socket.id);
        io.emit('updatePlayers', Object.fromEntries(players));
    });
});

async function updateProjectiles() {
    const now = Date.now();
    const projectileUpdates = [];

    for (const cell of activeCells) {
        const projectiles = cell.projectiles;
        if (projectiles.length === 0) continue;

        for (let i = projectiles.length - 1; i >= 0; i--) {
            const proj = projectiles[i];
            proj.x += proj.vx;
            proj.y += proj.vy;

            if (now - proj.createdAt > proj.ttl || 
                proj.x < 0 || proj.x > WORLD_WIDTH || proj.y < 0 || proj.y > WORLD_HEIGHT) {
                projectiles.splice(i, 1);
                updateActiveCells(cell);
                continue;
            }

            const newCell = getCell(proj.x, proj.y);
            if (newCell !== cell) {
                projectiles.splice(i, 1);
                newCell.addProjectile(proj);
                updateActiveCells(cell);
                updateActiveCells(newCell);
            } else {
                projectileUpdates.push({ cell, proj, index: i });
            }
        }
    }

    return projectileUpdates;
}

async function checkCollisions(projectileUpdates) {
    const collisionEvents = [];

    await Promise.all(projectileUpdates.map(async ({ cell, proj, index }) => {
        for (const neighbor of cell.neighbors) {
            for (const id of neighbor.players) {
                if (id !== proj.owner) {
                    const player = players.get(id);
                    const dx = proj.x - player.x;
                    const dy = proj.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const collisionDistance = proj.radius + player.radius;

                    if (distance < collisionDistance) {
                        player.health -= 10;
                        cell.projectiles.splice(index, 1);
                        updateActiveCells(cell);

                        if (player.health <= 0) {
                            console.log(`Игрок ${id} умер!`);
                            getCell(player.x, player.y).removePlayer(id);
                            players.delete(id);
                            collisionEvents.push({ type: 'playerDead', id });
                        }
                        collisionEvents.push({ type: 'hit', playerId: id, health: player.health });
                        return;
                    }
                }
            }
        }
    }));

    return collisionEvents;
}

function bufferGameState() {
    for (const [id, player] of players) {
        const cell = getCell(player.x, player.y);
        const nearbyPlayers = new Map();
        const nearbyProjectiles = [];

        cell.neighbors.forEach((neighbor) => {
            neighbor.players.forEach((pid) => nearbyPlayers.set(pid, players.get(pid)));
            nearbyProjectiles.push(...neighbor.projectiles);
        });

        gameStateBuffer.set(id, {
            players: Object.fromEntries(nearbyPlayers),
            projectiles: nearbyProjectiles,
        });
    }
}

function broadcastGameState() {
    for (const [id, state] of gameStateBuffer) {
        const prev = prevGameState.get(id) || {};
        const delta = {
            players: Object.entries(state.players).reduce((acc, [pid, p]) => {
                const prevP = prev.players?.[pid];
                if (!prevP || prevP.x !== p.x || prevP.y !== p.y || prevP.health !== p.health) {
                    acc[pid] = [p.x, p.y, p.health];
                }
                return acc;
            }, {}),
            projectiles: state.projectiles.map(pr => [pr.x, pr.y, pr.vx, pr.vy, pr.radius])
        };
        if (Object.keys(delta.players).length > 0 || delta.projectiles.length > 0) {
            io.to(id).emit('updateGameState', msgpack.encode(delta));
        }
    }
    prevGameState = new Map(gameStateBuffer);
    setTimeout(broadcastGameState, BROADCAST_INTERVAL);
}

async function gameLoop() {
    const projectileUpdates = await updateProjectiles();
    const collisionEvents = await checkCollisions(projectileUpdates);
    bufferGameState();

    collisionEvents.forEach(event => {
        if (event.type === 'playerDead') {
            io.to(event.id).emit('playerDead');
        }
    });

    io.emit('updatePlayers', Object.fromEntries(players));
    setTimeout(gameLoop, UPDATE_RATE);
}

gameLoop();
broadcastGameState();

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${PORT}`);
});
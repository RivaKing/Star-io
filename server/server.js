const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const Cell = require('./cell.js');

const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 6000;
const GRID_SIZE = 600;
const UPDATE_RATE = 1000 / 30; // Уменьшаем частоту до 30 обновлений в секунду

let players = {};
let grid = {};
let activeCells = new Set(); // Множество активных ячеек

app.use(express.static('../client'));

function initializeGrid() {
    // Шаг 1: Создаём все ячейки
    for (let x = 0; x < WORLD_WIDTH / GRID_SIZE; x++) {
        for (let y = 0; y < WORLD_HEIGHT / GRID_SIZE; y++) {
            const key = `${x},${y}`;
            grid[key] = new Cell(x, y);
        }
    }

    // Шаг 2: Назначаем соседей для всех ячеек
    for (let x = 0; x < WORLD_WIDTH / GRID_SIZE; x++) {
        for (let y = 0; y < WORLD_HEIGHT / GRID_SIZE; y++) {
            const key = `${x},${y}`;
            grid[key].neighbors = getNeighborCells(x, y);
        }
    }
}

function getCell(x, y) {
    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);
    return grid[`${gridX},${gridY}`];
}

function getNeighborCells(gridX, gridY) {
    const neighbors = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const key = `${gridX + dx},${gridY + dy}`;
            if (grid[key]) {
                neighbors.push(grid[key]);
            }
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

    if (Object.keys(players).length >= 10) {
        socket.disconnect();
        return;
    }

    players[socket.id] = { x: 100, y: 100, health: 50, radius: 20 };
    const startCell = getCell(100, 100);
    startCell.addPlayer(socket.id);
    updateActiveCells(startCell);
    io.emit('updatePlayers', players);

    socket.on('move', (data) => {
        if (players[socket.id]) {
            const player = players[socket.id];
            const oldX = player.x;
            const oldY = player.y;
            player.x = data.x;
            player.y = data.y;
            updatePlayerCell(socket.id, oldX, oldY, player.x, player.y);
            io.emit('updatePlayers', players);
        }
    });

    socket.on('shoot', (projectile) => {
        if (players[socket.id]) {
            projectile.owner = socket.id;
            projectile.createdAt = Date.now();
            const cell = getCell(projectile.x, projectile.y);
            cell.addProjectile(projectile);
            updateActiveCells(cell);
        }
    });

    socket.on('respawn', () => {
        console.log('Игрок возродился:', socket.id);
        players[socket.id] = { x: 100, y: 100, health: 100, radius: 20 };
        const startCell = getCell(100, 100);
        startCell.addPlayer(socket.id);
        updateActiveCells(startCell);
        io.emit('updatePlayers', players);
    });

    socket.on('disconnect', () => {
        console.log('Игрок отключился:', socket.id);
        const player = players[socket.id];
        if (player) {
            const cell = getCell(player.x, player.y);
            cell.removePlayer(socket.id);
            updateActiveCells(cell);
        }
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

function gameLoop() {
    const now = Date.now();

    activeCells.forEach((cell) => {
        const projectiles = cell.projectiles;
        if (projectiles.length === 0) return;

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
            }

            cell.neighbors.forEach((neighbor) => {
                neighbor.players.forEach((id) => {
                    if (id !== proj.owner) {
                        const player = players[id];
                        const dx = proj.x - player.x;
                        const dy = proj.y - player.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const collisionDistance = proj.radius + player.radius;

                        if (distance < collisionDistance) {
                            player.health -= 10;
                            projectiles.splice(i, 1);
                            updateActiveCells(cell);
                            if (player.health <= 0) {
                                console.log(`Игрок ${id} умер!`);
                                getCell(player.x, player.y).removePlayer(id);
                                delete players[id];
                                io.to(id).emit('playerDead');
                            }
                            io.emit('updatePlayers', players);
                            return;
                        }
                    }
                });
            });
        }
    });

    for (let id in players) {
        const player = players[id];
        const cell = getCell(player.x, player.y);
        const nearbyPlayers = {};
        const nearbyProjectiles = [];

        cell.neighbors.forEach((neighbor) => {
            neighbor.players.forEach((pid) => {
                nearbyPlayers[pid] = players[pid];
            });
            nearbyProjectiles.push(...neighbor.projectiles);
        });

        io.to(id).emit('updateGameState', {
            players: nearbyPlayers,
            projectiles: nearbyProjectiles,
        });
    }

    setTimeout(gameLoop, UPDATE_RATE);
}

gameLoop();

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${PORT}`);
});
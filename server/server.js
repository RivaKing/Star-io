const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const Cell = require('./cell.js');

const WORLD_WIDTH = 6000;
const WORLD_HEIGHT = 6000;
const GRID_SIZE = 600;

let players = {};
let grid = {};

app.use(express.static('../client'));

function initializeGrid() {
    for (let x = 0; x < WORLD_WIDTH / GRID_SIZE; x++) {
        for (let y = 0; y < WORLD_HEIGHT / GRID_SIZE; y++) {
            grid[`${x},${y}`] = new Cell(x, y);
        }
    }
}

initializeGrid();

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
    }
}

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);

    if (Object.keys(players).length >= 10) {
        socket.disconnect();
        return;
    }

    players[socket.id] = { x: 100, y: 100, health: 100, radius: 20 };
    getCell(100, 100).addPlayer(socket.id);
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
            projectile.createdAt = Date.now(); // Добавляем время создания
            getCell(projectile.x, projectile.y).addProjectile(projectile);
        }
    });

    socket.on('respawn', () => {
        console.log('Игрок возродился:', socket.id);
        players[socket.id] = { x: 100, y: 100, health: 100, radius: 20 };
        getCell(100, 100).addPlayer(socket.id);
        io.emit('updatePlayers', players);
    });

    socket.on('disconnect', () => {
        console.log('Игрок отключился:', socket.id);
        const player = players[socket.id];
        if (player) {
            getCell(player.x, player.y).removePlayer(socket.id);
        }
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

function gameLoop() {
    const now = Date.now();

    for (let key in grid) {
        const cell = grid[key];
        const projectiles = cell.projectiles;
        if (projectiles.length === 0) continue;

        projectiles.forEach((proj, index) => {
            proj.x += proj.vx;
            proj.y += proj.vy;

            // Проверка времени жизни
            if (now - proj.createdAt > proj.ttl) {
                cell.projectiles.splice(index, 1);
                return;
            }

            if (proj.x < 0 || proj.x > WORLD_WIDTH || proj.y < 0 || proj.y > WORLD_HEIGHT) {
                cell.projectiles.splice(index, 1);
                return;
            }

            const newCell = getCell(proj.x, proj.y);
            if (newCell !== cell) {
                cell.projectiles.splice(index, 1);
                newCell.addProjectile(proj);
            }

            const neighbors = getNeighborCells(cell.gridX, cell.gridY);
            neighbors.forEach((neighbor) => {
                neighbor.players.forEach((id) => {
                    if (id !== proj.owner) {
                        const player = players[id];
                        const dx = proj.x - player.x;
                        const dy = proj.y - player.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const collisionDistance = proj.radius + player.radius;

                        if (distance < collisionDistance) {
                            player.health -= 10;
                            cell.projectiles.splice(index, 1);
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
        });
    }

    for (let id in players) {
        const player = players[id];
        const cell = getCell(player.x, player.y);
        const neighbors = getNeighborCells(cell.gridX, cell.gridY);
        const nearbyPlayers = {};
        const nearbyProjectiles = [];

        neighbors.forEach((neighbor) => {
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

    setTimeout(gameLoop, 1000 / 60);
}

gameLoop();

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${PORT}`);
});
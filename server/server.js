const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let players = {};
let projectiles = [];

app.use(express.static('../client')); // Изменено на правильный путь

io.on('connection', (socket) => {
    console.log('Игрок подключился:', socket.id);

    if (Object.keys(players).length >= 2) {
        socket.disconnect();
        return;
    }

    players[socket.id] = { x: 100, y: 100, health: 100, radius: 20 };
    io.emit('updatePlayers', players);

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            io.emit('updatePlayers', players);
        }
    });

    socket.on('shoot', (projectile) => {
        if (players[socket.id]) {
            projectiles.push(projectile);
        }
    });

    socket.on('respawn', () => {
        console.log('Игрок возродился:', socket.id);
        players[socket.id] = { x: 100, y: 100, health: 100, radius: 20 };
        io.emit('updatePlayers', players);
    });

    socket.on('disconnect', () => {
        console.log('Игрок отключился:', socket.id);
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

function gameLoop() {
    projectiles.forEach((proj, index) => {
        proj.x += proj.vx;
        proj.y += proj.vy;

        if (proj.x < 0 || proj.x > 5000 || proj.y < 0 || proj.y > 5000) {
            projectiles.splice(index, 1);
            return;
        }

        for (let id in players) {
            if (id !== proj.owner) {
                const player = players[id];
                const dx = proj.x - player.x;
                const dy = proj.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const collisionDistance = proj.radius + player.radius;

                if (distance < collisionDistance) {
                    player.health -= 10;
                    projectiles.splice(index, 1);
                    if (player.health <= 0) {
                        console.log(`Игрок ${id} умер!`);
                        delete players[id];
                        io.to(id).emit('playerDead');
                    }
                    io.emit('updatePlayers', players);
                    return;
                }
            }
        }
    });

    io.emit('updateProjectiles', projectiles);
    setTimeout(gameLoop, 1000 / 60); // Изменено на 30 FPS
}

gameLoop();

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на http://0.0.0.0:${PORT}`);
});
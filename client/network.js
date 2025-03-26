import * as msgpack from 'https://cdn.jsdelivr.net/npm/msgpack-lite@0.1.26/+esm';
import { player, players, projectiles, socket } from './main.js';
import { setIsDead } from './player.js';

export function initSocketListeners(socket) {
    socket.on('updateGameState', (packedData) => {
        const data = msgpack.decode(new Uint8Array(packedData));
        const serverPlayers = data.players || {};
        const serverProjectiles = data.projectiles || [];

        // Обработка игроков
        for (let id in serverPlayers) {
            const [x, y, health] = serverPlayers[id];
            if (id === socket.id) {
                player.health = health;
                players[id] = { ...players[id], x: player.x, y: player.y, health };
            } else if (!players[id]) {
                players[id] = { x, y, health, radius: 20 };
            } else {
                players[id].x += (x - players[id].x) * 0.2;
                players[id].y += (y - players[id].y) * 0.2;
                players[id].health = health;
            }
        }

        for (let id in players) {
            if (!serverPlayers[id] && id !== socket.id) {
                delete players[id];
            }
        }

        // Обработка снарядов
        projectiles.length = 0;
        serverProjectiles.forEach(([x, y, vx, vy, r]) => {
            projectiles.push({ x, y, vx, vy, radius: r });
        });
    });

    socket.on('playerDead', () => {
        setIsDead(true);
    });
}
// network.js
import { player, players, projectiles, isDead } from './main.js';

export function initSocketListeners(socket) {
    socket.on('updatePlayers', (serverPlayers) => {
        for (let id in serverPlayers) {
            if (id === socket.id) {
                player.health = serverPlayers[id].health;
                players[id] = { ...serverPlayers[id], x: player.x, y: player.y };
            } else if (!players[id]) {
                players[id] = serverPlayers[id];
            } else {
                players[id].x += (serverPlayers[id].x - players[id].x) * 0.2;
                players[id].y += (serverPlayers[id].y - players[id].y) * 0.2;
                players[id].health = serverPlayers[id].health;
            }
        }
        for (let id in players) {
            if (!serverPlayers[id]) {
                delete players[id];
            }
        }
    });

    socket.on('updateProjectiles', (serverProjectiles) => {
        // Очищаем текущий массив и добавляем новые элементы
        projectiles.length = 0; // Очищаем массив
        serverProjectiles.forEach(proj => projectiles.push(proj)); // Копируем элементы
    });

    socket.on('playerDead', () => {
        isDead = true;
    });
}
import { player, players, projectiles, socket } from './main.js';
import { setIsDead } from './player.js';

export function initSocketListeners(socket) {
    socket.on('updateGameState', (data) => {
        const serverPlayers = data.players;
        const serverProjectiles = data.projectiles;

        for (let id in serverPlayers) {
            if (id === socket.id) {
                player.health = serverPlayers[id].health;
                players[id] = { ...serverPlayers[id], x: player.x, y: player.y };
            } else if (!players[id]) {
                players[id] = serverPlayers[id];
            } else {
                players[id].targetX = serverPlayers[id].x;
                players[id].targetY = serverPlayers[id].y;
                players[id].health = serverPlayers[id].health;
            }
        }

        for (let id in players) {
            if (!serverPlayers[id]) delete players[id];
        }

        projectiles.length = 0;
        serverProjectiles.forEach(proj => projectiles.push(proj));
    });

    socket.on('playerDead', () => {
        setIsDead(true);
    });
}
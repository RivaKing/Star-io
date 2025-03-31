self.onmessage = (e) => {
    const { projectiles, players, deltaTime } = e.data;

    // Обновление снарядов
    const updatedProjectiles = projectiles.map(proj => {
        proj.x += proj.vx * deltaTime;
        proj.y += proj.vy * deltaTime;
        proj.ttl -= deltaTime * 1000;
        return proj;
    }).filter(proj => proj.ttl > 0);

    // Интерполяция позиций других игроков
    const updatedPlayers = {};
    for (let id in players) {
        const p = players[id];
        if (p.targetX && p.targetY) {
            p.x += (p.targetX - p.x) * 0.2;
            p.y += (p.targetY - p.y) * 0.2;
        }
        updatedPlayers[id] = p;
    }

    self.postMessage({ updatedProjectiles, updatedPlayers });
};
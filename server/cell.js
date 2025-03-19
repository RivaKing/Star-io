class Cell {
    constructor(gridX, gridY) {
        this.gridX = gridX; // Координата X в сетке
        this.gridY = gridY; // Координата Y в сетке
        this.players = new Set(); // Множество ID игроков в ячейке
        this.projectiles = []; // Список снарядов в ячейке
    }

    // Добавление игрока в ячейку
    addPlayer(playerId) {
        this.players.add(playerId);
    }

    // Удаление игрока из ячейки
    removePlayer(playerId) {
        this.players.delete(playerId);
    }

    // Добавление снаряда в ячейку
    addProjectile(projectile) {
        this.projectiles.push(projectile);
    }

    // Очистка снарядов (например, после столкновения или выхода за пределы)
    clearProjectiles() {
        this.projectiles = [];
    }
}

module.exports = Cell;
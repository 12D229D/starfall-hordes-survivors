/**
 * STARFALL HORDES: SURVIVORS - Spatial Hash Grid
 * Estructura de aceleración espacial 2D en tiempo constante O(1)
 * Permite chequear miles de colisiones entre proyectiles, enemigos y jugadores sin O(N^2).
 */

export class SpatialHashGrid {
  constructor(cellSize = 96) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }

  clear() {
    this.grid.clear();
  }

  _getKey(cellX, cellY) {
    return (cellX << 16) ^ cellY;
  }

  insert(id, x, y, radius) {
    const minCellX = Math.floor((x - radius) / this.cellSize);
    const maxCellX = Math.floor((x + radius) / this.cellSize);
    const minCellY = Math.floor((y - radius) / this.cellSize);
    const maxCellY = Math.floor((y + radius) / this.cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = this._getKey(cx, cy);
        let cell = this.grid.get(key);
        if (!cell) {
          cell = [];
          this.grid.set(key, cell);
        }
        cell.push(id);
      }
    }
  }

  query(x, y, radius, resultList) {
    resultList.length = 0;
    const minCellX = Math.floor((x - radius) / this.cellSize);
    const maxCellX = Math.floor((x + radius) / this.cellSize);
    const minCellY = Math.floor((y - radius) / this.cellSize);
    const maxCellY = Math.floor((y + radius) / this.cellSize);

    // Evitar duplicados con un Set o un array de visitas rápido
    const visited = new Set();

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = this._getKey(cx, cy);
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const id = cell[i];
            if (!visited.has(id)) {
              visited.add(id);
              resultList.push(id);
            }
          }
        }
      }
    }
    return resultList;
  }
}

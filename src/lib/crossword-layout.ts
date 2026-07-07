// Simple crossword layout: places words on a grid, preferring intersections.
// Output is trimmed to the used bounding box. Disconnected words are dropped.

export type Direction = "across" | "down";

export type Placement = {
  index: number; // original word index
  word: string;
  clue: string;
  row: number;
  col: number;
  dir: Direction;
  number: number; // clue number
};

export type Cell = {
  letter: string;
  // Placements this cell belongs to (index into placements[])
  across?: number;
  down?: number;
  // Clue number if this cell starts a word
  number?: number;
};

export type Layout = {
  rows: number;
  cols: number;
  grid: (Cell | null)[][];
  placements: Placement[];
};

type RawWord = { word: string; clue: string };

const SIZE = 40; // working canvas; final layout trimmed

export function layoutCrossword(words: RawWord[]): Layout {
  // Normalize + filter
  const items = words
    .map((w, i) => ({
      index: i,
      word: (w.word || "").toUpperCase().replace(/\s+/g, ""),
      clue: w.clue || "",
    }))
    .filter((w) => w.word.length >= 2);

  // Longest first for better anchoring
  items.sort((a, b) => b.word.length - a.word.length);

  type WorkPlacement = Omit<Placement, "number">;
  const grid: (string | null)[][] = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(null),
  );
  const placements: WorkPlacement[] = [];

  function canPlace(
    word: string,
    row: number,
    col: number,
    dir: Direction,
  ): boolean {
    const len = word.length;
    if (row < 0 || col < 0) return false;
    if (dir === "across" && col + len > SIZE) return false;
    if (dir === "down" && row + len > SIZE) return false;

    // Cell before / after must be empty (no adjacency to another word)
    if (dir === "across") {
      if (col > 0 && grid[row][col - 1] != null) return false;
      if (col + len < SIZE && grid[row][col + len] != null) return false;
    } else {
      if (row > 0 && grid[row - 1][col] != null) return false;
      if (row + len < SIZE && grid[row + len][col] != null) return false;
    }

    let hasIntersection = false;
    for (let k = 0; k < len; k++) {
      const r = dir === "across" ? row : row + k;
      const c = dir === "across" ? col + k : col;
      const existing = grid[r][c];
      if (existing != null) {
        if (existing !== word[k]) return false;
        hasIntersection = true;
      } else {
        // Perpendicular neighbours must be empty
        if (dir === "across") {
          if (r > 0 && grid[r - 1][c] != null) return false;
          if (r < SIZE - 1 && grid[r + 1][c] != null) return false;
        } else {
          if (c > 0 && grid[r][c - 1] != null) return false;
          if (c < SIZE - 1 && grid[r][c + 1] != null) return false;
        }
      }
    }
    return hasIntersection || placements.length === 0;
  }

  function commit(word: string, row: number, col: number, dir: Direction) {
    for (let k = 0; k < word.length; k++) {
      const r = dir === "across" ? row : row + k;
      const c = dir === "across" ? col + k : col;
      grid[r][c] = word[k];
    }
  }

  // Place first word horizontally in the middle
  if (items.length === 0) {
    return { rows: 0, cols: 0, grid: [], placements: [] };
  }
  const first = items[0];
  const startRow = Math.floor(SIZE / 2);
  const startCol = Math.floor((SIZE - first.word.length) / 2);
  commit(first.word, startRow, startCol, "across");
  placements.push({
    index: first.index,
    word: first.word,
    clue: first.clue,
    row: startRow,
    col: startCol,
    dir: "across",
  });

  // Place remaining words by trying to intersect existing letters
  for (let i = 1; i < items.length; i++) {
    const w = items[i];
    let placed = false;
    let bestScore = -1;
    let best: WorkPlacement | null = null;

    for (let k = 0; k < w.word.length && !placed; k++) {
      const letter = w.word[k];
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (grid[r][c] !== letter) continue;
          // Try both orientations perpendicular to existing letters
          for (const dir of ["across", "down"] as Direction[]) {
            const row = dir === "across" ? r : r - k;
            const col = dir === "across" ? c - k : c;
            if (canPlace(w.word, row, col, dir)) {
              // Score: count intersections
              let score = 0;
              for (let j = 0; j < w.word.length; j++) {
                const rr = dir === "across" ? row : row + j;
                const cc = dir === "across" ? col + j : col;
                if (grid[rr][cc] != null) score++;
              }
              if (score > bestScore) {
                bestScore = score;
                best = {
                  index: w.index,
                  word: w.word,
                  clue: w.clue,
                  row,
                  col,
                  dir,
                };
              }
            }
          }
        }
      }
    }

    if (best) {
      commit(best.word, best.row, best.col, best.dir);
      placements.push(best);
      placed = true;
    }
    // Words that can't intersect are dropped (keeps grid connected)
    if (!placed) continue;
  }

  // Trim bounding box
  let minR = SIZE, maxR = -1, minC = SIZE, maxC = -1;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] != null) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }
  if (maxR < 0) return { rows: 0, cols: 0, grid: [], placements: [] };

  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;
  const trimmed: (Cell | null)[][] = Array.from({ length: rows }, () =>
    Array<Cell | null>(cols).fill(null),
  );

  // Shift placements
  const shifted: Placement[] = placements.map((p) => ({
    ...p,
    row: p.row - minR,
    col: p.col - minC,
    number: 0,
  }));

  // Fill letters
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const letter = grid[r + minR][c + minC];
      if (letter != null) trimmed[r][c] = { letter };
    }
  }

  // Number cells by scanning top-to-bottom, left-to-right
  // A cell starts a word if it starts an across or down entry
  const startsAcross = new Map<string, number>(); // "r,c" -> placement idx
  const startsDown = new Map<string, number>();
  shifted.forEach((p, idx) => {
    const key = `${p.row},${p.col}`;
    if (p.dir === "across") startsAcross.set(key, idx);
    else startsDown.set(key, idx);
  });

  let num = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!trimmed[r][c]) continue;
      const key = `${r},${c}`;
      const isStart = startsAcross.has(key) || startsDown.has(key);
      if (isStart) {
        num++;
        trimmed[r][c]!.number = num;
        const aIdx = startsAcross.get(key);
        const dIdx = startsDown.get(key);
        if (aIdx != null) shifted[aIdx].number = num;
        if (dIdx != null) shifted[dIdx].number = num;
      }
    }
  }

  // Tag each cell with placement indices it belongs to
  shifted.forEach((p, idx) => {
    for (let k = 0; k < p.word.length; k++) {
      const r = p.dir === "across" ? p.row : p.row + k;
      const c = p.dir === "across" ? p.col + k : p.col;
      const cell = trimmed[r][c]!;
      if (p.dir === "across") cell.across = idx;
      else cell.down = idx;
    }
  });

  return { rows, cols, grid: trimmed, placements: shifted };
}

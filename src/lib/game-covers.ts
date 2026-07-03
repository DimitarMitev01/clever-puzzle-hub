import ticTacToe from "@/assets/games/tic-tac-toe.jpg";
import snake from "@/assets/games/snake.jpg";
import g2048 from "@/assets/games/2048.jpg";
import sudoku from "@/assets/games/sudoku.jpg";
import memory from "@/assets/games/memory.jpg";
import hangman from "@/assets/games/hangman.jpg";
import wordle from "@/assets/games/wordle.jpg";
import wordSearch from "@/assets/games/word-search.jpg";
import tetris from "@/assets/games/tetris.jpg";
import slidingPuzzle from "@/assets/games/sliding-puzzle.jpg";

export const GAME_COVERS: Record<string, string> = {
  "tic-tac-toe": ticTacToe,
  snake,
  "2048": g2048,
  sudoku,
  memory,
  hangman,
  wordle,
  "word-search": wordSearch,
  tetris,
  "sliding-puzzle": slidingPuzzle,
};

let numSelected = null;
let tileSelected = null;
let errors = 0;
let timer;
let seconds = 0;
let currentPuzzleSolution = null; // Store the current solution
let currentPuzzleBoard = null; // Store the current board
let hintsRemaining = 3; // Number of hints remaining
let isHintMode = false;
let selectedTileForHint = null; // Tile selected to receive hint

const GRID_SIZE = 9;
const SUBGRID_SIZE = 3;

window.onload = function () {
    loadGameFromStorage();
    document.getElementById("difficulty").addEventListener("change", resetGame);
};

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        seconds++;
        const min = String(Math.floor(seconds / 60)).padStart(2, '0');
        const sec = String(seconds % 60).padStart(2, '0');
        document.getElementById("timer").innerText = `${min}:${sec}`;
        saveGameToStorage();
    }, 1000);
}

function resetGame() {
    const level = document.getElementById("difficulty").value;
    localStorage.removeItem("sudoku-game");
    errors = 0;
    seconds = 0;
    hintsRemaining = 3; // Reset the number of hints
    document.getElementById("errors").innerText = errors;
    document.getElementById("timer").innerText = "00:00";
    document.getElementById("hints").innerText = hintsRemaining; // Update hint display
    generateAndSetPuzzle(level);
}

async function generateAndSetPuzzle(difficulty) {
    const { board, solution } = await generateSudoku(difficulty);
    currentPuzzleSolution = solution;
    currentPuzzleBoard = board;
    setGameBoard(board);
    startTimer();
    saveGameToStorage();
}

function setGameBoard(board) {
    document.getElementById("digits").innerHTML = "";
    document.getElementById("board").innerHTML = "";
    for (let i = 1; i <= 9; i++) {
        let number = document.createElement("div");
        number.id = i;
        number.innerText = i;
        number.addEventListener("click", selectNumber);
        number.classList.add("number");
        document.getElementById("digits").appendChild(number);
    }
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            let tile = document.createElement("div");
            tile.id = `${r}-${c}`;
            let val = board[r][c];
            if (val != 0) {
                tile.innerText = val;
                tile.classList.add("tile-start");
            }
            tile.classList.add("tile");
            if (r % SUBGRID_SIZE === 2) tile.classList.add("horizontal-line");
            if (c % SUBGRID_SIZE === 2) tile.classList.add("vertical-line");
            tile.addEventListener("click", () => selectTile(tile, currentPuzzleSolution));
            document.getElementById("board").append(tile);
        }
    }
}

function selectNumber() {
    if (numSelected) numSelected.classList.remove("number-selected");
    numSelected = this;
    numSelected.classList.add("number-selected");
}

function selectTile(tile, solution) {
    const [r, c] = tile.id.split("-").map(Number);

    // If in hint mode
    if (isHintMode) {
        if (tile.innerText !== "") {
            alert("This tile already has a number! Please choose an empty one.");
        } else {
            tile.innerText = solution[r][c];
            tile.classList.add("hint");
            setTimeout(() => tile.classList.remove("hint"), 1000);
            hintsRemaining--;
            document.getElementById("hints").innerText = hintsRemaining;
            saveGameToStorage();
        }
        isHintMode = false;
        return;
    }

    // Normal play mode
    if (!numSelected || tile.innerText !== "") return;
    if (solution[r][c] == numSelected.id) {
        tile.innerText = numSelected.id;
        tile.classList.remove("wrong");
        highlightTile(tile);
        if (checkCompletion(solution)) {
            clearInterval(timer);
            alert("🎉 Congratulations! You've completed the Sudoku!");
        }
    } else {
        tile.classList.add("wrong");
        setTimeout(() => tile.classList.remove("wrong"), 500);
        errors++;
        document.getElementById("errors").innerText = errors;
    }
    saveGameToStorage();
}

function highlightTile(tile) {
    const [r, c] = tile.id.split("-").map(Number);
    const allTiles = document.getElementsByClassName("tile");
    for (let t of allTiles) t.classList.remove("highlight");
    for (let i = 0; i < GRID_SIZE; i++) {
        document.getElementById(`${r}-${i}`).classList.add("highlight");
        document.getElementById(`${i}-${c}`).classList.add("highlight");
    }
    const startRow = Math.floor(r / SUBGRID_SIZE) * SUBGRID_SIZE;
    const startCol = Math.floor(c / SUBGRID_SIZE) * SUBGRID_SIZE;
    for (let i = 0; i < SUBGRID_SIZE; i++) {
        for (let j = 0; j < SUBGRID_SIZE; j++) {
            document.getElementById(`${startRow + i}-${startCol + j}`).classList.add("highlight");
        }
    }
}

function saveGameToStorage() {
    const level = document.getElementById("difficulty").value;
    const tiles = Array.from(document.getElementsByClassName("tile")).map(tile => tile.innerText);
    const data = {
        level: level,
        tiles: tiles,
        errors: errors,
        seconds: seconds,
        hintsRemaining: hintsRemaining // Save the number of remaining hints
    };
    localStorage.setItem("sudoku-game", JSON.stringify(data));
}

function loadGameFromStorage() {
    const saved = JSON.parse(localStorage.getItem("sudoku-game"));
    const level = document.getElementById("difficulty").value;
    if (saved && saved.level === level) {
        errors = saved.errors;
        seconds = saved.seconds;
        hintsRemaining = saved.hintsRemaining !== undefined ? saved.hintsRemaining : 3; // Load the number of hints (if available)
        document.getElementById("errors").innerText = errors;
        document.getElementById("timer").innerText = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        document.getElementById("hints").innerText = hintsRemaining; // Update hint display
        generateAndSetPuzzle(saved.level);
        setTimeout(() => {
            const tiles = document.getElementsByClassName("tile");
            for (let i = 0; i < tiles.length; i++) {
                if (!tiles[i].classList.contains("tile-start")) {
                    tiles[i].innerText = saved.tiles[i];
                }
            }
        }, 100);
    } else {
        generateAndSetPuzzle(level);
        document.getElementById("hints").innerText = hintsRemaining; // Ensure correct hint display when starting a new game
    }
}

function checkCompletion(solution) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            let tile = document.getElementById(`${r}-${c}`);
            if (tile.innerText != solution[r][c]) return false;
        }
    }
    return true;
}

async function generateSudoku(difficulty) {
    const emptyBoard = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    const solvedBoard = solveSudoku(emptyBoard);
    if (!solvedBoard) {
        console.error("Unable to generate a valid Sudoku board.");
        return { board: emptyBoard, solution: emptyBoard };
    }

    const boardToRemove = solvedBoard.map(row => [...row]);
    const cellsToRemove = getNumberOfCellsToRemove(difficulty);
    const removedIndices = new Set();

    while (removedIndices.size < cellsToRemove) {
        const rowIndex = Math.floor(Math.random() * GRID_SIZE);
        const colIndex = Math.floor(Math.random() * GRID_SIZE);
        const index = rowIndex * GRID_SIZE + colIndex;
        if (!removedIndices.has(index)) {
            boardToRemove[rowIndex][colIndex] = 0;
            removedIndices.add(index);
        }
    }

    return { board: boardToRemove, solution: solvedBoard };
}

function solveSudoku(board) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (board[r][c] === 0) {
                for (let num = 1; num <= 9; num++) {
                    if (isValidPlacement(board, num, r, c)) {
                        board[r][c] = num;
                        if (solveSudoku(board)) {
                            return board; // Found solution
                        } else {
                            board[r][c] = 0; // Backtrack
                        }
                    }
                }
                return false; // No valid number found
            }
        }
    }
    return board; // Fully solved
}

function isValidPlacement(board, num, row, col) {
    for (let i = 0; i < GRID_SIZE; i++) {
        if (board[row][i] === num) return false;
    }
    for (let i = 0; i < GRID_SIZE; i++) {
        if (board[i][col] === num) return false;
    }
    const startRow = Math.floor(row / SUBGRID_SIZE) * SUBGRID_SIZE;
    const startCol = Math.floor(col / SUBGRID_SIZE) * SUBGRID_SIZE;
    for (let i = 0; i < SUBGRID_SIZE; i++) {
        for (let j = 0; j < SUBGRID_SIZE; j++) {
            if (board[startRow + i][startCol + j] === num) return false;
        }
    }
    return true;
}

function getNumberOfCellsToRemove(difficulty) {
    switch (difficulty) {
        case "easy":
            return 40; // Approximately 40 empty cells for easy
        case "medium":
            return 50; // Approximately 50 empty cells for medium
        case "hard":
            return 60; // Approximately 60 empty cells for hard
        default:
            return 45;
    }
}

function giveHint() {
    if (hintsRemaining <= 0) {
        alert("You have no more hints left!");
        return;
    }
    isHintMode = true;
    alert("Please select an empty tile to receive a hint.");
}

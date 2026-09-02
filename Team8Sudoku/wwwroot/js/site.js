const board = document.getElementById("board");

let selectedCell = null;
let history = [];
let mistakes = 0;
let seconds = 0;
let timerInterval;
let currentPuzzleIndex = 0;

const games = [
    {
        puzzle: [
            5, 3, 0, 0, 7, 0, 0, 0, 0,
            6, 0, 0, 1, 9, 5, 0, 0, 0,
            0, 9, 8, 0, 0, 0, 0, 6, 0,
            8, 0, 0, 0, 6, 0, 0, 0, 3,
            4, 0, 0, 8, 0, 3, 0, 0, 1,
            7, 0, 0, 0, 2, 0, 0, 0, 6,
            0, 6, 0, 0, 0, 0, 2, 8, 0,
            0, 0, 0, 4, 1, 9, 0, 0, 5,
            0, 0, 0, 0, 8, 0, 0, 7, 9
        ],
        solution: [
            5, 3, 4, 6, 7, 8, 9, 1, 2,
            6, 7, 2, 1, 9, 5, 3, 4, 8,
            1, 9, 8, 3, 4, 2, 5, 6, 7,
            8, 5, 9, 7, 6, 1, 4, 2, 3,
            4, 2, 6, 8, 5, 3, 7, 9, 1,
            7, 1, 3, 9, 2, 4, 8, 5, 6,
            9, 6, 1, 5, 3, 7, 2, 8, 4,
            2, 8, 7, 4, 1, 9, 6, 3, 5,
            3, 4, 5, 2, 8, 6, 1, 7, 9
        ]
    },

    {
        puzzle: [
            0, 0, 0, 2, 6, 0, 7, 0, 1,
            6, 8, 0, 0, 7, 0, 0, 9, 0,
            1, 9, 0, 0, 0, 4, 5, 0, 0,
            8, 2, 0, 1, 0, 0, 0, 4, 0,
            0, 0, 4, 6, 0, 2, 9, 0, 0,
            0, 5, 0, 0, 0, 3, 0, 2, 8,
            0, 0, 9, 3, 0, 0, 0, 7, 4,
            0, 4, 0, 0, 5, 0, 0, 3, 6,
            7, 0, 3, 0, 1, 8, 0, 0, 0
        ],
        solution: [
            4, 3, 5, 2, 6, 9, 7, 8, 1,
            6, 8, 2, 5, 7, 1, 4, 9, 3,
            1, 9, 7, 8, 3, 4, 5, 6, 2,
            8, 2, 6, 1, 9, 5, 3, 4, 7,
            3, 7, 4, 6, 8, 2, 9, 1, 5,
            9, 5, 1, 7, 4, 3, 6, 2, 8,
            5, 1, 9, 3, 2, 6, 8, 7, 4,
            2, 4, 8, 9, 5, 7, 1, 3, 6,
            7, 6, 3, 4, 1, 8, 2, 5, 9
        ]
    },

    {
        puzzle: [
            0, 2, 0, 6, 0, 8, 0, 0, 0,
            5, 8, 0, 0, 0, 9, 7, 0, 0,
            0, 0, 0, 0, 4, 0, 0, 0, 0,
            3, 7, 0, 0, 0, 0, 5, 0, 0,
            6, 0, 0, 0, 0, 0, 0, 0, 4,
            0, 0, 8, 0, 0, 0, 0, 1, 3,
            0, 0, 0, 0, 2, 0, 0, 0, 0,
            0, 0, 9, 8, 0, 0, 0, 3, 6,
            0, 0, 0, 3, 0, 6, 0, 9, 0
        ],
        solution: [
            1, 2, 3, 6, 7, 8, 9, 4, 5,
            5, 8, 4, 2, 3, 9, 7, 6, 1,
            9, 6, 7, 1, 4, 5, 3, 2, 8,
            3, 7, 2, 4, 6, 1, 5, 8, 9,
            6, 9, 1, 5, 8, 3, 2, 7, 4,
            4, 5, 8, 7, 9, 2, 6, 1, 3,
            8, 3, 6, 9, 2, 4, 1, 5, 7,
            2, 1, 9, 8, 5, 7, 4, 3, 6,
            7, 4, 5, 3, 1, 6, 8, 9, 2
        ]
    }
];

function getCurrentGame() {
    return games[currentPuzzleIndex];
}

function createBoard() {
    board.innerHTML = "";

    const currentGame = getCurrentGame();

    for (let i = 0; i < 81; i++) {
        const cell = document.createElement("div");

        cell.classList.add("cell");
        cell.dataset.index = i;

        if (currentGame.puzzle[i] !== 0) {
            cell.textContent = currentGame.puzzle[i];
            cell.classList.add("fixed");
        }

        cell.addEventListener("click", function () {
            if (cell.classList.contains("fixed")) {
                return;
            }

            if (selectedCell) {
                selectedCell.classList.remove("selected");
            }

            selectedCell = cell;
            cell.classList.add("selected");
        });

        board.appendChild(cell);
    }
}

const numberButtons = document.querySelectorAll(".number-btn");

numberButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        if (!selectedCell) {
            return;
        }

        const currentGame = getCurrentGame();
        const index = Number(selectedCell.dataset.index);
        const value = Number(button.textContent);

        history.push({
            cell: selectedCell,
            oldValue: selectedCell.textContent,
            wasWrong: selectedCell.classList.contains("wrong")
        });

        selectedCell.textContent = value;

        if (value !== currentGame.solution[index]) {
            selectedCell.classList.add("wrong");
            mistakes++;
            document.getElementById("mistakes").textContent = mistakes;
        } else {
            selectedCell.classList.remove("wrong");
        }

        checkCompletion();
    });
});

document.getElementById("eraseBtn").addEventListener("click", function () {
    if (!selectedCell) {
        return;
    }

    history.push({
        cell: selectedCell,
        oldValue: selectedCell.textContent,
        wasWrong: selectedCell.classList.contains("wrong")
    });

    selectedCell.textContent = "";
    selectedCell.classList.remove("wrong");
});

document.getElementById("undoBtn").addEventListener("click", function () {
    if (history.length === 0) {
        return;
    }

    const lastMove = history.pop();

    if (selectedCell) {
        selectedCell.classList.remove("selected");
    }

    selectedCell = lastMove.cell;
    selectedCell.textContent = lastMove.oldValue;

    if (lastMove.wasWrong) {
        selectedCell.classList.add("wrong");
    } else {
        selectedCell.classList.remove("wrong");
    }

    selectedCell.classList.add("selected");
});

document.getElementById("restartBtn").addEventListener("click", function () {
    resetCurrentGame();
});

document.getElementById("newGameBtn").addEventListener("click", function () {
    currentPuzzleIndex++;

    if (currentPuzzleIndex >= games.length) {
        currentPuzzleIndex = 0;
    }

    resetCurrentGame();
});

document.getElementById("menuBtn").addEventListener("click", function () {
    alert("Team 8 Sudoku");
});

function startTimer() {
    clearInterval(timerInterval);

    seconds = 0;
    document.getElementById("timer").textContent = "00:00";

    timerInterval = setInterval(function () {
        seconds++;

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        const formattedMinutes = String(minutes).padStart(2, "0");
        const formattedSeconds = String(remainingSeconds).padStart(2, "0");

        document.getElementById("timer").textContent =
            formattedMinutes + ":" + formattedSeconds;

    }, 1000);
}

function resetCurrentGame() {
    selectedCell = null;
    history = [];
    mistakes = 0;

    document.getElementById("mistakes").textContent = "0";

    createBoard();
    startTimer();
}

function checkCompletion() {
    const currentGame = getCurrentGame();
    const cells = document.querySelectorAll(".cell");

    for (let i = 0; i < cells.length; i++) {
        if (Number(cells[i].textContent) !== currentGame.solution[i]) {
            return;
        }
    }

    clearInterval(timerInterval);

    alert(
        "Congratulations! You completed the Sudoku puzzle in " +
        document.getElementById("timer").textContent +
        "!"
    );
}

createBoard();
startTimer();
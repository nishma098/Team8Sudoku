const baseSolution = [
    [5, 3, 4, 6, 7, 8, 9, 1, 2],
    [6, 7, 2, 1, 9, 5, 3, 4, 8],
    [1, 9, 8, 3, 4, 2, 5, 6, 7],
    [8, 5, 9, 7, 6, 1, 4, 2, 3],
    [4, 2, 6, 8, 5, 3, 7, 9, 1],
    [7, 1, 3, 9, 2, 4, 8, 5, 6],
    [9, 6, 1, 5, 3, 7, 2, 8, 4],
    [2, 8, 7, 4, 1, 9, 6, 3, 5],
    [3, 4, 5, 2, 8, 6, 1, 7, 9]
];


const puzzles = {

    easy: [
        [5, 3, 0, 6, 7, 0, 9, 0, 2],
        [6, 0, 2, 1, 9, 5, 0, 4, 8],
        [0, 9, 8, 3, 0, 2, 5, 6, 0],

        [8, 5, 0, 7, 6, 1, 0, 2, 3],
        [4, 0, 6, 8, 0, 3, 7, 0, 1],
        [7, 1, 0, 9, 2, 4, 0, 5, 6],

        [0, 6, 1, 5, 0, 7, 2, 8, 0],
        [2, 8, 0, 4, 1, 9, 6, 0, 5],
        [3, 0, 5, 0, 8, 6, 1, 7, 9]
    ],


    medium: [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],

        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],

        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ],


    hard: [
        [5, 0, 0, 0, 7, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 5, 0, 0, 0],
        [0, 9, 0, 0, 0, 0, 0, 6, 0],

        [8, 0, 0, 0, 0, 0, 0, 0, 3],
        [0, 0, 0, 8, 0, 3, 0, 0, 0],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],

        [0, 6, 0, 0, 0, 0, 2, 0, 0],
        [0, 0, 0, 4, 0, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 0]
    ]
};


const board =
    document.getElementById("sudoku-board");

const difficulty =
    document.getElementById("difficulty");

const difficultyTitle =
    document.getElementById("difficultyTitle");

const statusText =
    document.getElementById("statusText");

const livesDisplay =
    document.getElementById("lives");

const timerDisplay =
    document.getElementById("timer");

const progressText =
    document.getElementById("progressText");

const progressBar =
    document.getElementById("progressBar");

const pauseButton =
    document.getElementById("pauseBtn");

const pauseOverlay =
    document.getElementById("pauseOverlay");

const resumeButton =
    document.getElementById("resumeBtn");

const undoButton =
    document.getElementById("undoBtn");

const eraseButton =
    document.getElementById("eraseBtn");

const newGameButton =
    document.getElementById("newGameBtn");

const numberButtons =
    document.querySelectorAll(
        ".number-buttons button"
    );

const gameModal =
    document.getElementById("gameModal");

const modalIcon =
    document.getElementById("modalIcon");

const modalTitle =
    document.getElementById("modalTitle");

const modalMessage =
    document.getElementById("modalMessage");

const modalNewGame =
    document.getElementById("modalNewGame");


let currentPuzzle = [];

let selectedCell = null;

let lives = 3;

let history = [];

let seconds = 0;

let timer = null;

let paused = false;

let gameOver = false;

let totalEmpty = 0;

let completed = 0;


function clonePuzzle(puzzle) {

    return puzzle.map(
        row => [...row]
    );
}


function startGame() {

    gameOver = false;
    paused = false;

    selectedCell = null;

    lives = 3;

    history = [];

    seconds = 0;

    completed = 0;

    pauseOverlay.classList.add(
        "hidden"
    );

    gameModal.classList.add(
        "hidden"
    );

    pauseButton.textContent =
        "Pause";


    const level =
        difficulty.value;


    document.body.className =
        `difficulty-${level}`;


    currentPuzzle =
        clonePuzzle(
            puzzles[level]
        );


    totalEmpty =
        currentPuzzle
            .flat()
            .filter(
                value => value === 0
            )
            .length;


    difficultyTitle.textContent =
        capitalize(level)
        +
        " Puzzle";


    if (level === "easy") {

        statusText.textContent =
            "Relax and have fun! 🌿";

    }

    else if (level === "hard") {

        statusText.textContent =
            "Challenge accepted! 🔥";

    }

    else {

        statusText.textContent =
            "You've got this! ✨";
    }


    updateLives();

    updateProgress();

    resetTimer();

    drawBoard();
}


function drawBoard() {

    board.innerHTML = "";


    currentPuzzle.forEach(
        (row, rowIndex) => {

            row.forEach(
                (value, colIndex) => {

                    const cell =
                        document.createElement(
                            "div"
                        );


                    cell.classList.add(
                        "sudoku-cell"
                    );


                    cell.dataset.row =
                        rowIndex;

                    cell.dataset.col =
                        colIndex;


                    if (value !== 0) {

                        cell.textContent =
                            value;

                        cell.classList.add(
                            "fixed-cell"
                        );

                    }

                    else {

                        cell.classList.add(
                            "editable-cell"
                        );


                        cell.addEventListener(
                            "click",
                            () => selectCell(cell)
                        );
                    }


                    board.appendChild(
                        cell
                    );
                }
            );
        }
    );
}


function selectCell(cell) {

    if (
        paused
        ||
        gameOver
    ) {
        return;
    }


    clearHighlights();


    selectedCell =
        cell;


    cell.classList.add(
        "selected-cell"
    );


    const selectedRow =
        Number(
            cell.dataset.row
        );

    const selectedCol =
        Number(
            cell.dataset.col
        );


    document
        .querySelectorAll(
            ".sudoku-cell"
        )
        .forEach(other => {

            const row =
                Number(
                    other.dataset.row
                );

            const col =
                Number(
                    other.dataset.col
                );


            const sameRow =
                row === selectedRow;


            const sameColumn =
                col === selectedCol;


            const sameBox =
                Math.floor(
                    row / 3
                )
                ===
                Math.floor(
                    selectedRow / 3
                )
                &&
                Math.floor(
                    col / 3
                )
                ===
                Math.floor(
                    selectedCol / 3
                );


            if (
                other !== cell
                &&
                (
                    sameRow
                    ||
                    sameColumn
                    ||
                    sameBox
                )
            ) {

                other.classList.add(
                    "related-cell"
                );
            }
        });
}


function clearHighlights() {

    document
        .querySelectorAll(
            ".sudoku-cell"
        )
        .forEach(cell => {

            cell.classList.remove(
                "selected-cell"
            );

            cell.classList.remove(
                "related-cell"
            );
        });
}


function enterNumber(number) {

    if (
        !selectedCell
        ||
        paused
        ||
        gameOver
    ) {
        return;
    }


    const row =
        Number(
            selectedCell.dataset.row
        );

    const col =
        Number(
            selectedCell.dataset.col
        );


    if (
        number
        ===
        baseSolution[row][col]
    ) {

        if (
            selectedCell.textContent
            === ""
        ) {

            history.push({
                cell:
                    selectedCell,

                value:
                    ""
            });


            completed++;
        }


        selectedCell.textContent =
            number;


        selectedCell.classList.add(
            "user-number"
        );


        selectedCell.classList.add(
            "correct-pop"
        );


        statusText.textContent =
            positiveMessage();


        updateProgress();


        const cell =
            selectedCell;


        setTimeout(
            () => {

                cell.classList.remove(
                    "correct-pop"
                );

            },
            350
        );


        if (
            completed
            ===
            totalEmpty
        ) {

            finishGame();
        }
    }

    else {

        lives--;


        updateLives();


        selectedCell.classList.add(
            "wrong-cell"
        );


        statusText.textContent =
            "Oops! Try another number.";


        const cell =
            selectedCell;


        setTimeout(
            () => {

                cell.classList.remove(
                    "wrong-cell"
                );

            },
            450
        );


        if (
            lives <= 0
        ) {

            loseGame();
        }
    }
}


numberButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                enterNumber(
                    Number(
                        button.dataset.number
                    )
                );
            }
        );
    }
);


function eraseCell() {

    if (
        !selectedCell
        ||
        paused
        ||
        gameOver
    ) {
        return;
    }


    if (
        selectedCell.textContent
        !== ""
    ) {

        history.push({
            cell:
                selectedCell,

            value:
                selectedCell.textContent
        });


        selectedCell.textContent =
            "";


        selectedCell.classList.remove(
            "user-number"
        );


        completed =
            Math.max(
                0,
                completed - 1
            );


        updateProgress();


        statusText.textContent =
            "Cell cleared";
    }
}


function undoMove() {

    if (
        history.length === 0
        ||
        paused
        ||
        gameOver
    ) {

        statusText.textContent =
            "Nothing to undo";

        return;
    }


    const move =
        history.pop();


    const current =
        move.cell.textContent;


    move.cell.textContent =
        move.value;


    if (
        current !== ""
        &&
        move.value === ""
    ) {

        completed =
            Math.max(
                0,
                completed - 1
            );
    }


    if (
        move.value === ""
    ) {

        move.cell.classList.remove(
            "user-number"
        );

    }

    else {

        move.cell.classList.add(
            "user-number"
        );
    }


    updateProgress();


    statusText.textContent =
        "Move undone";
}


eraseButton.addEventListener(
    "click",
    eraseCell
);


undoButton.addEventListener(
    "click",
    undoMove
);


function updateLives() {

    livesDisplay.innerHTML =
        "";


    for (
        let i = 0;
        i < 3;
        i++
    ) {

        const heart =
            document.createElement(
                "span"
            );


        if (
            i < lives
        ) {

            heart.textContent =
                "❤️";

        }

        else {

            heart.textContent =
                "💔";

            heart.classList.add(
                "lost-heart"
            );
        }


        livesDisplay.appendChild(
            heart
        );
    }
}


function updateProgress() {

    progressText.textContent =
        `${completed} / ${totalEmpty}`;


    let percentage = 0;


    if (
        totalEmpty > 0
    ) {

        percentage =
            completed
            /
            totalEmpty
            *
            100;
    }


    progressBar.style.width =
        `${percentage}%`;
}


function resetTimer() {

    clearInterval(
        timer
    );


    seconds = 0;


    updateTimer();


    timer =
        setInterval(
            () => {

                if (
                    !paused
                    &&
                    !gameOver
                ) {

                    seconds++;

                    updateTimer();
                }

            },
            1000
        );
}


function updateTimer() {

    const minutes =
        Math.floor(
            seconds / 60
        );


    const remaining =
        seconds % 60;


    timerDisplay.textContent =
        String(minutes)
            .padStart(
                2,
                "0"
            )
        +
        ":"
        +
        String(remaining)
            .padStart(
                2,
                "0"
            );
}


function pauseGame() {

    if (
        gameOver
    ) {
        return;
    }


    paused =
        true;


    pauseOverlay.classList.remove(
        "hidden"
    );


    pauseButton.textContent =
        "Resume";
}


function resumeGame() {

    paused =
        false;


    pauseOverlay.classList.add(
        "hidden"
    );


    pauseButton.textContent =
        "Pause";
}


pauseButton.addEventListener(
    "click",
    () => {

        if (paused) {

            resumeGame();

        }

        else {

            pauseGame();
        }
    }
);


resumeButton.addEventListener(
    "click",
    resumeGame
);


function finishGame() {

    gameOver =
        true;


    clearInterval(
        timer
    );


    statusText.textContent =
        "Puzzle complete! 🏆";


    showModal(
        "🏆",
        "Amazing!",
        `You completed the puzzle in ${timerDisplay.textContent}.`
    );
}


function loseGame() {

    gameOver =
        true;


    clearInterval(
        timer
    );


    showModal(
        "💔",
        "Game Over",
        "You used all three lives. Try again!"
    );
}


function showModal(
    icon,
    title,
    message
) {

    modalIcon.textContent =
        icon;


    modalTitle.textContent =
        title;


    modalMessage.textContent =
        message;


    gameModal.classList.remove(
        "hidden"
    );
}


function positiveMessage() {

    const messages = [
        "Nice! ✨",
        "Great move! 🌟",
        "Perfect! 🎯",
        "Keep going! 🚀",
        "Awesome! 💜"
    ];


    return messages[
        Math.floor(
            Math.random()
            *
            messages.length
        )
    ];
}


function capitalize(word) {

    return (
        word
            .charAt(0)
            .toUpperCase()
        +
        word.slice(1)
    );
}


newGameButton.addEventListener(
    "click",
    startGame
);


modalNewGame.addEventListener(
    "click",
    startGame
);


difficulty.addEventListener(
    "change",
    startGame
);


startGame();
/* =========================================================
   TEAM 8 SUDOKU
   ITERATION 1 + ITERATION 2
   ========================================================= */


/* =========================================================
   BASE VALID SUDOKU SOLUTION
   ========================================================= */

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


const gameShell =
    document.querySelector(
        ".game-shell"
    );


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const board =
    document.getElementById(
        "sudoku-board"
    );


const difficulty =
    document.getElementById(
        "difficulty"
    );

const difficultyDisplay =
    document.getElementById(
        "difficultyDisplay"
    );

const themeSelect =
    document.getElementById(
        "themeSelect"
    );


const difficultyTitle =
    document.getElementById(
        "difficultyTitle"
    );


const statusText =
    document.getElementById(
        "statusText"
    );


const livesDisplay =
    document.getElementById(
        "lives"
    );


const mistakesDisplay =
    document.getElementById(
        "mistakes"
    );


const timerDisplay =
    document.getElementById(
        "timer"
    );


const bestTimeDisplay =
    document.getElementById(
        "bestTime"
    );


const hintsUsedDisplay =
    document.getElementById(
        "hintsUsed"
    );


const progressText =
    document.getElementById(
        "progressText"
    );


const progressBar =
    document.getElementById(
        "progressBar"
    );


const pauseButton =
    document.getElementById(
        "pauseBtn"
    );


const pauseOverlay =
    document.getElementById(
        "pauseOverlay"
    );


const resumeButton =
    document.getElementById(
        "resumeBtn"
    );


const undoButton =
    document.getElementById(
        "undoBtn"
    );


const eraseButton =
    document.getElementById(
        "eraseBtn"
    );


const hintButton =
    document.getElementById(
        "hintBtn"
    );


const helpButton =
    document.getElementById(
        "helpBtn"
    );


const practiceMode =
    document.getElementById(
        "practiceMode"
    );


const tutorialOverlay =
    document.getElementById(
        "tutorialOverlay"
    );


const closeTutorialButton =
    document.getElementById(
        "closeTutorialBtn"
    );


const newGameButton =
    document.getElementById(
        "newGameBtn"
    );


const startGameButton =
    document.getElementById(
        "startGameBtn"
    );


const numberButtons =
    document.querySelectorAll(
        ".number-buttons button"
    );


const gameModal =
    document.getElementById(
        "gameModal"
    );


const modalIcon =
    document.getElementById(
        "modalIcon"
    );


const modalTitle =
    document.getElementById(
        "modalTitle"
    );


const modalMessage =
    document.getElementById(
        "modalMessage"
    );


const modalNewGame =
    document.getElementById(
        "modalNewGame"
    );


const summaryDifficulty =
    document.getElementById(
        "summaryDifficulty"
    );


const summaryTime =
    document.getElementById(
        "summaryTime"
    );


const summaryMistakes =
    document.getElementById(
        "summaryMistakes"
    );


const summaryHints =
    document.getElementById(
        "summaryHints"
    );


const summaryBestTime =
    document.getElementById(
        "summaryBestTime"
    );


const startupScreen =
    document.getElementById(
        "startupScreen"
    );



/* =========================================================
   GAME STATE
   ========================================================= */

let currentPuzzle = [];

let currentSolution = [];

let selectedCell = null;

let lives = 3;

let mistakes = 0;

let hintsUsed = 0;

let history = [];

let seconds = 0;

let timer = null;

let paused = false;

let gameOver = false;

let totalEmpty = 0;

let completed = 0;

let tutorialOpen = true;

let gameStarted = false;


/* =========================================================
   BASIC UTILITY FUNCTIONS
   ========================================================= */

function cloneGrid(grid) {

    return grid.map(
        row => [...row]
    );

}



function shuffle(array) {

    const copy =
        [...array];


    for (
        let i = copy.length - 1;
        i > 0;
        i--
    ) {

        const randomIndex =
            Math.floor(
                Math.random()
                *
                (i + 1)
            );


        [
            copy[i],
            copy[randomIndex]
        ]
        =
        [
            copy[randomIndex],
            copy[i]
        ];

    }


    return copy;

}



function transpose(grid) {

    return grid[0].map(

        (_, column) =>

            grid.map(
                row =>
                    row[column]
            )

    );

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



function formatTime(totalSeconds) {

    const minutes =
        Math.floor(
            totalSeconds / 60
        );


    const remainingSeconds =
        totalSeconds % 60;


    return (

        String(minutes)
            .padStart(
                2,
                "0"
            )

        +

        ":"

        +

        String(remainingSeconds)
            .padStart(
                2,
                "0"
            )

    );

}



/* =========================================================
   THEME SYSTEM
   ========================================================= */

function applyTheme(theme) {

    document.body.classList.remove(

        "theme-purple",

        "theme-blue",

        "theme-green",

        "theme-pink",

        "theme-dark"

    );


    document.body.classList.add(
        `theme-${theme}`
    );


    localStorage.setItem(
        "team8SudokuTheme",
        theme
    );

}



function loadTheme() {

    const savedTheme =
        localStorage.getItem(
            "team8SudokuTheme"
        )
        ||
        "purple";


    themeSelect.value =
        savedTheme;


    applyTheme(
        savedTheme
    );

}



themeSelect.addEventListener(

    "change",

    () => {

        const selectedTheme =
            themeSelect.value;


        applyTheme(
            selectedTheme
        );


        statusText.textContent =
            `${capitalize(selectedTheme)} theme selected 🎨`;

    }

);



/* =========================================================
   CREATE RANDOM VALID SOLUTION
   ========================================================= */

function randomizeSolution(source) {

    let grid =
        cloneGrid(
            source
        );


    /* Random number replacement */

    const digits =
        shuffle(
            [
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
                9
            ]
        );


    const map = {};


    for (
        let number = 1;
        number <= 9;
        number++
    ) {

        map[number] =
            digits[number - 1];

    }


    grid =
        grid.map(

            row =>

                row.map(

                    value =>
                        map[value]

                )

        );



    /* Shuffle rows inside each band */

    for (
        let band = 0;
        band < 3;
        band++
    ) {

        const start =
            band * 3;


        const group =
            shuffle(

                grid.slice(
                    start,
                    start + 3
                )

            );


        grid.splice(

            start,

            3,

            ...group

        );

    }



    /* Shuffle entire row bands */

    const bands =
        shuffle(
            [

                grid.slice(
                    0,
                    3
                ),

                grid.slice(
                    3,
                    6
                ),

                grid.slice(
                    6,
                    9
                )

            ]
        );


    grid =
        bands.flat();



    /* Transpose to safely shuffle columns */

    grid =
        transpose(
            grid
        );



    /* Shuffle columns in each stack */

    for (
        let stack = 0;
        stack < 3;
        stack++
    ) {

        const start =
            stack * 3;


        const group =
            shuffle(

                grid.slice(
                    start,
                    start + 3
                )

            );


        grid.splice(

            start,

            3,

            ...group

        );

    }



    /* Shuffle column stacks */

    const stacks =
        shuffle(
            [

                grid.slice(
                    0,
                    3
                ),

                grid.slice(
                    3,
                    6
                ),

                grid.slice(
                    6,
                    9
                )

            ]
        );


    grid =
        stacks.flat();



    return transpose(
        grid
    );

}



/* =========================================================
   CREATE PUZZLE BASED ON DIFFICULTY
   ========================================================= */

function makePuzzle(
    solution,
    level
) {

    const puzzle =
        cloneGrid(
            solution
        );


    const blanksByDifficulty = {

        easy: 36,

        medium: 46,

        hard: 54

    };


    const positions = [];


    for (
        let row = 0;
        row < 9;
        row++
    ) {

        for (
            let column = 0;
            column < 9;
            column++
        ) {

            positions.push(
                [
                    row,
                    column
                ]
            );

        }

    }


    const shuffledPositions =
        shuffle(
            positions
        );


    const blankCount =
        blanksByDifficulty[level]
        ??
        46;


    for (
        let index = 0;
        index < blankCount;
        index++
    ) {

        const [
            row,
            column
        ] =
            shuffledPositions[index];


        puzzle[row][column] =
            0;

    }


    return puzzle;

}



/* =========================================================
   START / RESET GAME
   ========================================================= */

function startGame() {

    gameOver =
        false;


    paused =
        false;


    selectedCell =
        null;


    lives =
        3;


    mistakes =
        0;


    hintsUsed =
        0;


    history =
        [];


    seconds =
        0;


    completed =
        0;



    pauseOverlay
        .classList
        .add(
            "hidden"
        );


    gameModal
        .classList
        .add(
            "hidden"
        );


    pauseButton.textContent =
        "Pause";


    const level =
        difficulty.value;


        difficultyDisplay.textContent = difficulty.options[difficulty.selectedIndex].text;

    /* Create new randomized solution */

    currentSolution =
        randomizeSolution(
            baseSolution
        );



    /* Create puzzle */

    currentPuzzle =
        makePuzzle(

            currentSolution,

            level

        );



    totalEmpty =
        currentPuzzle

            .flat()

            .filter(

                value =>
                    value === 0

            )

            .length;



    difficultyTitle.textContent =
        `${capitalize(level)} Puzzle`;



    if (
        level === "easy"
    ) {

        statusText.textContent =
            "Relax and have fun! 🌿";

    }


    else if (
        level === "hard"
    ) {

        statusText.textContent =
            "Challenge accepted! 🔥";

    }


    else {

        statusText.textContent =
            "You've got this! ✨";

    }



    updateLives();

    updateMistakes();

    updateHints();

    updateProgress();

    loadBestTime();

    resetTimer();

    drawBoard();

    showBoard(); // Shows all of the board and surrounding elements. Un-hides the whole element

}



/* =========================================================
   DRAW BOARD
   ========================================================= */

function drawBoard() {

    board.innerHTML =
        "";


    currentPuzzle.forEach(

        (
            row,
            rowIndex
        ) => {

            row.forEach(

                (
                    value,
                    columnIndex
                ) => {

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
                        columnIndex;


                    cell.dataset.answer =
                        "false";


                    /* Starting clue */

                    if (
                        value !== 0
                    ) {

                        cell.textContent =
                            value;


                        cell.classList.add(
                            "fixed-cell"
                        );

                    }


                    /* Empty editable cell */

                    else {

                        cell.classList.add(
                            "editable-cell"
                        );


                        cell.addEventListener(

                            "click",

                            () => {

                                selectCell(
                                    cell
                                );

                            }

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



/* =========================================================
   SELECT CELL
   ========================================================= */

function selectCell(cell) {

    if (

        paused

        ||

        gameOver

        ||

        tutorialOpen

    ) {

        return;

    }


    clearHighlights();


    selectedCell =
        cell;


    selectedCell.classList.add(
        "selected-cell"
    );


    const selectedRow =
        Number(
            cell.dataset.row
        );


    const selectedColumn =
        Number(
            cell.dataset.col
        );



    /* Highlight same row, column, and box */

    document
        .querySelectorAll(
            ".sudoku-cell"
        )
        .forEach(

            otherCell => {

                const row =
                    Number(
                        otherCell.dataset.row
                    );


                const column =
                    Number(
                        otherCell.dataset.col
                    );


                const sameRow =
                    row ===
                    selectedRow;


                const sameColumn =
                    column ===
                    selectedColumn;


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
                        column / 3
                    )

                    ===

                    Math.floor(
                        selectedColumn / 3
                    );


                if (

                    otherCell !== cell

                    &&

                    (
                        sameRow

                        ||

                        sameColumn

                        ||

                        sameBox
                    )

                ) {

                    otherCell.classList.add(
                        "related-cell"
                    );

                }

            }

        );

}



/* =========================================================
   CLEAR HIGHLIGHTS
   ========================================================= */

function clearHighlights() {

    document
        .querySelectorAll(
            ".sudoku-cell"
        )
        .forEach(

            cell => {

                cell.classList.remove(
                    "selected-cell"
                );


                cell.classList.remove(
                    "related-cell"
                );

            }

        );

}



/* =========================================================
   ENTER NUMBER
   ========================================================= */

function enterNumber(number) {

    if (

        !selectedCell

        ||

        paused

        ||

        gameOver

        ||

        tutorialOpen

    ) {

        return;

    }



    /* Do not overwrite completed cell */

    if (
        selectedCell.dataset.answer
        === "true"
    ) {

        return;

    }



    const row =
        Number(
            selectedCell.dataset.row
        );


    const column =
        Number(
            selectedCell.dataset.col
        );



    /* Correct answer */

    if (

        number

        ===

        currentSolution[row][column]

    ) {

        history.push({

            type:
                "answer",

            cell:
                selectedCell

        });


        selectedCell.textContent =
            number;


        selectedCell.dataset.answer =
            "true";


        selectedCell.classList.add(
            "user-number"
        );


        selectedCell.classList.add(
            "correct-pop"
        );


        completed++;


        updateProgress();


        statusText.textContent =
            positiveMessage();


        const currentCell =
            selectedCell;


        setTimeout(

            () => {

                currentCell.classList.remove(
                    "correct-pop"
                );

            },

            350

        );


        if (
            completed ===
            totalEmpty
        ) {

            finishGame();

        }

    }


    /* Wrong answer */

    else {

        mistakes++;


        updateMistakes();


        selectedCell.classList.add(
            "wrong-cell"
        );


        if (
            practiceMode.checked
        ) {

            statusText.textContent =
                "Wrong number — Practice Mode keeps your lives!";

        }


        else {

            lives--;


            updateLives();


            statusText.textContent =
                "Oops! Wrong number.";


            if (
                lives <= 0
            ) {

                loseGame();

            }

        }


        const currentCell =
            selectedCell;


        setTimeout(

            () => {

                currentCell.classList.remove(
                    "wrong-cell"
                );

            },

            450

        );

    }

}



/* =========================================================
   NUMBER BUTTONS
   ========================================================= */

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



/* =========================================================
   MISTAKE COUNTER
   ========================================================= */

function updateMistakes() {

    mistakesDisplay.textContent =
        `${mistakes} / 3`;


    if (
        mistakes >= 3
    ) {

        mistakesDisplay.classList.add(
            "mistake-warning"
        );

    }


    else {

        mistakesDisplay.classList.remove(
            "mistake-warning"
        );

    }

}



/* =========================================================
   HINT SYSTEM
   ========================================================= */

function updateHints() {

    hintsUsedDisplay.textContent =
        hintsUsed;

}



function giveHint() {

    if (

        !selectedCell

        ||

        paused

        ||

        gameOver

        ||

        tutorialOpen

    ) {

        statusText.textContent =
            "Select an empty cell first";

        return;

    }



    if (
        selectedCell.dataset.answer
        === "true"
    ) {

        statusText.textContent =
            "Choose another empty cell";

        return;

    }



    const row =
        Number(
            selectedCell.dataset.row
        );


    const column =
        Number(
            selectedCell.dataset.col
        );


    const answer =
        currentSolution[row][column];



    history.push({

        type:
            "hint",

        cell:
            selectedCell

    });



    selectedCell.textContent =
        answer;


    selectedCell.dataset.answer =
        "true";


    selectedCell.classList.add(
        "user-number"
    );


    selectedCell.classList.add(
        "correct-pop"
    );


    completed++;


    hintsUsed++;


    updateHints();

    updateProgress();


    statusText.textContent =
        "Hint used 💡";


    const currentCell =
        selectedCell;


    setTimeout(

        () => {

            currentCell.classList.remove(
                "correct-pop"
            );

        },

        350

    );


    if (
        completed ===
        totalEmpty
    ) {

        finishGame();

    }

}



/* =========================================================
   ERASE
   ========================================================= */

function eraseCell() {

    if (

        !selectedCell

        ||

        paused

        ||

        gameOver

        ||

        tutorialOpen

    ) {

        return;

    }



    if (
        selectedCell.dataset.answer
        !== "true"
    ) {

        statusText.textContent =
            "Nothing to erase";

        return;

    }



    history.push({

        type:
            "erase",

        cell:
            selectedCell,

        previousValue:
            selectedCell.textContent

    });



    selectedCell.textContent =
        "";


    selectedCell.dataset.answer =
        "false";


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



/* =========================================================
   UNDO
   ========================================================= */

function undoMove() {

    if (

        history.length === 0

        ||

        paused

        ||

        gameOver

        ||

        tutorialOpen

    ) {

        statusText.textContent =
            "Nothing to undo";

        return;

    }


    const move =
        history.pop();



    /* Undo correct answer */

    if (
        move.type ===
        "answer"
    ) {

        move.cell.textContent =
            "";


        move.cell.dataset.answer =
            "false";


        move.cell.classList.remove(
            "user-number"
        );


        completed =
            Math.max(
                0,
                completed - 1
            );

    }



    /* Undo hint */

    else if (
        move.type ===
        "hint"
    ) {

        move.cell.textContent =
            "";


        move.cell.dataset.answer =
            "false";


        move.cell.classList.remove(
            "user-number"
        );


        completed =
            Math.max(
                0,
                completed - 1
            );


        hintsUsed =
            Math.max(
                0,
                hintsUsed - 1
            );


        updateHints();

    }



    /* Undo erase */

    else if (
        move.type ===
        "erase"
    ) {

        move.cell.textContent =
            move.previousValue;


        move.cell.dataset.answer =
            "true";


        move.cell.classList.add(
            "user-number"
        );


        completed++;

    }


    updateProgress();


    statusText.textContent =
        "Move undone";

}



/* =========================================================
   ACTION BUTTON EVENTS
   ========================================================= */

eraseButton.addEventListener(

    "click",

    eraseCell

);


undoButton.addEventListener(

    "click",

    undoMove

);


hintButton.addEventListener(

    "click",

    giveHint

);



/* =========================================================
   LIVES
   ========================================================= */

function updateLives() {

    livesDisplay.innerHTML =
        "";


    if (
        practiceMode.checked
    ) {

        livesDisplay.textContent =
            "∞";


        livesDisplay.title =
            "Practice Mode: Infinite Lives";


        return;

    }



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



/* =========================================================
   PRACTICE MODE
   ========================================================= */

practiceMode.addEventListener(

    "change",

    () => {

        /*
            If player changes back to normal mode,
            restart their normal 3 lives.
        */

        if (
            !practiceMode.checked
        ) {

            lives =
                3;

        }


        updateLives();


        if (
            practiceMode.checked
        ) {

            statusText.textContent =
                "Practice Mode ON — infinite lives! ♾️";

        }


        else {

            statusText.textContent =
                "Practice Mode OFF — 3 lives.";

        }

    }

);



/* =========================================================
   PROGRESS BAR
   ========================================================= */

function updateProgress() {

    progressText.textContent =
        `${completed} / ${totalEmpty}`;


    let percentage =
        0;


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



/* =========================================================
   TIMER
   ========================================================= */

function resetTimer() {

    clearInterval(
        timer
    );


    seconds =
        0;


    updateTimer();


    timer =
        setInterval(

            () => {

                if (

                    !paused

                    &&

                    !gameOver

                    &&

                    !tutorialOpen

                ) {

                    seconds++;


                    updateTimer();

                }

            },

            1000

        );

}



function updateTimer() {

    timerDisplay.textContent =
        formatTime(
            seconds
        );

}



/* =========================================================
   BEST TIME
   ========================================================= */

function getBestTimeKey() {

    return (
        "team8SudokuBestTime_"
        +
        difficulty.value
    );

}



function loadBestTime() {

    const storedBestTime =
        localStorage.getItem(
            getBestTimeKey()
        );


    if (
        storedBestTime === null
    ) {

        bestTimeDisplay.textContent =
            "--:--";

    }


    else {

        bestTimeDisplay.textContent =
            formatTime(
                Number(
                    storedBestTime
                )
            );

    }

}



function saveBestTime() {

    const key =
        getBestTimeKey();


    const oldBestTime =
        localStorage.getItem(
            key
        );


    if (

        oldBestTime === null

        ||

        seconds <
        Number(
            oldBestTime
        )

    ) {

        localStorage.setItem(
            key,
            seconds
        );


        bestTimeDisplay.textContent =
            formatTime(
                seconds
            );


        return true;

    }


    return false;

}



/* =========================================================
   PAUSE / RESUME
   ========================================================= */

function pauseGame() {

    if (

        gameOver

        ||

        tutorialOpen

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

        if (
            paused
        ) {

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



/* =========================================================
   TUTORIAL
   ========================================================= */

function openTutorial() {

    tutorialOpen =
        true;


    tutorialOverlay.classList.remove(
        "hidden"
    );

}



function closeTutorial() {

    tutorialOpen =
        false;


    tutorialOverlay.classList.add(
        "hidden"
    );

}


/* =========================================================
   Board Toggle
   ========================================================= */

function hideBoard() {
    gameShell.classList.add("hidden");
}

function showBoard() {
    gameShell.classList.remove("hidden");
}


helpButton.addEventListener(

    "click",

    openTutorial

);



closeTutorialButton.addEventListener(

    "click",

    closeTutorial

);



/* =========================================================
   GAME COMPLETE
   ========================================================= */

function finishGame() {

    gameOver =
        true;


    clearInterval(
        timer
    );


    const newBestTime =
        saveBestTime();



    summaryDifficulty.textContent =
        capitalize(
            difficulty.value
        );


    summaryTime.textContent =
        formatTime(
            seconds
        );


    summaryMistakes.textContent =
        mistakes;


    summaryHints.textContent =
        hintsUsed;


    summaryBestTime.textContent =
        bestTimeDisplay.textContent;



    modalIcon.textContent =
        "🏆";


    modalTitle.textContent =
        "Puzzle Complete!";



    if (
        newBestTime
    ) {

        modalMessage.textContent =
            "Amazing! You set a new best time! 🎉";

    }


    else {

        modalMessage.textContent =
            "Great job! Here is your game summary.";

    }



    gameModal.classList.remove(
        "hidden"
    );

}



/* =========================================================
   GAME OVER
   ========================================================= */

function loseGame() {

    gameOver =
        true;


    clearInterval(
        timer
    );


    summaryDifficulty.textContent =
        capitalize(
            difficulty.value
        );


    summaryTime.textContent =
        formatTime(
            seconds
        );


    summaryMistakes.textContent =
        mistakes;


    summaryHints.textContent =
        hintsUsed;


    summaryBestTime.textContent =
        bestTimeDisplay.textContent;


    modalIcon.textContent =
        "💔";


    modalTitle.textContent =
        "Game Over";


    modalMessage.textContent =
        "You used all three lives. Try again!";


    gameModal.classList.remove(
        "hidden"
    );

}



/* =========================================================
   POSITIVE MESSAGES
   ========================================================= */

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



/* =========================================================
   NEW GAME / DIFFICULTY EVENTS
   ========================================================= */

newGameButton.addEventListener(

    "click",

    openStartupScreen
);

startGameButton.addEventListener("click", () => {
    closeStartupScreen();
    startGame();
});
    



modalNewGame.addEventListener(

    "click",

    startGame

);
/* =========================================================
   STARTUP SCREEN
   ========================================================= */

function openStartupScreen() 
{
    startupScreen.classList.remove("hidden");
}

function closeStartupScreen() 
{
    startupScreen.classList.add("hidden");
}

async function start()
{
    openTutorial();

    // Wait until the tutorial is closed
    while (tutorialOpen) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    openStartupScreen();
}


/* =========================================================
   INITIALIZE
   ========================================================= */

loadTheme();
start();
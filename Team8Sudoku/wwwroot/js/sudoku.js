
"use strict";

// ========================================
// TEAM 8 SUDOKU - GAME ENGINE
// ========================================

(() => {
    const $ = id => document.getElementById(id);

    const TOTAL_LEVELS = 50;
    const STORAGE_KEY = "team8-sudoku-progress-v1";
    const SYMBOLS = "123456789ABCDEFG";

    const state = {
        size: 9,
        difficulty: "medium",
        mode: "levels",
        level: 1,
        levelPage: 0,
        theme: "sakura",
        solution: [],
        puzzle: [],
        board: [],
        selected: -1,
        points: 0,
        lives: 3,
        mistakes: 0,
        hints: 3,
        seconds: 0,
        history: [],
        completed: {},
        totalPoints: 0,
        paused: false,
        started: false,
        finished: false,
        timerHandle: null
    };

    function progressKey() {
        return `${state.size}-${state.difficulty}`;
    }

    function loadProgress() {
        try {
            const saved = JSON.parse(
                localStorage.getItem(STORAGE_KEY) || "{}"
            );

            state.completed = saved.completed || {};
            state.totalPoints = saved.totalPoints || 0;
            state.theme = saved.theme || "sakura";
        } catch {
            state.completed = {};
            state.totalPoints = 0;
        }
    }

    function saveProgress() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                completed: state.completed,
                totalPoints: state.totalPoints,
                theme: state.theme
            }));
        } catch {
            // Game still works if browser storage is unavailable.
        }
    }

    function completedLevels() {
        return state.completed[progressKey()] || [];
    }

    function isUnlocked(level) {
        if (level === 1) return true;
        return completedLevels().includes(level - 1);
    }

    function shuffle(values) {
        const result = [...values];

        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }

        return result;
    }

    function makeSolution(size) {
        const box = Math.sqrt(size);

        const groups = shuffle(
            Array.from({ length: box }, (_, i) => i)
        );

        const rows = groups.flatMap(group =>
            shuffle(
                Array.from(
                    { length: box },
                    (_, i) => group * box + i
                )
            )
        );

        const columnGroups = shuffle(
            Array.from({ length: box }, (_, i) => i)
        );

        const columns = columnGroups.flatMap(group =>
            shuffle(
                Array.from(
                    { length: box },
                    (_, i) => group * box + i
                )
            )
        );

        const numbers = shuffle(
            Array.from({ length: size }, (_, i) => i + 1)
        );

        const solution = [];

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const pattern =
                    (box * (rows[r] % box) +
                        Math.floor(rows[r] / box) +
                        columns[c]) % size;

                solution.push(numbers[pattern]);
            }
        }

        return solution;
    }

    function makePuzzle(solution) {
        const size = state.size;
        const total = size * size;

        const ratios = {
            easy: 0.42,
            medium: 0.55,
            hard: 0.65
        };

        const ratio = ratios[state.difficulty];
        const removeCount = Math.floor(total * ratio);

        const puzzle = [...solution];

        const positions = shuffle(
            Array.from({ length: total }, (_, i) => i)
        );

        for (let i = 0; i < removeCount; i++) {
            puzzle[positions[i]] = 0;
        }

        return puzzle;
    }

    function displayValue(number) {
        return number === 0 ? "" : SYMBOLS[number - 1];
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remaining = seconds % 60;

        return String(minutes).padStart(2, "0") +
            ":" +
            String(remaining).padStart(2, "0");
    }

    function message(text) {
        $("gameStatus").textContent = text;
    }

    function updateStats() {
        $("points").textContent = state.points;
        $("lives").textContent =
            state.mode === "practice" ? "∞" : state.lives;

        $("timer").textContent = formatTime(state.seconds);
        $("hintsLeft").textContent = state.hints;
        $("totalPoints").textContent =
            `${state.totalPoints} ✦`;

        $("mistakesText").textContent =
            `Mistakes: ${state.mistakes}`;
    }

    function setTheme(theme) {
        state.theme = theme;

        const app = document.querySelector(".sakura-app");

        app.classList.remove(
            "theme-sakura",
            "theme-lavender",
            "theme-night"
        );

        app.classList.add(`theme-${theme}`);

        $("themeSelect").value = theme;

        saveProgress();
    }

    function updateChoices() {
        document.querySelectorAll("[data-size]").forEach(button => {
            button.classList.toggle(
                "active",
                Number(button.dataset.size) === state.size
            );
        });

        document.querySelectorAll("[data-difficulty]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.difficulty === state.difficulty
            );
        });

        document.querySelectorAll("[data-mode]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.mode === state.mode
            );
        });
    }

    function renderBoard() {
        const container = $("sudoku-board");
        const size = state.size;
        const box = Math.sqrt(size);

        container.innerHTML = "";
        container.style.gridTemplateColumns =
            `repeat(${size}, minmax(0, 1fr))`;
        container.style.gridTemplateRows =
            `repeat(${size}, minmax(0, 1fr))`;

        for (let i = 0; i < size * size; i++) {
            const row = Math.floor(i / size);
            const col = i % size;

            const cell = document.createElement("button");

            cell.type = "button";
            cell.className = "sudoku-cell";
            cell.textContent = displayValue(state.board[i]);

            cell.setAttribute("role", "gridcell");
            cell.setAttribute(
                "aria-label",
                `Row ${row + 1}, column ${col + 1}, ` +
                (state.board[i]
                    ? displayValue(state.board[i])
                    : "empty")
            );

            if (state.puzzle[i] !== 0) {
                cell.classList.add("given");
            }

            if (state.selected === i) {
                cell.classList.add("selected");
            }

            if (col % box === box - 1 && col !== size - 1) {
                cell.style.borderRight =
                    "3px solid #653293";
            }

            if (row % box === box - 1 && row !== size - 1) {
                cell.style.borderBottom =
                    "3px solid #653293";
            }

            cell.addEventListener("click", () => {
                if (!canPlay()) return;

                state.selected = i;
                renderBoard();
            });

            container.appendChild(cell);
        }
    }

    function renderNumberPad() {
        const pad = $("numberPad");

        pad.innerHTML = "";

        for (let number = 1; number <= state.size; number++) {
            const button = document.createElement("button");

            button.type = "button";
            button.textContent = displayValue(number);

            button.addEventListener("click", () => {
                enterNumber(number);
            });

            pad.appendChild(button);
        }
    }

    function renderLevels() {
        const list = $("levelList");
        const completed = completedLevels();

        list.innerHTML = "";

        const start = state.levelPage * 10 + 1;
        const end = Math.min(start + 9, TOTAL_LEVELS);

        $("levelRange").textContent =
            `Levels ${start}–${end}`;

        $("levelPage").textContent =
            `${state.levelPage + 1} / 5`;

        for (let level = start; level <= end; level++) {
            const button = document.createElement("button");

            button.type = "button";
            button.textContent =
                completed.includes(level)
                    ? `✓ ${level}`
                    : isUnlocked(level)
                        ? `${level}`
                        : `🔒 ${level}`;

            button.disabled =
                state.mode === "practice" ||
                !isUnlocked(level);

            if (level === state.level &&
                state.mode === "levels") {
                button.classList.add("active");
            }

            button.addEventListener("click", () => {
                state.level = level;
                newGame();
            });

            list.appendChild(button);
        }

        $("previousLevels").disabled =
            state.levelPage === 0;

        $("nextLevels").disabled =
            state.levelPage === 4;

        $("progressLabel").textContent =
            state.mode === "practice"
                ? "Practice Mode"
                : `Level ${state.level} of ${TOTAL_LEVELS}`;

        $("levelProgress").textContent =
            `${completed.length} / ${TOTAL_LEVELS} levels completed`;

        updateCellProgress();
    }

    function updateCellProgress() {
        const emptyCount =
            state.puzzle.filter(value => value === 0).length;

        let completedCount = 0;

        for (let i = 0; i < state.board.length; i++) {
            if (state.puzzle[i] === 0 &&
                state.board[i] === state.solution[i]) {
                completedCount++;
            }
        }

        $("cellProgress").textContent =
            `${completedCount} / ${emptyCount} cells completed`;

        $("progressFill").style.width =
            emptyCount === 0
                ? "100%"
                : `${(completedCount / emptyCount) * 100}%`;
    }

    function stopTimer() {
        if (state.timerHandle !== null) {
            clearInterval(state.timerHandle);
            state.timerHandle = null;
        }
    }

    function startTimer() {
        stopTimer();

        state.timerHandle = setInterval(() => {
            if (state.started &&
                !state.paused &&
                !state.finished) {
                state.seconds++;
                updateStats();
            }
        }, 1000);
    }

    function canPlay() {
        return state.started &&
            !state.paused &&
            !state.finished;
    }

    function snapshot() {
        state.history.push({
            board: [...state.board],
            points: state.points,
            lives: state.lives,
            mistakes: state.mistakes,
            hints: state.hints
        });

        if (state.history.length > 100) {
            state.history.shift();
        }
    }

    function enterNumber(number) {
        if (!canPlay()) return;

        const index = state.selected;

        if (index < 0) {
            message("Select an empty square first.");
            return;
        }

        if (state.puzzle[index] !== 0) {
            message("This number cannot be changed.");
            return;
        }

        if (state.board[index] === number) return;

        snapshot();

        if (number === state.solution[index]) {
            state.board[index] = number;
            state.points += 10;
            state.totalPoints += 10;

            message("✨ Correct! +10 points");
        } else {
            state.mistakes++;

            if (state.mode === "levels") {
                state.lives--;
            }

            message(
                state.mode === "practice"
                    ? "Not quite! Try again."
                    : "Incorrect! You lost one life."
            );

            if (state.lives <= 0 &&
                state.mode === "levels") {
                renderBoard();
                updateStats();
                finishGame(false);
                return;
            }
        }

        saveProgress();
        renderBoard();
        updateStats();
        updateCellProgress();
        checkWin();
    }

    function eraseSelected() {
        if (!canPlay()) return;

        const index = state.selected;

        if (index < 0 ||
            state.puzzle[index] !== 0 ||
            state.board[index] === 0) {
            message("Select a number you entered to erase.");
            return;
        }

        snapshot();

        state.board[index] = 0;

        renderBoard();
        updateCellProgress();

        message("Number erased.");
    }

    function undoMove() {
        if (!canPlay()) return;

        if (state.history.length === 0) {
            message("Nothing to undo.");
            return;
        }

        const previous = state.history.pop();

        // Total points earned remain saved.
        state.board = previous.board;
        state.points = previous.points;
        state.lives = previous.lives;
        state.mistakes = previous.mistakes;
        state.hints = previous.hints;

        renderBoard();
        updateStats();
        updateCellProgress();

        message("Last move undone.");
    }

    function useHint() {
        if (!canPlay()) return;

        if (state.hints <= 0) {
            message("You have no hints remaining.");
            return;
        }

        let index = state.selected;

        if (index < 0 ||
            state.puzzle[index] !== 0 ||
            state.board[index] === state.solution[index]) {
            index = state.board.findIndex(
                (value, i) =>
                    state.puzzle[i] === 0 &&
                    value !== state.solution[i]
            );
        }

        if (index === -1) return;

        snapshot();

        state.selected = index;
        state.board[index] = state.solution[index];
        state.hints--;

        renderBoard();
        updateStats();
        updateCellProgress();

        message("💡 Hint used! One square completed.");

        checkWin();
    }

    function checkWin() {
        const won = state.board.every(
            (value, i) => value === state.solution[i]
        );

        if (won) finishGame(true);
    }

    function showResult(title, text, icon) {
        $("resultTitle").textContent = title;
        $("resultMessage").textContent = text;
        $("resultIcon").textContent = icon;

        $("resultOverlay").classList.remove("hidden");
    }

    function finishGame(won) {
        state.finished = true;
        stopTimer();

        if (won) {
            const bonus =
                Math.max(50, 300 - state.seconds);

            state.points += bonus;
            state.totalPoints += bonus;

            if (state.mode === "levels") {
                const completed = completedLevels();

                if (!completed.includes(state.level)) {
                    completed.push(state.level);
                    completed.sort((a, b) => a - b);

                    state.completed[progressKey()] = completed;
                }
            }

            saveProgress();
            updateStats();
            renderLevels();

            showResult(
                "Puzzle Complete!",
                `Amazing! You earned ${state.points} points ` +
                `and finished in ${formatTime(state.seconds)}.`,
                "🏆"
            );
        } else {
            showResult(
                "Game Over",
                "You ran out of lives. Try again!",
                "💔"
            );
        }
    }

    function updateTutorial() {
        const size = state.size;
        const box = Math.sqrt(size);

        $("tutorialNumbers").textContent =
            `Fill the grid using symbols ` +
            `1 through ${displayValue(size)}.`;

        $("tutorialBoxes").textContent =
            `Every row, column, and ${box}×${box} box ` +
            `must contain each symbol exactly once.`;
    }

    function newGame() {
        stopTimer();

        state.solution = makeSolution(state.size);
        state.puzzle = makePuzzle(state.solution);
        state.board = [...state.puzzle];

        state.selected = -1;
        state.points = 0;
        state.lives = 3;
        state.mistakes = 0;
        state.hints = 3;
        state.seconds = 0;
        state.history = [];
        state.paused = false;
        state.finished = false;
        state.started = false;

        $("pauseOverlay").classList.add("hidden");
        $("resultOverlay").classList.add("hidden");
        $("tutorialOverlay").classList.remove("hidden");

        updateChoices();
        updateTutorial();
        renderBoard();
        renderNumberPad();
        renderLevels();
        updateStats();

        message("Select an empty square to begin.");
    }

    function startGame() {
        $("tutorialOverlay").classList.add("hidden");

        state.started = true;
        state.paused = false;

        startTimer();
        message("Good luck! 🌸");
    }

    function togglePause() {
        if (!state.started || state.finished) return;

        state.paused = true;
        $("pauseOverlay").classList.remove("hidden");
    }

    function resumeGame() {
        state.paused = false;
        $("pauseOverlay").classList.add("hidden");
    }

    function changeSize(size) {
        state.size = size;
        state.level = 1;
        state.levelPage = 0;
        newGame();
    }

    function changeDifficulty(difficulty) {
        state.difficulty = difficulty;
        state.level = 1;
        state.levelPage = 0;
        newGame();
    }

    function changeMode(mode) {
        state.mode = mode;
        state.level = 1;
        state.levelPage = 0;
        newGame();
    }

    function bindEvents() {
        document.querySelectorAll("[data-size]").forEach(button => {
            button.addEventListener("click", () => {
                changeSize(Number(button.dataset.size));
            });
        });

        document.querySelectorAll("[data-difficulty]").forEach(button => {
            button.addEventListener("click", () => {
                changeDifficulty(button.dataset.difficulty);
            });
        });

        document.querySelectorAll("[data-mode]").forEach(button => {
            button.addEventListener("click", () => {
                changeMode(button.dataset.mode);
            });
        });

        $("themeSelect").addEventListener("change", event => {
            setTheme(event.target.value);
        });

        $("newGameBtn").addEventListener("click", newGame);
        $("hintBtn").addEventListener("click", useHint);
        $("undoBtn").addEventListener("click", undoMove);
        $("eraseBtn").addEventListener("click", eraseSelected);

        $("pauseBtn").addEventListener("click", togglePause);
        $("resumeBtn").addEventListener("click", resumeGame);

        $("startBtn").addEventListener("click", startGame);

        $("helpBtn").addEventListener("click", () => {
            state.paused = true;
            updateTutorial();
            $("tutorialOverlay").classList.remove("hidden");
        });

        $("previousLevels").addEventListener("click", () => {
            if (state.levelPage > 0) {
                state.levelPage--;
                renderLevels();
            }
        });

        $("nextLevels").addEventListener("click", () => {
            if (state.levelPage < 4) {
                state.levelPage++;
                renderLevels();
            }
        });

        $("resultBtn").addEventListener("click", () => {
            $("resultOverlay").classList.add("hidden");

            if (state.finished &&
                state.board.every(
                    (value, i) => value === state.solution[i]
                ) &&
                state.mode === "levels" &&
                state.level < TOTAL_LEVELS) {
                state.level++;
                state.levelPage =
                    Math.floor((state.level - 1) / 10);
            }

            newGame();
        });

        document.addEventListener("keydown", event => {
            if (!canPlay()) return;

            if (event.target.matches("input, select, textarea")) {
                return;
            }

            const key = event.key.toUpperCase();
            const number = SYMBOLS.indexOf(key) + 1;

            if (number >= 1 && number <= state.size) {
                enterNumber(number);
            } else if (
                event.key === "Backspace" ||
                event.key === "Delete"
            ) {
                eraseSelected();
            }
        });
    }

    function init() {
        loadProgress();
        bindEvents();
        setTheme(state.theme);
        newGame();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

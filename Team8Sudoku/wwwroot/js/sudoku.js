
(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    const TOTAL_LEVELS = 50;
    const STORAGE = "sudoku-calendar-v1";
    const SYMBOLS = "123456789ABCDEFG";

    if (!$("sudoku-board")) return;

    function loadSaved() {
        try {
            return {
                points: 0,
                bestTime: null,
                completedLevels: {},
                dailyCompleted: {},
                dailyProgress: {},
                victories: 0,
                theme: "sakura",
                ...JSON.parse(localStorage.getItem(STORAGE) || "{}")
            };
        } catch {
            return {
                points: 0, bestTime: null,
                completedLevels: {}, dailyCompleted: {},
                dailyProgress: {}, victories: 0,
                theme: "sakura"
            };
        }
    }

    let saved = loadSaved();
    let size = 9, difficulty = "medium", mode = "levels";
    let level = 1, levelPage = 0;
    let solution = [], puzzle = [], board = [], fixed = [];
    let selected = -1, lives = 3, mistakes = 0, hints = 3;
    let seconds = 0, paused = false, finished = false;
    let history = [], currentDaily = null;
    let timerInterval = null, wrongTimeout = null, gameToken = 0;
    let calendarDate = new Date(), selectedDate = "";

    function save() {
        try {
            localStorage.setItem(STORAGE, JSON.stringify(saved));
        } catch { }
    }

    function setText(id, value) {
        if ($(id)) $(id).textContent = value;
    }

    function status(message) {
        setText("gameStatus", message);
    }

    function dateKey(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function formatTime(value) {
        return String(Math.floor(value / 60)).padStart(2, "0")
            + ":" + String(value % 60).padStart(2, "0");
    }

    function hashString(value) {
        let hash = 2166136261;
        for (const ch of value) {
            hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
        }
        return hash >>> 0;
    }

    function seededRandom(seed) {
        let state = seed >>> 0;
        return () => {
            state += 0x6D2B79F5;
            let t = state;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function shuffle(array, random) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    function generateSolution(n, random) {
        const root = Math.sqrt(n);
        const groups = Array.from({ length: root }, (_, i) => i);
        const rows = shuffle(groups, random).flatMap(g =>
            shuffle(groups, random).map(i => g * root + i)
        );
        const cols = shuffle(groups, random).flatMap(g =>
            shuffle(groups, random).map(i => g * root + i)
        );
        const digits = shuffle(
            Array.from({ length: n }, (_, i) => i + 1), random
        );
        const pattern = (r, c) =>
            (root * (r % root) + Math.floor(r / root) + c) % n;
        return rows.flatMap(r =>
            cols.map(c => digits[pattern(r, c)])
        );
    }

    function countSolutions(grid, n, limit = 2) {
        const root = Math.sqrt(n);
        const rows = Array(n).fill(0);
        const cols = Array(n).fill(0);
        const boxes = Array(n).fill(0);
        const all = (1 << n) - 1;

        for (let i = 0; i < grid.length; i++) {
            if (!grid[i]) continue;
            const r = Math.floor(i / n), c = i % n;
            const b = Math.floor(r / root) * root + Math.floor(c / root);
            const bit = 1 << (grid[i] - 1);
            if ((rows[r] | cols[c] | boxes[b]) & bit) return 0;
            rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
        }

        let solutions = 0;

        function search() {
            if (solutions >= limit) return;
            let best = -1, bestMask = 0, bestCount = n + 1;

            for (let i = 0; i < grid.length; i++) {
                if (grid[i]) continue;
                const r = Math.floor(i / n), c = i % n;
                const b = Math.floor(r / root) * root + Math.floor(c / root);
                const mask = all & ~(rows[r] | cols[c] | boxes[b]);
                let count = 0;
                for (let bits = mask; bits; bits &= bits - 1) count++;
                if (!count) return;
                if (count < bestCount) {
                    best = i; bestMask = mask; bestCount = count;
                    if (count === 1) break;
                }
            }

            if (best === -1) {
                solutions++;
                return;
            }

            const r = Math.floor(best / n), c = best % n;
            const b = Math.floor(r / root) * root + Math.floor(c / root);

            for (let bits = bestMask; bits; bits &= bits - 1) {
                const bit = bits & -bits;
                const value = 32 - Math.clz32(bit);
                grid[best] = value;
                rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
                search();
                grid[best] = 0;
                rows[r] ^= bit; cols[c] ^= bit; boxes[b] ^= bit;
                if (solutions >= limit) return;
            }
        }

        search();
        return solutions;
    }

    function generatePuzzle(n, diff, seed) {
        const random = seededRandom(seed);
        const solved = generateSolution(n, random);
        const grid = [...solved];
        const ratio = { easy: .38, medium: .50, hard: .58 }[diff];
        const target = Math.floor(n * n * ratio);
        const indices = shuffle(
            Array.from({ length: n * n }, (_, i) => i), random
        );
        let removed = 0;

        for (const index of indices) {
            if (removed >= target) break;
            const previous = grid[index];
            grid[index] = 0;
            if (n <= 9 && countSolutions([...grid], n) !== 1) {
                grid[index] = previous;
            } else {
                removed++;
            }
        }

        return { solution: solved, puzzle: grid };
    }

    function symbol(value) {
        return value ? SYMBOLS[value - 1] : "";
    }

    function updateStats() {
        setText("points", saved.points);
        setText("totalPoints", saved.points + " ✦");
        setText("lives", mode === "practice" && !currentDaily ? "∞" : lives);
        setText("timer", formatTime(seconds));
        setText("hintsLeft", hints);
        setText("bestTime",
            saved.bestTime === null ? "--:--" : formatTime(saved.bestTime)
        );
    }

    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (paused || finished) return;
            seconds++;
            setText("timer", formatTime(seconds));
            if (currentDaily) saveDailyProgress();
        }, 1000);
    }

    function updateChoices() {
        document.querySelectorAll("[data-size]").forEach(b =>
            b.classList.toggle("active", Number(b.dataset.size) === size)
        );
        document.querySelectorAll("[data-difficulty]").forEach(b =>
            b.classList.toggle("active", b.dataset.difficulty === difficulty)
        );
        document.querySelectorAll("[data-mode]").forEach(b =>
            b.classList.toggle("active", b.dataset.mode === mode)
        );
    }

    // Clicking a cell ONLY selects it.
    // It does not change numbers or start a new game.
    function selectCell(index) {
        if (paused || finished) return;
        if (index < 0 || index >= board.length) return;

        selected = index;

        const cells = $("sudoku-board").querySelectorAll(".sudoku-cell");
        cells.forEach((cell, i) => {
            cell.classList.toggle("selected", i === index);
        });

        status(fixed[index]
            ? "This number cannot be changed."
            : "Choose a number from the number pad."
        );
    }

    function renderBoard() {
        const container = $("sudoku-board");
        container.replaceChildren();
        container.style.gridTemplateColumns =
            `repeat(${size}, minmax(0, 1fr))`;
        container.style.gridTemplateRows =
            `repeat(${size}, minmax(0, 1fr))`;
        container.classList.toggle("size-16", size === 16);
        const root = Math.sqrt(size);

        for (let i = 0; i < board.length; i++) {
            const cell = document.createElement("button");
            cell.type = "button";
            cell.className = "sudoku-cell";
            cell.dataset.index = i;
            cell.textContent = symbol(board[i]);
            cell.setAttribute("role", "gridcell");
            cell.setAttribute("aria-label",
                `Row ${Math.floor(i / size) + 1}, column ${i % size + 1}`
            );

            if (fixed[i]) cell.classList.add("given");
            if (selected === i) cell.classList.add("selected");

            const r = Math.floor(i / size), c = i % size;
            if ((c + 1) % root === 0 && c !== size - 1)
                cell.style.borderRight = "2px solid #693699";
            if ((r + 1) % root === 0 && r !== size - 1)
                cell.style.borderBottom = "2px solid #693699";

            cell.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                selectCell(i);
            });

            container.appendChild(cell);
        }
    }

    function renderPad() {
        const pad = $("numberPad");
        pad.replaceChildren();
        pad.classList.toggle("size-16", size === 16);

        for (let n = 1; n <= size; n++) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = symbol(n);
            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                enterNumber(n);
            });
            pad.appendChild(button);
        }
    }

    function flashWrong(index, number) {
        const cell = $("sudoku-board").children[index];
        if (!cell) return;

        const token = gameToken;
        cell.textContent = symbol(number);
        cell.classList.add("wrong");
        clearTimeout(wrongTimeout);

        wrongTimeout = setTimeout(() => {
            if (token !== gameToken) return;
            cell.classList.remove("wrong");
            cell.textContent = symbol(board[index]);
        }, 650);
    }

    function enterNumber(number) {
        if (paused || finished) return;
        if (selected < 0) {
            status("Select an empty square first.");
            return;
        }
        if (fixed[selected]) {
            status("This is a fixed number.");
            return;
        }
        if (board[selected] === number) return;

        if (number !== solution[selected]) {
            mistakes++;
            flashWrong(selected, number);

            if (mode !== "practice" || currentDaily)
                lives = Math.max(0, lives - 1);

            status("❌ Wrong number! Try again.");
            updateStats();
            updateProgress();
            saveDailyProgress();

            if (lives === 0) {
                const token = gameToken;
                setTimeout(() => {
                    if (token === gameToken && !finished)
                        finishGame(false);
                }, 700);
            }
            return;
        }

        history.push({ index: selected, previous: board[selected] });
        board[selected] = number;
        saved.points += 10;

        clearTimeout(wrongTimeout);
        renderBoard();
        updateStats();
        updateProgress();
        saveDailyProgress();
        save();

        status("✅ Correct!");

        if (board.every((v, i) => v === solution[i]))
            finishGame(true);
    }

    function updateProgress() {
        const empty = puzzle.filter(v => v === 0).length;
        const filled = board.reduce((sum, v, i) =>
            sum + (puzzle[i] === 0 && v !== 0 ? 1 : 0), 0
        );
        if ($("progressFill"))
            $("progressFill").style.width =
                (empty ? filled / empty * 100 : 100) + "%";

        setText("cellProgress", `${filled} / ${empty} cells completed`);
        setText("mistakesText", `Mistakes: ${mistakes}`);

        const completed = Object.values(saved.completedLevels)
            .filter(Boolean).length;
        setText("levelProgress", `${completed} levels completed`);
        setText("progressLabel", currentDaily
            ? `Daily Challenge: ${currentDaily}`
            : mode === "practice"
                ? "Practice Mode"
                : `Level ${level} of ${TOTAL_LEVELS}`
        );
    }

    function levelKey(n) {
        return `${size}-${difficulty}-${n}`;
    }

    function highestUnlocked() {
        for (let i = 1; i <= TOTAL_LEVELS; i++) {
            if (!saved.completedLevels[levelKey(i)]) return i;
        }
        return TOTAL_LEVELS;
    }

    function renderLevels() {
        const list = $("levelList");
        if (!list) return;
        list.replaceChildren();

        const start = levelPage * 10 + 1;
        const end = Math.min(start + 9, TOTAL_LEVELS);
        setText("levelRange", `Levels ${start}–${end}`);
        setText("levelPage", `${levelPage + 1} / 5`);

        const highest = highestUnlocked();

        for (let n = start; n <= end; n++) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = n;
            if (saved.completedLevels[levelKey(n)])
                button.classList.add("completed");
            if (n === level && !currentDaily)
                button.classList.add("active");
            button.disabled = n > highest;

            button.addEventListener("click", () => {
                level = n;
                mode = "levels";
                currentDaily = null;
                updateChoices();
                newGame();
            });
            list.appendChild(button);
        }

        $("previousLevels").disabled = levelPage === 0;
        $("nextLevels").disabled = levelPage === 4;
    }

    function renderAchievements() {
        const list = $("achievementList");
        if (!list) return;
        list.replaceChildren();

        const completed = Object.values(saved.completedLevels)
            .filter(Boolean).length;

        const achievements = [
            ["🏆", "First Victory", saved.victories >= 1],
            ["🏅", "10 Levels", completed >= 10],
            ["⭐", "1,000 Points", saved.points >= 1000],
            ["📅", "Daily Champion",
                Object.values(saved.dailyCompleted).some(Boolean)]
        ];

        for (const [icon, label, unlocked] of achievements) {
            const card = document.createElement("div");
            card.className = "achievement-item";
            if (!unlocked) card.classList.add("locked");

            const iconEl = document.createElement("span");
            iconEl.className = "achievement-icon";
            iconEl.textContent = unlocked ? icon : "🔒";

            const name = document.createElement("strong");
            name.textContent = label;
            card.append(iconEl, name);

            if (label === "Daily Champion") {
                card.style.cursor = "pointer";
                card.addEventListener("click", openCalendar);
            }

            list.appendChild(card);
        }
    }

    function hideOverlays() {
        document.querySelectorAll(".overlay")
            .forEach(el => el.classList.add("hidden"));
    }

    function newGame() {
        gameToken++;
        clearTimeout(wrongTimeout);
        hideOverlays();

        currentDaily = null;
        selected = -1;
        lives = 3; mistakes = 0; hints = 3; seconds = 0;
        paused = false; finished = false; history = [];

        const seed = mode === "levels"
            ? hashString(`level-${size}-${difficulty}-${level}`)
            : Math.floor(Math.random() * 4294967295);

        const generated = generatePuzzle(size, difficulty, seed);
        solution = generated.solution;
        puzzle = generated.puzzle;
        board = [...puzzle];
        fixed = puzzle.map(v => v !== 0);

        updateChoices();
        renderBoard();
        renderPad();
        renderLevels();
        renderAchievements();
        updateProgress();
        updateStats();
        updateDailyCard();
        status("Select an empty square to begin.");
        startTimer();
    }

    function saveDailyProgress() {
        if (!currentDaily || finished) return;
        saved.dailyProgress[currentDaily] = {
            board: [...board], lives, mistakes, hints, seconds
        };
        save();
    }

    function startDailyChallenge(key) {
        if (key > dateKey(new Date())) return;

        gameToken++;
        clearTimeout(wrongTimeout);
        hideOverlays();

        currentDaily = key;
        mode = "levels";
        size = 9;
        difficulty = "medium";
        selected = -1;
        lives = 3; mistakes = 0; hints = 3; seconds = 0;
        paused = false; finished = false; history = [];

        const generated = generatePuzzle(
            size, difficulty, hashString(`daily-${key}`)
        );
        solution = generated.solution;
        puzzle = generated.puzzle;
        board = [...puzzle];
        fixed = puzzle.map(v => v !== 0);

        const progress = saved.dailyProgress[key];
        if (progress && Array.isArray(progress.board) &&
            progress.board.length === board.length) {
            board = progress.board.map((value, i) =>
                fixed[i] ? puzzle[i]
                    : value === solution[i] ? value : 0
            );
            lives = Math.max(1, progress.lives ?? 3);
            mistakes = progress.mistakes || 0;
            hints = progress.hints ?? 3;
            seconds = progress.seconds || 0;
        }

        updateChoices();
        renderBoard();
        renderPad();
        renderLevels();
        renderAchievements();
        updateProgress();
        updateStats();
        status(`📅 Daily Challenge: ${key}`);
        startTimer();
    }

    function finishGame(won) {
        if (finished) return;
        finished = true;
        clearInterval(timerInterval);

        if (won) {
            saved.victories++;
            if (saved.bestTime === null || seconds < saved.bestTime)
                saved.bestTime = seconds;

            if (currentDaily) {
                if (!saved.dailyCompleted[currentDaily]) {
                    saved.dailyCompleted[currentDaily] = true;
                    saved.points += 100;
                }
                delete saved.dailyProgress[currentDaily];
            } else if (mode === "levels") {
                saved.completedLevels[levelKey(level)] = true;
            }

            setText("resultIcon", "🏆");
            setText("resultTitle", "Puzzle Complete!");
            setText("resultMessage", currentDaily
                ? "Daily challenge completed! You earned 100 bonus points."
                : "Excellent work! Puzzle solved."
            );
        } else {
            setText("resultIcon", "💔");
            setText("resultTitle", "Game Over");
            setText("resultMessage", "You ran out of lives. Try again!");
            if (currentDaily) delete saved.dailyProgress[currentDaily];
        }

        save();
        updateStats();
        updateProgress();
        renderLevels();
        renderAchievements();
        updateDailyCard();
        $("resultOverlay")?.classList.remove("hidden");
    }

    function updateDailyCard() {
        const key = dateKey(new Date());
        setText("dailyChallengeDate",
            new Date(key + "T12:00:00").toLocaleDateString(undefined, {
                weekday: "long", month: "long", day: "numeric"
            })
        );
        setText("dailyChallengeStatus",
            saved.dailyCompleted[key]
                ? "✅ Today's challenge completed!"
                : "Complete today's challenge!"
        );
        setText("dailyStatus",
            saved.dailyCompleted[key]
                ? "✅ Today's challenge completed!"
                : "A new challenge is waiting!"
        );
    }

    // DAILY CHALLENGE CALENDAR
    function ensureCalendar() {
        if (!$("calendarOverlay")) {
            const overlay = document.createElement("div");
            overlay.id = "calendarOverlay";
            overlay.className = "overlay hidden";
            overlay.innerHTML = `
          <div class="dialog-card calendar-card">
            <h2>📅 Daily Challenge Calendar</h2>
            <div class="calendar-nav">
              <button type="button" id="previousMonth">‹</button>
              <strong id="calendarMonth"></strong>
              <button type="button" id="nextMonth">›</button>
            </div>
            <div class="calendar-weekdays">
              <span>Sun</span><span>Mon</span><span>Tue</span>
              <span>Wed</span><span>Thu</span><span>Fri</span>
              <span>Sat</span>
            </div>
            <div id="calendarDays" class="calendar-days"></div>
            <p id="selectedChallengeDate"></p>
            <p id="selectedChallengeStatus"></p>
            <button type="button" id="playSelectedChallenge"
                    class="primary">Play Selected Day</button>
            <button type="button" id="closeCalendarBtn">Close</button>
          </div>`;
            document.body.appendChild(overlay);
        }

        if (!$("viewCalendarBtn")) {
            const dailyButton = $("dailyChallengeBtn") || $("dailyBtn");
            if (dailyButton) {
                const button = document.createElement("button");
                button.type = "button";
                button.id = "viewCalendarBtn";
                button.textContent = "📅 Challenge Calendar";
                button.className = "wide-btn calendar-open-btn";
                button.style.width = "100%";
                button.style.marginTop = "10px";
                dailyButton.insertAdjacentElement("afterend", button);
            }
        }

        $("viewCalendarBtn")?.addEventListener("click", openCalendar);
        $("closeCalendarBtn")?.addEventListener("click", () =>
            $("calendarOverlay").classList.add("hidden")
        );
        $("previousMonth")?.addEventListener("click", () => changeMonth(-1));
        $("nextMonth")?.addEventListener("click", () => changeMonth(1));
        $("playSelectedChallenge")?.addEventListener("click", () =>
            startDailyChallenge(selectedDate)
        );
    }

    function openCalendar() {
        const now = new Date();
        calendarDate = new Date(now.getFullYear(), now.getMonth(), 1);
        selectedDate = dateKey(now);
        renderCalendar();
        $("calendarOverlay")?.classList.remove("hidden");
    }

    function renderCalendar() {
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();

        setText("calendarMonth",
            calendarDate.toLocaleDateString(undefined, {
                month: "long", year: "numeric"
            })
        );

        const container = $("calendarDays");
        if (!container) return;
        container.replaceChildren();

        const firstDay = new Date(year, month, 1).getDay();
        const days = new Date(year, month + 1, 0).getDate();
        const todayKey = dateKey(new Date());

        for (let i = 0; i < firstDay; i++)
            container.appendChild(document.createElement("div"));

        for (let day = 1; day <= days; day++) {
            const key = dateKey(new Date(year, month, day));
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = saved.dailyCompleted[key]
                ? `${day} ✓` : String(day);
            button.disabled = key > todayKey;

            if (key === todayKey) button.classList.add("today");
            if (key === selectedDate) button.classList.add("selected-day");
            if (saved.dailyCompleted[key])
                button.classList.add("completed");

            button.addEventListener("click", () => {
                selectedDate = key;
                renderCalendar();
            });
            container.appendChild(button);
        }

        setText("selectedChallengeDate",
            new Date(selectedDate + "T12:00:00")
                .toLocaleDateString(undefined, {
                    weekday: "long", month: "long",
                    day: "numeric", year: "numeric"
                })
        );

        setText("selectedChallengeStatus",
            saved.dailyCompleted[selectedDate]
                ? "✅ Completed! You can replay this puzzle."
                : "Ready to play this daily challenge!"
        );

        if ($("playSelectedChallenge"))
            $("playSelectedChallenge").disabled =
                selectedDate > todayKey;

        if ($("nextMonth"))
            $("nextMonth").disabled =
                year > new Date().getFullYear() ||
                (year === new Date().getFullYear() &&
                    month >= new Date().getMonth());
    }

    function changeMonth(direction) {
        calendarDate = new Date(
            calendarDate.getFullYear(),
            calendarDate.getMonth() + direction, 1
        );
        selectedDate = dateKey(calendarDate);
        renderCalendar();
    }

    function undoMove() {
        if (paused || finished) return;
        const move = history.pop();
        if (!move) return;
        board[move.index] = move.previous;
        selected = move.index;
        renderBoard();
        updateProgress();
        saveDailyProgress();
        status("Move undone.");
    }

    function eraseCell() {
        if (paused || finished || selected < 0 || fixed[selected])
            return;
        if (!board[selected]) return;

        history.push({ index: selected, previous: board[selected] });
        board[selected] = 0;
        renderBoard();
        updateProgress();
        saveDailyProgress();
        status("Number erased.");
    }

    function giveHint() {
        if (paused || finished || hints <= 0) return;
        let index = selected;

        if (index < 0 || fixed[index] ||
            board[index] === solution[index]) {
            index = board.findIndex((v, i) =>
                !fixed[i] && v !== solution[i]
            );
        }
        if (index < 0) return;

        history.push({ index, previous: board[index] });
        board[index] = solution[index];
        selected = index;
        hints--;

        renderBoard();
        updateStats();
        updateProgress();
        saveDailyProgress();

        if (board.every((v, i) => v === solution[i]))
            finishGame(true);
    }

    function setTheme(theme) {
        const app = document.querySelector(".sakura-app");
        if (!app) return;
        app.classList.remove(
            "theme-sakura", "theme-lavender", "theme-night"
        );
        app.classList.add("theme-" + theme);
        saved.theme = theme;
        save();
    }

    function bindEvents() {
        document.querySelectorAll("[data-size]").forEach(b =>
            b.addEventListener("click", () => {
                size = Number(b.dataset.size);
                level = 1; levelPage = 0;
                newGame();
            })
        );

        document.querySelectorAll("[data-difficulty]").forEach(b =>
            b.addEventListener("click", () => {
                difficulty = b.dataset.difficulty;
                level = 1; levelPage = 0;
                newGame();
            })
        );

        document.querySelectorAll("[data-mode]").forEach(b =>
            b.addEventListener("click", () => {
                mode = b.dataset.mode;
                newGame();
            })
        );

        $("themeSelect")?.addEventListener("change", e =>
            setTheme(e.target.value)
        );

        $("newGameBtn")?.addEventListener("click", newGame);
        $("hintBtn")?.addEventListener("click", giveHint);
        $("undoBtn")?.addEventListener("click", undoMove);
        $("eraseBtn")?.addEventListener("click", eraseCell);

        $("previousLevels")?.addEventListener("click", () => {
            levelPage = Math.max(0, levelPage - 1);
            renderLevels();
        });
        $("nextLevels")?.addEventListener("click", () => {
            levelPage = Math.min(4, levelPage + 1);
            renderLevels();
        });

        ($("dailyChallengeBtn") || $("dailyBtn"))
            ?.addEventListener("click", () =>
                startDailyChallenge(dateKey(new Date()))
            );

        $("pauseBtn")?.addEventListener("click", () => {
            if (finished || paused) return;
            paused = true;
            $("pauseOverlay")?.classList.remove("hidden");
        });

        $("resumeBtn")?.addEventListener("click", () => {
            paused = false;
            $("pauseOverlay")?.classList.add("hidden");
        });

        ($("helpBtn") || $("tutorialBtn"))
            ?.addEventListener("click", () => {
                setText("tutorialNumbers",
                    size === 16
                        ? "Use numbers 1–9 and letters A–G."
                        : `Use numbers 1 through ${size}.`
                );
                const root = Math.sqrt(size);
                setText("tutorialBoxes",
                    `Each ${root}×${root} box must contain each symbol once.`
                );
                $("tutorialOverlay")?.classList.remove("hidden");
            });

        $("startBtn")?.addEventListener("click", () =>
            $("tutorialOverlay")?.classList.add("hidden")
        );

        $("resultBtn")?.addEventListener("click", () => {
            if (currentDaily) {
                startDailyChallenge(currentDaily);
                return;
            }
            if (finished && lives > 0 &&
                mode === "levels" && level < TOTAL_LEVELS) {
                level++;
                levelPage = Math.floor((level - 1) / 10);
            }
            newGame();
        });

        document.addEventListener("keydown", e => {
            if (e.key === "Escape") {
                $("calendarOverlay")?.classList.add("hidden");
                return;
            }
            if (paused || finished) return;
            if (["Backspace", "Delete"].includes(e.key)) {
                eraseCell();
                return;
            }
            let number = Number(e.key);
            if (size === 16 && /^[A-Ga-g]$/.test(e.key))
                number = e.key.toUpperCase().charCodeAt(0) - 55;
            if (number >= 1 && number <= size)
                enterNumber(number);
        });
    }

    function init() {
        ensureCalendar();
        bindEvents();

        if ($("themeSelect"))
            $("themeSelect").value = saved.theme;

        setTheme(saved.theme);
        updateDailyCard();
        newGame();
    }

    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", init);
    else
        init();

})();

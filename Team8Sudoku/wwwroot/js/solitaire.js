
(() => {
    "use strict";

    const $ = id => document.getElementById(id);
    if (!$("cardGameApp") || !$("solTableau")) return;

    const SUITS = ["♠", "♥", "♣", "♦"];
    const RANKS = [
        "", "A", "2", "3", "4", "5", "6",
        "7", "8", "9", "10", "J", "Q", "K"
    ];
    const SAVE_KEY = "team8-cards-iteration3-v1";

    const defaults = {
        game: "klondike",
        drawMode: "1",
        spiderSuits: "1",
        theme: "sakura",
        cardBack: "purple"
    };

    let settings = { ...defaults };
    let state = null;
    let initialState = null;
    let history = [];
    let selected = null;
    let hint = null;
    let dragging = null;
    let dialogAction = null;
    let seconds = 0;

    const clone = value =>
        JSON.parse(JSON.stringify(value));

    const red = card =>
        card.suit === "♥" || card.suit === "♦";

    const label = card =>
        RANKS[card.rank] + card.suit;

    function shuffle(cards) {
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
        return cards;
    }

    function deck(suits = SUITS, copies = 1) {
        const result = [];
        for (let copy = 0; copy < copies; copy++) {
            for (const suit of suits) {
                for (let rank = 1; rank <= 13; rank++) {
                    result.push({
                        suit,
                        rank,
                        faceUp: true
                    });
                }
            }
        }
        return shuffle(result);
    }

    function createGame(game) {
        const s = {
            game,
            tableau: [],
            stock: [],
            waste: [],
            foundations: [[], [], [], []],
            freecells: [null, null, null, null],
            completed: 0,
            score: 0,
            moves: 0,
            won: false
        };

        if (game === "klondike") {
            const cards = deck();
            s.tableau = Array.from(
                { length: 7 }, () => []
            );

            for (let col = 0; col < 7; col++) {
                for (let row = 0; row <= col; row++) {
                    const card = cards.pop();
                    card.faceUp = row === col;
                    s.tableau[col].push(card);
                }
            }
            s.stock = cards;
        }

        if (game === "freecell") {
            const cards = deck();
            s.tableau = Array.from(
                { length: 8 }, () => []
            );

            cards.forEach((card, index) => {
                s.tableau[index % 8].push(card);
            });
        }

        if (game === "spider") {
            const count = Number(settings.spiderSuits);
            const suits = count === 1
                ? ["♠"]
                : count === 2
                    ? ["♠", "♥"]
                    : SUITS;

            const cards = deck(suits, 8 / count);
            s.tableau = Array.from(
                { length: 10 }, () => []
            );

            for (let col = 0; col < 10; col++) {
                const amount = col < 4 ? 6 : 5;
                for (let row = 0; row < amount; row++) {
                    const card = cards.pop();
                    card.faceUp = row === amount - 1;
                    s.tableau[col].push(card);
                }
            }
            s.stock = cards;
        }

        return s;
    }

    function save() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify({
                settings,
                state,
                initialState,
                history,
                seconds
            }));
        } catch {
            // Game remains playable without storage.
        }
    }

    function load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;

            const saved = JSON.parse(raw);
            settings = { ...defaults, ...saved.settings };

            if (
                !saved.state ||
                !["klondike", "spider", "freecell"]
                    .includes(saved.state.game) ||
                !Array.isArray(saved.state.tableau)
            ) return false;

            state = saved.state;
            initialState = saved.initialState || clone(state);
            history = Array.isArray(saved.history)
                ? saved.history : [];
            seconds = Number(saved.seconds) || 0;
            settings.game = state.game;
            return true;
        } catch {
            return false;
        }
    }

    function message(text) {
        $("solMessage").textContent = text;
    }

    function applySettings() {
        const app = $("cardGameApp");

        for (const name of [
            "theme-sakura", "theme-green", "theme-midnight",
            "back-purple", "back-pink",
            "back-blue", "back-classic"
        ]) app.classList.remove(name);

        if (!["sakura", "green", "midnight"]
            .includes(settings.theme)) {
            settings.theme = "sakura";
        }
        if (!["purple", "pink", "blue", "classic"]
            .includes(settings.cardBack)) {
            settings.cardBack = "purple";
        }

        app.classList.add("theme-" + settings.theme);
        app.classList.add("back-" + settings.cardBack);

        $("solTheme").value = settings.theme;
        $("solCardBack").value = settings.cardBack;
        $("solDrawMode").value = settings.drawMode;
        $("solSpiderSuits").value = settings.spiderSuits;

        $("klondikeOptions").classList.toggle(
            "hidden", state.game !== "klondike"
        );
        $("spiderOptions").classList.toggle(
            "hidden", state.game !== "spider"
        );
        $("solStockArea").classList.toggle(
            "hidden", state.game === "freecell"
        );
        $("solFreecells").classList.toggle(
            "hidden", state.game !== "freecell"
        );
        $("solFoundations").classList.toggle(
            "hidden", state.game === "spider"
        );
        $("solSpiderInfo").classList.toggle(
            "hidden", state.game !== "spider"
        );

        document.querySelectorAll("[data-game]")
            .forEach(button => {
                button.classList.toggle(
                    "active",
                    button.dataset.game === state.game
                );
            });
    }

    function makeCard(card, active = false) {
        const el = document.createElement("div");
        el.className = "sol-card";

        if (!card.faceUp) {
            el.classList.add("face-down");
            const back = document.createElement("span");
            back.className = "sol-card-back";
            back.textContent =
                settings.cardBack === "classic" ? "♠" : "✿";
            el.append(back);
            return el;
        }

        if (red(card)) el.classList.add("red");
        if (active) el.classList.add("selected");

        const corner = document.createElement("span");
        corner.className = "sol-card-corner";
        corner.textContent = label(card);

        const center = document.createElement("span");
        center.className = "sol-card-center";
        center.textContent = card.suit;

        el.append(corner, center);
        return el;
    }

    function same(a, b) {
        return a && b &&
            a.type === b.type &&
            a.column === b.column &&
            a.index === b.index;
    }

    function pileFor(source) {
        if (source.type === "tableau")
            return state.tableau[source.column];
        if (source.type === "foundation")
            return state.foundations[source.column];
        if (source.type === "waste")
            return state.waste;
        return [];
    }

    function sourceCards(source) {
        if (!source) return [];

        if (source.type === "freecell") {
            const card = state.freecells[source.column];
            return card ? [card] : [];
        }

        const pile = pileFor(source);
        if (!pile || !pile.length) return [];

        if (source.type === "tableau") {
            return pile.slice(source.index);
        }
        return [pile[pile.length - 1]];
    }

    function validSequence(cards) {
        if (!cards.length ||
            cards.some(c => !c.faceUp)) return false;

        if (state.game === "freecell" &&
            cards.length !== 1) {
            // Multi-card FreeCell moves are checked separately.
            return freecellSequence(cards);
        }

        for (let i = 0; i < cards.length - 1; i++) {
            const a = cards[i];
            const b = cards[i + 1];

            if (a.rank !== b.rank + 1) return false;

            if (state.game === "spider") {
                if (a.suit !== b.suit) return false;
            } else {
                if (red(a) === red(b)) return false;
            }
        }
        return true;
    }

    function freecellSequence(cards) {
        if (!cards.length) return false;
        for (let i = 0; i < cards.length - 1; i++) {
            const a = cards[i], b = cards[i + 1];
            if (
                a.rank !== b.rank + 1 ||
                red(a) === red(b)
            ) return false;
        }
        return true;
    }

    function freecellCapacity(source, destination) {
        const emptyCells = state.freecells
            .filter(card => card === null).length;

        let emptyColumns = state.tableau
            .filter(pile => pile.length === 0).length;

        if (
            destination.type === "tableau" &&
            state.tableau[destination.column].length === 0
        ) emptyColumns--;

        return (emptyCells + 1) *
            Math.pow(2, Math.max(0, emptyColumns));
    }

    function canMove(source, destination) {
        if (!source || !destination) return false;

        if (
            source.type === destination.type &&
            source.column === destination.column
        ) return false;

        if (state.game === "spider" &&
            source.type !== "tableau") return false;

        const cards = sourceCards(source);
        if (!validSequence(cards)) return false;

        if (destination.type === "tableau") {
            const pile = state.tableau[destination.column];

            if (
                state.game === "freecell" &&
                cards.length > freecellCapacity(
                    source, destination
                )
            ) return false;

            if (!pile.length) {
                return state.game !== "klondike" ||
                    cards[0].rank === 13;
            }

            const top = pile[pile.length - 1];
            if (!top.faceUp ||
                top.rank !== cards[0].rank + 1) {
                return false;
            }

            if (state.game === "spider") return true;
            return red(top) !== red(cards[0]);
        }

        if (
            destination.type === "foundation" &&
            state.game !== "spider"
        ) {
            if (cards.length !== 1) return false;
            const card = cards[0];
            const pile = state.foundations[destination.column];

            if (!pile.length) return card.rank === 1;

            const top = pile[pile.length - 1];
            return top.suit === card.suit &&
                card.rank === top.rank + 1;
        }

        if (
            destination.type === "freecell" &&
            state.game === "freecell"
        ) {
            return cards.length === 1 &&
                state.freecells[destination.column] === null;
        }

        return false;
    }

    function remember() {
        history.push({
            state: clone(state),
            seconds
        });
        if (history.length > 150) history.shift();
    }

    function removeSource(source) {
        if (source.type === "freecell") {
            const card = state.freecells[source.column];
            state.freecells[source.column] = null;
            return [card];
        }

        const pile = pileFor(source);
        const cards = source.type === "tableau"
            ? pile.splice(source.index)
            : [pile.pop()];

        if (
            source.type === "tableau" &&
            pile.length &&
            !pile[pile.length - 1].faceUp
        ) {
            pile[pile.length - 1].faceUp = true;
            state.score += 5;
        }
        return cards;
    }

    function move(source, destination) {
        if (state.won ||
            !canMove(source, destination)) return false;

        remember();
        const cards = removeSource(source);

        if (destination.type === "freecell") {
            state.freecells[destination.column] = cards[0];
        } else {
            const pile = destination.type === "tableau"
                ? state.tableau[destination.column]
                : state.foundations[destination.column];

            pile.push(...cards);
        }

        state.moves++;
        state.score += destination.type === "foundation"
            ? 10 : 5;

        selected = null;
        dragging = null;
        hint = null;

        if (state.game === "spider") {
            clearSpiderRuns();
        }

        checkWin();
        message("Nice move!");
        render();
        save();
        return true;
    }

    function clearSpiderRuns() {
        let changed = true;

        while (changed) {
            changed = false;

            for (const pile of state.tableau) {
                if (pile.length < 13) continue;

                const run = pile.slice(-13);
                const suit = run[0].suit;

                const complete = run.every((card, i) =>
                    card.faceUp &&
                    card.suit === suit &&
                    card.rank === 13 - i
                );

                if (!complete) continue;

                pile.splice(-13);
                state.completed++;
                state.score += 100;
                changed = true;

                if (
                    pile.length &&
                    !pile[pile.length - 1].faceUp
                ) {
                    pile[pile.length - 1].faceUp = true;
                    state.score += 5;
                }
            }
        }
    }

    function checkWin() {
        let complete = false;

        if (state.game === "spider") {
            complete = state.completed === 8;
        } else {
            const total = state.foundations.reduce(
                (sum, pile) => sum + pile.length, 0
            );
            complete = total === 52;
        }

        if (!complete || state.won) return;

        state.won = true;
        state.score += 500;

        openDialog(
            "🏆 Congratulations!",
            `<p>You completed ${gameName()}!</p>
             <p>Final score: <strong>${state.score}</strong></p>
             <p>Moves: ${state.moves}</p>
             <p>Time: ${formatTime(seconds)}</p>`,
            "Play Again",
            () => newGame()
        );
    }

    function gameName() {
        return {
            klondike: "Classic Solitaire",
            spider: "Spider Solitaire",
            freecell: "FreeCell"
        }[state.game];
    }

    function formatTime(time) {
        const min = String(
            Math.floor(time / 60)
        ).padStart(2, "0");

        const sec = String(time % 60).padStart(2, "0");
        return `${min}:${sec}`;
    }

    function updateStats() {
        $("solScore").textContent = state.score;
        $("solMoves").textContent = state.moves;
        $("solTimer").textContent = formatTime(seconds);
        $("solUndo").disabled = history.length === 0;
        $("solSpiderCompleted").textContent = state.completed;
    }

    function attachCard(el, source) {
        el.addEventListener("click", event => {
            event.stopPropagation();
            clickSource(source);
        });

        el.draggable = true;

        el.addEventListener("dragstart", event => {
            if (
                state.won ||
                !validSequence(sourceCards(source))
            ) {
                event.preventDefault();
                return;
            }

            dragging = { ...source };
            selected = { ...source };
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(
                "text/plain", "team8-card"
            );
            el.classList.add("dragging");
        });

        el.addEventListener("dragend", () => {
            dragging = null;
            document.querySelectorAll(".drop-target")
                .forEach(node =>
                    node.classList.remove("drop-target"));
            el.classList.remove("dragging");
        });
    }

    function attachDestination(el, destination) {
        el.addEventListener("click", () => {
            clickDestination(destination);
        });

        el.addEventListener("dragover", event => {
            if (!dragging) return;
            event.preventDefault();
            el.classList.add("drop-target");
        });

        el.addEventListener("dragleave", event => {
            if (!el.contains(event.relatedTarget)) {
                el.classList.remove("drop-target");
            }
        });

        el.addEventListener("drop", event => {
            if (!dragging) return;
            event.preventDefault();
            event.stopPropagation();

            const source = { ...dragging };
            dragging = null;

            if (!move(source, destination)) {
                message("That move is not allowed.");
                render();
            }
        });
    }

    function clickSource(source) {
        if (state.won) return;

        if (same(selected, source)) {
            selected = null;
            render();
            return;
        }

        if (selected) {
            const destination = {
                type: source.type,
                column: source.column
            };

            if (move(selected, destination)) return;
        }

        if (!validSequence(sourceCards(source))) {
            message("Choose a valid card or sequence.");
            return;
        }

        selected = { ...source };
        hint = null;
        message("Choose where to move the card.");
        render();
    }

    function clickDestination(destination) {
        if (state.won) return;

        if (selected && move(selected, destination)) return;

        if (selected) {
            message("That move is not allowed.");
        }
    }

    function renderSlot(el, card, source, destination) {
        el.innerHTML = "";
        el.classList.toggle(
            "hint-target",
            !!hint && sameDestination(
                hint.destination, destination
            )
        );

        if (card) {
            const cardEl = makeCard(
                card, same(selected, source)
            );

            if (hint && same(hint.source, source)) {
                cardEl.classList.add("hint-source");
            }

            attachCard(cardEl, source);
            el.append(cardEl);
        } else if (destination.type === "foundation") {
            el.textContent = "A";
        } else if (destination.type === "freecell") {
            el.textContent = "+";
        }

        // Replace handlers by cloning slots during each render.
        attachDestination(el, destination);
    }

    function sameDestination(a, b) {
        return a && b &&
            a.type === b.type &&
            a.column === b.column;
    }

    function renderTop() {
        const stock = $("solStock");
        const waste = $("solWaste");

        stock.innerHTML = "";
        waste.innerHTML = "";

        if (state.stock.length) {
            stock.append(makeCard({ faceUp: false }));
        } else if (
            state.game === "klondike" &&
            state.waste.length
        ) {
            stock.textContent = "↻";
        } else if (state.game === "spider") {
            stock.textContent = "✓";
        }

        if (state.game === "klondike" &&
            state.waste.length) {
            const source = { type: "waste" };
            const card = makeCard(
                state.waste.at(-1),
                same(selected, source)
            );
            attachCard(card, source);
            waste.append(card);
        }

        document.querySelectorAll("[data-foundation]")
            .forEach(el => {
                const column = Number(el.dataset.foundation);
                const pile = state.foundations[column];
                const source = {
                    type: "foundation", column
                };
                const destination = {
                    type: "foundation", column
                };

                // Use replaceWith to avoid duplicate listeners.
                const fresh = el.cloneNode(false);
                el.replaceWith(fresh);

                renderSlot(
                    fresh, pile.at(-1),
                    source, destination
                );
            });

        document.querySelectorAll("[data-freecell]")
            .forEach(el => {
                const column = Number(el.dataset.freecell);
                const source = { type: "freecell", column };
                const destination = {
                    type: "freecell", column
                };

                const fresh = el.cloneNode(false);
                el.replaceWith(fresh);

                renderSlot(
                    fresh, state.freecells[column],
                    source, destination
                );
            });
    }

    function renderTableau() {
        const board = $("solTableau");
        board.innerHTML = "";

        board.className = "sol-tableau";

        if (state.game === "freecell") {
            board.classList.add("eight-columns");
        }
        if (state.game === "spider") {
            board.classList.add("ten-columns");
        }

        state.tableau.forEach((pile, column) => {
            const el = document.createElement("div");
            el.className = "sol-column";

            const destination = {
                type: "tableau", column
            };

            if (hint && sameDestination(
                hint.destination, destination
            )) {
                el.classList.add("hint-target");
            }

            let top = 0;

            pile.forEach((card, index) => {
                const source = {
                    type: "tableau", column, index
                };

                const cardEl = makeCard(
                    card, same(selected, source)
                );

                cardEl.style.top = top + "px";
                cardEl.style.zIndex = index + 1;

                if (hint && same(hint.source, source)) {
                    cardEl.classList.add("hint-source");
                }

                if (card.faceUp) {
                    attachCard(cardEl, source);
                }

                el.append(cardEl);
                top += card.faceUp ? 29 : 18;
            });

            const last = pile.at(-1);
            const offset = last
                ? (last.faceUp ? 29 : 18) : 0;

            el.style.minHeight =
                `calc(var(--card-height) + ${Math.max(
                    0, top - offset
                )}px)`;

            attachDestination(el, destination);
            board.append(el);
        });
    }

    function render() {
        applySettings();
        renderTop();
        renderTableau();
        updateStats();
    }

    function newGame() {
        state = createGame(settings.game);
        initialState = clone(state);
        history = [];
        seconds = 0;
        selected = null;
        hint = null;
        dragging = null;

        render();
        message(`New ${gameName()} game started!`);
        save();
    }

    function restart() {
        if (!confirm("Restart this exact game?")) return;
        state = clone(initialState);
        history = [];
        seconds = 0;
        selected = null;
        hint = null;
        render();
        message("Game restarted.");
        save();
    }

    function undo() {
        if (!history.length) return;

        const previous = history.pop();
        state = previous.state;
        seconds = previous.seconds;
        selected = null;
        hint = null;
        dragging = null;

        render();
        message("Last move undone.");
        save();
    }

    function drawKlondike() {
        if (state.won) return;

        if (state.stock.length) {
            remember();

            const amount = Number(settings.drawMode);
            for (
                let i = 0;
                i < amount && state.stock.length;
                i++
            ) {
                const card = state.stock.pop();
                card.faceUp = true;
                state.waste.push(card);
            }

            state.moves++;
            message("Cards drawn.");
        } else if (state.waste.length) {
            remember();

            state.stock = state.waste
                .reverse()
                .map(card => ({
                    ...card, faceUp: false
                }));

            state.waste = [];
            state.moves++;
            message("Stock recycled.");
        } else {
            return;
        }

        selected = null;
        hint = null;
        render();
        save();
    }

    function dealSpider() {
        if (
            state.won ||
            state.stock.length < 10
        ) return;

        if (
            state.tableau.some(pile => !pile.length)
        ) {
            message(
                "Fill every empty column before dealing."
            );
            return;
        }

        remember();

        for (const pile of state.tableau) {
            const card = state.stock.pop();
            card.faceUp = true;
            pile.push(card);
        }

        state.moves++;
        state.score = Math.max(0, state.score - 5);
        selected = null;
        hint = null;

        clearSpiderRuns();
        checkWin();
        render();
        save();
        message("Ten new Spider cards dealt.");
    }

    function sources() {
        const result = [];

        if (state.game === "klondike" &&
            state.waste.length) {
            result.push({ type: "waste" });
        }

        if (state.game !== "spider") {
            state.foundations.forEach((pile, column) => {
                if (pile.length) {
                    result.push({
                        type: "foundation", column
                    });
                }
            });
        }

        if (state.game === "freecell") {
            state.freecells.forEach((card, column) => {
                if (card) {
                    result.push({
                        type: "freecell", column
                    });
                }
            });
        }

        state.tableau.forEach((pile, column) => {
            pile.forEach((card, index) => {
                if (card.faceUp) {
                    result.push({
                        type: "tableau", column, index
                    });
                }
            });
        });

        return result;
    }

    function findHint() {
        const all = sources();

        // Prefer foundation moves.
        if (state.game !== "spider") {
            for (const source of all) {
                if (source.type === "foundation") continue;

                for (let column = 0; column < 4; column++) {
                    const destination = {
                        type: "foundation", column
                    };
                    if (canMove(source, destination)) {
                        return { source, destination };
                    }
                }
            }
        }

        // Then tableau moves.
        for (const source of all) {
            if (source.type === "foundation") continue;

            for (
                let column = 0;
                column < state.tableau.length;
                column++
            ) {
                const destination = {
                    type: "tableau", column
                };

                if (!canMove(source, destination)) continue;

                // Avoid moving an entire pile to an empty
                // column when that move reveals nothing.
                if (
                    source.type === "tableau" &&
                    source.index === 0 &&
                    !state.tableau[column].length
                ) continue;

                return { source, destination };
            }
        }

        // FreeCell: show an available free cell.
        if (state.game === "freecell") {
            for (const source of all) {
                if (source.type !== "tableau") continue;

                for (let column = 0; column < 4; column++) {
                    const destination = {
                        type: "freecell", column
                    };

                    if (canMove(source, destination)) {
                        return { source, destination };
                    }
                }
            }
        }

        return null;
    }

    function showHint() {
        hint = findHint();
        selected = null;

        if (hint) {
            const card = sourceCards(hint.source)[0];
            message(
                `Hint: Try moving ${label(card)}.`
            );
            render();
        } else if (
            state.stock.length &&
            state.game !== "freecell"
        ) {
            message("Try dealing more cards.");
        } else {
            message("No available hint. Try Undo.");
        }
    }

    function openDialog(title, html, button, action) {
        $("solDialogTitle").textContent = title;
        $("solDialogText").innerHTML = html;
        $("solDialogButton").textContent = button;
        dialogAction = action;
        $("solOverlay").classList.remove("hidden");
    }

    function showHelp() {
        let html = "";

        if (state.game === "klondike") {
            html = `
                <p>Build four foundations from Ace to King
                in the same suit.</p>
                <p>On the board, stack cards in descending
                order with alternating colors.</p>
                <p>Only Kings may enter empty columns.</p>
                <p>Draw 1 or 3 cards from the stock.</p>
            `;
        }

        if (state.game === "spider") {
            html = `
                <p>Build descending sequences from
                King to Ace.</p>
                <p>Cards may be placed on the next higher
                rank regardless of suit.</p>
                <p>Only same-suit descending sequences
                can move together.</p>
                <p>A complete same-suit King-to-Ace run
                is removed automatically.</p>
                <p>Remove all eight runs to win.</p>
                <p>Click the stock to deal ten cards.
                All columns must contain a card.</p>
            `;
        }

        if (state.game === "freecell") {
            html = `
                <p>Move all 52 cards to the foundations
                from Ace to King by suit.</p>
                <p>Build tableau columns in descending
                rank with alternating colors.</p>
                <p>Use the four free cells as temporary
                storage for one card each.</p>
                <p>Empty columns can hold any card.</p>
                <p>Multiple-card moves depend on the
                number of empty free cells and columns.</p>
            `;
        }

        html += `
            <p>Click a card and then its destination,
            or drag and drop cards.</p>
            <p>Use Hint, Undo, Restart, and New Game
            from the toolbar.</p>
        `;

        openDialog(
            `How to Play ${gameName()}`,
            html,
            "Continue Playing",
            () => { }
        );
    }

    // Stock button
    $("solStock").addEventListener("click", () => {
        if (state.game === "klondike") drawKlondike();
        if (state.game === "spider") dealSpider();
    });

    // Waste is a card source, not a destination.
    $("solWaste").addEventListener("click", () => {
        if (state.game === "klondike" &&
            state.waste.length) {
            clickSource({ type: "waste" });
        }
    });

    // Game selection
    document.querySelectorAll("[data-game]")
        .forEach(button => {
            button.addEventListener("click", () => {
                const game = button.dataset.game;
                if (game === state.game) return;

                if (!confirm(
                    "Switch games? Your current game " +
                    "will be replaced."
                )) return;

                settings.game = game;
                newGame();
            });
        });

    $("solNew").addEventListener("click", () => {
        if (confirm("Start a new game?")) newGame();
    });

    $("solRestart").addEventListener("click", restart);
    $("solUndo").addEventListener("click", undo);
    $("solHint").addEventListener("click", showHint);
    $("solHelp").addEventListener("click", showHelp);

    $("solDialogButton").addEventListener("click", () => {
        $("solOverlay").classList.add("hidden");
        const action = dialogAction;
        dialogAction = null;
        if (action) action();
    });

    $("solTheme").addEventListener("change", event => {
        settings.theme = event.target.value;
        render();
        save();
    });

    $("solCardBack").addEventListener("change", event => {
        settings.cardBack = event.target.value;
        render();
        save();
    });

    $("solDrawMode").addEventListener("change", event => {
        if (
            state.moves &&
            !confirm("Changing draw mode starts a new game.")
        ) {
            event.target.value = settings.drawMode;
            return;
        }

        settings.drawMode = event.target.value;
        newGame();
    });

    $("solSpiderSuits").addEventListener("change", event => {
        if (
            state.moves &&
            !confirm("Changing difficulty starts a new game.")
        ) {
            event.target.value = settings.spiderSuits;
            return;
        }

        settings.spiderSuits = event.target.value;
        newGame();
    });

    setInterval(() => {
        if (
            state &&
            !state.won &&
            state.moves > 0 &&
            $("solOverlay").classList.contains("hidden")
        ) {
            seconds++;
            updateStats();
            save();
        }
    }, 1000);

    // Restore browser progress or start a new game.
    if (!load()) {
        newGame();
    } else {
        render();
        message("Welcome back! Your game was restored.");
    }
})();


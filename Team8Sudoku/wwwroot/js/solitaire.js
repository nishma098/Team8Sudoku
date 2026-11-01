
(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    if (!$("solTableau")) return;

    const SUITS = ["♠", "♥", "♣", "♦"];
    const RANKS = [
        "", "A", "2", "3", "4", "5", "6",
        "7", "8", "9", "10", "J", "Q", "K"
    ];

    const SETTINGS_KEY = "team8-card-settings-v1";

    const DEFAULT_SETTINGS = {
        drawMode: "1",
        theme: "sakura",
        cardBack: "purple"
    };

    function loadSettings() {
        try {
            return {
                ...DEFAULT_SETTINGS,
                ...JSON.parse(localStorage.getItem(SETTINGS_KEY))
            };
        } catch {
            return { ...DEFAULT_SETTINGS };
        }
    }

    let settings = loadSettings();

    let stock = [];
    let waste = [];
    let tableau = [];
    let foundations = [];

    let selected = null;
    let dragging = null;
    let hintMove = null;
    let history = [];

    let score = 0;
    let moves = 0;
    let seconds = 0;
    let started = false;
    let won = false;
    let dialogAction = null;

    function isRed(card) {
        return card.suit === "♥" || card.suit === "♦";
    }

    function label(card) {
        return RANKS[card.rank] + card.suit;
    }

    function saveSettings() {
        localStorage.setItem(
            SETTINGS_KEY,
            JSON.stringify(settings)
        );
    }

    function applySettings() {
        const app = $("cardGameApp");

        const themes = ["sakura", "green", "midnight"];
        const backs = ["purple", "pink", "blue", "classic"];

        if (!themes.includes(settings.theme)) {
            settings.theme = "sakura";
        }

        if (!backs.includes(settings.cardBack)) {
            settings.cardBack = "purple";
        }

        if (!["1", "3"].includes(settings.drawMode)) {
            settings.drawMode = "1";
        }

        app.classList.remove(
            "theme-sakura",
            "theme-green",
            "theme-midnight",
            "back-purple",
            "back-pink",
            "back-blue",
            "back-classic"
        );

        app.classList.add("theme-" + settings.theme);
        app.classList.add("back-" + settings.cardBack);

        $("solDrawMode").value = settings.drawMode;
        $("solTheme").value = settings.theme;
        $("solCardBack").value = settings.cardBack;
    }

    function createDeck() {
        const deck = [];

        for (const suit of SUITS) {
            for (let rank = 1; rank <= 13; rank++) {
                deck.push({
                    suit,
                    rank,
                    faceUp: false
                });
            }
        }

        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    }

    function snapshot() {
        return JSON.parse(JSON.stringify({
            stock,
            waste,
            tableau,
            foundations,
            score,
            moves,
            started
        }));
    }

    function rememberMove() {
        history.push(snapshot());

        if (history.length > 150) {
            history.shift();
        }
    }

    function message(text) {
        $("solMessage").textContent = text;
    }

    function updateStats() {
        $("solScore").textContent = score;
        $("solMoves").textContent = moves;
        $("solUndo").disabled = history.length === 0;

        const minutes = String(
            Math.floor(seconds / 60)
        ).padStart(2, "0");

        const remainder = String(
            seconds % 60
        ).padStart(2, "0");

        $("solTimer").textContent =
            `${minutes}:${remainder}`;
    }

    function createCard(card, highlighted = false) {
        const element = document.createElement("div");
        element.className = "sol-card";

        if (!card.faceUp) {
            element.classList.add("face-down");
            element.draggable = false;

            const back = document.createElement("span");
            back.className = "sol-card-back";
            back.textContent =
                settings.cardBack === "classic" ? "♠" : "✿";

            element.appendChild(back);
            return element;
        }

        if (isRed(card)) {
            element.classList.add("red");
        }

        if (highlighted) {
            element.classList.add("selected");
        }

        const corner = document.createElement("span");
        corner.className = "sol-card-corner";
        corner.textContent = label(card);

        const center = document.createElement("span");
        center.className = "sol-card-center";
        center.textContent = card.suit;

        element.append(corner, center);
        element.draggable = true;

        return element;
    }

    function getSourceCards(source) {
        if (!source) return [];

        if (source.type === "waste") {
            return waste.length
                ? [waste[waste.length - 1]]
                : [];
        }

        if (source.type === "foundation") {
            const pile = foundations[source.column];

            return pile.length
                ? [pile[pile.length - 1]]
                : [];
        }

        if (source.type === "tableau") {
            return tableau[source.column].slice(source.index);
        }

        return [];
    }

    function validSequence(cards) {
        if (
            !cards.length ||
            cards.some(card => !card.faceUp)
        ) {
            return false;
        }

        for (let i = 0; i < cards.length - 1; i++) {
            const first = cards[i];
            const next = cards[i + 1];

            if (
                first.rank !== next.rank + 1 ||
                isRed(first) === isRed(next)
            ) {
                return false;
            }
        }

        return true;
    }

    function canMove(source, destination) {
        if (!source || !destination) return false;

        if (
            source.type === destination.type &&
            source.column === destination.column
        ) {
            return false;
        }

        const cards = getSourceCards(source);

        if (!validSequence(cards)) return false;

        if (destination.type === "tableau") {
            const pile = tableau[destination.column];

            if (!pile.length) {
                return cards[0].rank === 13;
            }

            const last = pile[pile.length - 1];

            return last.faceUp &&
                last.rank === cards[0].rank + 1 &&
                isRed(last) !== isRed(cards[0]);
        }

        if (destination.type === "foundation") {
            if (cards.length !== 1) return false;

            const card = cards[0];
            const pile = foundations[destination.column];

            if (!pile.length) {
                return card.rank === 1;
            }

            const last = pile[pile.length - 1];

            return card.suit === last.suit &&
                card.rank === last.rank + 1;
        }

        return false;
    }

    function removeSource(source) {
        if (source.type === "waste") {
            return [waste.pop()];
        }

        if (source.type === "foundation") {
            return [foundations[source.column].pop()];
        }

        const pile = tableau[source.column];
        const cards = pile.splice(source.index);

        if (
            pile.length &&
            !pile[pile.length - 1].faceUp
        ) {
            pile[pile.length - 1].faceUp = true;
            score += 5;
        }

        return cards;
    }

    function moveCards(source, destination) {
        if (won || !canMove(source, destination)) {
            return false;
        }

        rememberMove();

        const cards = removeSource(source);

        if (destination.type === "tableau") {
            tableau[destination.column].push(...cards);
            score += 5;
        } else {
            foundations[destination.column].push(...cards);
            score += 10;
        }

        if (source.type === "foundation") {
            score = Math.max(0, score - 15);
        }

        moves++;
        started = true;
        selected = null;
        dragging = null;
        hintMove = null;

        message("Nice move!");
        render();
        checkWin();

        return true;
    }

    function selectSource(source) {
        const cards = getSourceCards(source);

        if (!validSequence(cards)) {
            message("Select a valid face-up card or sequence.");
            return false;
        }

        selected = { ...source };
        hintMove = null;
        message("Choose where to move the card.");
        render();

        return true;
    }

    function handleSourceClick(source) {
        if (won) return;

        if (selected) {
            if (
                selected.type === source.type &&
                selected.column === source.column &&
                selected.index === source.index
            ) {
                selected = null;
                render();
                return;
            }

            if (source.type === "tableau") {
                if (moveCards(selected, {
                    type: "tableau",
                    column: source.column
                })) return;
            }

            if (source.type === "foundation") {
                if (moveCards(selected, {
                    type: "foundation",
                    column: source.column
                })) return;
            }
        }

        selectSource(source);
    }

    function handleDestination(destination) {
        if (won) return;

        if (selected && moveCards(selected, destination)) {
            return;
        }

        if (
            destination.type === "foundation" &&
            foundations[destination.column].length
        ) {
            selectSource({
                type: "foundation",
                column: destination.column
            });
        } else if (selected) {
            message("That move is not allowed.");
        }
    }

    function attachDragSource(element, source) {
        element.draggable = true;

        element.addEventListener("dragstart", event => {
            if (won || !validSequence(getSourceCards(source))) {
                event.preventDefault();
                return;
            }

            selected = { ...source };
            dragging = { ...source };
            hintMove = null;

            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(
                "text/plain",
                "team8-card"
            );

            element.classList.add("dragging");
        });

        element.addEventListener("dragend", () => {
            dragging = null;

            document.querySelectorAll(".drop-target")
                .forEach(el => el.classList.remove("drop-target"));

            element.classList.remove("dragging");
        });
    }

    function attachDropTarget(element, destination) {
        element.addEventListener("dragover", event => {
            if (!dragging || won) return;

            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            element.classList.add("drop-target");
        });

        element.addEventListener("dragleave", event => {
            if (!element.contains(event.relatedTarget)) {
                element.classList.remove("drop-target");
            }
        });

        element.addEventListener("drop", event => {
            if (!dragging || won) return;

            event.preventDefault();
            event.stopPropagation();

            const source = { ...dragging };
            const moved = moveCards(source, destination);

            if (!moved) {
                selected = null;
                dragging = null;
                message("That card cannot move there.");
                render();
            }
        });
    }

    function isSelected(source) {
        return selected &&
            selected.type === source.type &&
            selected.column === source.column &&
            selected.index === source.index;
    }

    function isHintSource(source) {
        return hintMove &&
            hintMove.source.type === source.type &&
            hintMove.source.column === source.column &&
            hintMove.source.index === source.index;
    }

    function isHintDestination(destination) {
        return hintMove &&
            hintMove.destination.type === destination.type &&
            hintMove.destination.column === destination.column;
    }

    function render() {
        const stockElement = $("solStock");
        const wasteElement = $("solWaste");

        stockElement.innerHTML = "";
        wasteElement.innerHTML = "";

        if (stock.length) {
            stockElement.appendChild(
                createCard({ faceUp: false })
            );
        } else if (waste.length) {
            stockElement.textContent = "↻";
        }

        if (waste.length) {
            const source = { type: "waste" };
            const card = createCard(
                waste[waste.length - 1],
                isSelected(source)
            );

            if (isHintSource(source)) {
                card.classList.add("hint-source");
            }

            attachDragSource(card, source);
            wasteElement.appendChild(card);
        }

        if (isHintDestination({ type: "waste" })) {
            wasteElement.classList.add("hint-target");
        } else {
            wasteElement.classList.remove("hint-target");
        }

        document.querySelectorAll("[data-foundation]")
            .forEach(element => {
                const column = Number(
                    element.dataset.foundation
                );

                const destination = {
                    type: "foundation",
                    column
                };

                element.innerHTML = "";
                element.classList.toggle(
                    "hint-target",
                    Boolean(isHintDestination(destination))
                );

                const pile = foundations[column];

                if (pile.length) {
                    const source = {
                        type: "foundation",
                        column
                    };

                    const card = createCard(
                        pile[pile.length - 1],
                        isSelected(source)
                    );

                    if (isHintSource(source)) {
                        card.classList.add("hint-source");
                    }

                    attachDragSource(card, source);
                    element.appendChild(card);
                } else {
                    element.textContent = "A";
                }
            });

        const board = $("solTableau");
        board.innerHTML = "";

        for (let column = 0; column < 7; column++) {
            const element = document.createElement("div");
            element.className = "sol-column";

            const destination = {
                type: "tableau",
                column
            };

            if (isHintDestination(destination)) {
                element.classList.add("hint-target");
            }

            let top = 0;

            tableau[column].forEach((card, index) => {
                const source = {
                    type: "tableau",
                    column,
                    index
                };

                const cardElement = createCard(
                    card,
                    isSelected(source)
                );

                cardElement.style.top = top + "px";
                cardElement.style.zIndex = index + 1;

                if (isHintSource(source)) {
                    cardElement.classList.add("hint-source");
                }

                if (card.faceUp) {
                    attachDragSource(cardElement, source);
                }

                cardElement.addEventListener("click", event => {
                    event.stopPropagation();
                    handleSourceClick(source);
                });

                element.appendChild(cardElement);

                top += card.faceUp ? 29 : 18;
            });

            const lastCard = tableau[column].at(-1);

            const lastOffset = lastCard
                ? (lastCard.faceUp ? 29 : 18)
                : 0;

            const lastTop = Math.max(0, top - lastOffset);

            element.style.minHeight =
                `calc(var(--card-height) + ${lastTop}px)`;

            element.addEventListener("click", () => {
                handleDestination(destination);
            });

            attachDropTarget(element, destination);
            board.appendChild(element);
        }

        updateStats();
    }

    function newGame() {
        const deck = createDeck();

        stock = [];
        waste = [];
        tableau = Array.from({ length: 7 }, () => []);
        foundations = Array.from({ length: 4 }, () => []);

        selected = null;
        dragging = null;
        hintMove = null;
        history = [];

        score = 0;
        moves = 0;
        seconds = 0;
        started = false;
        won = false;

        for (let column = 0; column < 7; column++) {
            for (let index = 0; index <= column; index++) {
                const card = deck.pop();
                card.faceUp = index === column;
                tableau[column].push(card);
            }
        }

        stock = deck;

        message("New game! Select or drag a card.");
        render();
    }

    function drawCards() {
        if (won) return;

        if (stock.length) {
            rememberMove();

            const amount = Number(settings.drawMode);

            for (let i = 0; i < amount && stock.length; i++) {
                const card = stock.pop();
                card.faceUp = true;
                waste.push(card);
            }

            moves++;
            started = true;
            selected = null;
            hintMove = null;

            message(
                amount === 1
                    ? "One card drawn."
                    : "Up to three cards drawn."
            );
        } else if (waste.length) {
            rememberMove();

            stock = waste.reverse().map(card => ({
                ...card,
                faceUp: false
            }));

            waste = [];
            moves++;
            selected = null;
            hintMove = null;

            message("Draw pile recycled.");
        } else {
            message("No cards left to draw.");
        }

        render();
    }

    function undo() {
        if (!history.length || won) return;

        const previous = history.pop();

        stock = previous.stock;
        waste = previous.waste;
        tableau = previous.tableau;
        foundations = previous.foundations;
        score = previous.score;
        moves = previous.moves;
        started = previous.started;

        selected = null;
        dragging = null;
        hintMove = null;

        message("Last move undone.");
        render();
    }

    function possibleSources() {
        const sources = [];

        if (waste.length) {
            sources.push({ type: "waste" });
        }

        for (let column = 0; column < 7; column++) {
            const pile = tableau[column];

            for (let index = 0; index < pile.length; index++) {
                if (pile[index].faceUp) {
                    sources.push({
                        type: "tableau",
                        column,
                        index
                    });
                }
            }
        }

        for (let column = 0; column < 4; column++) {
            if (foundations[column].length) {
                sources.push({
                    type: "foundation",
                    column
                });
            }
        }

        return sources;
    }

    function findHint() {
        const sources = possibleSources();

        // Prefer moves to foundations.
        for (const source of sources) {
            if (source.type === "foundation") continue;

            for (let column = 0; column < 4; column++) {
                const destination = {
                    type: "foundation",
                    column
                };

                if (canMove(source, destination)) {
                    return { source, destination };
                }
            }
        }

        // Then moves between tableau columns.
        for (const source of sources) {
            if (source.type === "foundation") continue;

            for (let column = 0; column < 7; column++) {
                const destination = {
                    type: "tableau",
                    column
                };

                if (!canMove(source, destination)) continue;

                // Avoid suggesting moving an entire King pile
                // from one empty column to another.
                if (
                    source.type === "tableau" &&
                    source.index === 0 &&
                    tableau[source.column].length ===
                    getSourceCards(source).length &&
                    tableau[column].length === 0
                ) {
                    continue;
                }

                return { source, destination };
            }
        }

        return null;
    }

    function showHint() {
        if (won) return;

        hintMove = findHint();
        selected = null;

        if (hintMove) {
            const cards = getSourceCards(hintMove.source);
            const targetName = hintMove.destination.type === "foundation"
                ? "foundation"
                : "column " + (hintMove.destination.column + 1);

            message(
                `Hint: Move ${label(cards[0])} to ${targetName}.`
            );

            render();
        } else if (stock.length || waste.length) {
            message("No useful move found. Try drawing a card.");
        } else {
            message("No move found. Try Undo or New Game.");
        }
    }

    function checkWin() {
        const total = foundations.reduce(
            (sum, pile) => sum + pile.length,
            0
        );

        if (total !== 52) return;

        won = true;
        score += 500;
        render();

        openDialog(
            "🏆 You Won!",
            "<p>Congratulations! All 52 cards are in the foundations.</p>" +
            `<p>Final Score: <strong>${score}</strong></p>` +
            "<p>Ready for another challenge?</p>",
            "New Game",
            newGame
        );
    }

    function openDialog(title, html, buttonText, action) {
        $("solDialogTitle").textContent = title;
        $("solDialogText").innerHTML = html;
        $("solDialogButton").textContent = buttonText;
        dialogAction = action;

        $("solOverlay").classList.remove("hidden");
    }

    // Game controls

    $("solStock").addEventListener("click", drawCards);

    $("solWaste").addEventListener("click", () => {
        handleSourceClick({ type: "waste" });
    });

    document.querySelectorAll("[data-foundation]")
        .forEach(element => {
            const column = Number(
                element.dataset.foundation
            );

            const destination = {
                type: "foundation",
                column
            };

            element.addEventListener("click", () => {
                handleDestination(destination);
            });

            attachDropTarget(element, destination);
        });

    $("solNew").addEventListener("click", () => {
        if (confirm("Start a new Solitaire game?")) {
            newGame();
        }
    });

    $("solUndo").addEventListener("click", undo);
    $("solHint").addEventListener("click", showHint);

    $("solHelp").addEventListener("click", () => {
        openDialog(
            "How to Play Solitaire",
            "<p>Move all 52 cards to four foundations.</p>" +
            "<p>Foundations build Ace to King in the same suit.</p>" +
            "<p>In the seven columns, stack cards in descending " +
            "order with alternating colors.</p>" +
            "<p>Only Kings can move to empty columns.</p>" +
            "<p>Drag cards or click a card and its destination.</p>" +
            "<p>Use Hint for a possible move. " +
            "Draw Mode controls how many cards you turn over.</p>",
            "Continue Playing",
            () => { }
        );
    });

    $("solDialogButton").addEventListener("click", () => {
        $("solOverlay").classList.add("hidden");

        const action = dialogAction;
        dialogAction = null;

        if (action) action();
    });

    // Customization

    $("solTheme").addEventListener("change", event => {
        settings.theme = event.target.value;
        saveSettings();
        applySettings();
        message("Background theme updated.");
    });

    $("solCardBack").addEventListener("change", event => {
        settings.cardBack = event.target.value;
        saveSettings();
        applySettings();
        render();
        message("Card design updated.");
    });

    $("solDrawMode").addEventListener("change", event => {
        const nextMode = event.target.value;

        if (
            moves > 0 &&
            !confirm("Changing Draw Mode starts a new game. Continue?")
        ) {
            event.target.value = settings.drawMode;
            return;
        }

        settings.drawMode = nextMode;
        saveSettings();
        newGame();
        message("Draw Mode updated. New game started.");
    });

    // Timer

    setInterval(() => {
        if (
            started &&
            !won &&
            $("solOverlay").classList.contains("hidden")
        ) {
            seconds++;
            updateStats();
        }
    }, 1000);

    applySettings();
    newGame();
})();

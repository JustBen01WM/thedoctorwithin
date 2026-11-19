"use strict";

/* =========================================
   THE DOCTOR WITHIN
   MEDICAL MATCH - SPECIAL POWER-UP ENGINE
========================================= */

const $ = (id) => document.getElementById(id);

const SIZE = 9;
const SAVE_KEY = "doctorWithinMedicalMatch";

const TILE_TYPES = [
  { emoji: "❤️", name: "Heart" },
  { emoji: "💧", name: "Water drop" },
  { emoji: "💊", name: "Medicine" },
  { emoji: "🩺", name: "Stethoscope" },
  { emoji: "⭐", name: "Star" },
  { emoji: "🧬", name: "DNA" },
  { emoji: "🩹", name: "Bandage" },
  { emoji: "🌡️", name: "Thermometer" },
];

const SPECIALS = {
  row: "⚡",
  bomb: "💥",
  rainbow: "🌈"
};

let board = [];
let selectedTile = null;
let busy = false;
let levelFinished = false;
let gameRunId = 0;

let moves = 20;
let score = 0;
let heartsCollected = 0;
let targetHearts = 20;
let bestCombo = 0;
let currentCombo = 0;
let level = 1;

let coins = 0;
let totalXP = 0;
let achievements = [];
let bossTimerInterval = null;
let bossTimeLeft = 300;
let bossTimerStarted = false;
let returnLevel = null;
let unlockedLevel = 1;

/* =====================================
   DR AFOR - MEDICAL CAREER SYSTEM
===================================== */

const CAREER_RANKS = [
  {
    name: "Medical Student",
    minXP: 0,
    icon: "🎓"
  },
  {
    name: "Junior Doctor",
    minXP: 500,
    icon: "🩺"
  },
  {
    name: "Resident Doctor",
    minXP: 1500,
    icon: "🏥"
  },
  {
    name: "Senior Specialist",
    minXP: 3500,
    icon: "⚕️"
  },
  {
    name: "Chief Medical Officer",
    minXP: 7000,
    icon: "👑"
  }
];

function getCareerRank() {
  let currentRank = CAREER_RANKS[0];

  for (const rank of CAREER_RANKS) {
    if (totalXP >= rank.minXP) {
      currentRank = rank;
    }
  }

  return currentRank;
}

function getNextCareerRank() {
  return CAREER_RANKS.find(
    rank => totalXP < rank.minXP
  ) || null;
}

function updateCareerDisplay() {
  const currentRank = getCareerRank();
  const nextRank = getNextCareerRank();

  $("careerRankName").textContent = currentRank.name;
  $("careerXP").textContent = totalXP;

  if (!nextRank) {
    $("careerNextRank").textContent = "Highest medical rank achieved!";
    $("careerProgress").style.width = "100%";
    $("careerProgressText").textContent = "CAREER COMPLETE";
    return;
  }

  const xpNeeded = nextRank.minXP - currentRank.minXP;
  const xpEarned = totalXP - currentRank.minXP;

  const progress = Math.min(
    100,
    Math.max(0, (xpEarned / xpNeeded) * 100)
  );

  $("careerNextRank").textContent = "Next: " + nextRank.name;
  $("careerProgress").style.width = progress + "%";

  $("careerProgressText").textContent =
    `${xpEarned} / ${xpNeeded} XP to next rank`;
}

let soundEnabled = true;
let musicEnabled = true;
let audioContext = null;

let musicTimer = null;
let musicStep = 0;
let musicMode = "normal";
let mapOpenedFromResult = false;

/* =========================================
   SMALL HELPERS
========================================= */

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function indexOf(row, col) {
  return row * SIZE + col;
}

function coordinates(index) {
  return {
    row: Math.floor(index / SIZE),
    col: index % SIZE
  };
}

function randomType() {
  const roll = Math.random();

  if (roll < 0.25) return 0; // Heart — 25%

  return 1 + Math.floor(Math.random() * 7);
}

function makeTile(type = randomType(), special = null) {
  return { type, special };
}

function cloneTile(tile) {
  return tile ? { ...tile } : null;
}

/* =========================================
   SAVE SYSTEM
========================================= */

function loadSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));

    if (saved && typeof saved === "object") {
      coins = Math.max(0, Number(saved.coins) || 0);
      totalXP = Math.max(0, Number(saved.xp) || 0);
      level = Math.max(1, Number(saved.level) || 1);
      unlockedLevel = Math.max(
  level,
  Number(saved.unlockedLevel) || level
);
      achievements = Array.isArray(saved.achievements)
  ? saved.achievements
  : [];
    }
  } catch (error) {
    console.warn("Could not load Medical Match progress.", error);
  }

  updateCoinDisplay();
}


function updateCoinDisplay() {
  $("coinCount").textContent = coins.toLocaleString();
}

const achievementDetails = {
  heartHealer: {
    name: "Heart Healer",
    emoji: "❤️",
    description: "Complete your first level!"
  },
  comboQueen: {
    name: "Combo Queen",
    emoji: "🔥",
    description: "Reach a 5x combo!"
  },
  risingDoctor: {
    name: "Rising Doctor",
    emoji: "🩺",
    description: "Reach Level 5!"
  },
  bossSlayer: {
    name: "Boss Champion Trophy",
    emoji: "🏆",
    description: "Defeat a Boss Level and claim your trophy!"
  },
  medicalLegend: {
    name: "Medical Legend",
    emoji: "💎",
    description: "Complete 10 levels!"
  }
};
function unlockAchievement(id) {
  if (achievements.includes(id)) return;

  const achievement = achievementDetails[id];
  if (!achievement) return;

  achievements.push(id);

  saveProgress();
  renderAchievements();

  $("gameMessage").textContent =
    `${achievement.emoji} ACHIEVEMENT UNLOCKED: ${achievement.name}!`;

  playArcadeSound("achievement");
}

function renderAchievements() {
  const list = $("achievementList");

  $("achievementCount").textContent =
    `${achievements.length}/${Object.keys(achievementDetails).length}`;

  list.innerHTML = Object.entries(achievementDetails)
    .map(([id, achievement]) => {
      const unlocked = achievements.includes(id);

      return `
        <div class="achievement-item ${unlocked ? "unlocked" : "locked"} ${id === "bossSlayer" && unlocked ? "boss-trophy-award" : ""}">
          <div class="achievement-icon">${achievement.emoji}</div>
          <div class="achievement-info">
            <strong>${achievement.name}</strong>
            <small>${unlocked ? "✓ Unlocked!" : achievement.description}</small>
          </div>
          <span>${unlocked ? "🏅" : "🔒"}</span>
        </div>
      `;
    })
    .join("");
}

$("quickAchievementButton").addEventListener("click", () => {
  renderAchievements();
  $("achievementOverlay").classList.remove("hidden");
});

$("closeAchievementButton").addEventListener("click", () => {
  $("achievementOverlay").classList.add("hidden");
});

function saveProgress() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      coins,
      xp: totalXP,
      level,
      unlockedLevel,
      heartsCollected,
      targetHearts,
      completedDestinations: Math.min(level - 1, 6),
      achievements
    }));
  } catch (error) {
    console.warn("Could not save Medical Match progress.", error);
  }
}

/* =========================================
   DR AFOR — RESTART JOURNEY
========================================= */

function restartAforJourney() {
  const confirmed = confirm(
    "Dr Afor, are you sure you want to restart from Level 1? Your coins and XP will be preserved."
  );

  if (!confirmed) return;

  level = 1;
  heartsCollected = 0;
  score = 0;
  currentCombo = 0;
  bestCombo = 0;
  selectedTile = null;
  busy = false;
  levelFinished = false;

  saveProgress();

  startLevel();
}

/* =========================================
   SOUND
========================================= */

function playSound(frequency = 500, duration = 0.08) {
  if (!soundEnabled) return;

  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    audioContext ||= new AudioContextClass();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.07, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    // Sound is optional.
  }
}


/* =========================================
   MEDICAL MATCH — ARCADE SOUND ENGINE
========================================= */

function playArcadeSound(type) {
  if (!soundEnabled) return;

  const soundPatterns = {
    match: [
      [520, 0.07],
      [720, 0.09]
    ],

    combo: [
      [520, 0.08],
      [660, 0.08],
      [820, 0.1],
      [1050, 0.15]
    ],

    bomb: [
      [180, 0.18],
      [110, 0.22]
    ],

    lightning: [
      [1100, 0.05],
      [1450, 0.07],
      [900, 0.08]
    ],

    rainbow: [
      [600, 0.08],
      [800, 0.08],
      [1050, 0.1],
      [1350, 0.16]
    ],

   victory: [
  [523, 0.12],
  [659, 0.12],
  [784, 0.12],
  [1047, 0.25]
],

heart: [
  [660, 0.08],
  [880, 0.12],
  [1100, 0.16]
],

bossVictory: [
  [392, 0.12],
  [523, 0.12],
  [659, 0.12],
  [784, 0.12],
  [1047, 0.18],
  [1318, 0.3]
],

failure: [
  [440, 0.12],
  [349, 0.16],
  [262, 0.25]
],

achievement: [
  [784, 0.09],
  [988, 0.09],
  [1175, 0.12],
  [1568, 0.25]
]
  };

  const pattern = soundPatterns[type];
  if (!pattern) return;

  pattern.forEach(([frequency, duration], index) => {
    setTimeout(() => {
      if (soundEnabled) playSound(frequency, duration);
    }, index * 85);
  });
}

/* =========================================
   DR AFOR — BACKGROUND MUSIC ENGINE
========================================= */

function playMusicNote(frequency, duration = 0.3, volume = 0.025) {
  if (!musicEnabled) return;

  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    audioContext ||= new AudioContextClass();

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + duration
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch (error) {
    // Background music is optional.
  }
}

function stopBackgroundMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}

function startBackgroundMusic(mode = "normal") {
  stopBackgroundMusic();

  if (!musicEnabled) return;

  musicMode = mode;
  musicStep = 0;

  const normalMelody = [
    523, 659, 784, 659,
    587, 698, 880, 698,
    523, 659, 784, 988,
    880, 784, 659, 587
  ];

  const bossMelody = [
    392, 392, 523, 392,
    349, 349, 466, 349,
    392, 523, 659, 523,
    466, 392, 349, 392
  ];

  const melody = mode === "boss"
    ? bossMelody
    : normalMelody;

  musicTimer = setInterval(() => {
    if (!musicEnabled) {
      stopBackgroundMusic();
      return;
    }

    const note = melody[musicStep % melody.length];

    playMusicNote(
      note,
      mode === "boss" ? 0.24 : 0.32,
      mode === "boss" ? 0.035 : 0.022
    );

    if (musicStep % 4 === 0) {
      playMusicNote(
        mode === "boss" ? 98 : 131,
        0.4,
        0.018
      );
    }

    musicStep++;
  }, mode === "boss" ? 300 : 420);
}

$("soundButton").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  $("soundButton").textContent = soundEnabled ? "🔊" : "🔇";

  if (soundEnabled) playSound(650);
});
$("musicButton").addEventListener("click", () => {
  musicEnabled = !musicEnabled;

  $("musicButton").textContent = musicEnabled ? "🎵" : "🔇";

  if (musicEnabled) {
    startBackgroundMusic(musicMode);
  } else {
    stopBackgroundMusic();
  }
});

/* =========================================
   BOARD GENERATION
========================================= */

function hasMatchAt(row, col, type) {
  return (
    (col >= 2 &&
      board[row][col - 1]?.type === type &&
      board[row][col - 2]?.type === type) ||
    (row >= 2 &&
      board[row - 1][col]?.type === type &&
      board[row - 2][col]?.type === type)
  );
}

function generateBoard() {
  let attempts = 0;

  do {
    board = [];

    for (let row = 0; row < SIZE; row++) {
      board[row] = [];

      for (let col = 0; col < SIZE; col++) {
        let tile;

        do {
          tile = makeTile();
        } while (hasMatchAt(row, col, tile.type));

        board[row][col] = tile;
      }
    }

    attempts++;
  } while (!hasPossibleMove() && attempts < 100);
}

/* =========================================
   RENDER BOARD
========================================= */

function renderBoard() {
  const boardElement = $("gameBoard");

  // Create the 81 tile elements only once.
  if (boardElement.children.length !== SIZE * SIZE) {
    boardElement.innerHTML = "";

    for (let i = 0; i < SIZE * SIZE; i++) {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.dataset.index = i;
      tile.dataset.row = Math.floor(i / SIZE);
      tile.dataset.col = i % SIZE;
      boardElement.appendChild(tile);
    }
  }

  // Update only properties that have actually changed.
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const index = indexOf(row, col);
      const tile = boardElement.children[index];
      const tileData = board[row][col];

      let desiredClass = "tile";
      let emoji = "";
      let label = "";

      if (tileData) {
        if (tileData.special) {
          emoji = SPECIALS[tileData.special];
          label = `${tileData.special} power-up`;
          desiredClass += ` special-tile special-${tileData.special}`;
        } else {
          emoji = TILE_TYPES[tileData.type].emoji;
          label = TILE_TYPES[tileData.type].name;
        }
      }

      if (
        selectedTile &&
        selectedTile.row === row &&
        selectedTile.col === col
      ) {
        desiredClass += " selected";
      }

      if (tile.className !== desiredClass) {
        tile.className = desiredClass;
      }

      if (tile.textContent !== emoji) {
        tile.textContent = emoji;
      }

      if (label) {
        if (tile.getAttribute("aria-label") !== label) {
          tile.setAttribute("aria-label", label);
        }
      } else if (tile.hasAttribute("aria-label")) {
        tile.removeAttribute("aria-label");
      }

      const shouldDisable = busy || levelFinished;

      if (tile.disabled !== shouldDisable) {
        tile.disabled = shouldDisable;
      }
    }
  }
}

function getTileElement(row, col) {
  return $("gameBoard").querySelector(
    `[data-index="${indexOf(row, col)}"]`
  );
}

/* =========================================
   FIND MATCH RUNS
========================================= */

function findMatchRuns() {
  const runs = [];

  // Horizontal runs
  for (let row = 0; row < SIZE; row++) {
    let col = 0;

    while (col < SIZE) {
      const tile = board[row][col];

      if (!tile) {
        col++;
        continue;
      }

      const type = tile.type;
      let end = col + 1;

      while (
        end < SIZE &&
        board[row][end] &&
        board[row][end].type === type
      ) {
        end++;
      }

      if (end - col >= 3) {
        const cells = [];

        for (let c = col; c < end; c++) {
          cells.push(indexOf(row, c));
        }

        runs.push({
          type,
          direction: "horizontal",
          cells
        });
      }

      col = end;
    }
  }

  // Vertical runs
  for (let col = 0; col < SIZE; col++) {
    let row = 0;

    while (row < SIZE) {
      const tile = board[row][col];

      if (!tile) {
        row++;
        continue;
      }

      const type = tile.type;
      let end = row + 1;

      while (
        end < SIZE &&
        board[end][col] &&
        board[end][col].type === type
      ) {
        end++;
      }

      if (end - row >= 3) {
        const cells = [];

        for (let r = row; r < end; r++) {
          cells.push(indexOf(r, col));
        }

        runs.push({
          type,
          direction: "vertical",
          cells
        });
      }

      row = end;
    }
  }

  return runs;
}

function findMatches() {
  const matches = new Set();

  for (const run of findMatchRuns()) {
    for (const cell of run.cells) {
      matches.add(cell);
    }
  }

  return matches;
}

/* =========================================
   GROUP MATCHES INTO COMBINATIONS
========================================= */

function getMatchGroups(runs) {
  const groups = [];
  const visited = new Set();

  const cellsByType = new Map();

  for (const run of runs) {
    if (!cellsByType.has(run.type)) {
      cellsByType.set(run.type, new Set());
    }

    for (const cell of run.cells) {
      cellsByType.get(run.type).add(cell);
    }
  }

  for (const [type, cells] of cellsByType) {
    for (const start of cells) {
      if (visited.has(start)) continue;

      const group = [];
      const queue = [start];

      visited.add(start);

      while (queue.length) {
        const current = queue.pop();
        group.push(current);

        const { row, col } = coordinates(current);

        const neighbours = [
          [row - 1, col],
          [row + 1, col],
          [row, col - 1],
          [row, col + 1]
        ];

        for (const [r, c] of neighbours) {
          if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) {
            continue;
          }

          const next = indexOf(r, c);

          if (
            cells.has(next) &&
            !visited.has(next)
          ) {
            visited.add(next);
            queue.push(next);
          }
        }
      }

      groups.push({ type, cells: group });
    }
  }

  return groups;
}

/* =========================================
   DECIDE WHICH POWER-UP TO CREATE
========================================= */

function getSpecialForGroup(group, runs) {
  const cells = new Set(group.cells);

  const horizontalRuns = runs.filter(run =>
    run.direction === "horizontal" &&
    run.type === group.type &&
    run.cells.some(cell => cells.has(cell))
  );

  const verticalRuns = runs.filter(run =>
    run.direction === "vertical" &&
    run.type === group.type &&
    run.cells.some(cell => cells.has(cell))
  );

  // T- and L-shaped intersections create a Heart Bomb.
  if (horizontalRuns.length && verticalRuns.length) {
    return "bomb";
  }

  const longestRun = Math.max(
    0,
    ...horizontalRuns.map(run => run.cells.length),
    ...verticalRuns.map(run => run.cells.length)
  );

  // A straight line of five or more creates a Rainbow Star.
  if (longestRun >= 5) {
    return "rainbow";
  }

  // A straight line of four creates Healing Lightning.
  if (longestRun >= 4) {
    return "row";
  }

  return null;
}

/* =========================================
   FIND VALID MOVES
========================================= */

function hasPossibleMove() {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const nextRow = row + dr;
        const nextCol = col + dc;

        if (nextRow >= SIZE || nextCol >= SIZE) continue;

        const first = board[row][col];
        const second = board[nextRow][nextCol];

        board[row][col] = second;
        board[nextRow][nextCol] = first;

        const valid =
          Boolean(first?.special) ||
          Boolean(second?.special) ||
          findMatches().size > 0;

        board[row][col] = first;
        board[nextRow][nextCol] = second;

        if (valid) return true;
      }
    }
  }

  return false;
}

/* =========================================
   SELECT AND SWAP
========================================= */

let pointerStart = null;
let pointerMoved = false;

$("gameBoard").addEventListener("pointerdown", event => {
  const tile = event.target.closest(".tile");
  if (!tile || busy || levelFinished) return;

  pointerStart = {
    row: Number(tile.dataset.row),
    col: Number(tile.dataset.col),
    x: event.clientX,
    y: event.clientY,
    pointerId: event.pointerId
  };

  pointerMoved = false;
});

$("gameBoard").addEventListener("pointerup", async event => {
  const start = pointerStart;
  pointerStart = null;
  pointerMoved = false;

  if (!start || busy || levelFinished) return;

  const tile = event.target.closest(".tile");
  const dx = event.clientX - start.x;
  const dy = event.clientY - start.y;
  const distanceMoved = Math.hypot(dx, dy);

  // A deliberate finger/mouse drag swaps with the adjacent tile in that direction.
  if (distanceMoved >= 18) {
    pointerMoved = true;

    let dr = 0;
    let dc = 0;

    if (Math.abs(dx) > Math.abs(dy)) {
      dc = dx > 0 ? 1 : -1;
    } else {
      dr = dy > 0 ? 1 : -1;
    }

    const targetRow = start.row + dr;
    const targetCol = start.col + dc;

    if (
      targetRow >= 0 && targetRow < SIZE &&
      targetCol >= 0 && targetCol < SIZE
    ) {
      selectedTile = null;
      await swapTiles(start, { row: targetRow, col: targetCol });
    }

    return;
  }

  // A short tap keeps the original two-tile selection controls.
  if (!tile) return;

  const row = Number(tile.dataset.row);
  const col = Number(tile.dataset.col);

  if (!Number.isInteger(row) || !Number.isInteger(col)) return;

  if (!selectedTile) {
    selectedTile = { row, col };
    renderBoard();
    playSound(430, 0.05);
    return;
  }

  const first = selectedTile;
  const distance = Math.abs(first.row - row) + Math.abs(first.col - col);

  if (distance === 0) {
    selectedTile = null;
    renderBoard();
    return;
  }

  if (distance !== 1) {
    selectedTile = { row, col };
    renderBoard();
    return;
  }

  selectedTile = null;
  renderBoard();
  await swapTiles(first, { row, col });
});

$("gameBoard").addEventListener("pointercancel", () => {
  pointerStart = null;
});

async function swapTiles(first, second) {
  if (busy || levelFinished || moves <= 0) return;

  busy = true;

  const firstTile = board[first.row][first.col];
  const secondTile = board[second.row][second.col];

  swapPositions(first, second);
  renderBoard();

  await wait(90);

  const specialSwap =
    Boolean(firstTile?.special) ||
    Boolean(secondTile?.special);

  if (!specialSwap && findMatches().size === 0) {
    swapPositions(first, second);
    renderBoard();

    $("gameMessage").textContent =
      "No match yet! Try another pair.";

    playSound(180, 0.1);

    busy = false;
    renderBoard();
    return;
  }

  moves--;
  updateStats();

if (level % 5 === 0 && !bossTimerStarted) {
  bossTimerStarted = true;
  startBossTimer();
}

  currentCombo = 0;

  const runId = gameRunId;

  if (firstTile?.special && secondTile?.special) {
    // Two power-ups combine!
    const affected = new Set();

    activateSpecialCombo(
      first,
      second,
      firstTile,
      secondTile,
      affected
    );

    await clearCells(affected, runId);

  } else if (specialSwap) {
    // One power-up combines with a normal tile.
    const affected = new Set();
    const triggered = new Set();

    if (firstTile?.special) {
      activateSpecial(
        second,
        secondTile?.type,
        affected,
        triggered
      );
    }

    if (secondTile?.special) {
      activateSpecial(
        first,
        firstTile?.type,
        affected,
        triggered
      );
    }

    await clearCells(affected, runId);
  }

  if (runId !== gameRunId) return;

  await clearCascades(runId, second);

  if (runId !== gameRunId) return;

  busy = false;
  renderBoard();
  checkGameStatus();
}

function swapPositions(first, second) {
  const temporary = board[first.row][first.col];

  board[first.row][first.col] = board[second.row][second.col];
  board[second.row][second.col] = temporary;
}

/* =========================================
   SPECIAL POWER-UP COMBINATIONS
========================================= */

function activateSpecialCombo(
  firstPosition,
  secondPosition,
  firstTile,
  secondTile,
  affected
) {
  const firstSpecial = firstTile.special;
  const secondSpecial = secondTile.special;

  const firstIndex = indexOf(
    firstPosition.row,
    firstPosition.col
  );

  const secondIndex = indexOf(
    secondPosition.row,
    secondPosition.col
  );

  const triggered = new Set([
    firstIndex,
    secondIndex
  ]);

  const addCell = (row, col) => {
    if (
      row >= 0 &&
      row < SIZE &&
      col >= 0 &&
      col < SIZE
    ) {
      affected.add(indexOf(row, col));
    }
  };

  const addRow = row => {
    for (let col = 0; col < SIZE; col++) {
      addCell(row, col);
    }
  };

  const addColumn = col => {
    for (let row = 0; row < SIZE; row++) {
      addCell(row, col);
    }
  };

  const addBombArea = (row, col, radius = 1) => {
    for (
      let r = row - radius;
      r <= row + radius;
      r++
    ) {
      for (
        let c = col - radius;
        c <= col + radius;
        c++
      ) {
        addCell(r, c);
      }
    }
  };

  const firstIsRainbow = firstSpecial === "rainbow";
  const secondIsRainbow = secondSpecial === "rainbow";

  const firstIsBomb = firstSpecial === "bomb";
  const secondIsBomb = secondSpecial === "bomb";

  const firstIsLightning = firstSpecial === "row";
  const secondIsLightning = secondSpecial === "row";

  const isDoubleRainbow =
    firstIsRainbow && secondIsRainbow;

  const isRainbowBomb =
    (firstIsRainbow && secondIsBomb) ||
    (secondIsRainbow && firstIsBomb);

  const isRainbowLightning =
    (firstIsRainbow && secondIsLightning) ||
    (secondIsRainbow && firstIsLightning);

  const isDoubleBomb =
    firstIsBomb && secondIsBomb;

  const isDoubleLightning =
    firstIsLightning && secondIsLightning;

  const isBombLightning =
    (firstIsBomb && secondIsLightning) ||
    (secondIsBomb && firstIsLightning);

  if (isDoubleRainbow) {
    // 🌈 + 🌈 = clear the entire board.
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        addCell(row, col);
      }
    }

    $("gameMessage").textContent =
      "🌈🌈 MEGA RAINBOW! TOTAL BOARD CLEAR!";

    playArcadeSound("rainbow");

  } else if (isRainbowBomb) {
    // 🌈 + 💥 = turn every matching tile into a bomb blast.
    const targetType = firstIsRainbow
      ? secondTile.type
      : firstTile.type;

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (board[row][col]?.type === targetType) {
          addBombArea(row, col, 1);
        }
      }
    }

    $("gameMessage").textContent =
      "🌈💥 RAINBOW BOMB STORM!";

    playArcadeSound("bomb");

  } else if (isRainbowLightning) {
    // 🌈 + ⚡ = cross-shaped lightning across matching tiles.
    const targetType = firstIsRainbow
      ? secondTile.type
      : firstTile.type;

    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (board[row][col]?.type === targetType) {
          addRow(row);
          addColumn(col);
        }
      }
    }

    $("gameMessage").textContent =
      "🌈⚡ RAINBOW LIGHTNING!";

    playArcadeSound("lightning");

  } else if (isDoubleBomb) {
    // 💥 + 💥 = two overlapping large explosions.
    addBombArea(
      firstPosition.row,
      firstPosition.col,
      2
    );

    addBombArea(
      secondPosition.row,
      secondPosition.col,
      2
    );

    $("gameMessage").textContent =
      "💥💥 MEGA EXPLOSION!";

    playArcadeSound("bomb");

  } else if (isDoubleLightning) {
    // ⚡ + ⚡ = cross-shaped board-wide lightning.
    addRow(firstPosition.row);
    addColumn(firstPosition.col);

    addRow(secondPosition.row);
    addColumn(secondPosition.col);

    $("gameMessage").textContent =
      "⚡⚡ DOUBLE LIGHTNING STRIKE!";

    playArcadeSound("lightning");

  } else if (isBombLightning) {
    // 💥 + ⚡ = three rows and three columns.
    const bombPosition = firstIsBomb
      ? firstPosition
      : secondPosition;

    for (
      let offset = -1;
      offset <= 1;
      offset++
    ) {
      addRow(bombPosition.row + offset);
      addColumn(bombPosition.col + offset);
    }

    $("gameMessage").textContent =
      "💥⚡ MEGA HEALING BLAST!";

    playArcadeSound("bomb");
  }

  // Activate any additional special tiles caught in the combo.
  // The original two power-ups are protected from being triggered twice.
  for (const cell of [...affected]) {
    const { row, col } = coordinates(cell);
    const tile = board[row][col];

    if (tile?.special && !triggered.has(cell)) {
      activateSpecial(
        { row, col },
        tile.type,
        affected,
        triggered
      );
    }
  }
}

/* =========================================
   ACTIVATE SPECIAL POWER-UPS
========================================= */

/* =========================================
   MEDICAL MATCH — POWER-UP VISUAL CONTROLLER
========================================= */

function triggerMedicalEffect(effect) {
  const boardElement = $("gameBoard");
  const frameElement = document.querySelector(".board-frame");

  if (!boardElement || !frameElement) return;

  const effects = {
    bomb: ["board-shake", "explosion-flash"],
    lightning: ["board-shake", "lightning-strike"],
    rainbow: ["board-shake", "rainbow-burst"]
  };

  const classes = effects[effect];
  if (!classes) return;

  [boardElement, frameElement].forEach(element => {
    classes.forEach(className => {
      element.classList.remove(className);
    });

    void element.offsetWidth;

    classes.forEach(className => {
      element.classList.add(className);
    });
  });

  setTimeout(() => {
    [boardElement, frameElement].forEach(element => {
      classes.forEach(className => {
        element.classList.remove(className);
      });
    });
  }, 700);
}

function activateSpecial(position, targetType, affected, triggered = new Set()) {
  // Use a queue so chain reactions cannot repeatedly trigger the same tile.
  const queue = [{ position, targetType }];

  while (queue.length) {
    const current = queue.shift();
    const row = current.position.row;
    const col = current.position.col;
    const cellIndex = indexOf(row, col);

    if (triggered.has(cellIndex)) continue;
    triggered.add(cellIndex);

    const tile = board[row]?.[col];
    if (!tile?.special) continue;

    const special = tile.special;
    const newlyAffected = [];

    if (special === "rainbow") {
      const chosenType = Number.isInteger(current.targetType)
        ? current.targetType
        : tile.type;

      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (board[r][c]?.type === chosenType) {
            newlyAffected.push(indexOf(r, c));
          }
        }
      }

      $("gameMessage").textContent = "🌈 RAINBOW POWER!";
      triggerMedicalEffect("rainbow");
      playArcadeSound("rainbow");
      playSound(950, 0.2);

    } else if (special === "row") {
      for (let c = 0; c < SIZE; c++) {
        newlyAffected.push(indexOf(row, c));
      }

      $("gameMessage").textContent = "⚡ HEALING LIGHTNING!";
      triggerMedicalEffect("lightning");
      playArcadeSound("lightning");
      playSound(780, 0.16);

    } else if (special === "bomb") {
      for (let r = row - 1; r <= row + 1; r++) {
        for (let c = col - 1; c <= col + 1; c++) {
          if (r >= 0 && r < SIZE && c >= 0 && c < SIZE) {
            newlyAffected.push(indexOf(r, c));
          }
        }
      }

      $("gameMessage").textContent = "💥 HEART BOMB!";
      triggerMedicalEffect("bomb");
      playArcadeSound("bomb");
      playSound(650, 0.2);
    }

    for (const cell of newlyAffected) {
      affected.add(cell);

      const { row: r, col: c } = coordinates(cell);
      const caught = board[r][c];

      if (caught?.special && !triggered.has(cell)) {
        queue.push({
          position: { row: r, col: c },
          targetType: tile.type
        });
      }
    }
  }
}

/* =========================================
   CLEAR MATCHES AND CREATE POWER-UPS
========================================= */


/* =========================================
   MEDICAL MATCH — COMBO ANNOUNCEMENTS
========================================= */

function showComboAnnouncement(cascade, matchCount) {
  const container = document.querySelector(".board-section");
  if (!container) return;

  let message;
  let tier;

  if (cascade >= 5) {
    message = "🚀 MEGA COMBO!";
    tier = "mega";
  } else if (cascade >= 4) {
    message = "UNSTOPPABLE!";
    tier = "unstoppable";
  } else if (cascade === 3) {
    message = "MEDICAL MASTER!";
    tier = "master";
  } else if (cascade === 2) {
    message = "SUPER COMBO!";
    tier = "super";
  } else if (matchCount >= 6) {
    message = "INCREDIBLE!";
    tier = "incredible";
  } else if (matchCount >= 5) {
    message = "AMAZING!";
    tier = "amazing";
  } else if (matchCount >= 4) {
    message = "GREAT MATCH!";
    tier = "great";
  } else {
    message = "NICE!";
    tier = "normal";
  }

  const announcement = document.createElement("div");

  announcement.className = `combo-announcement combo-${tier}`;
  announcement.textContent = message;

  container.appendChild(announcement);

  setTimeout(() => {
    announcement.remove();
  }, 1250);
}

function showBossAnnouncement() {
  const container = document.querySelector(".board-section");
  if (!container) return;

  const announcement = document.createElement("div");

  announcement.className = "boss-announcement";
  announcement.innerHTML = `
    <span class="boss-warning">MEDICAL EMERGENCY</span>
    <strong>BOSS LEVEL ${level}</strong>
    <small>Dr AFOR, your biggest challenge awaits!</small>
  `;

  container.appendChild(announcement);

  setTimeout(() => {
    announcement.remove();
  }, 2500);
}

/* =========================================
   MEDICAL MATCH — SCORE AND HEART REWARDS
========================================= */

function showRewardBurst(points, hearts) {
  const container = document.querySelector(".board-section");
  if (!container) return;

  const burst = document.createElement("div");

  burst.className = "reward-burst";

  if (hearts > 0) {
    burst.classList.add("heart-reward");
  }

  burst.innerHTML = `
    <strong>+${points.toLocaleString()} POINTS</strong>
    ${hearts > 0 ? `<small>❤️ +${hearts} HEART${hearts === 1 ? "" : "S"}!</small>` : ""}
  `;

  container.appendChild(burst);

  setTimeout(() => burst.remove(), 1150);
}

async function clearCascades(runId, preferredPosition = null) {
  let cascade = 0;

  while (true) {
    if (runId !== gameRunId) return;

    const runs = findMatchRuns();

    if (!runs.length) break;

    cascade++;
    currentCombo = cascade;
    bestCombo = Math.max(bestCombo, cascade);

    const groups = getMatchGroups(runs);
    const toClear = new Set();
    const creations = [];

    for (const group of groups) {
      const special = getSpecialForGroup(group, runs);

      let anchor = null;

      if (
        preferredPosition &&
        group.cells.includes(
          indexOf(preferredPosition.row, preferredPosition.col)
        )
      ) {
        anchor = indexOf(
          preferredPosition.row,
          preferredPosition.col
        );
      } else {
        anchor = group.cells[Math.floor(group.cells.length / 2)];
      }

      if (special) {
        creations.push({
          index: anchor,
          type: group.type,
          special
        });
      }

      for (const cell of group.cells) {
        if (cell !== anchor || !special) {
          toClear.add(cell);
        }
      }
    }

    // Count every matched heart, including a tile kept as a new power-up.
    const heartCredits = new Set();

    for (const group of groups) {
      for (const cell of group.cells) {
        const { row, col } = coordinates(cell);

        if (board[row][col]?.type === 0) {
          heartCredits.add(cell);
        }
      }
    }

    // Existing power-ups caught in a match also activate, with loop protection.
    const triggeredSpecials = new Set();

    for (const cell of [...toClear]) {
      const { row, col } = coordinates(cell);
      const tile = board[row][col];

      if (tile?.special && !triggeredSpecials.has(cell)) {
        const affected = new Set();

        activateSpecial(
          { row, col },
          tile.type,
          affected,
          triggeredSpecials
        );

        for (const extra of affected) {
          toClear.add(extra);

          const { row: r, col: c } = coordinates(extra);

          if (board[r][c]?.type === 0) {
            heartCredits.add(extra);
          }
        }
      }
    }

    heartsCollected += heartCredits.size;   
    if (heartCredits.size > 0) {
  playArcadeSound("heart");
}

    const points = toClear.size * 60 * cascade;
    if (cascade > 1) {
  playArcadeSound("combo");
} else {
  playArcadeSound("match");
}
    score += points;
    showRewardBurst(points, heartCredits.size);

    $("gameMessage").textContent =
      cascade > 1
        ? `🔥 ${cascade}x COMBO! Amazing!`
        : `✨ ${toClear.size} pieces matched!`;
        showComboAnnouncement(cascade, toClear.size);
        playArcadeSound(cascade > 1 ? "combo" : "match");

    updateStats();

    for (const cell of toClear) {
      const { row, col } = coordinates(cell);
      const element = getTileElement(row, col);

      if (element) element.classList.add("matched");
    }

    await wait(270);

    if (runId !== gameRunId) return;

    for (const cell of toClear) {
      const { row, col } = coordinates(cell);
      board[row][col] = null;
    }

    for (const creation of creations) {
      const { row, col } = coordinates(creation.index);

      board[row][col] = makeTile(
        creation.type,
        creation.special
      );
    }

    dropTiles();
    renderBoard();

    await wait(230);
    preferredPosition = null;
  }

  if (currentCombo > 1) {
    $("gameMessage").textContent =
      `Fantastic! ${currentCombo} cascades!`;

    playSound(900, 0.16);
  }

  updateStats();
}

/* =========================================
   CLEAR POWER-UP EFFECTS
========================================= */

async function clearCells(cells, runId) {
  if (runId !== gameRunId) return;

  const validCells = [...cells].filter(cell => {
    const { row, col } = coordinates(cell);
    return Boolean(board[row][col]);
  });

  const heartMatches = validCells.filter(cell => {
    const { row, col } = coordinates(cell);
    return board[row][col]?.type === 0;
  }).length;

  heartsCollected += heartMatches;
  score += validCells.length * 100;

  updateStats();

  for (const cell of validCells) {
    const { row, col } = coordinates(cell);
    const element = getTileElement(row, col);

    if (element) element.classList.add("matched");
  }

  await wait(280);

  if (runId !== gameRunId) return;

  for (const cell of validCells) {
    const { row, col } = coordinates(cell);
    board[row][col] = null;
  }

  dropTiles();
  renderBoard();

  await wait(230);
}

/* =========================================
   DROP AND REFILL
========================================= */

function dropTiles() {
  for (let col = 0; col < SIZE; col++) {
    const remaining = [];

    for (let row = SIZE - 1; row >= 0; row--) {
      if (board[row][col]) {
        remaining.push(board[row][col]);
      }
    }

    for (let row = SIZE - 1; row >= 0; row--) {
      const position = SIZE - 1 - row;

      board[row][col] =
        position < remaining.length
          ? remaining[position]
          : makeTile();
    }
  }
}

/* =========================================
   STATS
========================================= */

function updateStats() {
  $("score").textContent = score;
  $("movesLeft").textContent = moves;
  $("bestCombo").textContent = bestCombo;

  $("collectedCount").textContent = heartsCollected;
  $("targetCount").textContent = targetHearts;

  const progress = Math.min(
    100,
    (heartsCollected / targetHearts) * 100
  );

  $("missionProgress").style.width = `${progress}%`;
  $("levelNumber").textContent = level;
}

/* =========================================
   LEVEL STATUS
========================================= */

function checkGameStatus() {
  if (heartsCollected >= targetHearts) {
    finishLevel(true);
    return;
  }

  if (moves <= 0) {
    finishLevel(false);
    return;
  }

  if (!hasPossibleMove()) {
    $("gameMessage").textContent =
      "Fresh board! Let's keep matching!";

    generateBoard();
    renderBoard();
  }
}


function showVictoryConfetti() {
  const oldConfetti = document.getElementById("victoryConfetti");

  if (oldConfetti) {
    oldConfetti.remove();
  }

  const container = document.createElement("div");
  container.id = "victoryConfetti";
  document.body.appendChild(container);

  const colors = [
    "#ff3d8b",
    "#ffd447",
    "#35c9ff",
    "#65e879",
    "#ff8735",
    "#a875ff",
    "#ffffff"
  ];

  for (let i = 0; i < 120; i++) {
    const piece = document.createElement("span");

    piece.className = "confetti-piece";

    piece.style.left = `${Math.random() * 100}%`;
    piece.style.backgroundColor =
      colors[Math.floor(Math.random() * colors.length)];

    piece.style.animationDelay = `${Math.random() * 1.5}s`;
    piece.style.animationDuration =
      `${3 + Math.random() * 2}s`;

    piece.style.setProperty(
      "--drift",
      `${Math.random() * 300 - 150}px`
    );

    piece.style.setProperty(
      "--spin",
      `${Math.random() * 1440 - 720}deg`
    );

    piece.style.width = `${6 + Math.random() * 7}px`;
    piece.style.height = `${10 + Math.random() * 10}px`;

    container.appendChild(piece);
  }

  setTimeout(() => {
    container.remove();
  }, 7000);
}

function finishLevel(won) {
  if (levelFinished) return;

  levelFinished = true;
  stopBossTimer();

const bossBanner = document.getElementById("bossTimerBanner");
if (bossBanner) {
  bossBanner.classList.remove("boss-banner-active");
}
  busy = false;
  selectedTile = null;

const isBossLevel = level % 5 === 0;

const worldStage = Math.min(
  20,
  Math.ceil(level / 5)
);

document.body.className = document.body.className
  .replace(/\bworld-level-\d+\b/g, "")
  .trim();

document.body.classList.add(`world-level-${worldStage}`);

const earnedCoins = won
  ? 30 + level * 5 + (isBossLevel ? 50 : 0)
  : 5;

const earnedXP = won
  ? 50 + level * 10 + (isBossLevel ? 100 : 0)
  : 5;

  coins += earnedCoins;

const previousRank = getCareerRank();

totalXP += earnedXP;

const newRank = getCareerRank();
const rankPromoted = won && newRank.name !== previousRank.name;

  saveProgress();
  updateCoinDisplay();
  updateCareerDisplay();

if (won) {
  unlockAchievement("heartHealer");

  if (bestCombo >= 5) {
    unlockAchievement("comboQueen");
  }

  if (level >= 5) {
    unlockAchievement("risingDoctor");
  }

  if (level % 5 === 0) {
    unlockAchievement("bossSlayer");
  }

  if (level >= 10) {
    unlockAchievement("medicalLegend");
  }
}

$("resultEmoji").textContent =
  won && isBossLevel ? "" : won ? "🎉" : "💪";

const bossTrophy = document.getElementById("bossTrophy");

if (bossTrophy) {
  bossTrophy.classList.toggle("hidden", !(won && isBossLevel));
}
$("resultOverlay").classList.toggle(
  "boss-victory",
  won && isBossLevel
);
  if (won && isBossLevel) {
  playArcadeSound("bossVictory");
} else if (won) {
  playArcadeSound("victory");
} else {
  playArcadeSound("failure");
}

$("resultEyebrow").textContent = won
  ? (isBossLevel ? "🏆 BOSS DEFEATED!" : "LEVEL COMPLETE")
  : (isBossLevel ? "BOSS CHALLENGE FAILED" : "NICE TRY");

$("resultTitle").textContent = won
  ? "Dr Afor, YOU DID IT! ❤️"
  : "Keep believing, Dr Afor! One day at a time!";

  
const LEVEL_VICTORY_MESSAGES = [
  "Every great doctor starts with a dream. Keep going, Dr Afor!",
  "One step closer to the white coat!",
  "Your dedication today shapes tomorrow's doctor.",
  "Every challenge conquered makes you stronger.",
  "The world needs your courage and compassion.",
  "Little victories. Big dreams. Keep rising!",
  "Your journey is just getting started!",
  "Behind every great doctor is a story of determination.",
  "Keep chasing the dream. Lives may one day depend on it.",
  "Another level conquered. Another step towards greatness!",
  "Believe in yourself. Your future is bright!",
  "The doctor you're dreaming of is taking shape!",
  "Your hard work is building something extraordinary.",
  "Never stop learning. Never stop believing!",
  "One day, you'll make a difference. Keep going!",
  "You're doing amazing, Dr Afor!",
  "No mountain too high, no valley too deep. Keep climbing, Dr Afor!",
  "The journey of a thousand miles begins with a single step. Keep going, Dr Afor!",
  "You're on your way to becoming a medical marvel, Dr Afor!",
  "No sea too rough, no road too tough. Keep sailing, Dr Afor!",
  "Keep your stethoscope close and your dreams closer, Dr Afor!",
  "One day at a time, Dr Afor! Keep going."
];

if (won) {
  $("resultMessage").textContent =
    LEVEL_VICTORY_MESSAGES[(level - 1) % LEVEL_VICTORY_MESSAGES.length];
}
  if (rankPromoted) {
  $("resultEyebrow").textContent = "🎓 CAREER PROMOTION!";
  $("resultTitle").textContent = "Congratulations, Dr Afor!";
  $("resultMessage").textContent =
    `You've been promoted to ${newRank.name}! Your dedication is taking you closer to your dream.`;
}

  $("resultScore").textContent = score;
  $("resultCoins").textContent = earnedCoins;
  $("resultXP").textContent = earnedXP;

$("nextLevelButton").textContent =
    won ? "Continue to Next Level →" : "🔄 RETRY THIS LEVEL";

$("resultNextLevelButton").dataset.won = String(won);

  $("resultOverlay").classList.remove("hidden");
  if (won) {
  showVictoryConfetti();
}

  // Unlock Dr Afor's personal letter after her first victory.
if (won && !localStorage.getItem("aforLetterUnlocked")) {
  setTimeout(() => {
    const letter = $("aforLetter");

    if (letter) {
      letter.classList.remove("hidden");
      localStorage.setItem("aforLetterUnlocked", "true");
    }
  }, 1800);
}

  if (won) {
  playArcadeSound("victory");
} else {
  playSound(250, 0.2);
}
  renderBoard();
}

function stopBossTimer() {
  if (bossTimerInterval) {
    clearInterval(bossTimerInterval);
    bossTimerInterval = null;
  }
}

function startBossTimer() {
  stopBossTimer();

 bossTimeLeft = level === 25 ? 420 : 300;

  let banner = document.getElementById("bossTimerBanner");

  if (!banner) {
    banner = document.createElement("div");
    banner.id = "bossTimerBanner";
    banner.innerHTML = `
      <span class="boss-banner-title">🚨 BOSS BATTLE!</span>
      <span class="boss-banner-message">Defeat the challenge before time runs out!</span>
      <span id="bossTimerDisplay">05:00</span>
    `;
    document.body.appendChild(banner);
  }

  banner.classList.remove("hidden");
  banner.classList.add("boss-banner-active");

  const display = document.getElementById("bossTimerDisplay");

  function updateTimer() {
    const minutes = Math.floor(bossTimeLeft / 60);
    const seconds = bossTimeLeft % 60;

    display.textContent =
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    if (bossTimeLeft <= 30) {
      banner.classList.add("boss-timer-danger");
    } else {
      banner.classList.remove("boss-timer-danger");
    }
  }

  updateTimer();

  bossTimerInterval = setInterval(() => {
    if (levelFinished) {
      stopBossTimer();
      return;
    }

    bossTimeLeft--;
    updateTimer();

    if (bossTimeLeft <= 0) {
      stopBossTimer();
      finishLevel(false);
    }
  }, 1000);
}

/* =========================================
   START / RESTART
========================================= */

function startLevel() {
  gameRunId++;
stopBossTimer();

const oldBossBanner = document.getElementById("bossTimerBanner");
if (oldBossBanner) {
  oldBossBanner.classList.remove("boss-banner-active");
}

bossTimerStarted = false;

  selectedTile = null;
  busy = false;
  levelFinished = false;

  const isBossLevel = level % 5 === 0;
  document.body.classList.toggle("boss-level", isBossLevel);
  startBackgroundMusic(isBossLevel ? "boss" : "normal");
  const baseMoves =
    level <= 5 ? 35 :
    level <= 10 ? 33 :
    level <= 20 ? 31 :
    level <= 35 ? 29 :
    level <= 50 ? 27 :
    level <= 75 ? 25 : 23;

  moves = isBossLevel ? baseMoves - 2 : baseMoves;
  score = 0;
  heartsCollected = 0;
  bestCombo = 0;
  currentCombo = 0;

targetHearts =
  level <= 5 ? 20 :
  level <= 10 ? 25 :
  level <= 20 ? 30 :
  level <= 35 ? 35 :
  level <= 50 ? 40 : 45;

if (isBossLevel) {
  targetHearts += 5;
}

const missionMessages = [
  "❤️ Mission: Collect hearts to help your patients!",
  "🩺 Mission: Match your way to a healthier hospital!",
  "💊 Mission: Collect as many hearts as possible!",
  "🌟 Mission: Show your medical skills, Dr Afor!"
];

$("gameMessage").textContent =
  missionMessages[(level - 1) % missionMessages.length];
  if (isBossLevel) {
  $("gameMessage").textContent =
    "🚨 BOSS LEVEL! Dr Afor, your biggest medical challenge awaits!";
}

  $("resultOverlay").classList.add("hidden");

  generateBoard();
  updateStats();
  renderBoard();
 
if (isBossLevel) {
  $("gameMessage").textContent =
    "🚨 BOSS LEVEL! Collect the required hearts before your moves run out!";
} else {
  $("gameMessage").textContent =
    missionMessages[(level - 1) % missionMessages.length];
}
}
$("restartButton").addEventListener("click", () => {
  if (busy) return;

  startLevel();
  playSound(450);
});

$("restartJourneyButton").addEventListener("click", () => {
  if (busy) return;

  restartAforJourney();
});

$("previousLevelButton").addEventListener("click", () => {
  if (busy) return;

  if (level <= 1) {
    $("gameMessage").textContent =
      "You're already at Level 1, Dr Afor!";
    return;
  }

  level--;
  saveProgress();
  startLevel();

  playSound(450);
});

$("nextLevelButton").addEventListener("click", () => {
  const won = $("nextLevelButton").dataset.won === "true";

  if (won) {
    unlockedLevel = Math.max(unlockedLevel, level + 1);
    level++;
    saveProgress();
  } else if (level < unlockedLevel) {
    level++;
    saveProgress();
  } else {
    $("gameMessage").textContent =
      "Complete this level first to unlock the next one, Dr Afor!";
    return;
  }

  startLevel();
});

$("resultNextLevelButton").addEventListener("click", () => {
  if (busy) return;

  const won =
    $("resultNextLevelButton").dataset.won === "true";

  if (!won) return;

  unlockedLevel = Math.max(unlockedLevel, level + 1);
  level++;

  saveProgress();
  startLevel();

  playSound(450);
});

$("playAgainButton").addEventListener("click", () => {
  if (busy) return;

  startLevel();
  playSound(450);
});

function updateMedicalWorldMap() {
  updateCareerDisplay();
  const destinations = [
    "General Hospital",
    "Cardiology Centre",
    "Neurology Centre",
    "Pharmacy Lab",
    "Emergency Ward",
    "Chief Doctor's Challenge"
  ];

  for (let i = 1; i <= 6; i++) {
    const destination = $("destination" + i);

    destination.classList.remove(
      "active", "locked", "unlocked", "completed"
    );

    if (level > i) {
      destination.classList.add("completed");
      destination.querySelector("span").textContent =
        destinations[i - 1] + " ✓";
    } else if (level === i) {
      destination.classList.add("active");
      destination.querySelector("span").textContent =
        destinations[i - 1] + " — CURRENT";
    } else {
      destination.classList.add("locked");
      destination.querySelector("span").textContent =
        destinations[i - 1] + " 🔒";
    }
  }
}

$("quickMapButton").addEventListener("click", () => {
  updateMedicalWorldMap();
  $("worldMapOverlay").classList.remove("hidden");
  mapOpenedFromResult = false;
});

$("openWorldMapButton").addEventListener("click", () => {
  updateMedicalWorldMap();
  $("resultOverlay").classList.add("hidden");
  $("worldMapOverlay").classList.remove("hidden");
  mapOpenedFromResult = true;
});

$("closeWorldMapButton").addEventListener("click", () => {
  $("worldMapOverlay").classList.add("hidden");

  if (mapOpenedFromResult) {
    $("resultOverlay").classList.remove("hidden");
  }
});

$("closeResultButton").addEventListener("click", () => {
  $("resultOverlay").classList.add("hidden");
});

$("backButton").addEventListener("click", () => {
  window.location.href = "welcome.html";
});

function setupProgressTransfer() {
  const exportButton = $("exportProgressButton");
  const importButton = $("importProgressButton");
  const fileInput = $("importProgressFile");

  if (!exportButton || !importButton || !fileInput) return;

  // EXPORT PROGRESS
  exportButton.addEventListener("click", () => {
    saveProgress();

    const savedData = localStorage.getItem(SAVE_KEY);

    if (!savedData) {
      alert("No saved progress found.");
      return;
    }

    const blob = new Blob([savedData], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "dr-afor-medical-match-save.json";
    link.click();

    URL.revokeObjectURL(url);
  });

  // OPEN IMPORT FILE PICKER
  importButton.addEventListener("click", () => {
    fileInput.click();
  });

  // IMPORT PROGRESS
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];

    if (!file) return;

    try {
      const imported = JSON.parse(await file.text());

      const importedLevel = Number(imported.level);
      const importedCoins = Number(imported.coins);
      const importedXP = Number(imported.xp);

      if (
        !imported ||
        typeof imported !== "object" ||
        !Number.isInteger(importedLevel) ||
        importedLevel < 1 ||
        !Number.isFinite(importedCoins) ||
        importedCoins < 0 ||
        !Number.isFinite(importedXP) ||
        importedXP < 0
      ) {
        throw new Error("Invalid save file.");
      }

      const confirmed = confirm(
        "Import this progress? Your current progress on this site will be replaced."
      );

      if (!confirmed) {
        fileInput.value = "";
        return;
      }

      const importedSave = {
        coins: importedCoins,
        xp: importedXP,
        level: importedLevel,
        heartsCollected: Math.max(
          0,
          Number(imported.heartsCollected) || 0
        ),
        targetHearts: Math.max(
          1,
          Number(imported.targetHearts) || 20
        ),
        completedDestinations: Math.max(
          0,
          Number(imported.completedDestinations) || 0
        ),
        achievements: Array.isArray(imported.achievements)
          ? imported.achievements
          : []
      };

      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify(importedSave)
      );

      alert("Progress imported successfully! The game will now reload.");

      location.reload();

    } catch (error) {
      alert("Could not import this save file. Please select a valid Medical Match save.");
      console.error("Progress import failed:", error);
    }

    fileInput.value = "";
  });
}

/* =========================================
   INITIALISE
========================================= */

function initialiseGame() {
  setupProgressTransfer();

  loadSave();
  startLevel();

  $("soundButton").textContent = "🔊";
}

initialiseGame();

// Close Dr Afor's personal letter.
const closeAforLetter = $("closeAforLetter");

if (closeAforLetter) {
  closeAforLetter.addEventListener("click", () => {
    $("aforLetter").classList.add("hidden");
  });
}

/* =========================================
   INSTALLABLE APP — SERVICE WORKER
========================================= */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}

/* =========================================
   DR AFOR — APP INSTALLATION
========================================= */

let deferredInstallPrompt = null;

const installAppButton = $("installAppButton");
function updateInstallButtonVisibility() {
  if (!installAppButton) return;

  const isInstalled =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  installAppButton.style.display = isInstalled ? "none" : "block";
}

updateInstallButtonVisibility();

// Detect when the browser offers installation.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

// Handle installation button clicks.
if (installAppButton) {
  installAppButton.addEventListener("click", async () => {

    // Check whether the game is already installed.
    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isInstalled) {
      alert("Medical Match is already installed on this device! ❤️");
      return;
    }

    // iPhone and iPad instructions.
    const isAppleMobile =
      /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (isAppleMobile) {
      alert(
        "To install Dr Afor's Medical Match:\n\n" +
        "1. Open this game in Safari.\n" +
        "2. Tap the Share button.\n" +
        "3. Select 'Add to Home Screen'.\n" +
        "4. Tap 'Add'.\n\n" +
        "The game will appear alongside your other apps! ❤️"
      );
      return;
    }

    // Android and supported desktop browsers.
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();

      const choice = await deferredInstallPrompt.userChoice;

      if (choice.outcome === "accepted") {
        installAppButton.textContent = "❤️ GAME INSTALLED";
      }

      deferredInstallPrompt = null;
      return;
    }

    // Fallback when the browser has not offered installation yet.
    alert(
      "To install Medical Match:\n\n" +
      "Open your browser menu (⋮) and select 'Install app' " +
      "or 'Add to Home Screen'."
    );
  });
}

// Update the button if installation succeeds.
window.addEventListener("appinstalled", () => {
  if (installAppButton) {
    installAppButton.style.display = "none";
  }
});

/* ==========================================
   THE DOCTOR WITHIN
   MEDIVERSE GAME ENGINE
   Heartbeat Hero + Brain Storm
========================================== */

const places = {
  hospital: {
    name: "Happy Hospital",
    emoji: "🏥",
    desc: "Meet wonderfully weird patients, solve playful cases and discover that kindness is a superpower.",
    reward: "Patient adventures • Funny encounters • Kindness badges",
    action: "Explore the hospital"
  },
  lab: {
    name: "Physiology Lab",
    emoji: "🧪",
    desc: "Your curiosity laboratory! Explore the heart, lungs, brain, muscles and all the amazing systems that keep us moving.",
    reward: "Heartbeat Hero • Brain Storm • Science stars",
    action: "Choose a mini-game"
  },
  emergency: {
    name: "Emergency Rush",
    emoji: "🚑",
    desc: "The clock is ticking! Take on quick-thinking challenges and help cartoon patients in a safe, fictional arcade world.",
    reward: "Timed rounds • Reflex challenges • Bonus coins",
    action: "Start a rush"
  },
  mysteries: {
    name: "Medical Mysteries",
    emoji: "🔎",
    desc: "Every symptom is a clue. Observe, investigate and solve curious fictional cases one discovery at a time.",
    reward: "Mystery cases • Hidden clues • Detective badges",
    action: "Investigate a case"
  },
  lounge: {
    name: "Doctor's Lounge",
    emoji: "🛋️",
    desc: "Take a breather, personalize your little corner of Mediverse and collect fun outfits and accessories.",
    reward: "Style collection • Room decorations • Avatar items",
    action: "Visit the lounge"
  },
  dream: {
    name: "The Dream Room",
    emoji: "🌟",
    desc: "A special place filled with personal surprises and reminders for the days when the journey feels difficult.",
    reward: "Unlock by collecting 3 badges",
    action: "Keep exploring"
  }
};

const $ = id => document.getElementById(id);

const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem("tdw-save") || "{}");
  } catch {
    return {};
  }
})();

let coins = Number.isFinite(saved.coins) ? saved.coins : 120;
let xp = Number.isFinite(saved.xp) ? saved.xp : 0;
let badges = Number.isFinite(saved.badges) ? saved.badges : 0;
let soundOn = false;
let activePlace = null;


function saveProgress() {
  try {
    localStorage.setItem("tdw-save", JSON.stringify({
      coins,
      xp,
      badges,

      heartbeatEarned: !!saved.heartbeatEarned,
      brainiacEarned: !!saved.brainiacEarned,
      brainBest: Number(saved.brainBest) || 0,

      dailyMissionDate: saved.dailyMissionDate || getTodayDate(),
      dailyMissionDone: !!saved.dailyMissionDone
    }));
  } catch {}
}


function updateStats() {
  $("coins").textContent = coins;
  $("xp").textContent = xp;
  $("collectionCount").textContent =
    `${badges} badge${badges === 1 ? "" : "s"} collected`;

  $("levelProgress").style.width = (xp % 100) + "%";
  $("xpToNext").textContent = `${xp % 100} / 100 XP`;

  saveProgress();
}


/* ==========================================
   DAILY MEDICAL MISSION
========================================== */

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function initialiseDailyMission() {
  const today = getTodayDate();

  if (saved.dailyMissionDate !== today) {
    saved.dailyMissionDate = today;
    saved.dailyMissionDone = false;
  }
}

function updateDailyMissionUI() {
  const completed = !!saved.dailyMissionDone;

  $("dailyProgressText").textContent =
    completed ? "Mission completed!" : "Mission progress";

  $("dailyProgressCount").textContent =
    completed ? "1/1" : "0/1";

  $("dailyProgressFill").style.width =
    completed ? "100%" : "0%";

  $("dailyStatus").textContent =
    completed
      ? "Amazing work! Your daily reward has been collected. 💗"
      : "Your daily adventure awaits!";

  $("dailyButton").innerHTML = completed
    ? 'Mission completed <span>✓</span>'
    : 'Play today\'s challenge <span>→</span>';

  $("dailyButton").disabled = completed;
}

function completeDailyMission() {
  initialiseDailyMission();

  if (saved.dailyMissionDone) return false;

  saved.dailyMissionDone = true;

  coins += 15;
  xp += 30;

  updateStats();
  updateDailyMissionUI();

  return true;
}

function awardBadge(type) {
  const key = type === "brain" ? "brainiacEarned" : "heartbeatEarned";

  if (saved[key]) return false;

  saved[key] = true;
  badges++;
  return true;
}

/* ==========================================
   MEDIVERSE HOME SCREEN
========================================== */

function openModal(place) {
  activePlace = place;
  const p = places[place];

  $("modalKicker").textContent = "MEDIVERSE LOCATION";
  $("modalEmoji").textContent = p.emoji;
  $("modalTitle").textContent = p.name;
  $("modalDescription").textContent = p.desc;
  $("modalReward").textContent = "✨ " + p.reward;
  $("modalAction").textContent = p.action + "  →";

  if (place === "dream" && badges < 3) {
    $("modalDescription").textContent =
      "This room is keeping a little surprise safe for you. Collect 3 badges around Mediverse and come back to unlock it.";

    $("modalAction").textContent = "I'll be back!";
  }

  $("modalBackdrop").hidden = false;
}

function closeModal() {
  $("modalBackdrop").hidden = true;
}

document.querySelectorAll(".building").forEach(btn => {
  btn.addEventListener("click", () => openModal(btn.dataset.place));
});

$("modalClose").addEventListener("click", closeModal);

$("modalBackdrop").addEventListener("click", e => {
  if (e.target === $("modalBackdrop")) closeModal();
});

function openGamePicker() {
  $("gamePicker").hidden = false;
}

function closeGamePicker() {
  $("gamePicker").hidden = true;
}

$("modalAction").addEventListener("click", () => {
  if (activePlace === "dream" && badges < 3) {
    closeModal();
    return;
  }

  if (activePlace === "lab") {
    closeModal();
    openGamePicker();
    return;
  }

  if (activePlace === "daily") {
    closeModal();
    startHeartbeatGame();
    return;
  }

  if (activePlace === "about") {
    closeModal();
    return;
  }

  closeModal();

  if (["hospital", "mysteries", "emergency"].includes(activePlace)) {
    alert(`${places[activePlace].name} is on the adventure map. More activities are coming soon!`);
  } else if (activePlace === "lounge") {
    alert("Your style studio is getting its finishing touches. More outfits are coming soon!");
  }
});

$("pickerClose").addEventListener("click", closeGamePicker);

$("gamePicker").addEventListener("click", e => {
  if (e.target === $("gamePicker")) closeGamePicker();
});

$("chooseHeartbeat").addEventListener("click", () => {
  closeGamePicker();
  startHeartbeatGame();
});

$("chooseBrain").addEventListener("click", () => {
  closeGamePicker();
  startBrainGame();
});

$("dailyButton").addEventListener("click", () => {
  activePlace = "daily";

  $("modalKicker").textContent = "TODAY'S LITTLE CHALLENGE";
  $("modalTitle").textContent = "Heartbeat Hero";
  $("modalEmoji").textContent = "🫀";
  $("modalDescription").textContent =
    "Keep the rhythm going for 20 beats. Perfect taps earn extra points and a lovely reward!";

  $("modalReward").textContent =
    "🏅 Earn XP  •  🪙 Collect coins";

  $("modalAction").textContent = "Let's play  →";
  $("modalBackdrop").hidden = false;
});

$("soundToggle").addEventListener("click", () => {
  soundOn = !soundOn;
  $("soundToggle").textContent = soundOn ? "♫" : "♪";
  $("soundToggle").style.background =
    soundOn ? "#267d78" : "#294365";
});

$("profileButton").addEventListener("click", () => openModal("lounge"));

$("aboutButton").addEventListener("click", () => {
  activePlace = "about";

  $("modalEmoji").textContent = "💛";
  $("modalKicker").textContent = "A NOTE FROM YOUR GAME MAKER";
  $("modalTitle").textContent = "A world that believes in you";

  $("modalDescription").textContent =
    "The Doctor Within is your own little arcade universe. Play for fun, follow your curiosity and remember: every big journey is made of small steps.";

  $("modalReward").textContent = "Made with belief in your dream.";
  $("modalAction").textContent = "Back to Mediverse  →";
  $("modalBackdrop").hidden = false;
});

/* ==========================================
   HEARTBEAT HERO
========================================== */

const game = {
  mode: "easy",
  interval: 1050,
  total: 20,
  beatIndex: 0,
  nextBeat: 0,
  window: 260,
  running: false,
  score: 0,
  combo: 0,
  bestCombo: 0,
  hits: 0,
  misses: 0,
  perfect: 0,
  raf: 0,
  countdownTimer: 0,
  launchTimeout: 0,
  startAt: 0,
  handled: new Set(),
  lastTap: -1,
  lastPulse: -1
};

const modes = {
  easy: { interval: 1050, window: 300 },
  normal: { interval: 820, window: 245 },
  expert: { interval: 650, window: 190 }
};

function showGame() {
  $("heartbeatGame").hidden = false;
  document.body.style.overflow = "hidden";
}

function stopGameLoop() {
  if (game.raf) cancelAnimationFrame(game.raf);
  game.raf = 0;
}

function hideGame() {
  stopGameLoop();
  clearInterval(game.countdownTimer);
  clearTimeout(game.launchTimeout);

  game.running = false;

  $("heartbeatGame").hidden = true;
  $("gameCountdown").hidden = true;
  $("gameResult").hidden = true;

  document.body.style.overflow = "";
}

function setFace(message, miss = false) {
  $("heartFace").textContent = message;
  $("tapFeedback").textContent = message;
  $("tapFeedback").classList.toggle("miss", miss);
}

function setMode(mode) {
  if (game.running) return;

  game.mode = mode;
  game.interval = modes[mode].interval;
  game.window = modes[mode].window;

  document.querySelectorAll(".mode-choice").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
}

document.querySelectorAll(".mode-choice").forEach(b => {
  b.addEventListener("click", () => setMode(b.dataset.mode));
});

function startHeartbeatGame() {
  showGame();

  $("gameResult").hidden = true;
  $("gameCountdown").hidden = true;

  game.running = false;
  stopGameLoop();

  game.score = 0;
  game.combo = 0;
  game.bestCombo = 0;
  game.hits = 0;
  game.misses = 0;
  game.perfect = 0;
  game.beatIndex = 0;
  game.handled = new Set();
  game.lastTap = -1;

  $("gameScore").textContent = "0";
  $("beatsLeft").textContent = game.total;
  $("comboCount").textContent = "0×";
  $("bestCombo").textContent = "0×";

  $("tapHeart").disabled = true;
  setFace("Ready when you are!");

  let count = 3;

  $("countdownNumber").textContent = count;
  $("gameCountdown").hidden = false;

  clearInterval(game.countdownTimer);
  clearTimeout(game.launchTimeout);

  game.countdownTimer = setInterval(() => {
    count--;

    if (count > 0) {
      $("countdownNumber").textContent = count;
    } else {
      $("countdownNumber").textContent = "GO!";
      clearInterval(game.countdownTimer);

      game.launchTimeout = setTimeout(() => {
        $("gameCountdown").hidden = true;
        beginRound();
      }, 450);
    }
  }, 700);
}

function beginRound() {
  game.running = true;
  game.startAt = performance.now() + 500;
  game.nextBeat = game.startAt;
  game.lastPulse = -1;

  $("tapHeart").disabled = false;
  setFace("Follow the pulse!");

  game.raf = requestAnimationFrame(gameTick);
}

function gameTick(now) {
  if (!game.running) return;

  const current =
    Math.floor((now - game.startAt) / game.interval) + 1;

  for (let i = 0; i < game.total; i++) {
    const beatTime = game.startAt + i * game.interval;

    if (now > beatTime + game.window && !game.handled.has(i)) {
      game.handled.add(i);
      game.misses++;
      game.combo = 0;

      $("comboCount").textContent = "0×";
      setFace("Oops! The heart says: try again 💗", true);
    }
  }

  game.beatIndex = Math.min(
    game.total,
    Math.max(0, current)
  );

  $("beatsLeft").textContent =
    Math.max(0, game.total - game.handled.size);

  const phase =
    ((now - game.startAt) % game.interval) / game.interval;

  $("beatMarker").style.transform =
    `translateX(${(phase - .5) * 270}px)`;

  const pulseIndex =
    Math.floor((now - game.startAt) / game.interval);

  if (
    pulseIndex >= 0 &&
    pulseIndex < game.total &&
    pulseIndex !== game.lastPulse &&
    now - (game.startAt + pulseIndex * game.interval) < 70
  ) {
    game.lastPulse = pulseIndex;

    $("heartCharacter").classList.add("beat");

    setTimeout(() => {
      $("heartCharacter").classList.remove("beat");
    }, 130);

    $("beatMarker").classList.add("active");

    setTimeout(() => {
      $("beatMarker").classList.remove("active");
    }, 150);
  }

  if (game.handled.size >= game.total) {
    finishRound();
    return;
  }

  game.raf = requestAnimationFrame(gameTick);
}

function tapBeat() {
  if (!game.running) return;

  const now = performance.now();

  let nearest = -1;
  let delta = Infinity;

  for (let i = 0; i < game.total; i++) {
    if (game.handled.has(i)) continue;

    const diff = Math.abs(
      now - (game.startAt + i * game.interval)
    );

    if (diff < delta) {
      delta = diff;
      nearest = i;
    }
  }

  if (nearest < 0 || delta > game.window) {
    game.combo = 0;
    $("comboCount").textContent = "0×";
    setFace("A little off-beat! Keep going.", true);
    return;
  }

  game.handled.add(nearest);
  game.hits++;
  game.combo++;

  game.bestCombo = Math.max(game.bestCombo, game.combo);

  let points;

  if (delta <= game.window * .32) {
    points = 100;
    game.perfect++;
    setFace("PERFECT! You're a rhythm star! ✨");
  } else if (delta <= game.window * .68) {
    points = 70;
    setFace("GREAT timing! 💗");
  } else {
    points = 40;
    setFace("Nice one! Keep the beat!");
  }

  const comboBonus = Math.min(
    50,
    Math.max(0, game.combo - 1) * 5
  );

  game.score += points + comboBonus;

  $("gameScore").textContent = game.score;
  $("comboCount").textContent = game.combo + "×";
  $("bestCombo").textContent = game.bestCombo + "×";

  $("beatsLeft").textContent =
    Math.max(0, game.total - game.handled.size);

  $("heartCharacter").classList.add("beat");

  setTimeout(() => {
    $("heartCharacter").classList.remove("beat");
  }, 140);

  if (game.handled.size >= game.total) finishRound();
}

$("tapHeart").addEventListener("click", tapBeat);

document.addEventListener("keydown", e => {
  if (
    !$("heartbeatGame").hidden &&
    (e.code === "Space" || e.code === "Enter") &&
    !e.repeat
  ) {
    if (e.target.tagName === "BUTTON" && e.code === "Enter") return;

    e.preventDefault();
    tapBeat();
  }
});

function finishRound() {
  if (!game.running) return;

  game.running = false;
  stopGameLoop();

  $("tapHeart").disabled = true;

  const accuracy = Math.round(
    (game.hits / game.total) * 100
  );

  const earnedXP = Math.max(
    5,
    Math.round(game.score / 35) + 10
  );

  const earnedCoins = Math.max(
    5,
    Math.round(game.score / 55) + 5
  );

  const title =
    accuracy >= 90 ? "Heart-throb hero!" :
    accuracy >= 65 ? "Rhythm superstar!" :
    accuracy >= 40 ? "Keep that heart happy!" :
    "Every great doctor keeps learning!";

  const message =
    accuracy >= 90
      ? "Wow! You and that little heart are perfectly in sync."
      : accuracy >= 65
      ? "That was lovely timing. The heart is doing a happy dance!"
      : accuracy >= 40
      ? "A good start! A little practice makes a big difference."
      : "No worries. Every expert starts somewhere. Give it another go!";

  coins += earnedCoins;
  xp += earnedXP;
  completeDailyMission();

  const newBadge = awardBadge("heartbeat");

  if (newBadge) {
    $("collectionCount").textContent =
      `${badges} badges collected`;
  }

  updateStats();

  $("resultEmoji").textContent =
    accuracy >= 65 ? "🏆" : "💗";

  $("resultTitle").textContent = title;

  $("resultMessage").textContent =
    `${message} Accuracy: ${accuracy}% • Best combo: ${game.bestCombo}×`;

  $("finalScore").textContent = game.score;
  $("earnedXP").textContent = `${earnedXP} XP`;
  $("earnedCoins").textContent = `${earnedCoins} coins`;

  $("gameResult").hidden = false;
}

$("gameBack").addEventListener("click", hideGame);
$("resultHome").addEventListener("click", hideGame);
$("playAgain").addEventListener("click", startHeartbeatGame);

/* ==========================================
   BRAIN STORM
   MEMORY CHALLENGE
========================================== */

const brain = {
  sequence: [],
  playerIndex: 0,
  round: 0,
  score: 0,
  streak: 0,
  best: Number(saved.brainBest) || 0,
  running: false,
  accepting: false,
  timers: [],
  roundScores: 0
};

const brainTiles = [...document.querySelectorAll(".memory-tile")];

const brainReactions = {
  ready: [
    "Ready to give your brain a workout?",
    "Let's see those brilliant brain cells!",
    "Your brain called. It wants a challenge!"
  ],
  correct: [
    "YES! Your neurons are dancing! 🧠",
    "Brilliant! Not a single brain cell wasted!",
    "Look at that memory power!",
    "Dr. Hope is impressed!"
  ],
  wrong: [
    "Oops! That neuron took a wrong turn!",
    "Close! Even genius brains need practice.",
    "The brain gremlins got you this time!",
    "No worries. Let's give it another go!"
  ]
};

function randomMessage(type) {
  const list = brainReactions[type];
  return list[Math.floor(Math.random() * list.length)];
}

function brainMessage(message) {
  $("brainMessage").textContent = message;
  $("brainCharacter").classList.remove("excited");

  void $("brainCharacter").offsetWidth;

  $("brainCharacter").classList.add("excited");
}

function clearBrainTimers() {
  brain.timers.forEach(timer => clearTimeout(timer));
  brain.timers = [];
}

function brainDelay(callback, delay) {
  const timer = setTimeout(callback, delay);
  brain.timers.push(timer);
  return timer;
}

function setBrainTilesDisabled(disabled) {
  brainTiles.forEach(tile => {
    tile.disabled = disabled;
  });
}

function updateBrainStats() {
  $("brainScore").textContent = brain.score;
  $("brainRound").textContent = `${Math.min(brain.round + 1, 5)} / 5`;
  $("brainStreak").textContent = brain.streak;
  $("brainBest").textContent = brain.best;
}

function showBrainGame() {
  $("brainGame").hidden = false;
  document.body.style.overflow = "hidden";
}

function hideBrainGame() {
  clearBrainTimers();

  brain.running = false;
  brain.accepting = false;

  setBrainTilesDisabled(true);

  $("brainGame").hidden = true;
  $("brainResult").hidden = true;

  document.body.style.overflow = "";
}

function startBrainGame() {
  clearBrainTimers();

  showBrainGame();

  brain.sequence = [];
  brain.playerIndex = 0;
  brain.round = 0;
  brain.score = 0;
  brain.streak = 0;
  brain.roundScores = 0;
  brain.running = true;
  brain.accepting = false;

  $("brainResult").hidden = true;
  $("brainStart").hidden = false;
  $("brainStart").textContent = "Let's play! →";

  $("brainStatus").textContent = "PRESS START WHEN READY";

  brainMessage(randomMessage("ready"));

  setBrainTilesDisabled(true);
  updateBrainStats();
}

function beginBrainChallenge() {
  if (!brain.running) return;

  $("brainStart").hidden = true;

  brain.round++;
  brain.playerIndex = 0;
  brain.sequence = [];

  const sequenceLength = brain.round + 1;

  for (let i = 0; i < sequenceLength; i++) {
    brain.sequence.push(Math.floor(Math.random() * 4));
  }

  updateBrainStats();

  $("brainStatus").textContent =
    "WATCH THE SEQUENCE CAREFULLY!";

  brainMessage(
    brain.round === 5
      ? "Final round! Show those brain cells who's boss!"
      : "Watch closely. Remember the order!"
  );

  setBrainTilesDisabled(true);

  brainDelay(() => showBrainSequence(0), 650);
}

function showBrainSequence(index) {
  if (!brain.running) return;

  if (index >= brain.sequence.length) {
    brainDelay(() => {
      brain.accepting = true;
      brain.playerIndex = 0;

      $("brainStatus").textContent = "YOUR TURN! REPEAT THE SEQUENCE";
      brainMessage("Your turn! I believe in you!");
      setBrainTilesDisabled(false);
    }, 350);

    return;
  }

  const tileIndex = brain.sequence[index];
  const tile = brainTiles[tileIndex];

  tile.classList.add("flash");

  brainDelay(() => {
    tile.classList.remove("flash");

    brainDelay(() => {
      showBrainSequence(index + 1);
    }, 180);

  }, 520);
}

function brainTilePressed(index) {
  if (!brain.running || !brain.accepting) return;

  const expected = brain.sequence[brain.playerIndex];

  if (index !== expected) {
    brain.accepting = false;
    brain.streak = 0;

    const tile = brainTiles[index];
    tile.classList.add("wrong");

    brainDelay(() => tile.classList.remove("wrong"), 350);

    brainMessage(randomMessage("wrong"));

    $("brainStatus").textContent = "NOT QUITE!";

    setBrainTilesDisabled(true);

    brainDelay(() => finishBrainGame(false), 1100);

    return;
  }

  const tile = brainTiles[index];

  tile.classList.add("flash");

  brainDelay(() => tile.classList.remove("flash"), 220);

  brain.playerIndex++;
  brain.streak++;

  if (brain.playerIndex >= brain.sequence.length) {
    brain.accepting = false;

    const roundPoints = brain.round * 100;
    brain.score += roundPoints;
    brain.roundScores++;

    brain.best = Math.max(brain.best, brain.streak);

    saved.brainBest = brain.best;
    saveProgress();

    updateBrainStats();

    brainMessage(randomMessage("correct"));

    $("brainStatus").textContent =
      `ROUND ${brain.round} COMPLETE! +${roundPoints} POINTS`;

    setBrainTilesDisabled(true);

    if (brain.round >= 5) {
      brainDelay(() => finishBrainGame(true), 1100);
    } else {
      brainDelay(() => beginBrainChallenge(), 1100);
    }
  }
}

brainTiles.forEach(tile => {
  tile.addEventListener("click", () => {
    brainTilePressed(Number(tile.dataset.tile));
  });
});

$("brainStart").addEventListener("click", () => {
  if (!brain.running) {
    startBrainGame();
  }

  clearBrainTimers();
  beginBrainChallenge();
});

function finishBrainGame(completed) {
  clearBrainTimers();

  brain.running = false;
  brain.accepting = false;

  setBrainTilesDisabled(true);

  const earnedXP = Math.max(
    5,
    brain.roundScores * 12 + Math.round(brain.score / 80)
  );

  const earnedCoins = Math.max(
    5,
    brain.roundScores * 6 + Math.round(brain.score / 150)
  );

  coins += earnedCoins;
  xp += earnedXP;

  let newBadge = false;

  if (completed) {
    newBadge = awardBadge("brain");
  }

  updateStats();

  $("brainResultEmoji").textContent =
    completed ? "🏆" : "🧠";

  $("brainResultKicker").textContent =
    completed ? "FIVE ROUNDS COMPLETE!" : "CHALLENGE COMPLETE";

  $("brainResultTitle").textContent =
    completed
      ? newBadge ? "Brainiac unlocked!" : "Brilliant thinking!"
      : "A brainy effort!";

  $("brainResultMessage").textContent =
    completed
      ? "You remembered every sequence! Dr. Hope is doing a victory dance. You are officially a Mediverse Brainiac!"
      : `${randomMessage("wrong")} You completed ${brain.roundScores} of 5 rounds. Every attempt makes your memory stronger.`;

  $("brainFinalScore").textContent = brain.score;
  $("brainEarnedXP").textContent = `${earnedXP} XP`;
  $("brainEarnedCoins").textContent = `${earnedCoins} coins`;

  $("brainResult").hidden = false;

  $("brainStart").hidden = false;
  $("brainStart").textContent = "Play again →";
}

$("brainBack").addEventListener("click", hideBrainGame);

$("brainResultHome").addEventListener("click", hideBrainGame);

$("brainPlayAgain").addEventListener("click", startBrainGame);

/* ==========================================
   INITIALIZE
========================================== */

initialiseDailyMission();
updateDailyMissionUI();

updateStats();
updateBrainStats();

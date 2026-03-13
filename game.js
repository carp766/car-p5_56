const gameData = {
  locations: [
    { id: "ru", name: "Российская школа", color: "#1d4ed8", objective: "Координируй эвакуацию и перекрывай опасные зоны." },
    { id: "us", name: "Американская школа", color: "#0f766e", objective: "Найди учеников, активируй тревогу и держи безопасный периметр." }
  ],
  modes: [
    { id: "campaign", name: "Кампания", note: "20 последовательных уровней", levels: 20 },
    { id: "defense", name: "Оборона", note: "Удерживай безопасные зоны как можно дольше", levels: Infinity },
    { id: "sandbox", name: "Песочница", note: "Свободная тренировка тактик", levels: Infinity }
  ],
  characters: [
    {
      name: "Иван Бурин",
      role: "Стрелок",
      country: "Россия",
      gear: "M850 (тренировочный маркер)",
      bonus: "+15% к скорости перемещения"
    },
    {
      name: "Джек Шендер",
      role: "Стрелок",
      country: "США",
      gear: "M4 (тренировочный маркер)",
      bonus: "+10% к точности сигналов"
    },
    {
      name: "Сергей Борисов",
      role: "Школьник",
      country: "7 класс",
      gear: "Рюкзак, аптечка, фонарик",
      bonus: "+20% к скорости спасения"
    },
    {
      name: "Пол Олипс",
      role: "Школьник",
      country: "9 класс",
      gear: "Телефон, карта школы, вода",
      bonus: "+15% к разведке"
    },
    {
      name: "Андрей Волин",
      role: "Полицейский",
      country: "Россия",
      gear: "АКМ (учебный макет), щит",
      bonus: "+25% к защите зоны"
    },
    {
      name: "Джеймс Опинл",
      role: "Полицейский",
      country: "США",
      gear: "M4A1-S (учебный макет), рация",
      bonus: "+20% к координации команды"
    }
  ]
};

const state = {
  running: false,
  paused: false,
  level: 1,
  score: 0,
  timer: 0,
  citizensSaved: 0,
  selectedLocation: gameData.locations[0],
  selectedMode: gameData.modes[0],
  selectedCharacter: gameData.characters[0],
  avatar: { x: 80, y: 80, speed: 220, radius: 16 },
  targets: []
};

const locationSelect = document.getElementById("locationSelect");
const modeSelect = document.getElementById("modeSelect");
const characterSelect = document.getElementById("characterSelect");
const characterCard = document.getElementById("characterCard");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const hud = document.getElementById("hud");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const keys = new Set();
let lastFrame = 0;

function fillSelect(select, list, mapper) {
  list.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = mapper(item);
    select.appendChild(option);
  });
}

fillSelect(locationSelect, gameData.locations, (l) => l.name);
fillSelect(modeSelect, gameData.modes, (m) => `${m.name} — ${m.note}`);
fillSelect(characterSelect, gameData.characters, (c) => `${c.name} (${c.role})`);

function updateCharacterCard() {
  const c = state.selectedCharacter;
  characterCard.innerHTML = `
    <strong>${c.name}</strong><br>
    Роль: ${c.role}<br>
    Профиль: ${c.country}<br>
    Снаряжение: ${c.gear}<br>
    Бонус: ${c.bonus}
  `;
}

function spawnTargets(count) {
  state.targets = [];
  for (let i = 0; i < count; i += 1) {
    state.targets.push({
      x: 60 + Math.random() * (canvas.width - 120),
      y: 60 + Math.random() * (canvas.height - 120),
      radius: 12,
      done: false
    });
  }
}

function applySelections() {
  state.selectedLocation = gameData.locations[Number(locationSelect.value)];
  state.selectedMode = gameData.modes[Number(modeSelect.value)];
  state.selectedCharacter = gameData.characters[Number(characterSelect.value)];
  updateCharacterCard();
}

locationSelect.addEventListener("change", applySelections);
modeSelect.addEventListener("change", applySelections);
characterSelect.addEventListener("change", applySelections);

startBtn.addEventListener("click", () => {
  applySelections();
  state.running = true;
  state.paused = false;
  spawnTargets(state.selectedMode.id === "campaign" ? Math.min(4 + state.level, 12) : 8);
});

pauseBtn.addEventListener("click", () => {
  state.paused = !state.paused;
});

resetBtn.addEventListener("click", () => {
  state.running = false;
  state.paused = false;
  state.level = 1;
  state.score = 0;
  state.timer = 0;
  state.citizensSaved = 0;
  state.avatar.x = 80;
  state.avatar.y = 80;
  state.targets = [];
});

window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function update(dt) {
  if (!state.running || state.paused) return;

  state.timer += dt;

  const speedMultiplier = state.selectedCharacter.role === "Стрелок" ? 1.15 : 1;
  const speed = state.avatar.speed * speedMultiplier * dt;

  if (keys.has("w") || keys.has("arrowup")) state.avatar.y -= speed;
  if (keys.has("s") || keys.has("arrowdown")) state.avatar.y += speed;
  if (keys.has("a") || keys.has("arrowleft")) state.avatar.x -= speed;
  if (keys.has("d") || keys.has("arrowright")) state.avatar.x += speed;

  state.avatar.x = Math.max(state.avatar.radius, Math.min(canvas.width - state.avatar.radius, state.avatar.x));
  state.avatar.y = Math.max(state.avatar.radius, Math.min(canvas.height - state.avatar.radius, state.avatar.y));

  state.targets.forEach((target) => {
    if (target.done) return;
    const dx = target.x - state.avatar.x;
    const dy = target.y - state.avatar.y;
    if (Math.hypot(dx, dy) < target.radius + state.avatar.radius) {
      target.done = true;
      state.score += 100;
      state.citizensSaved += 1;
    }
  });

  const remaining = state.targets.filter((t) => !t.done).length;
  if (remaining === 0 && state.running) {
    if (state.selectedMode.id === "campaign") {
      if (state.level < 20) {
        state.level += 1;
        spawnTargets(Math.min(4 + state.level, 12));
      } else {
        state.running = false;
      }
    } else if (state.selectedMode.id === "defense") {
      spawnTargets(10);
      state.score += 50;
    }
  }
}

function draw() {
  ctx.fillStyle = state.selectedLocation.color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(15,23,42,0.35)";
  for (let x = 0; x < canvas.width; x += 48) {
    ctx.fillRect(x, 0, 1, canvas.height);
  }

  for (let y = 0; y < canvas.height; y += 48) {
    ctx.fillRect(0, y, canvas.width, 1);
  }

  state.targets.forEach((target) => {
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    ctx.fillStyle = target.done ? "#22c55e" : "#fbbf24";
    ctx.fill();
  });

  ctx.beginPath();
  ctx.arc(state.avatar.x, state.avatar.y, state.avatar.radius, 0, Math.PI * 2);
  ctx.fillStyle = "#e2e8f0";
  ctx.fill();

  hud.textContent = `Режим: ${state.selectedMode.name} | Уровень: ${state.level}/20 | Очки: ${state.score} | Спасено: ${state.citizensSaved} | Время: ${state.timer.toFixed(1)}с`;

  if (!state.running) {
    ctx.fillStyle = "rgba(2,6,23,0.75)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText("Нажми СТАРТ, чтобы начать тренировку безопасности", 120, canvas.height / 2);
  }
}

function loop(timestamp) {
  const dt = (timestamp - lastFrame) / 1000;
  lastFrame = timestamp;
  update(dt || 0);
  draw();
  requestAnimationFrame(loop);
}

applySelections();
spawnTargets(6);
requestAnimationFrame(loop);

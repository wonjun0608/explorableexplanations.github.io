/* Casino Always Wins Simulator
   - Single-run: balance curve + LLN average profit/round curve
   - Monte Carlo: ruin probability + final bankroll distribution
   - No server needed. Open index.html directly.
*/

const $ = (id) => document.getElementById(id);

function fmtMoney(x) {
  const sign = x < 0 ? "-" : "";
  const abs = Math.abs(x);
  return sign + "$" + abs.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function fmtInt(x) {
  return x.toLocaleString();
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// ----- State -----
let state = {
  bankroll0: 1000,
  bankroll: 1000,
  rounds: 0,
  totalProfit: 0,
  currentBet: 10,
  lastOutcome: null, // "W" | "L"
  streakLosses: 0,
  running: false,
  autoTimer: null,

  // chart series
  balanceHistory: [1000],
  avgProfitHistory: [0],

  // MC results
  distFinals: [],
};

// ----- Read settings -----
function readSettings() {
  const bankroll0 = Math.max(1, Number($("startingBankroll").value || 1000));
  const pWin = clamp(Number($("pWin").value || 0.495), 0, 1);
  const payout = Math.max(0, Number($("payout").value || 1.0));
  const baseBet = Math.max(1, Number($("baseBet").value || 10));
  const maxBet = Math.max(1, Number($("maxBet").value || 500));
  const strategy = $("strategy").value;

  const autoRounds = Math.max(1, Number($("autoRounds").value || 500));
  const mcSims = Math.max(10, Number($("mcSims").value || 300));
  const mcHorizon = Math.max(10, Number($("mcHorizon").value || 2000));

  return { bankroll0, pWin, payout, baseBet, maxBet, strategy, autoRounds, mcSims, mcHorizon };
}

// ----- Strategy bet sizing -----
function computeBet(settings, st) {
  const { baseBet, maxBet, strategy } = settings;

  let bet = baseBet;

  if (strategy === "flat") {
    bet = baseBet;
  } else if (strategy === "random") {
    bet = Math.floor(1 + Math.random() * baseBet);
  } else if (strategy === "proportional") {
    // 2% of bankroll, at least 1
    bet = Math.max(1, Math.floor(st.bankroll * 0.02));
  } else if (strategy === "martingale") {
    // base * 2^(loss streak)
    bet = baseBet * (2 ** st.streakLosses);
  }

  bet = Math.min(bet, maxBet);
  bet = Math.min(bet, Math.max(0, st.bankroll)); // can't bet more than bankroll
  bet = Math.max(0, Math.floor(bet));

  return bet;
}

// ----- One round of play -----
function playOneRound() {
  const settings = readSettings();
  if (state.bankroll <= 0) return false;

  const bet = computeBet(settings, state);
  if (bet <= 0) return false;

  const win = Math.random() < settings.pWin;

  // payout: win profit = payout * bet, loss = -bet
  const profit = win ? (settings.payout * bet) : -bet;

  state.bankroll += profit;
  // protect against float drift, but keep cents
  state.bankroll = Math.max(0, Math.round(state.bankroll * 100) / 100);

  state.rounds += 1;
  state.totalProfit = state.bankroll - state.bankroll0;

  state.lastOutcome = win ? "W" : "L";
  if (win) state.streakLosses = 0;
  else state.streakLosses += 1;

  // update histories
  state.balanceHistory.push(state.bankroll);
  state.avgProfitHistory.push(state.totalProfit / state.rounds);

  updateUI();
  updateCharts();

  return true;
}

// ----- Reset -----
function resetAll() {
  stopAuto();

  const settings = readSettings();
  state.bankroll0 = settings.bankroll0;
  state.bankroll = settings.bankroll0;
  state.rounds = 0;
  state.totalProfit = 0;
  state.lastOutcome = null;
  state.streakLosses = 0;

  state.balanceHistory = [state.bankroll];
  state.avgProfitHistory = [0];

  // clear MC outputs
  state.distFinals = [];
  $("ruinProb").textContent = "—";
  $("ruinTime").textContent = "—";
  $("mcProgress").style.width = "0%";

  updateUI();
  updateCharts(true);
  updateDistChart(true);
}

// ----- Auto-play -----
function startAuto() {
  if (state.running) return;
  state.running = true;

  $("btnStop").disabled = false;
  $("btnAuto").disabled = true;
  $("btnOne").disabled = true;
  $("btnReset").disabled = true;
  $("btnMC").disabled = true;

  const { autoRounds } = readSettings();
  let remaining = autoRounds;

  // chunked loop to keep UI responsive
  const step = () => {
    if (!state.running) return;
    let did = 0;
    const chunk = 50;

    while (did < chunk && remaining > 0 && state.bankroll > 0) {
      playOneRound();
      remaining--;
      did++;
    }

    if (remaining <= 0 || state.bankroll <= 0) {
      stopAuto();
      return;
    }
    state.autoTimer = window.setTimeout(step, 10);
  };

  step();
}

function stopAuto() {
  state.running = false;
  if (state.autoTimer) window.clearTimeout(state.autoTimer);
  state.autoTimer = null;

  $("btnStop").disabled = true;
  $("btnAuto").disabled = false;
  $("btnOne").disabled = false;
  $("btnReset").disabled = false;
  $("btnMC").disabled = false;
}

// ----- Charts -----
let balanceChart, avgChart, distChart;

function makeLineChart(canvasId, label, dataArr) {
  const ctx = $(canvasId).getContext("2d");
  return new Chart(ctx, {
    type: "line",
    data: {
      labels: dataArr.map((_, i) => i),
      datasets: [{
        label,
        data: dataArr,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
      }]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { labels: { color: "rgba(255,255,255,0.75)" } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtMoney(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "rgba(255,255,255,0.55)" },
          grid: { color: "rgba(255,255,255,0.08)" }
        },
        y: {
          ticks: { color: "rgba(255,255,255,0.55)" },
          grid: { color: "rgba(255,255,255,0.08)" }
        }
      }
    }
  });
}

function initCharts() {
  balanceChart = makeLineChart("balanceChart", "Bankroll", state.balanceHistory);

  // avg profit per round curve (LLN)
  const ctx2 = $("avgChart").getContext("2d");
  avgChart = new Chart(ctx2, {
    type: "line",
    data: {
      labels: state.avgProfitHistory.map((_, i) => i),
      datasets: [{
        label: "Avg profit / round",
        data: state.avgProfitHistory,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
      }]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { labels: { color: "rgba(255,255,255,0.75)" } },
        tooltip: {
          callbacks: {
            label: (ctx) => `Avg profit/round: ${fmtMoney(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "rgba(255,255,255,0.55)" },
          grid: { color: "rgba(255,255,255,0.08)" }
        },
        y: {
          ticks: { color: "rgba(255,255,255,0.55)" },
          grid: { color: "rgba(255,255,255,0.08)" }
        }
      }
    }
  });

  // distribution chart
  const ctx3 = $("distChart").getContext("2d");
  distChart = new Chart(ctx3, {
    type: "bar",
    data: {
      labels: [],
      datasets: [{
        label: "Count",
        data: [],
        borderWidth: 1,
      }]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: {
        legend: { labels: { color: "rgba(255,255,255,0.75)" } },
        tooltip: {
          callbacks: {
            label: (ctx) => `Count: ${fmtInt(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "rgba(255,255,255,0.55)", maxRotation: 0, autoSkip: true },
          grid: { color: "rgba(255,255,255,0.08)" }
        },
        y: {
          ticks: { color: "rgba(255,255,255,0.55)" },
          grid: { color: "rgba(255,255,255,0.08)" }
        }
      }
    }
  });
}

function updateCharts(rebuild = false) {
  if (!balanceChart || rebuild) return;

  balanceChart.data.labels = state.balanceHistory.map((_, i) => i);
  balanceChart.data.datasets[0].data = state.balanceHistory;
  balanceChart.update();

  avgChart.data.labels = state.avgProfitHistory.map((_, i) => i);
  avgChart.data.datasets[0].data = state.avgProfitHistory;
  avgChart.update();
}

function updateDistChart(clear = false) {
  if (!distChart) return;

  if (clear || state.distFinals.length === 0) {
    distChart.data.labels = [];
    distChart.data.datasets[0].data = [];
    distChart.update();
    return;
  }

  // build histogram bins
  const finals = state.distFinals.slice().sort((a, b) => a - b);
  const min = finals[0];
  const max = finals[finals.length - 1];

  // choose bin count based on sims
  const binCount = Math.min(30, Math.max(10, Math.floor(Math.sqrt(finals.length))));
  const width = (max - min) / binCount || 1;

  const bins = Array.from({ length: binCount }, () => 0);
  for (const v of finals) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx]++;
  }

  const labels = bins.map((_, i) => {
    const a = min + i * width;
    const b = a + width;
    // short labels
    return `${Math.round(a)}–${Math.round(b)}`;
  });

  distChart.data.labels = labels;
  distChart.data.datasets[0].data = bins;
  distChart.update();
}

// ----- UI -----
function updateUI() {
  $("balance").textContent = fmtMoney(state.bankroll);
  $("rounds").textContent = fmtInt(state.rounds);
  $("avgProfit").textContent = fmtMoney(state.rounds === 0 ? 0 : (state.totalProfit / state.rounds));

  // subtle color cue
  const balEl = $("balance");
  balEl.style.color =
    state.bankroll <= 0 ? "rgba(255,77,90,0.95)" :
    state.totalProfit >= 0 ? "rgba(83,255,154,0.95)" :
    "rgba(255,255,255,0.92)";
}

// ----- Monte Carlo (ruin + distribution) -----
async function runMonteCarlo() {
  if (state.running) return;

  $("btnMC").disabled = true;
  $("btnReset").disabled = true;
  $("btnAuto").disabled = true;
  $("btnOne").disabled = true;

  $("ruinProb").textContent = "Running…";
  $("ruinTime").textContent = "—";
  $("mcProgress").style.width = "0%";

  const settings = readSettings();
  const sims = settings.mcSims;
  const horizon = settings.mcHorizon;

  let ruined = 0;
  let ruinRoundsSum = 0;
  const finals = [];

  // simulate in chunks for responsiveness
  const chunk = 25;
  for (let s = 0; s < sims; s++) {
    // simulate one universe
    const res = simulateUniverse(settings, horizon);
    finals.push(res.finalBankroll);

    if (res.ruined) {
      ruined++;
      ruinRoundsSum += res.ruinAt;
    }

    // progress + yield
    if ((s + 1) % chunk === 0 || s === sims - 1) {
      const pct = Math.round(((s + 1) / sims) * 100);
      $("mcProgress").style.width = pct + "%";
      await new Promise(r => setTimeout(r, 0));
    }
  }

  state.distFinals = finals;
  updateDistChart(false);

  const ruinProb = ruined / sims;
  const avgRuinAt = ruined > 0 ? (ruinRoundsSum / ruined) : null;

  $("ruinProb").textContent = `${(ruinProb * 100).toFixed(1)}%`;
  $("ruinTime").textContent = avgRuinAt === null ? "—" : `${avgRuinAt.toFixed(0)} rounds`;

  $("btnMC").disabled = false;
  $("btnReset").disabled = false;
  $("btnAuto").disabled = false;
  $("btnOne").disabled = false;
}

function simulateUniverse(settings, horizon) {
  let bankroll0 = settings.bankroll0;
  let bankroll = bankroll0;
  let streakLosses = 0;

  for (let t = 1; t <= horizon; t++) {
    if (bankroll <= 0) {
      return { ruined: true, ruinAt: t - 1, finalBankroll: 0 };
    }

    // compute bet using the same logic
    const st = { bankroll, streakLosses };
    let bet = computeBet(settings, st);
    if (bet <= 0) return { ruined: bankroll <= 0, ruinAt: t - 1, finalBankroll: bankroll };

    const win = Math.random() < settings.pWin;
    const profit = win ? (settings.payout * bet) : -bet;

    bankroll += profit;
    bankroll = Math.max(0, Math.round(bankroll * 100) / 100);

    if (win) streakLosses = 0;
    else streakLosses += 1;
  }

  // not ruined within horizon
  return { ruined: bankroll <= 0, ruinAt: horizon, finalBankroll: bankroll };
}

// ----- Wire up -----
function bindEvents() {
  $("btnReset").addEventListener("click", resetAll);
  $("btnOne").addEventListener("click", () => playOneRound());
  $("btnAuto").addEventListener("click", startAuto);
  $("btnStop").addEventListener("click", stopAuto);
  $("btnMC").addEventListener("click", runMonteCarlo);

  // If user changes starting bankroll while running, we don’t auto-reset; user controls reset.
  // But we do update “expected feel” immediately by updating displayed balance on reset only.
}

// ----- Boot -----
function boot() {
  initCharts();
  bindEvents();
  resetAll();
}

boot();

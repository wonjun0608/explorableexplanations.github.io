const canvas = document.getElementById("histogram");
const ctx = canvas.getContext("2d");

const slider = document.getElementById("sampleSize");
const sampleValue = document.getElementById("sampleValue");
const runButton = document.getElementById("run");
const resetButton = document.getElementById("reset");

const runCountText = document.getElementById("runCount");
const meanValueText = document.getElementById("meanValue");

let results = [];

sampleValue.textContent = slider.value;

slider.oninput = () => {
  sampleValue.textContent = slider.value;
};

runButton.onclick = () => {
  const n = Number(slider.value);

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += Math.random();
  }

  results.push(sum / n);

  updateStats();
  drawHistogram();
};

resetButton.onclick = () => {
  results = [];
  updateStats();
  drawHistogram();
};

function updateStats() {
  runCountText.textContent = results.length;

  if (results.length === 0) {
    meanValueText.textContent = "–";
    return;
  }

  const mean =
    results.reduce((a, b) => a + b, 0) / results.length;

  meanValueText.textContent = mean.toFixed(3);
}

function drawHistogram() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (results.length === 0) return;

  const bins = 20;
  const counts = Array(bins).fill(0);

  results.forEach(v => {
    const index = Math.min(
      bins - 1,
      Math.floor(v * bins)
    );
    counts[index]++;
  });

  const maxCount = Math.max(...counts);
  const barWidth = canvas.width / bins;

  counts.forEach((count, i) => {
    const height = (count / maxCount) * (canvas.height - 40);

    ctx.fillStyle = "#00e5ff";
    ctx.fillRect(
      i * barWidth,
      canvas.height - height,
      barWidth - 2,
      height
    );
  });

  // draw mean line
  const mean =
    results.reduce((a, b) => a + b, 0) / results.length;

  const x = mean * canvas.width;

  ctx.strokeStyle = "#ffeb3b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, canvas.height);
  ctx.stroke();
}

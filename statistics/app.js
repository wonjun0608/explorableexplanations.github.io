// Explorable: Why does randomness stabilize?

// DOM elements
const slider = document.getElementById("n");
const value = document.getElementById("value");
const canvas = document.getElementById("histogram");
const ctx = canvas.getContext("2d");

// Canvas setup
canvas.width = 600;
canvas.height = 300;

// Display initial value
value.textContent = slider.value;

// --------------------------------
// Random sample generator
// --------------------------------
// Take the average of several uniform random numbers.
// This creates a smooth, bell-shaped distribution
// without explicitly mentioning any statistical laws.
function randomAverage(k = 6) {
  let sum = 0;
  for (let i = 0; i < k; i++) {
    sum += Math.random();
  }
  return sum / k; // in [0, 1]
}

// --------------------------------
// Histogram computation
// --------------------------------
function computeHistogram(samples, bins = 30) {
  const counts = Array(bins).fill(0);

  samples.forEach(x => {
    const i = Math.min(
      bins - 1,
      Math.floor(x * bins)
    );
    counts[i]++;
  });

  return counts;
}

// --------------------------------
// Draw histogram
// --------------------------------
function drawHistogram(counts) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const maxCount = Math.max(...counts);
  const barWidth = canvas.width / counts.length;

  counts.forEach((count, i) => {
    const height = (count / maxCount) * canvas.height;

    ctx.fillStyle = "#4B0082";
    ctx.fillRect(
      i * barWidth,
      canvas.height - height,
      barWidth - 1,
      height
    );
  });
}

// --------------------------------
// Update on interaction
// --------------------------------
function update() {
  const n = Number(slider.value);
  value.textContent = n;

  const samples = [];
  for (let i = 0; i < n; i++) {
    samples.push(randomAverage());
  }

  const histogram = computeHistogram(samples);
  drawHistogram(histogram);
}

// Event listener
slider.addEventListener("input", update);

// Initial render
update();

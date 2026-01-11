const icons = ["🧑‍🚀","🧙","🧝","🧛","🧞","🧟","🧜","🦸"];
let n = 4;
let rotation = 0;
let seen = new Set();
let currentKey = "";

const circle = document.getElementById("circle");
const count = document.getElementById("count");
const unique = document.getElementById("unique");
const feedback = document.getElementById("feedback");

function normalize(arr) {
  const doubled = arr.concat(arr);
  let best = null;

  for (let i = 0; i < arr.length; i++) {
    const slice = doubled.slice(i, i + arr.length).join("");
    if (!best || slice < best) best = slice;
  }
  return best;
}

function render() {
  circle.innerHTML = "";
  const radius = 140;
  const center = 160;

  const order = [];
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n + rotation;
    const x = center + radius * Math.cos(angle) - 24;
    const y = center + radius * Math.sin(angle) - 24;

    const el = document.createElement("div");
    el.className = "character";
    el.textContent = icons[i];
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    circle.appendChild(el);

    order.push(icons[i]);
  }

  currentKey = normalize(order);
}

function check(answer) {
  const isNew = !seen.has(currentKey);

  if (
    (answer === "new" && isNew) ||
    (answer === "same" && !isNew)
  ) {
    feedback.textContent = "✅ Correct!";
    if (isNew) {
      seen.add(currentKey);
      unique.textContent = seen.size;
    }
  } else {
    feedback.textContent = "❌ Not quite. Try rotating.";
  }
}

document.querySelectorAll(".answer").forEach(btn =>
  btn.onclick = () => check(btn.dataset.answer)
);

document.getElementById("rotate").onclick = () => {
  rotation += Math.PI / 6;
  render();
};

document.getElementById("random").onclick = () => {
  icons.sort(() => Math.random() - 0.5);
  render();
};

document.getElementById("plus").onclick = () => {
  if (n < 8) n++;
  count.textContent = n;
  seen.clear();
  unique.textContent = 0;
  render();
};

document.getElementById("minus").onclick = () => {
  if (n > 3) n--;
  count.textContent = n;
  seen.clear();
  unique.textContent = 0;
  render();
};

render();

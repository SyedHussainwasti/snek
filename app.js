"use strict";

// ---- Pure game logic: no drawing here, just the rules of the game ----

// Work out where the snake's head will be next, given its direction
function nextHead(head, dir) { return { x: head.x + dir.x, y: head.y + dir.y }; }

// Check if two directions are exact opposites (so the snake can't turn back into itself)
function isOpposite(a, b) { return a.x === -b.x && a.y === -b.y; }

// Pick a random empty square for the apple — never on top of the snake
function placeFood(snake, n) {
  var occ = {}, i, p, key; // occ remembers which squares the snake covers
  // Mark every square the snake's body sits on
  for (i = 0; i < snake.length; i++) { p = snake[i]; occ[p.x + ',' + p.y] = 1; }
  var free = []; // list of squares nobody is on
  // Walk the whole board and collect the free squares
  for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) { key = x + ',' + y; if (!occ[key]) free.push({ x: x, y: y }); }
  if (!free.length) return null; // board is full — the player wins
  // Pick one free square at random
  return free[(Math.random() * free.length) | 0];
}

// Move the game forward one step: returns the new game state
function stepSnake(s) {
  // Find where the head goes next
  var head = nextHead(s.snake[0], s.dir);
  // Hit a wall? The run ends.
  if (head.x < 0 || head.y < 0 || head.x >= s.n || head.y >= s.n)
    return { snake: s.snake, dir: s.dir, food: s.food, n: s.n, score: s.score, alive: false, died: 'wall' };
  // Did the head land on the apple?
  var eating = head.x === s.food.x && head.y === s.food.y;
  // If not eating, the tail moves up one (so the snake stays the same length)
  var body = eating ? s.snake : s.snake.slice(0, -1);
  // Did the head run into the body? The run ends.
  for (var i = 0; i < body.length; i++)
    if (body[i].x === head.x && body[i].y === head.y)
      return { snake: s.snake, dir: s.dir, food: s.food, n: s.n, score: s.score, alive: false, died: 'self' };
  var snake, food = s.food, score = s.score, won = false;
  if (eating) {
    score++; // one more apple eaten
    snake = [head].concat(s.snake); // grow: keep the tail this time
    food = placeFood(snake, s.n); // put a new apple down
    if (!food) won = true; // no free squares left — board is full, you win
  } else {
    snake = [head].concat(s.snake.slice(0, -1)); // move: new head, drop the tail
  }
  // Hand back the new state — still alive
  return { snake: snake, dir: s.dir, food: food, n: s.n, score: score, alive: true, won: won };
}

// ---- Page setup: grab the pieces we need from the HTML ----

// Board is 20x20 squares, 400 pixels wide
var N = 20, W = 400, CELL = W / N;
// Grab the drawing board and its paintbrush
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
// Grab the score numbers, the overlay panel and its text, and the start button
var scoreEl = document.getElementById('score'), bestEl = document.getElementById('best');
var ov = document.getElementById('ov'), ovTitle = document.getElementById('ovTitle');
var ovSub = document.getElementById('ovSub'), startBtn = document.getElementById('startBtn');
// Load the best score remembered from last time (or 0) and show it
var best = +(localStorage.getItem('snakeBest') || 0);
bestEl.textContent = best;

// s holds the whole game state; timer drives the loop; speed is the delay between steps
var s = null, timer = null, speed = 150, paused = false;

// Start a fresh game
function newGame() {
  // Snake starts 3 squares long, moving right
  var snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  s = { snake: snake, dir: { x: 1, y: 0 }, pend: { x: 1, y: 0 }, food: placeFood(snake, N), n: N, score: 0, alive: true, won: false };
  speed = 150; paused = false; // back to starting speed, not paused
  scoreEl.textContent = '0'; // reset the score display
  ov.classList.add('hidden'); // hide the menu overlay
  draw(); // paint the first frame
  clearTimeout(timer); // stop any old game loop
  timer = setTimeout(tick, speed); // start the new loop
}

// One heartbeat of the game — runs over and over
function tick() {
  // If paused, just wait and check again shortly
  if (paused) { timer = setTimeout(tick, 120); return; }
  // Apply the player's latest steering, unless it's a U-turn
  if (!isOpposite(s.pend, s.dir)) s.dir = s.pend;
  var before = s.score; // remember the score before this step
  s = stepSnake(s); // move the game one step
  // Died? Show the game-over panel with the reason.
  if (!s.alive) { gameOver(s.died === 'wall' ? 'Hit the wall!' : 'Bit yourself!'); return; }
  // Filled the whole board? That's a win.
  if (s.won) { gameOver('You filled the board! 🏆', true); return; }
  // Ate an apple? Speed up a little and update the score display.
  if (s.score > before) { speed = Math.max(65, speed - 4); scoreEl.textContent = s.score; }
  draw(); // repaint the board
  timer = setTimeout(tick, speed); // schedule the next heartbeat
}

// Show the game-over panel
function gameOver(msg, won) {
  clearTimeout(timer); // stop the loop
  var sc = s.score;
  // New best score? Remember it on the phone for next time.
  if (sc > best) { best = sc; localStorage.setItem('snakeBest', best); bestEl.textContent = best; }
  ovTitle.textContent = won ? 'You win!' : 'Game Over'; // title depends on win/lose
  ovSub.innerHTML = msg + '<br>Score: <b>' + sc + '</b> · Best: <b>' + best + '</b>'; // show what happened and the scores
  startBtn.textContent = 'Play again'; // the button now offers a rematch
  ov.classList.remove('hidden'); // show the panel
}

// Paint everything: board, grid, apple, snake, eyes
function draw() {
  // Paint the dark background
  ctx.fillStyle = '#0d1119'; ctx.fillRect(0, 0, W, W);
  // Draw the faint grid lines
  ctx.strokeStyle = '#161d2b'; ctx.lineWidth = 1;
  var i;
  for (i = 1; i < N; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, W); ctx.stroke(); // vertical line
    ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke(); // horizontal line
  }
  // Draw the apple as a red circle
  if (s.food) {
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(s.food.x * CELL + CELL / 2, s.food.y * CELL + CELL / 2, CELL * 0.38, 0, 7);
    ctx.fill();
  }
  // Draw the snake from tail to head so the head sits on top
  for (i = s.snake.length - 1; i >= 0; i--) {
    var p = s.snake[i];
    ctx.fillStyle = i === 0 ? '#8ce99a' : (i % 2 ? '#51cf66' : '#40c057'); // head is lightest, body alternates greens
    ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
  }
  // Draw two eyes on the head, placed according to which way it's facing
  if (s.snake.length) {
    var h = s.snake[0], cx = h.x * CELL + CELL / 2, cy = h.y * CELL + CELL / 2;
    ctx.fillStyle = '#0b0e14';
    var ex = CELL * 0.18, ey = CELL * 0.12;
    if (s.dir.x === 1) { ctx.fillRect(cx + ex, cy - ey - 2, 4, 4); ctx.fillRect(cx + ex, cy + ey - 2, 4, 4); } // facing right
    else if (s.dir.x === -1) { ctx.fillRect(cx - ex - 4, cy - ey - 2, 4, 4); ctx.fillRect(cx - ex - 4, cy + ey - 2, 4, 4); } // facing left
    else if (s.dir.y === 1) { ctx.fillRect(cx - ey - 2, cy + ex, 4, 4); ctx.fillRect(cx + ey - 2, cy + ex, 4, 4); } // facing down
    else { ctx.fillRect(cx - ey - 2, cy - ex - 4, 4, 4); ctx.fillRect(cx + ey - 2, cy - ex - 4, 4, 4); } // facing up
  }
}

// Steer the snake (ignores U-turns and input when there's no live game)
function steer(x, y) {
  if (!s || !s.alive) return;
  var d = { x: x, y: y };
  if (!isOpposite(d, s.dir)) s.pend = d; // pend = the direction to take on the next step
}

// Keyboard controls: arrows/WASD steer, space starts or pauses
window.addEventListener('keydown', function (e) {
  var k = e.key;
  if (k === 'ArrowUp' || k === 'w' || k === 'W') { steer(0, -1); e.preventDefault(); } // up
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { steer(0, 1); e.preventDefault(); } // down
  else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { steer(-1, 0); e.preventDefault(); } // left
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { steer(1, 0); e.preventDefault(); } // right
  else if (k === ' ') {
    if (!ov.classList.contains('hidden')) { newGame(); } // space on the menu starts the game
    else { paused = !paused; } // space mid-game pauses/unpauses
    e.preventDefault();
  }
});

// Touch controls: remember where the finger landed…
var tsx = 0, tsy = 0;
cv.addEventListener('touchstart', function (e) {
  var t = e.changedTouches[0]; tsx = t.clientX; tsy = t.clientY;
}, { passive: true });
// …and when it lifts, steer in the swipe direction (ignores tiny taps)
cv.addEventListener('touchend', function (e) {
  var t = e.changedTouches[0], dx = t.clientX - tsx, dy = t.clientY - tsy;
  if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return; // too small to be a swipe
  if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 1 : -1, 0); else steer(0, dy > 0 ? 1 : -1);
  e.preventDefault();
}, { passive: false });

// The Start button begins a new game
startBtn.addEventListener('click', newGame);

// Draw a quiet board behind the start menu so the page isn't empty
s = { snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }], dir: { x: 1, y: 0 }, pend: { x: 1, y: 0 }, food: { x: 14, y: 10 }, n: N, score: 0, alive: true };
draw();

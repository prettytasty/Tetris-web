// -------------------- CANVAS SETUP --------------------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// Neon colors
const COLORS = [
  null,
  '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF',
  '#FF8E0D', '#FFE138', '#3877FF'
];

// Tetromino shapes
const TETROMINOES = {
  'T': [[0,1,0],[1,1,1],[0,0,0]],
  'I': [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  'S': [[0,1,1],[1,1,0],[0,0,0]],
  'Z': [[1,1,0],[0,1,1],[0,0,0]],
  'L': [[0,0,1],[1,1,1],[0,0,0]],
  'J': [[1,0,0],[1,1,1],[0,0,0]],
  'O': [[1,1],[1,1]]
};

// -------------------- GAME STATE --------------------
let grid = Array.from({length: ROWS}, () => Array(COLS).fill(0));
let score = 0;
let level = 1;
let dropInterval = 1000;
let dropCounter = 0;
let lastTime = 0;

let player = {
  pos: {x:0, y:0},
  matrix: null,
  next: null,
  hold: null,
  canHold: true
};

// -------------------- DRAW BLOCKS --------------------
function drawMatrix(matrix, offset, context){
  matrix.forEach((row,y)=>{
    row.forEach((value,x)=>{
      if(value!==0){
        const px = (x+offset.x) * BLOCK_SIZE;
        const py = (y+offset.y) * BLOCK_SIZE;
        const size = BLOCK_SIZE - 2;

        context.fillStyle = COLORS[value];
        context.shadowColor = COLORS[value];
        context.shadowBlur = 8;
        context.fillRect(px, py, size, size);
        context.shadowBlur = 0;
      }
    });
  });
}

// -------------------- PLAYER ACTIONS --------------------
function merge(grid, player){
  player.matrix.forEach((row,y)=>{
    row.forEach((value,x)=>{
      if(value!==0) grid[y+player.pos.y][x+player.pos.x] = value;
    });
  });
}

function collide(grid, player){
  const [m,o] = [player.matrix, player.pos];
  for(let y=0;y<m.length;y++){
    for(let x=0;x<m[y].length;x++){
      if(m[y][x]!==0 && (grid[y+o.y] && grid[y+o.y][x+o.x])!==0) return true;
    }
  }
  return false;
}

function rotate(matrix, dir){
  for(let y=0;y<matrix.length;y++){
    for(let x=0;x<y;x++){
      [matrix[x][y],matrix[y][x]] = [matrix[y][x],matrix[x][y]];
    }
  }
  if(dir>0) matrix.forEach(row=>row.reverse());
  else matrix.reverse();
}

function playerDrop(){
  player.pos.y++;
  if(collide(grid,player)){
    player.pos.y--;
    merge(grid,player);
    gridSweep();
    updateScore();
    playerReset();
  }
  dropCounter = 0;
}

function playerMove(dir){
  player.pos.x += dir;
  if(collide(grid,player)) player.pos.x -= dir;
}

function playerRotate(dir){
  const pos = player.pos.x;
  rotate(player.matrix, dir);
  let offset=1;
  while(collide(grid,player)){
    player.pos.x+=offset;
    offset=-(offset+(offset>0?1:-1));
    if(offset>player.matrix[0].length){
      rotate(player.matrix,-dir);
      player.pos.x = pos;
      return;
    }
  }
}

function playerHold(){
  if(!player.canHold) return;
  if(!player.hold){
    player.hold = player.matrix;
    playerReset();
  } else {
    [player.hold,player.matrix] = [player.matrix,player.hold];
    player.pos = {x: Math.floor(COLS/2)-Math.floor(player.matrix[0].length/2), y:0};
  }
  player.canHold=false;
}

// Reset player
function playerReset(){
  if(!player.next) player.next = randomTetromino();
  player.matrix = player.next;
  player.next = randomTetromino();
  player.pos.y = 0;
  player.pos.x = Math.floor(COLS/2) - Math.floor(player.matrix[0].length/2);
  player.canHold = true;

  if(collide(grid,player)){
    grid.forEach(row=>row.fill(0));
    score=0; level=1; dropInterval=1000;
  }
}

// -------------------- GRID & SCORE --------------------
function gridSweep(){
  let rowCount=1;
  outer: for(let y=grid.length-1;y>=0;y--){
    for(let x=0;x<grid[y].length;x++){
      if(grid[y][x]===0) continue outer;
    }
    grid.splice(y,1);
    grid.unshift(Array(COLS).fill(0));
    score += rowCount*10;
    rowCount*=2;
    if(score>=level*100){ level++; dropInterval*=0.9;}
    y++;
  }
}

function randomTetromino(){
  const types='TJLSZOI';
  const type = types[Math.floor(Math.random()*types.length)];
  const map={'T':1,'J':6,'L':5,'S':3,'Z':4,'O':7,'I':2};
  return TETROMINOES[type].map(row=>row.map(v=>v?map[type]:0));
}

function updateScore(){
  document.getElementById('score').innerText = score;
  document.getElementById('level').innerText = level;
}

// -------------------- DRAW GAME --------------------
function draw(){
  ctx.fillStyle='#111';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  drawMatrix(grid,{x:0,y:0}, ctx);
  drawMatrix(player.matrix, player.pos, ctx);

  // ---------- CENTERED NEXT ----------
  nextCtx.fillStyle='#111';
  nextCtx.fillRect(0,0,nextCanvas.width,nextCanvas.height);
  const nextOffset = {
    x: Math.floor((nextCanvas.width/ BLOCK_SIZE - player.next[0].length)/2),
    y: Math.floor((nextCanvas.height/ BLOCK_SIZE - player.next.length)/2)
  };
  drawMatrix(player.next, nextOffset, nextCtx);

  // ---------- CENTERED HOLD ----------
  holdCtx.fillStyle='#111';
  holdCtx.fillRect(0,0,holdCanvas.width, holdCanvas.height);
  if(player.hold){
    const holdOffset = {
      x: Math.floor((holdCanvas.width/ BLOCK_SIZE - player.hold[0].length)/2),
      y: Math.floor((holdCanvas.height/ BLOCK_SIZE - player.hold.length)/2)
    };
    drawMatrix(player.hold, holdOffset, holdCtx);
  }
}

// -------------------- GAME LOOP --------------------
function update(time=0){
  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if(dropCounter > dropInterval) playerDrop();
  draw();
  requestAnimationFrame(update);
}

// -------------------- CONTROLS --------------------
document.addEventListener('keydown', event => {
  switch(event.key.toLowerCase()) {

    case 'a': // Move left
      playerMove(-1);
      break;

    case 'd': // Move right
      playerMove(1);
      break;

    case 's': // Soft drop
      playerDrop();
      break;

    case 'w': // Rotate
      playerRotate(1);
      break;

    case ' ': // Hard drop
      // Move down until collision
      while(!collide(grid, player)) {
        player.pos.y++;
      }
      player.pos.y--; // Step back ONE block so it doesn’t overlap
      merge(grid, player); // Merge into the grid
      gridSweep();          // Clear full rows
      updateScore();        // Update UI
      playerReset();        // Spawn next piece
      dropCounter = 0;      // Reset drop timer
      break;

    case 'c': // Hold
      playerHold();
      break;

  }
});


// -------------------- MADE BY TONY BUTTON --------------------
document.getElementById('tonyBtn').addEventListener('click', ()=>{
  alert("Thanks for playing Neon Tetris!");
});

// -------------------- START GAME --------------------
playerReset();
updateScore();
update();


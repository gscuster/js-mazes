let state = {
  maze: [
    [0, 1, 1, 1, 0],
    [2, 1, 1, 0, 2],
    [3, 3, 1, 0, 2],
    [2, 0, 1, 0, 2],
    [1, 3, 1, 3, 2]
  ],
  mazeSettings: {
    algorithm: null,
    cellDimensions: [32, 32],
    position: [64, 64],
    lineWidth: 3,
    strokeStyle: '#000000'
  },
  padding: 64
}

document.onreadystatechange = () => {
  if (document.readyState === "complete") {
    setup()
  }
}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 */
const draw = (ctx) => {
  drawMaze(ctx, state.mazeSettings, state.maze)
}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Maze} maze 
 */
const drawMaze = (ctx, mazeSettings, maze) => {
  ctx.lineWidth = mazeSettings.lineWidth
  ctx.strokeStyle = mazeSettings.strokeStyle
  for (let i = 0; i < maze.length; i++) {
    y = mazeSettings.cellDimensions[1] * i + mazeSettings.position[1]
    for (let j = 0; j < maze[i].length; j++) {
      x = mazeSettings.cellDimensions[0] * j + mazeSettings.position[0]
      if (maze[i][j] & 1) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + mazeSettings.cellDimensions[0], y)
        ctx.closePath()
        ctx.stroke()
      }
      if (maze[i][j] & 2) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y - mazeSettings.cellDimensions[1])
        ctx.closePath()
        ctx.stroke()
      }
    }
  }
}

const generateMaze = () => {
  const maze = state.mazeSettings.algorithm(4, 4)
  state.maze = maze
}

const preDraw = (canvas, ctx) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

const resizeCanvas = (canvas) => {
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    resizeMaze(canvas)
  }
}

/**
 * Updates parameters for the maze.
 * @param {HTMLCanvasElement} canvas 
 */
const resizeMaze = (canvas) => {
  const nX = state.maze[0].length - 1
  const nY = state.maze.length - 1
  const maxCellWidth = (canvas.width - 2 * state.padding) / nX
  const maxCellHeight = (canvas.height - 2 * state.padding) / nY
  const cellSize = Math.min(maxCellWidth, maxCellHeight)
  const xPosition = canvas.width/2 - nX * cellSize / 2
  const yPosition = canvas.height/2 - nY * cellSize / 2
  state.mazeSettings.cellDimensions = [cellSize, cellSize]
  state.mazeSettings.position = [xPosition, yPosition]
}

const run = (canvas, ctx) => {
  preDraw(canvas, ctx)
  draw(ctx)
  window.requestAnimationFrame((_) => { run(canvas, ctx) })
}

const setup = () => {
  const canvas = document.getElementById('gs');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  ctx.font = "30px Verdana";
  window.addEventListener("resize", () => { resizeCanvas(canvas) });

  setupMenu()

  resizeMaze(canvas)
  state.mazeSettings.algorithm = binaryTree
  run(canvas, ctx)
}

const setupMenu = () => {
  document.getElementById('buttongenerate').onclick = generateMaze
}

// Algorithms

const binaryTree = (nCellsX, nCellsY) => {
  let maze = []
  // Walls inside maze
  for (i = 0; i < nCellsY; i++) {
    maze[i] = []
    for (j = 0; j < nCellsX; j++) {
      maze[i][j] = Math.ceil(Math.random()*2)
    }
    maze[i][nCellsY] = 2 // Right edge
  }
  maze[nCellsY] = Array(nCellsX).fill(1)
  // Outer edge of maze
  return maze.reverse()
}
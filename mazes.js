// Cell functions

function Cell(column, row) {
  this.row = row
  this.column = column
  this.identifier = `(${row},${column})`
  this.north = null
  this.south = null
  this.east = null
  this.west = null
  this.links = {}
}

/**
 * 
 * @param {Cell} cell 
 */
Cell.prototype.link = function (cell, bidi = true) {
  this.links[cell.identifier] = true
  if (bidi) cell.link(this, false)
}

/**
 * 
 * @param {Cell} cell 
 */
Cell.prototype.unlink = function (cell, bidi = true) {
  this.links[cell.identifier] = false
  if (bidi) cell.unlink(this, false)
}

Cell.prototype.linked = function (cell) {
  return cell && this.links[cell.identifier]
}

Cell.prototype.neighbors = function () {
  let lst = []
  if (this.north) lst.push(this.north)
  if (this.south) lst.push(this.south)
  if (this.east) lst.push(this.east)
  if (this.west) lst.push(this.west)
  return lst
}

// Grid functions

function Grid(columns, rows) {
  this.rows = rows
  this.columns = columns
  this.grid = this.prepareGrid()
  this.configureCells()
}

Grid.prototype.prepareGrid = function () {
  let grid = []
  for (let i = 0; i < this.rows; i++) {
    grid[i] = []
    for (let j = 0; j < this.columns; j++) {
      grid[i][j] = new Cell(j, i)
    }
  }
  return grid
}

Grid.prototype.configureCells = function () {
  let grid = this.grid
  grid.forEach((row) => {
    row.forEach((cell) => {
      const row = cell.row
      const col = cell.column
      if (row > 0) cell.north = grid[row - 1][col]
      if (row + 1 < grid.length) cell.south = grid[row + 1][col]
      if (col > 0) cell.west = grid[row][col - 1]
      if (col < grid[row].length) cell.east = grid[row][col + 1]
    })
  })
}

Grid.prototype.eachCell = function (fn) {
  let grid = this.grid
  grid.forEach((row) => { row.forEach((cell) => fn(cell)) })
}

Grid.prototype.eachRow = function (fn) {
  let grid = this.grid
  grid.forEach((row) => { fn(row) })
}

Grid.prototype.randomCell = function () {
  let row = Math.floor(Math.random() * this.rows)
  let col = Math.floor(Math.random() * this.columns)
  return this.grid[row][col]
}

Grid.prototype.size = function () {
  return this.rows * this.columns
}

let state = {
  maze: null,
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
  if (state.maze) {
    drawmaze(ctx, state.mazeSettings, state.maze)
  }
}

const drawLine = (ctx, x1, y1, x2, y2) => {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.closePath()
  ctx.stroke()
}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {*} mazeSettings 
 * @param {Grid} maze 
 */
const drawmaze = (ctx, mazeSettings, maze) => {
  ctx.lineWidth = mazeSettings.lineWidth
  ctx.strokeStyle = mazeSettings.strokeStyle
  // Draw perimeter
  const bX = mazeSettings.position[0]
  const bY = mazeSettings.position[1]
  const width = mazeSettings.cellDimensions[0] * maze.columns
  const height = mazeSettings.cellDimensions[1] * maze.rows
  //ctx.strokeRect(bX, bY, width, height)

  // Draw maze
  maze.eachCell((cell) => {
    const x1 = mazeSettings.cellDimensions[0] * cell.column + mazeSettings.position[0]
    const y1 = mazeSettings.cellDimensions[1] * cell.row + mazeSettings.position[1]
    const x2 = x1 + mazeSettings.cellDimensions[0]
    const y2 = y1 + mazeSettings.cellDimensions[1]
    if (!cell.north) drawLine(ctx, x1, y1, x2, y1)
    if (!cell.west) drawLine(ctx, x1, y1, x1, y2)
    if (!cell.linked(cell.south)) drawLine(ctx, x1, y2, x2, y2)
    if (!cell.linked(cell.east)) drawLine(ctx, x2, y1, x2, y2)
  })
}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {*} param1 
 * @param {*} maze 
 */
const drawMazeIndices = (ctx, { position, cellDimensions }, maze) => {
  let x = position[0] + cellDimensions[0] / 2
  let y = position[1] + cellDimensions[1] / 2
  let nCellX = maze.length - 1
  let nCellY = maze[0].length - 1

  ctx.textAlign = 'center';
  for (let i = 0; i < nCellY; i++) {
    for (let j = 0; j < nCellX; j++) {
      ctx.fillText((i * nCellX + j).toString(), x, y);
      x += cellDimensions[0]
    }
    y += cellDimensions[1]
    x -= cellDimensions[0] * nCellX
  }
}

const generateMaze = () => {
  const algo = document.getElementById('algorithm')
  state.mazeSettings.algorithm = algorithms[algo.value]
  const x = parseInt(document.getElementById('ncellx').value)
  const y = parseInt(document.getElementById('ncelly').value)
  state.maze = state.mazeSettings.algorithm(new Grid(x, y))
  resizeMaze(document.getElementById('gs'))
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
  if (state.maze) {
    const nX = state.maze.columns
    const nY = state.maze.rows
    const maxCellWidth = (canvas.width - 2 * state.padding) / nX
    const maxCellHeight = (canvas.height - 2 * state.padding) / nY
    const cellSize = Math.min(maxCellWidth, maxCellHeight)
    const xPosition = canvas.width / 2 - nX * cellSize / 2
    const yPosition = canvas.height / 2 - nY * cellSize / 2
    state.mazeSettings.cellDimensions = [cellSize, cellSize]
    state.mazeSettings.position = [xPosition, yPosition]
  }
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
  generateMaze()
  run(canvas, ctx)
}

// Utility

const randInt = (a, b) => {
  return Math.floor(Math.random() * (b - a)) + a
}

// Algorithms

const binaryTree = (grid) => {
  grid.eachCell((cell) => {
    let neighbors = []
    if (cell.north) neighbors.push(cell.north)
    if (cell.east) neighbors.push(cell.east)

    if (neighbors.length > 0) {
      const index = randInt(0, neighbors.length)
      const neighbor = neighbors[index]
      cell.link(neighbor)
    }
  })
  return grid
}

const sidewinder = (grid) => {
  grid.eachRow((row) => {
    let run = []
    row.forEach((cell) => {
      run.push(cell)
      eastWall = !cell.east
      northWall = !cell.north

      closeOut = eastWall || (!northWall && randInt(0, 2) === 0)

      if (closeOut) {
        const idx = randInt(0, run.length)
        member = run[idx]
        if (member.north) member.link(member.north)
        run = []
      } else {
        cell.link(cell.east)
      }
    })
  })
  return grid
}

const algorithms = {
  "Binary Tree": binaryTree,
  "Sidewinder": sidewinder
}

const setupMenu = () => {
  document.getElementById('generate').onclick = generateMaze

  const algoSelect = document.getElementById('algorithm')
  for (const [key, value] of Object.entries(algorithms)) {
    const opt = document.createElement('option')
    opt.value = key
    opt.innerHTML = key
    algoSelect.appendChild(opt)
  }
}
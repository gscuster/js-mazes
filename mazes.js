// Distance functions
function Distances(root) {
  this.root = root
  this.cells = {}
  this.cells[root.identifier] = 0
}

Distances.prototype.max = function (subset = null) {
  let maxDistance = 0
  let maxCell = this.root.identifier

  for (const [key, value] of Object.entries(this.cells)) {
    if (value > maxDistance && (!subset || subset.includes(key))) {
      maxDistance = value
      maxCell = key
    }
  }
  return [maxCell, maxDistance]
}

Distances.prototype.shortestPath = function (goal) {
  let current = goal
  breadcrumbs = new Distances(this.root)
  breadcrumbs.cells[current.identifier] = this.cells[current.identifier]
  while (current != this.root) {
    Object.values(current.links).forEach((neighbor) => {
      if (this.cells[neighbor.identifier] < this.cells[current.identifier]) {
        breadcrumbs.cells[neighbor.identifier] = this.cells[neighbor.identifier]
        current = neighbor
      }
    })
  }
  return breadcrumbs
}

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
  this.openings = {}
  this.neighbors = []
  this.color = '#ffffff'
}

/**
 * 
 * @param {Cell} cell 
 */
Cell.prototype.link = function (cell, bidi = true) {
  this.links[cell.identifier] = cell
  if (bidi) cell.link(this, false)
}

/**
 * 
 * @param {Cell} cell 
 */
Cell.prototype.unlink = function (cell, bidi = true) {
  delete this.links[cell.identifier]
  if (bidi) cell.unlink(this, false)
}

Cell.prototype.linked = function (cell) {
  return cell && this.links[cell.identifier]
}

Cell.prototype.updateNeighbors = function () {
  const lst = []
  if (this.north) lst.push(this.north)
  if (this.south) lst.push(this.south)
  if (this.east) lst.push(this.east)
  if (this.west) lst.push(this.west)
  this.neighbors = lst
}

Cell.prototype.borders = function () {
  const borders = []
  if (!this.north) borders.push('north')
  if (!this.south) borders.push('south')
  if (!this.east) borders.push('east')
  if (!this.west) borders.push('west')
  return borders
}

Cell.prototype.distances = function () {
  const distances = new Distances(this)
  let frontier = [this]
  while (frontier.length > 0) {
    let newFrontier = []
    frontier.forEach((cell) => {
      const cellDist = distances.cells[cell.identifier]
      Object.values(cell.links).forEach((linkedCell) => {
        if (distances.cells[linkedCell.identifier] == null) {
          distances.cells[linkedCell.identifier] = cellDist + 1
          newFrontier.push(linkedCell)
        }
      })
    })
    frontier = newFrontier
  }
  return distances
}

/**
 * Create a dummy link 
 */
Cell.prototype.openEdge = function () {
  const border = sample(this.borders())
  this.openings[border] = true
}

// Grid functions

function Grid(columns, rows) {
  this.rows = rows
  this.columns = columns
  this.grid = this.prepareGrid()
  this.gridIdentifiers = {}
  this.configureCells()
  this.edges = this.findEdges()
  this.distances = null
}

Grid.prototype.getCell = function (row, col) {
  return this.grid[row] && this.grid[row][col]
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
      cell.updateNeighbors()

      // Map cell to identifier for easier lookup
      this.gridIdentifiers[cell.identifier] = cell
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
  return this.getCell(row, col)
}

Grid.prototype.size = function () {
  return this.rows * this.columns
}

Grid.prototype.updateDistances = function () {
  this.distances = this.getCell(0, 0).distances()
  const [maxCellIdentifier, _] = this.distances.max()
  this.distances = this.gridIdentifiers[maxCellIdentifier].distances()
}

Grid.prototype.findEdges = function () {
  const edges = []
  this.eachCell((cell) => {
    if (cell.neighbors.length < 4) edges.push(cell)
  })
  return edges
}

Grid.prototype.updateColors = function (settings) {
  if (this.distances) {
    const minColor = [255, 255, 255]
    const maxColor = hexToRGB(document.getElementById('color').value)
    const colorInc = colorIncrements(minColor, maxColor, settings.distanceRes)
    const distFactor = settings.distanceRes / this.distances.max()[1]

    this.eachCell((cell) => {
      const distIndex = Math.floor(this.distances.cells[cell.identifier] * distFactor)
      const rgbOffset = colorInc.map((val) => val * distIndex)
      const cellColor = arrayAdd(rgbOffset, minColor).map(Math.floor)

      cell.color = rgbToHex(cellColor)
    })
  }
}

Grid.prototype.deadEnds = function () {
  const result = []
  this.eachCell((cell) => {
    if (Object.keys(cell.links).length === 1) result.push(cell)
  })
  return result
}

// Circular grid functions

function PolarCell(column, row) {
  Cell.call(this, column, row)
  this.ccw  = null
  this.cw = null
  this.inward = null
  this.outward = []
}
PolarCell.prototype = Object.create(Cell.prototype);
PolarCell.prototype.constructor = PolarCell;

PolarCell.prototype.updateNeighbors = function () {
  const lst = []
  if (this.ccw) lst.push(this.ccw)
  if (this.cw) lst.push(this.cw)
  if (this.inward) lst.push(this.inward)
  lst.concat(this.outward)
  this.neighbors = lst.concat(this.outward)
}

PolarCell.prototype.borders = function () {
  const borders = []
  if (this.outward.length === 0) borders.push('outward')
  return borders
}

function PolarGrid(rows) {
  Grid.call(this, 1, rows)
}

PolarGrid.prototype = Object.create(Grid.prototype);
PolarGrid.prototype.constructor = PolarGrid;

PolarGrid.prototype.getCell = function (row, col) {
  if (!this.grid[row]) {
    return null
  } else if (col > this.grid[row].length) {
    return this.grid[row][col % this.grid[row].length]
  } else if (col < 0) {
    return this.grid[row][mod(col, this.grid[row].length)]
  }
  return this.grid[row][col]
}

PolarGrid.prototype.prepareGrid = function () {
  const rowHeight = 1.0 / this.rows
  const grid = [[new PolarCell(0, 0)]]
  for (let i = 1; i < this.rows; i++) {
    const radius = i / this.rows
    const circumference = 2 * Math.PI * radius

    const previousCount = grid[i-1].length
    const estimatedWidth = circumference / previousCount
    const ratio = Math.round(estimatedWidth / rowHeight)
    const nCells = previousCount * ratio

    grid[i] = []
    for (let j = 0; j < nCells; j++) {
      grid[i].push(new PolarCell(j, i))
    }
  }
  return grid
}

PolarGrid.prototype.configureCells = function () {
  this.eachCell((cell) => {
    const row = cell.row
    const col = cell.column
    if (row > 0) {
      cell.cw = this.getCell(row, col+1)
      cell.ccw = this.getCell(row, col-1)
      ratio = this.grid[row].length / this.grid[row-1].length
      parent = this.getCell(row-1, Math.trunc(col / ratio))
      parent.outward.push(cell)
      cell.inward = parent
    }

    // Map cell to identifier for easier lookup
    this.gridIdentifiers[cell.identifier] = cell
  })
  this.eachCell((cell) => cell.updateNeighbors())
}

PolarGrid.prototype.findEdges = function () {

}

let state = {
  maze: null,
  mazeSettings: {
    algorithm: null,
    cellDimensions: [32, 32],
    position: [64, 64],
    lineWidth: 3,
    strokeStyle: '#000000',
    distanceOn: true,
    distanceColors: ['#FFFFFF', '#730071'],
    distanceRes: 1024
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
    drawMaze(ctx, state.mazeSettings, state.maze)
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
 * @param {*} settings 
 * @param {Grid} maze 
 */
const drawMaze = (ctx, settings, maze) => {
  ctx.lineWidth = settings.lineWidth
  ctx.strokeStyle = settings.strokeStyle
  // Draw perimeter
  const bX = settings.position[0]
  const bY = settings.position[1]
  const width = settings.cellDimensions[0] * maze.columns
  const height = settings.cellDimensions[1] * maze.rows

  // Draw color first if present
  if (settings.distanceOn && maze.distances) {
    maze.eachCell((cell) => {
      const x1 = settings.cellDimensions[0] * cell.column + settings.position[0]
      const y1 = settings.cellDimensions[1] * cell.row + settings.position[1]

      ctx.fillStyle = cell.color
      ctx.fillRect(
        x1,
        y1,
        settings.cellDimensions[0] + 0.5,
        settings.cellDimensions[1] + 0.5
      )
    })
  }

  // Draw maze
  maze.eachCell((cell) => {
    const x1 = settings.cellDimensions[0] * cell.column + settings.position[0]
    const y1 = settings.cellDimensions[1] * cell.row + settings.position[1]
    const x2 = x1 + settings.cellDimensions[0]
    const y2 = y1 + settings.cellDimensions[1]
    if (!cell.north && !cell.openings.north) drawLine(ctx, x1, y1, x2, y1)
    if (!cell.west && !cell.openings.west) drawLine(ctx, x1, y1, x1, y2)
    if (!cell.linked(cell.south) && !cell.openings.south) drawLine(ctx, x1, y2, x2, y2)
    if (!cell.linked(cell.east) && !cell.openings.east) drawLine(ctx, x2, y1, x2, y2)
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

const updateColors = () => {
  if (state.maze && state.maze.distances) {
    state.maze.updateColors(state.mazeSettings)
  }
}

const openMaze = () => {
  if (state.maze) {
    // get distances on edge
    let edgeDistances = state.maze.edges[0].distances()
    const edgeIds = state.maze.edges.map((cell) => cell.identifier)
    const [cellIdentifier, _] = edgeDistances.max(edgeIds)
    const startCell = state.maze.gridIdentifiers[cellIdentifier]
    const endCellId = startCell.distances().max(edgeIds)[0]
    const endCell = state.maze.gridIdentifiers[endCellId]

    startCell.openEdge()
    endCell.openEdge()
  }
}

const generateMaze = () => {
  const algo = document.getElementById('algorithm')
  state.mazeSettings.algorithm = algorithms[algo.value]
  const x = parseInt(document.getElementById('ncellx').value)
  const y = parseInt(document.getElementById('ncelly').value)
  state.maze = state.mazeSettings.algorithm(new Grid(x, y))
  state.maze.updateDistances()
  updateColors()
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

const arrayAdd = (arr1, arr2) => {
  if (arr1.length === arr2.length) {
    result = []
    for (let i = 0; i < arr1.length; i++) {
      result.push(arr1[i] + arr2[i])
    }
    return result
  }
}

const randInt = (a, b) => {
  return Math.floor(Math.random() * (b - a)) + a
}

const sample = (arr) => {
  if (arr.length > 0) {
    const idx = randInt(0, arr.length)
    return arr[idx]
  }
}

const sampleValues = (obj) => {
  return sample(Object.values(obj))
}

const mod = (n, m) => {
  return ((n % m) + m) % m
}

const hexToRGB = (hex) => {
  const [_, r, g, b] = hex.match(/#([0-9a-zA-Z]{2})([0-9a-zA-Z]{2})([0-9a-zA-Z]{2})/)
  return [r, g, b].map((val) => parseInt(val, 16))
}

const rgbToHex = (rgbColor) => {
  return '#' + rgbColor.map((val) => val.toString(16).padStart(2, '0')).join('')
}

const colorIncrements = (rgb1, rgb2, resolution) => {
  let increment = []
  for (let i = 0; i < 3; i++) {
    increment.push((rgb2[i] - rgb1[i]) / resolution)
  }
  return increment
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

const aldousBroder = (grid) => {
  let cell = grid.randomCell()
  let unvisited = grid.size() - 1
  while (unvisited > 0) {
    const neighbor = sample(cell.neighbors)
    if (Object.keys(neighbor.links).length === 0) {
      cell.link(neighbor)
      unvisited -= 1
    }
    cell = neighbor
  }
  return grid
}

const wilson = (grid) => {
  const unvisited = {}
  grid.eachCell((cell) => unvisited[cell.identifier] = cell)

  first = sampleValues(unvisited)
  delete unvisited[first.identifier]

  while (Object.keys(unvisited).length > 0) {
    let cell = sampleValues(unvisited)
    let path = [cell]
    while (unvisited[cell.identifier]) {
      cell = sample(cell.neighbors)
      const position = path.indexOf(cell)
      if (position >= 0) {
        path = path.slice(0, position+1)
      } else {
        path.push(cell)
      }
    }

    for (var i = 0; i < path.length-1; i++) {
      path[i].link(path[i + 1])
      delete unvisited[path[i].identifier]
    }
  }

  return grid
}

const huntKill = (grid) => {
  let current = grid.randomCell()
  while (current) {
    const unvisitedNeighbors = current.neighbors.filter((neighbor) => {
      return Object.keys(neighbor.links).length === 0
    })

    if (unvisitedNeighbors.length > 0) {
      const neighbor = sample(unvisitedNeighbors)
      current.link(neighbor)
      current = neighbor
    } else {
      current = null

      // Need a loop through cells we can break, grid.eachCell won't work
      for (let i = 0, j = 0; i < grid.rows; (j === grid.columns - 1) ? [i++, j=0] : j++) {
        const cell = grid.getCell[i][j]
        const visitedNeighbors = cell.neighbors.filter((neighbor) => {
          return Object.keys(neighbor.links).length > 0
        })
        if (Object.keys(cell.links).length === 0 && visitedNeighbors.length > 0) {
          current = cell
          const neighbor = sample(visitedNeighbors)
          current.link(neighbor)
          break
        }
      }
    }
  }
  return grid
}

const recursiveBacktracker = (grid) => {
  const startAt = grid.randomCell()
  const stack = [startAt]

  while (stack.length > 0) {
    const current = stack[stack.length - 1]
    const unvisitedNeighbors = current.neighbors.filter((neighbor) => {
      return Object.keys(neighbor.links).length === 0
    })
    if (unvisitedNeighbors.length === 0) {
      stack.pop()
    } else {
      const neighbor = sample(unvisitedNeighbors)
      current.link(neighbor)
      stack.push(neighbor)
    }
  }
  return grid
}

const algorithms = {
  "Recursive Backtracker": recursiveBacktracker,
  "Aldous-Broder": aldousBroder,
  "Hunt and Kill": huntKill,
  "Binary Tree": binaryTree,
  "Sidewinder": sidewinder,
  "Wilson": wilson,
}

const setupMenu = () => {
  document.getElementById('generate').onclick = generateMaze

  document.getElementById('openings').onclick = openMaze

  document.getElementById('color').oninput = updateColors

  const algoSelect = document.getElementById('algorithm')
  for (const [key, value] of Object.entries(algorithms)) {
    const opt = document.createElement('option')
    opt.value = key
    opt.innerHTML = key
    algoSelect.appendChild(opt)
  }
}
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
  this.cachedNeighbors = []
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

Cell.prototype.neighbors = function () {
  return this.cachedNeighbors
}

Cell.prototype.updateNeighbors = function () {
  const lst = []
  if (this.north) lst.push(this.north)
  if (this.south) lst.push(this.south)
  if (this.east) lst.push(this.east)
  if (this.west) lst.push(this.west)
  this.cachedNeighbors = lst
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
  this.inset = null
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
    if (cell.neighbors().length < 4) edges.push(cell)
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

Grid.prototype.drawCellWithoutInset = function (ctx, settings, cell, x, y) {
  const x2 = x + settings.cellDimensions[0]
  const y2 = y + settings.cellDimensions[1]
  if (!cell.north && !cell.openings.north) drawLine(ctx, x, y, x2, y)
  if (!cell.west && !cell.openings.west) drawLine(ctx, x, y, x, y2)
  if (!cell.linked(cell.south) && !cell.openings.south) drawLine(ctx, x, y2, x2, y2)
  if (!cell.linked(cell.east) && !cell.openings.east) drawLine(ctx, x2, y, x2, y2)
}

const insetCellCoords = (x, y, cellSize, inset) => {
  const insetAdj = inset * cellSize
  const x4 = x + cellSize
  const x2 = x + insetAdj
  const x3 = x4 - insetAdj

  const y4 = y + cellSize
  const y2 = y + insetAdj
  const y3 = y4 - insetAdj

  return [x, x2, x3, x4, y, y2, y3, y4]
}

Grid.prototype.drawCellWithInset = function (ctx, settings, cell, x, y, inset) {
  [x1, x2, x3, x4, y1, y2, y3, y4] =
    insetCellCoords(x, y, settings.cellDimensions[0], inset)
  if (cell.linked(cell.north) || cell.openings.north) {
    drawLine(ctx, x2, y1, x2, y2)
    drawLine(ctx, x3, y1, x3, y2)
  } else {
    drawLine(ctx, x2, y2, x3, y2)
  }

  if (cell.linked(cell.south) || cell.openings.south) {
    drawLine(ctx, x2, y3, x2, y4)
    drawLine(ctx, x3, y3, x3, y4)
  } else {
    drawLine(ctx, x2, y3, x3, y3)
  }

  if (cell.linked(cell.west) || cell.openings.west) {
    drawLine(ctx, x1, y2, x2, y2)
    drawLine(ctx, x1, y3, x2, y3)
  } else {
    drawLine(ctx, x2, y2, x2, y3)
  }

  if (cell.linked(cell.east) || cell.openings.east) {
    drawLine(ctx, x3, y2, x4, y2)
    drawLine(ctx, x3, y3, x4, y3)
  } else {
    drawLine(ctx, x3, y2, x3, y3)
  }
}

Grid.prototype.drawMaze = function (ctx, settings) {
  ctx.lineWidth = settings.lineWidth
  ctx.strokeStyle = settings.strokeStyle

  // Draw color first if present
  if (settings.distanceOn && this.distances) {
    this.eachCell((cell) => {
      const x = settings.cellDimensions[0] * cell.column + settings.position[0]
      const y = settings.cellDimensions[1] * cell.row + settings.position[1]

      ctx.fillStyle = cell.color
      ctx.fillRect(
        x,
        y,
        settings.cellDimensions[0] + 0.5,
        settings.cellDimensions[1] + 0.5
      )
    })
  }

  // Draw maze
  this.eachCell((cell) => {
    const x = settings.cellDimensions[0] * cell.column + settings.position[0]
    const y = settings.cellDimensions[1] * cell.row + settings.position[1]
    if (this.inset) {
      this.drawCellWithInset(ctx, settings, cell, x, y, this.inset)
    } else {
      this.drawCellWithoutInset(ctx, settings, cell, x, y)
    }
  })
}

/**
 * Updates parameters for the maze.
 */
Grid.prototype.resizeMaze = function (width, height, settings) {
  const nX = state.maze.columns
  const nY = state.maze.rows
  const maxCellWidth = (width - 2 * state.padding) / nX
  const maxCellHeight = (height - 2 * state.padding) / nY
  const cellSize = Math.min(maxCellWidth, maxCellHeight)
  const xPosition = (width - nX * cellSize) / 2
  const yPosition = (height - nY * cellSize) / 2
  settings.cellDimensions = [cellSize, cellSize]
  settings.position = [xPosition, yPosition]
}

Grid.prototype.openMaze = function () {
  // get distances on edge
  let edgeDistances = this.edges[0].distances()
  const edgeIds = this.edges.map((cell) => cell.identifier)
  const [cellIdentifier, _] = edgeDistances.max(edgeIds)
  const startCell = this.gridIdentifiers[cellIdentifier]
  const endCellId = startCell.distances().max(edgeIds)[0]
  const endCell = this.gridIdentifiers[endCellId]

  startCell.openEdge()
  endCell.openEdge()
}

Grid.prototype.braid = function (p = 0.75) {
  this.deadEnds().forEach((cell) => {
    if (Object.keys(cell.links).length === 1
      && Math.random() < p) {
      const neighbors = cell.neighbors().filter((neighbor => !cell.linked(neighbor)))
      let best = neighbors.filter((neighbor) => Object.keys(neighbor.links).length === 1)
      if (best.length === 0) best = neighbors
      cell.link(sample(best))
    }
  })
}

// Circular grid functions

function PolarCell(column, row) {
  Cell.call(this, column, row)
  this.ccw = null
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
  this.cachedNeighbors = lst.concat(this.outward)
}

PolarCell.prototype.borders = function () {
  if (this.outward.length === 0) return ['outward']
}

function PolarGrid(rows) {
  Grid.call(this, 1, rows)
}

PolarGrid.prototype = Object.create(Grid.prototype);
PolarGrid.prototype.constructor = PolarGrid;

PolarGrid.prototype.getCell = function (row, col) {
  if (!this.grid[row]) {
    return null
  } else if (col >= this.grid[row].length) {
    return this.grid[row][col % this.grid[row].length]
  } else if (col < 0) {
    return this.grid[row][mod(col, this.grid[row].length)]
  }
  return this.grid[row][col]
}

PolarGrid.prototype.size = function () {
  return this.grid.reduce((total, a) => total + a.length, 0)
}

PolarGrid.prototype.prepareGrid = function () {
  const rowHeight = 1.0 / this.rows
  const grid = [[new PolarCell(0, 0)]]
  for (let i = 1; i < this.rows; i++) {
    const radius = i / this.rows
    const circumference = 2 * Math.PI * radius

    const previousCount = grid[i - 1].length
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
      cell.cw = this.getCell(row, col + 1)
      cell.ccw = this.getCell(row, col - 1)
      ratio = this.grid[row].length / this.grid[row - 1].length
      parent = this.getCell(row - 1, Math.trunc(col / ratio))
      parent.outward.push(cell)
      cell.inward = parent
    }

    // Map cell to identifier for easier lookup
    this.gridIdentifiers[cell.identifier] = cell
  })
  this.eachCell((cell) => cell.updateNeighbors())
}

PolarGrid.prototype.findEdges = function () {
  return [...this.grid[this.rows - 1]]
}

PolarGrid.prototype.drawMaze = function (ctx, settings) {
  ctx.lineWidth = settings.lineWidth
  ctx.strokeStyle = settings.strokeStyle
  const cellSize = settings.cellDimensions[0]

  this.eachCell((cell) => {
    const theta = 2 * Math.PI / this.grid[cell.row].length
    const innerRadius = cell.row * cellSize
    const outerRadius = innerRadius + cellSize
    const thetaCCW = cell.column * theta
    const thetaCW = thetaCCW + theta

    const center = settings.position
    const sinCW = Math.sin(thetaCW)
    const cosCW = Math.cos(thetaCW)

    const cx = center[0] + innerRadius * cosCW
    const cy = center[1] + innerRadius * sinCW
    const dx = center[0] + outerRadius * cosCW
    const dy = center[1] + outerRadius * sinCW

    if (!cell.linked(cell.cw) && cell.row !== 0) drawLine(ctx, cx, cy, dx, dy)
    if (!cell.linked(cell.inward)) drawArc(ctx, ...center, innerRadius, thetaCCW, thetaCW)
    if (cell.outward.length === 0 && Object.keys(cell.openings).length === 0) {
      drawArc(ctx, ...center, outerRadius, thetaCCW, thetaCW)
    }
  })
}

PolarGrid.prototype.resizeMaze = function (width, height, settings) {
  const n = state.maze.rows
  const diameter = Math.min(width, height - 2 * state.padding)
  const cellSize = diameter / (2 * n)
  const xPosition = width / 2
  const yPosition = (height + state.padding) / 2
  settings.cellDimensions = [cellSize, cellSize]
  settings.position = [xPosition, yPosition]
}

PolarGrid.prototype.openMaze = function () {
  let centerDistances = this.getCell(0, 0).distances()
  const edgeIds = this.edges.map((cell) => cell.identifier)
  const [cellIdentifier, _] = centerDistances.max(edgeIds)
  const startCell = this.gridIdentifiers[cellIdentifier]
  startCell.openEdge()
}

// Hex Grid

function HexCell(column, row) {
  Cell.call(this, column, row)
  this.northwest = null
  this.northeast = null
  this.southwest = null
  this.southeast = null
}
HexCell.prototype = Object.create(Cell.prototype);
HexCell.prototype.constructor = HexCell;

HexCell.prototype.updateNeighbors = function () {
  const lst = []
  if (this.north) lst.push(this.north)
  if (this.south) lst.push(this.south)
  if (this.northeast) lst.push(this.northeast)
  if (this.northwest) lst.push(this.northwest)
  if (this.southeast) lst.push(this.southeast)
  if (this.southwest) lst.push(this.southwest)
  this.cachedNeighbors = lst
}

HexCell.prototype.borders = function () {
  const borders = []
  if (!this.north) borders.push('north')
  if (!this.south) borders.push('south')
  if (!this.northeast) borders.push('northeast')
  if (!this.northwest) borders.push('northwest')
  if (!this.southeast) borders.push('southeast')
  if (!this.southwest) borders.push('southwest')
  return borders
}

function HexGrid(columns, rows) {
  Grid.call(this, columns, rows * 2)
  this.baseHexagon = polygon(6)
}

HexGrid.prototype = Object.create(Grid.prototype);
HexGrid.prototype.constructor = HexGrid;

HexGrid.prototype.size = function () {
  return this.grid.reduce((total, a) => total + a.length, 0)
}

HexGrid.prototype.prepareGrid = function () {
  let grid = []
  for (let i = 0; i < this.rows; i++) {
    grid[i] = []
    for (let j = 0; j < this.columns; j++) {
      if ((i + j) % 2 === 0) {
        grid[i][j] = new HexCell(j, i)
      }
    }
  }
  return grid
}

HexGrid.prototype.configureCells = function () {
  this.eachCell((cell) => {
    const row = cell.row
    const col = cell.column

    cell.northwest = this.getCell(row - 1, col - 1)
    cell.north = this.getCell(row - 2, col)
    cell.northeast = this.getCell(row - 1, col + 1)
    cell.southwest = this.getCell(row + 1, col - 1)
    cell.south = this.getCell(row + 2, col)
    cell.southeast = this.getCell(row + 1, col + 1)
    cell.updateNeighbors()

    this.gridIdentifiers[cell.identifier] = cell
  })
}

HexGrid.prototype.randomCell = function () {
  let row = Math.floor(Math.random() * this.rows)
  return sample(this.grid[row])
}

HexGrid.prototype.drawMaze = function (ctx, settings) {
  ctx.lineWidth = settings.lineWidth
  ctx.strokeStyle = settings.strokeStyle

  this.eachCell((cell) => {
    const xOffset = cell.column * 1.5 * settings.cellDimensions[0]
    const yOffset = cell.row * SQRT3 * settings.cellDimensions[0] / 2
    const cellCenter = arrayAdd(settings.position, [xOffset, yOffset])
    const cellPoly = this.baseHexagon.map(point => arrayAdd(cellCenter, point))

    if (!cell.linked(cell.southeast) && !cell.openings.southeast) {
      drawLine(ctx, ...cellPoly[0], ...cellPoly[1])
    }
    if (!cell.linked(cell.south) && !cell.openings.south) {
      drawLine(ctx, ...cellPoly[1], ...cellPoly[2])
    }
    if (!cell.linked(cell.southwest) && !cell.openings.southwest) {
      drawLine(ctx, ...cellPoly[2], ...cellPoly[3])
    }
    if (!cell.linked(cell.northwest) && !cell.openings.northwest) {
      drawLine(ctx, ...cellPoly[3], ...cellPoly[4])
    }
    if (!cell.linked(cell.north) && !cell.openings.north) {
      drawLine(ctx, ...cellPoly[4], ...cellPoly[5])
    }
    if (!cell.linked(cell.northeast) && !cell.openings.northeast) {
      drawLine(ctx, ...cellPoly[5], ...cellPoly[0])
    }
  })
}

HexGrid.prototype.resizeMaze = function (width, height, settings) {
  const nX = state.maze.columns
  const nY = state.maze.rows / 2
  const maxRadiusW = (width - 2 * state.padding) / (1.5 * nX)
  const maxRadiusH = (height - 2 * state.padding) / (SQRT3 * nY)
  const cellSize = Math.min(maxRadiusW, maxRadiusH)
  const xPosition = (width - 1.5 * nX * cellSize) / 2
  const yPosition = (height - SQRT3 * nY * cellSize) / 2
  settings.cellDimensions = [cellSize, cellSize]
  settings.position = [xPosition, yPosition + cellSize]


  this.baseHexagon = polygon(6).map(point => point.map(val => val * cellSize))
}

// Triangle grid functions
function TriCell(column, row) {
  Cell.call(this, column, row)
}
TriCell.prototype = Object.create(Cell.prototype);
TriCell.prototype.constructor = TriCell;

TriCell.prototype.upright = function () {
  return (this.row + this.column) % 2 === 0
}

TriCell.prototype.updateNeighbors = function () {
  const lst = []
  if (this.west) lst.push(this.west)
  if (this.east) lst.push(this.east)
  if (this.upright()) {
    if (this.south) lst.push(this.south)
  } else {
    if (this.north) lst.push(this.north)
  }
  this.cachedNeighbors = lst
}

function TriGrid(columns, rows) {
  Grid.call(this, columns, rows)
}

TriGrid.prototype = Object.create(Grid.prototype);
TriGrid.prototype.constructor = TriGrid;

TriGrid.prototype.prepareGrid = function () {
  let grid = []
  for (let i = 0; i < this.rows; i++) {
    grid[i] = []
    for (let j = 0; j < this.columns; j++) {
      grid[i][j] = new TriCell(j, i)
    }
  }
  return grid
}

TriGrid.prototype.configureCells = function () {
  this.eachCell((cell) => {
    const row = cell.row
    const col = cell.column

    cell.west = this.getCell(row, col - 1)
    cell.east = this.getCell(row, col + 1)
    if (cell.upright()) {
      cell.south = this.getCell(row + 1, col)
    } else {
      cell.north = this.getCell(row - 1, col)
    }
    cell.updateNeighbors()

    this.gridIdentifiers[cell.identifier] = cell
  })
}

TriGrid.prototype.drawMaze = function (ctx, settings) {
  ctx.lineWidth = settings.lineWidth
  ctx.strokeStyle = settings.strokeStyle

  const cellSize = settings.cellDimensions[0]
  const halfWidth = cellSize / 2
  const height = cellSize * SQRT3 / 2
  const halfHeight = height / 2

  this.eachCell((cell) => {
    const cx = halfWidth + cell.column * halfWidth + settings.position[0]
    const cy = halfHeight + cell.row * height + settings.position[1]

    const westX = cx - halfWidth
    const eastX = cx + halfWidth
    
    let apexY, baseY
    if (cell.upright()) {
      apexY = cy - halfHeight
      baseY = cy + halfHeight
    } else {
      apexY = cy + halfHeight
      baseY = cy - halfHeight
    }

    if (!cell.west && !cell.openings.west) {
      drawLine(ctx, westX, baseY, cx, apexY)
    }

    if (!cell.linked(cell.east) && !cell.openings.east) {
      drawLine(ctx, eastX, baseY, cx, apexY)
    }

    const noSouth = cell.upright() && !cell.south
    const notLinked = !cell.upright() && !cell.linked(cell.north)
    if (noSouth || notLinked) drawLine(ctx, eastX, baseY, westX, baseY)
  })
}

TriGrid.prototype.resizeMaze = function (width, height, settings) {
  const nX = state.maze.columns
  const nY = state.maze.rows
  const maxRadiusW = (width - 2 * state.padding) / (nX / 2)
  const maxRadiusH = (height - 2 * state.padding) / (nY * SQRT3 / 2)
  const cellSize = Math.min(maxRadiusW, maxRadiusH)
  const xPosition = width / 2 - nX * cellSize / 4 - 0.25 * cellSize
  const yPosition = (height - nY * cellSize) / 2
  settings.cellDimensions = [cellSize, cellSize]
  settings.position = [xPosition, yPosition + cellSize]
}

// Weave functions
function OverCell(column, row, grid) {
  Cell.call(this, column, row)
  this.grid = grid
}
OverCell.prototype = Object.create(Cell.prototype);
OverCell.prototype.constructor = OverCell;

OverCell.prototype.horizontalPassage = function () {
  return this.linked(this.east) && this.linked(this.west) &&
    !this.linked(this.north) && !this.linked(this.south)
}

OverCell.prototype.verticalPassage = function () {
  return !this.linked(this.east) && !this.linked(this.west) &&
    this.linked(this.north) && this.linked(this.south)
}

OverCell.prototype.passage = function (dir) {
  if (dir === 'north' || dir === 'south') return this.horizontalPassage()
  return this.verticalPassage()
}

OverCell.prototype.canTunnel = function (dir) {
  return this[dir] && this[dir][dir] && this[dir].passage(dir)
}

OverCell.prototype.neighbors = function () {
  const lst = Cell.prototype.neighbors.call(this)
  if (this.canTunnel('north')) lst.push(this.north.north)
  if (this.canTunnel('south')) lst.push(this.south.south)
  if (this.canTunnel('east')) lst.push(this.east.east)
  if (this.canTunnel('west')) lst.push(this.west.west)
  return lst
}

OverCell.prototype.link = function (cell, bidi=true) {
  let neighbor = null
  if (this.north && this.north === cell.south) {
    neighbor = this.north
  } else if (this.south && this.south === cell.north) {
    neighbor = this.south
  } else if (this.east && this.east === cell.west) {
    neighbor = this.east
  } else if (this.west && this.west === cell.east) {
    neighbor = this.west
  }

  if (neighbor) {
    this.grid.tunnelUnder(neighbor)
  } else {
    Cell.prototype.link.call(this, cell, bidi)
  }
}

function UnderCell(overCell, grid) {
  Cell.call(this, overCell.column, overCell.row)
  this.identifier = this.identifier + 'under'
  grid.gridIdentifiers[this.identifier] = this

  if (overCell.horizontalPassage()) {
    this.north = overCell.north
    overCell.north.south = this
    this.south = overCell.south
    overCell.south.north = this
    this.link(this.north)
    this.link(this.south)
  } else {
    this.east = overCell.east
    overCell.east.west = this
    this.west = overCell.west
    overCell.west.east = this
    this.link(this.east)
    this.link(this.west)
  }
}
UnderCell.prototype = Object.create(Cell.prototype);
UnderCell.prototype.constructor = UnderCell;

UnderCell.prototype.horizontalPassage = function () {
  return this.east || this.west
}

UnderCell.prototype.verticalPassage = function () {
  return this.north || this.south
}

UnderCell.prototype.passage = function (dir) {
  return false
}

function WeaveGrid(columns, rows, inset = 0.1) {
  this.underCells = []
  Grid.call(this, columns, rows)
  this.inset = inset
}

WeaveGrid.prototype = Object.create(Grid.prototype);
WeaveGrid.prototype.constructor = WeaveGrid;

WeaveGrid.prototype.size = function () {
  return this.grid.reduce((total, a) => total + a.length, 0)
}

WeaveGrid.prototype.prepareGrid = function () {
  let grid = []
  for (let i = 0; i < this.rows; i++) {
    grid[i] = []
    for (let j = 0; j < this.columns; j++) {
      grid[i][j] = new OverCell(j, i, this)
    }
  }
  return grid
}

WeaveGrid.prototype.tunnelUnder = function (overCell) {
  const underCell = new UnderCell(overCell, this)
  this.underCells.push(underCell)
}

WeaveGrid.prototype.eachCell = function (fn) {
  Grid.prototype.eachCell.call(this, fn)
  this.underCells.forEach((cell) => fn(cell))
}

WeaveGrid.prototype.drawCellWithInset = function (ctx, settings, cell, x, y, inset) {
  if (cell instanceof OverCell) {
    Grid.prototype.drawCellWithInset.call(this, ctx, settings, cell, x, y, inset)
  } else {
    [x1, x2, x3, x4, y1, y2, y3, y4] =
    insetCellCoords(x, y, settings.cellDimensions[0], inset)
    if (cell.verticalPassage()) {
      drawLine(ctx, x2, y1, x2, y2)
      drawLine(ctx, x3, y1, x3, y2)
      drawLine(ctx, x2, y3, x2, y4)
      drawLine(ctx, x3, y3, x3, y4)
    } else {
      drawLine(ctx, x1, y2, x2, y2)
      drawLine(ctx, x1, y3, x2, y3)
      drawLine(ctx, x3, y2, x4, y2)
      drawLine(ctx, x3, y3, x4, y3)
    }
  }
}

// Running/drawing functions

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
    state.maze.drawMaze(ctx, state.mazeSettings)
  }
}

const drawArc = (ctx, x, y, radius, startAngle, endAngle) => {
  ctx.beginPath()
  ctx.arc(x, y, radius, startAngle, endAngle)
  ctx.stroke()
}

const drawLine = (ctx, x1, y1, x2, y2) => {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.closePath()
  ctx.stroke()
}

const updateColors = () => {
  if (state.maze && state.maze.distances) {
    state.maze.updateColors(state.mazeSettings)
  }
}

const openMaze = () => {
  if (state.maze) {
    state.maze.openMaze()
  }
}

const generateMaze = () => {
  const algo = document.getElementById('algorithm')
  state.mazeSettings.algorithm = algorithms[algo.value]

  const gridType = document.getElementById('gridtype')
  state.mazeSettings.gridType = gridTypes[gridType.value]

  const braid = document.getElementById('braid').checked

  const x = parseInt(document.getElementById('ncellx').value)
  const y = parseInt(document.getElementById('ncelly').value)
  state.maze = state.mazeSettings.algorithm(new state.mazeSettings.gridType(x, y))
  if (braid) state.maze.braid()
  state.maze.updateDistances()
  updateColors()
  const canvas = document.getElementById('gs')
  if (state.maze) state.maze.resizeMaze(canvas.width, canvas.height, state.mazeSettings)
}

const preDraw = (canvas, ctx) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

const resizeCanvas = (canvas) => {
  if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    if (state.maze) state.maze.resizeMaze(canvas.width, canvas.height, state.mazeSettings)
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
  const nonNullArr = arr.filter((a) => a !== null)
  if (nonNullArr.length > 0) {
    const idx = randInt(0, nonNullArr.length)
    return nonNullArr[idx]
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

const polygon = (nsides, rotation = 0) => {
  var poly = [];
  var angle = PI2 / nsides;
  for (var i = 0; i < nsides; i++) {
    poly[i] = [Math.cos(i * angle + rotation), Math.sin(i * angle + rotation)];
  }
  return poly;
}

// Constants

const SQRT3 = Math.sqrt(3)
const PI2 = Math.PI * 2
const PI_2 = Math.PI / 2

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
    const neighbor = sample(cell.neighbors())
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
      cell = sample(cell.neighbors())
      const position = path.indexOf(cell)
      if (position >= 0) {
        path = path.slice(0, position + 1)
      } else {
        path.push(cell)
      }
    }

    for (var i = 0; i < path.length - 1; i++) {
      path[i].link(path[i + 1])
      delete unvisited[path[i].identifier]
    }
  }

  return grid
}

const huntKill = (grid) => {
  let current = grid.randomCell()
  while (current) {
    const unvisitedNeighbors = current.neighbors().filter((neighbor) => {
      return Object.keys(neighbor.links).length === 0
    })

    if (unvisitedNeighbors.length > 0) {
      const neighbor = sample(unvisitedNeighbors)
      current.link(neighbor)
      current = neighbor
    } else {
      current = null

      // Need a loop through cells we can break, grid.eachCell won't work
      for (let i = 0, j = 0; i < grid.rows; (j === grid.grid[i].length - 1) ? [i++, j = 0] : j++) {
        const cell = grid.getCell(i, j)
        if (!cell) break
        const visitedNeighbors = cell.neighbors().filter((neighbor) => {
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
    const unvisitedNeighbors = current.neighbors().filter((neighbor) => {
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

const gridTypes = {
  "Triangle": TriGrid,
  "Hex": HexGrid,
  "Weave": WeaveGrid,
  "Square": Grid,
  "Polar": PolarGrid,
}

const setupMenu = () => {
  document.getElementById('generate').onclick = generateMaze

  document.getElementById('openings').onclick = openMaze

  document.getElementById('color').oninput = updateColors

  const algoSelect = document.getElementById('algorithm')
  for (const key of Object.keys(algorithms)) {
    const opt = document.createElement('option')
    opt.value = key
    opt.innerHTML = key
    algoSelect.appendChild(opt)
  }

  const gridSelect = document.getElementById('gridtype')
  for (const key of Object.keys(gridTypes)) {
    const opt = document.createElement('option')
    opt.value = key
    opt.innerHTML = key
    gridSelect.appendChild(opt)
  }
}
'use strict';

var statusDiv = document.getElementById('status');
var rotateSound = document.getElementById('blockRotateSound');
var dropSound = document.getElementById('blockDropSound');
var startingOrientation = 0;
var oneBlockSizeInPixels = 20;
var gameTimer = null;
var timeInterval = 500;
var gameInitialized = false;
var gameOver = false;
var score = 0;
var totalLines = 0;
var totalSeconds = 0;
var startInterval = 0;
var endGameObject = {};

var touchStartX = 0;
var touchStartY = 0;
var touchEndX = 0;
var touchEndY = 0;

var sideBuffer = 120; // Pixels of buffer on the sides - 60px each side
var endBuffer = 20; // Pixels of buffer on the ends - 10px each end

var pit = {};

pit.width = 0;
pit.depth = 0;
pit.container = document.getElementById('thePit');
pit.contents = [];
pit.getFirstOccupiedRowAtColumn = function (col) {
  var startingRow = this.block.top;

  if (((this.block.shape === 'L' || this.block.shape === 'J' || this.block.shape === 'T') && this.block.rotation === 180) || (this.block.shape === 'Line' && (this.block.rotation === 90 || this.block.rotation === 270))) {
    startingRow -= 1;
    if (this.block.shape === 'Line' && this.block.rotation === 270) {
      // Need to bump it down one more
      startingRow -= 1;
    }
  }

  for (var i = startingRow; i >= 0; i -= 1) {
    if (this.contents[i][col].occupied === 1) {
      return i + 1; // Needed to differentiate between row 0 being occupied and column being empty
    }
  }
  return 0; // Returned if column is empty
};
pit.getLeftmostAvailableColumnAtRow = function (row) {
  for (var i = this.block.left; i >= 0; i -= 1) {
    if (this.contents[row][i].occupied === 1) {
      return i + 1;
    }
  }
  return 0;
};
pit.getRightmostAvailableColumnAtRow = function (row) {
  for (var i = this.block.left; i < this.width; i += 1) {
    if (this.contents[row][i].occupied === 1) {
      return i - 1;
    }
  }
  return this.width - 1;
};
pit.init = function () {
  gameInitialized = true;

  this.contents = [];
  for (var i = 0; i < this.depth; i += 1) {
    this.contents[i] = new Array(this.width);
    for (var j = 0; j < this.width; j += 1) {
      this.contents[i][j] = {};
      this.contents[i][j].occupied = 0;
      this.contents[i][j].blockFragment = '';
    }
  }
};
pit.draw = function () {
  // Remove all blocks from the pit (used when starting a new game after one ended)
  while (this.container.lastChild) {
    this.container.removeChild(this.container.lastChild);
  }
  // Draw the pit container based on screen dimensions
  this.container.style.width = Math.floor((window.innerWidth - sideBuffer) / oneBlockSizeInPixels) * oneBlockSizeInPixels + 'px'; // 60px buffer on the sides
  this.container.style.height = Math.floor((window.innerHeight - endBuffer) / oneBlockSizeInPixels) * oneBlockSizeInPixels + 'px'; // 10px buffer on top and bottom
  this.container.style.backgroundColor = '#EEE';
};
pit.dropAllRowsAboveRow = function (row) {
  // Drop rows by 1 above row
  for (var i = row; i < this.depth - 1; i += 1) {
    for (var j = 0; j < this.contents[i].length; j += 1) {
      this.contents[i][j].occupied = this.contents[i + 1][j].occupied;
      this.contents[i][j].blockFragment = this.contents[i + 1][j].blockFragment;
    }
  }

  // Always have an empty row on top
  for (var l = 0; l < this.width; l += 1) {
    this.contents[this.depth - 1][l].occupied = 0;
    this.contents[this.depth - 1][l].blockFragment = '';
  }
};
pit.checkForCompletedRows = function () {
  var totalCleared = [];
  // Check for completed rows using function this.getLeftmostAvailableColumnAtRow
  for (var i = 0; i < this.depth; i += 1) {
    for (var j = 0; j < this.width; j += 1) {
      if (this.contents[i][j].occupied === 1) {
        if (j === this.width - 1) {
          // All cells were full in row, clear row
          var tempBlock;
          for (var z = 0; z < this.contents[i].length; z += 1) {
            // Find the block and set the block's z-index to hide it, then remove it
            tempBlock = document.getElementById('block' + i + z);
            tempBlock.parentNode.removeChild(tempBlock);
          }

          totalCleared[totalCleared.length] = i;
        }
      } else {
        break; // Found an empty cell, row not full
      }
    }
  }

  for (var k = totalCleared.length - 1; k >= 0; k -= 1) {
    this.dropAllRowsAboveRow(totalCleared[k]);
  }

  // Re-draw the pit
  this.redrawBlocks();

  totalLines += totalCleared.length;
  // Using old school NES scoring system from level 0
  switch (totalCleared.length)
  {
    case 1:
      score += 40;
      break;

    case 2:
      score += 100;
      break;

    case 3:
      score += 300;
      break;

    case 4:
      score += 1200;
      break;
  }
};
pit.redrawBlocks = function () {
  var newElement;

  for (var i = 0; i < this.contents.length; i += 1) {
    for (var j = 0; j < this.contents[i].length; j += 1) {
      if (document.getElementById('block' + i + j)) {
        document.getElementById('block' + i + j).parentNode.removeChild(document.getElementById('block' + i + j));
      }

      if (this.contents[i][j].occupied === 1) {
        newElement = document.createElement('img');
        newElement.setAttribute('src', this.contents[i][j].blockFragment);
        newElement.setAttribute('id', 'block' + i + j);
        newElement.style.position = 'absolute';
        newElement.style.top = ((this.depth - 1 - i) * oneBlockSizeInPixels) + 'px';
        newElement.style.left = j * oneBlockSizeInPixels + 'px';
        this.container.appendChild(newElement);
      }
    }
  }
};

// Block class
function Block() {
  // Properties
  this.top = pit.depth - 1;
  this.left = Math.floor(pit.width / 2) - 1;
  this.rotation = 0;

  this.element = document.createElement('img');
  this.element.style.position = 'absolute';
  this.element.setAttribute('id', 'newblock');

  // The following most likely should NOT be here since it varies by block, but I'm doing so for simplicity
  switch (Math.floor((Math.random() * 7) + 1))
  {
    case 1:
      this.shape = 'Cube';
      this.element.setAttribute('src', 'images/cube.png');
      this.oneBlockImg = 'images/cube1.png';
      break;

    case 2:
      this.shape = 'Line';
      this.element.setAttribute('src', 'images/line.png');
      this.oneBlockImg = 'images/line1.png';
      break;

    case 3:
      this.shape = 'T';
      this.left -= 1;
      this.element.setAttribute('src', 'images/T.png');
      this.oneBlockImg = 'images/T1.png';
      break;

    case 4:
      this.shape = 'J';
      this.left -= 1;
      this.element.setAttribute('src', 'images/J.png');
      this.oneBlockImg = 'images/J1.png';
      break;

    case 5:
      this.shape = 'L';
      this.left -= 1;
      this.element.setAttribute('src', 'images/L.png');
      this.oneBlockImg = 'images/L1.png';
      break;

    case 6:
      this.shape = 'S';
      this.element.setAttribute('src', 'images/S.png');
      this.oneBlockImg = 'images/S1.png';
      break;

    case 7:
      this.shape = 'Z';
      this.element.setAttribute('src', 'images/Z.png');
      this.oneBlockImg = 'images/Z1.png';
      break;

  }

  this.element.style.left = this.left * oneBlockSizeInPixels + 'px';
}

Block.prototype.Drop = function (Pit) {
  // Depending on block shape, call Pit.getFirstOccupiedRowAtColumn() for all columns that the shape currently occupies (which depends on orientation of block)
  switch (this.shape)
  {
      // If possible, move block down one on display, else, return 0
    case 'Cube':
      if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 1) {
        this.top -= 1;
      } else {
        return 0;
      }
      break;

    case 'Line':
      switch (this.rotation)
      {
        case 0:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 3) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 90:
          if (Pit.getFirstOccupiedRowAtColumn(this.left - 1) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 1) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 180:
          if (Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 3) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 270:
          if (Pit.getFirstOccupiedRowAtColumn(this.left - 1) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 2) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;
      }
      break;

    case 'T':
      switch (this.rotation)
      {
        case 0:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 1) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 90:
          if (Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 1) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 180:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 1) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 270:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 2) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;
      }
      break;

    case 'J':
      switch (this.rotation)
      {
        case 0:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 1) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 90:
          if (Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 180:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 2) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 270:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 2) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;
      }
      break;

    case 'L':
      switch (this.rotation)
      {
        case 0:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 1) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 90:
          if (Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 2) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 180:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 1) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 270:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 2) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;
      }
      break;

    case 'S':
      switch (this.rotation)
      {
        case 0:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 2) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 90:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 180:
          if (Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 2) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 270:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 1) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;
      }
      break;

    case 'Z':
      switch (this.rotation)
      {
        case 0:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 1) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 90:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 1) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 180:
          if (Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 1) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;

        case 270:
          if (Pit.getFirstOccupiedRowAtColumn(this.left) < this.top - 1 && Pit.getFirstOccupiedRowAtColumn(this.left + 1) < this.top - 2 && Pit.getFirstOccupiedRowAtColumn(this.left + 2) < this.top - 2) {
            this.top -= 1;
          } else {
            return 0;
          }
          break;
      }
      break;
  }
  this.element.style.top = ((Pit.depth - 1 - this.top) * oneBlockSizeInPixels) + 'px';
};

Block.prototype.fastDrop = function (Pit) {
  // Depending on block shape, call Pit.getFirstOccupiedRowAtColumn() for all columns that the shape currently occupies (which depends on orientation of block) and immediately place block on final position
  switch (this.shape)
  {
    case 'Cube':
      this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left), Pit.getFirstOccupiedRowAtColumn(this.left + 1)) + 1;
      break;

    case 'Line':
      switch (this.rotation)
      {
        case 0:
          this.top = Pit.getFirstOccupiedRowAtColumn(this.left) + 3;
          break;

        case 180:
          this.top = Pit.getFirstOccupiedRowAtColumn(this.left + 1) + 3;
          break;

        case 90:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left - 1), Pit.getFirstOccupiedRowAtColumn(this.left), Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2)) + 1;
          break;

        case 270:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left - 1), Pit.getFirstOccupiedRowAtColumn(this.left), Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2)) + 2;
          break;
      }
      break;

    case 'T':
      switch (this.rotation)
      {
        case 0:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left), Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2)) + 1;
          break;

        case 90:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2) - 1) + 2;
          break;

        case 180:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left) - 1, Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2) - 1) + 2;
          break;

        case 270:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left) - 1, Pit.getFirstOccupiedRowAtColumn(this.left + 1)) + 2;
          break;
      }
      break;

    case 'J':
      switch (this.rotation)
      {
        case 0:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left), Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2)) + 1;
          break;

        case 90:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2) - 2) + 2;
          break;

        case 180:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left) - 1, Pit.getFirstOccupiedRowAtColumn(this.left + 1) - 1, Pit.getFirstOccupiedRowAtColumn(this.left + 2)) + 2;
          break;

        case 270:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left), Pit.getFirstOccupiedRowAtColumn(this.left + 1)) + 2;
          break;
      }
      break;

    case 'L':
      switch (this.rotation)
      {
        case 0:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left), Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2)) + 1;
          break;

        case 90:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2)) + 2;
          break;

        case 180:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left), Pit.getFirstOccupiedRowAtColumn(this.left + 1) - 1, Pit.getFirstOccupiedRowAtColumn(this.left + 2) - 1) + 2;
          break;

        case 270:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left) - 2, Pit.getFirstOccupiedRowAtColumn(this.left + 1)) + 2;
          break;
      }
      break;

    case 'S':
      switch (this.rotation)
      {
        case 0:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left) - 1, Pit.getFirstOccupiedRowAtColumn(this.left + 1)) + 2;
          break;

        case 90:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left), Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2) - 1) + 1;
          break;

        case 180:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left + 1) - 1, Pit.getFirstOccupiedRowAtColumn(this.left + 2)) + 2;
          break;

        case 270:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left), Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2) - 1) + 2;
          break;
      }
      break;

    case 'Z':
      switch (this.rotation)
      {
        case 0:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left), Pit.getFirstOccupiedRowAtColumn(this.left + 1) - 1) + 2;
          break;

        case 90:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left) - 1, Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2)) + 1;
          break;

        case 180:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2) - 1) + 2;
          break;

        case 270:
          this.top = Math.max(Pit.getFirstOccupiedRowAtColumn(this.left) - 1, Pit.getFirstOccupiedRowAtColumn(this.left + 1), Pit.getFirstOccupiedRowAtColumn(this.left + 2)) + 2;
          break;
      }
      break;
  }
  this.element.style.top = ((Pit.depth - 1 - this.top) * oneBlockSizeInPixels) + 'px';
};

Block.prototype.moveLeft = function (Pit) {
  // Check to make sure block can move left first
  if (this.left - 1 >= -1) { // Needs to be -1 to account for the line at 180
    switch (this.shape)
    {
      case 'Cube':
        if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left) {
          this.left -= 1;
        }
        break;

      case 'Line':
        switch (this.rotation)
        {
          case 0:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 3) < this.left) {
              this.left -= 1;
            }
            break;

          case 90:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left - 1) {
              this.left -= 1;
            }
            break;

          case 180:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) <= this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) <= this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) <= this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 3) <= this.left) {
              this.left -= 1;
            }
            break;

          case 270:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left - 1) {
              this.left -= 1;
            }
            break;
        }
        break;

      case 'T':
        switch (this.rotation)
        {
          case 0:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left) {
              this.left -= 1;
            }
            break;

          case 90:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left + 1) {
              this.left -= 1;
            }
            break;

          case 180:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left + 1) {
              this.left -= 1;
            }
            break;

          case 270:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left + 1) {
              this.left -= 1;
            }
            break;
        }
        break;

      case 'J':
        switch (this.rotation)
        {
          case 0:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left) {
              this.left -= 1;
            }
            break;

          case 90:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left + 1) {
              this.left -= 1;
            }
            break;

          case 180:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left + 2) {
              this.left -= 1;
            }
            break;

          case 270:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left) {
              this.left -= 1;
            }
            break;
        }
        break;

      case 'L':
        switch (this.rotation)
        {
          case 0:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left + 2 && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left) {
              this.left -= 1;
            }
            break;

          case 90:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left + 1) {
              this.left -= 1;
            }
            break;

          case 180:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left) {
              this.left -= 1;
            }
            break;

          case 270:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left + 1) {
              this.left -= 1;
            }
            break;
        }
        break;

      case 'S':
        switch (this.rotation)
        {
          case 0:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left + 1) {
              this.left -= 1;
            }
            break;

          case 90:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left) {
              this.left -= 1;
            }
            break;

          case 180:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left + 2) {
              this.left -= 1;
            }
            break;

          case 270:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left) {
              this.left -= 1;
            }
            break;
        }
        break;

      case 'Z':
        switch (this.rotation)
        {
          case 0:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left) {
              this.left -= 1;
            }
            break;

          case 90:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left + 1) {
              this.left -= 1;
            }
            break;

          case 180:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top) < this.left + 2 && Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left + 1 && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left + 1) {
              this.left -= 1;
            }
            break;

          case 270:
            if (Pit.getLeftmostAvailableColumnAtRow(this.top - 1) < this.left && Pit.getLeftmostAvailableColumnAtRow(this.top - 2) < this.left + 1) {
              this.left -= 1;
            }
            break;
        }
        break;
    }
    this.element.style.left = this.left * oneBlockSizeInPixels + 'px';
  }
};

Block.prototype.moveRight = function (Pit) {
  // Check to make sure block can move right first
  if (this.left + 1 <= Pit.width - 1) {
    switch (this.shape)
    {
      case 'Cube':
        if (Pit.getRightmostAvailableColumnAtRow(this.top) >= this.left + 2 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) >= this.left + 2) {
          this.left += 1;
        }
        break;

      case 'Line':
        switch (this.rotation)
        {
          case 0:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) >= this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) >= this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) >= this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 3) >= this.left + 1) {
              this.left += 1;
            }
            break;

          case 90:
            if (Pit.getRightmostAvailableColumnAtRow(this.top - 1) >= this.left + 3) {
              this.left += 1;
            }
            break;

          case 180:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 3) > this.left + 1) {
              this.left += 1;
            }
            break;

          case 270:
            if (Pit.getRightmostAvailableColumnAtRow(this.top - 2) >= this.left + 3) {
              this.left += 1;
            }
            break;
        }
        break;

      case 'T':
        switch (this.rotation)
        {
          case 0:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 2) {
              this.left += 1;
            }
            break;

          case 90:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 2 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left + 1) {
              this.left += 1;
            }
            break;

          case 180:
            if (Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 2 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 1) {
              this.left += 1;
            }
            break;

          case 270:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left + 1) {
              this.left += 1;
            }
            break;
        }
        break;

      case 'J':
        switch (this.rotation)
        {
          case 0:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 2) {
              this.left += 1;
            }
            break;

          case 90:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 2 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left + 1) {
              this.left += 1;
            }
            break;

          case 180:
            if (Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 2 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 2) {
              this.left += 1;
            }
            break;

          case 270:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left + 1) {
              this.left += 1;
            }
            break;
        }
        break;

      case 'L':
        switch (this.rotation)
        {
          case 0:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 2 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 2) {
              this.left += 1;
            }
            break;

          case 90:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left + 2) {
              this.left += 1;
            }
            break;

          case 180:
            if (Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 2 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left) {
              this.left += 1;
            }
            break;

          case 270:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left + 1) {
              this.left += 1;
            }
            break;
        }
        break;

      case 'S':
        switch (this.rotation)
        {
          case 0:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left + 1) {
              this.left += 1;
            }
            break;

          case 90:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 2 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 1) {
              this.left += 1;
            }
            break;

          case 180:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 2 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left + 2) {
              this.left += 1;
            }
            break;

          case 270:
            if (Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 2 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left + 1) {
              this.left += 1;
            }
            break;
        }
        break;

      case 'Z':
        switch (this.rotation)
        {
          case 0:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left) {
              this.left += 1;
            }
            break;

          case 90:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 2) {
              this.left += 1;
            }
            break;

          case 180:
            if (Pit.getRightmostAvailableColumnAtRow(this.top) > this.left + 2 && Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 2 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left + 1) {
              this.left += 1;
            }
            break;

          case 270:
            if (Pit.getRightmostAvailableColumnAtRow(this.top - 1) > this.left + 1 && Pit.getRightmostAvailableColumnAtRow(this.top - 2) > this.left + 2) {
              this.left += 1;
            }
            break;
        }
        break;
    }
    this.element.style.left = this.left * oneBlockSizeInPixels + 'px';
  }
};

Block.prototype.rotateClockwise = function (Pit) {
  if (this.rotation === 270) {
    this.rotation = 0;
  } else {
    this.rotation += 90;
  }

  switch (this.shape)
  {
      // Cube irrelevant

    case 'Line':
      // Set the rotation and rotation origin
      this.element.style.webkitTransform = 'rotate(' + this.rotation + 'deg)';
      this.element.style.webkitTransformOrigin = 'right ' + (oneBlockSizeInPixels * 2) + 'px';

      switch (this.rotation)
      {
        case 0:
        case 180:
          if (this.top < 3) {
            this.top = 3;
          }
          this.element.style.top = ((Pit.depth - 1 - this.top) * oneBlockSizeInPixels) + 'px';
          break;

        case 90:
        case 270:
          if (this.left < 1) {
            this.left = 1;
          } else if (this.left >= Pit.width - 3) {
            this.left = Pit.width - 3;
          }
          this.element.style.left = this.left * oneBlockSizeInPixels + 'px';
          break;
      }
      break;

    case 'T':
    case 'J':
    case 'L':
      // Set the rotation and rotation origin
      this.element.style.webkitTransform = 'rotate(' + this.rotation + 'deg)';
      this.element.style.webkitTransformOrigin = 'center ' + (oneBlockSizeInPixels + (oneBlockSizeInPixels / 2)) + 'px';

      if (this.left < 0) {
        this.left = 0;
      } else if (this.left > Pit.width - 3) {
        this.left = Pit.width - 3;
      }
      this.element.style.left = this.left * oneBlockSizeInPixels + 'px';

      if (this.top < 2) {
        this.top = 2;
        this.element.style.top = ((Pit.depth - 1 - this.top) * oneBlockSizeInPixels) + 'px';
      }

      break;

    case 'S':
    case 'Z':
      // Set the rotation and rotation origin
      this.element.style.webkitTransform = 'rotate(' + this.rotation + 'deg)';
      this.element.style.webkitTransformOrigin = (oneBlockSizeInPixels + (oneBlockSizeInPixels / 2)) + 'px ' + (oneBlockSizeInPixels + (oneBlockSizeInPixels / 2)) + 'px';
      if (this.left < 0) {
        this.left = 0;
      } else if (this.left > Pit.width - 3) {
        this.left = Pit.width - 3;
      }
      this.element.style.left = this.left * oneBlockSizeInPixels + 'px';

      if (this.top < 2) {
        this.top = 2;
        this.element.style.top = ((Pit.depth - 1 - this.top) * oneBlockSizeInPixels) + 'px';
      }
      break;
  }
};

Block.prototype.rotateCounterClockwise = function (Pit) {
  if (this.rotation === 0) {
    this.rotation = 270;
  } else {
    this.rotation -= 90;
  }

  switch (this.shape)
  {
      // Cube irrelevant

    case 'Line':
      // Set the rotation and rotation origin
      this.element.style.webkitTransform = 'rotate(' + this.rotation + 'deg)';
      this.element.style.webkitTransformOrigin = 'right ' + (oneBlockSizeInPixels * 2) + 'px';

      switch (this.rotation)
      {
        case 0:
        case 180:
          if (this.top < 3) {
            this.top = 3;
          }
          this.element.style.top = ((Pit.depth - 1 - this.top) * oneBlockSizeInPixels) + 'px';
          break;

        case 90:
        case 270:
          if (this.left < 1) {
            this.left = 1;
          } else if (this.left >= Pit.width - 3) {
            this.left = Pit.width - 3;
          }
          this.element.style.left = this.left * oneBlockSizeInPixels + 'px';
          break;
      }
      break;

    case 'T':
    case 'J':
    case 'L':
      // Set the rotation and rotation origin
      this.element.style.webkitTransform = 'rotate(' + this.rotation + 'deg)';
      this.element.style.webkitTransformOrigin = 'center ' + (oneBlockSizeInPixels + (oneBlockSizeInPixels / 2)) + 'px';
      if (this.left < 0) {
        this.left = 0;
      } else if (this.left > Pit.width - 3) {
        this.left = Pit.width - 3;
      }
      this.element.style.left = this.left * oneBlockSizeInPixels + 'px';

      if (this.top < 2) {
        this.top = 2;
        this.element.style.top = ((Pit.depth - 1 - this.top) * oneBlockSizeInPixels) + 'px';
      }
      break;

    case 'S':
    case 'Z':
      // Set the rotation and rotation origin
      this.element.style.webkitTransform = 'rotate(' + this.rotation + 'deg)';
      this.element.style.webkitTransformOrigin = (oneBlockSizeInPixels + (oneBlockSizeInPixels / 2)) + 'px ' + (oneBlockSizeInPixels + (oneBlockSizeInPixels / 2)) + 'px';
      if (this.left < 0) {
        this.left = 0;
      } else if (this.left > Pit.width - 3) {
        this.left = Pit.width - 3;
      }
      this.element.style.left = this.left * oneBlockSizeInPixels + 'px';

      if (this.top < 2) {
        this.top = 2;
        this.element.style.top = ((Pit.depth - 1 - this.top) * oneBlockSizeInPixels) + 'px';
      }
      break;
  }
};

Block.prototype.setBlock = function (Pit, topCoord, leftCoord) {
  Pit.contents[topCoord][leftCoord].occupied = 1;
  Pit.contents[topCoord][leftCoord].blockFragment = this.oneBlockImg;
};

Block.prototype.finalizePosition = function (Pit) {
  // Add values to Pit when the block is done moving
  switch (this.shape)
  {
    case 'Cube':
      // Rotation is irrelevant
      this.setBlock(Pit, this.top, this.left);
      this.setBlock(Pit, this.top, this.left + 1);
      this.setBlock(Pit, this.top - 1, this.left);
      this.setBlock(Pit, this.top - 1, this.left + 1);
      break;

    case 'Line':
      switch (this.rotation)
      {
        case 0:
          this.setBlock(Pit, this.top, this.left);
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 2, this.left);
          this.setBlock(Pit, this.top - 3, this.left);
          break;

        case 90:
          this.setBlock(Pit, this.top - 1, this.left - 1);
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 2);
          break;

        case 180:
          this.setBlock(Pit, this.top, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          this.setBlock(Pit, this.top - 3, this.left + 1);
          break;

        case 270:
          this.setBlock(Pit, this.top - 2, this.left - 1);
          this.setBlock(Pit, this.top - 2, this.left);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left + 2);
          break;
      }
      break;

    case 'T':
      switch (this.rotation)
      {
        case 0:
          this.setBlock(Pit, this.top, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 2);
          break;

        case 90:
          this.setBlock(Pit, this.top, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 2);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          break;

        case 180:
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 2);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          break;

        case 270:
          this.setBlock(Pit, this.top, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          break;
      }
      break;

    case 'J':
      switch (this.rotation)
      {
        case 0:
          this.setBlock(Pit, this.top, this.left);
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 2);
          break;

        case 90:
          this.setBlock(Pit, this.top, this.left + 1);
          this.setBlock(Pit, this.top, this.left + 2);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          break;

        case 180:
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 2);
          this.setBlock(Pit, this.top - 2, this.left + 2);
          break;

        case 270:
          this.setBlock(Pit, this.top, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left);
          break;
      }
      break;

    case 'L':
      switch (this.rotation)
      {
        case 0:
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 2);
          this.setBlock(Pit, this.top, this.left + 2);
          break;

        case 90:
          this.setBlock(Pit, this.top, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left + 2);
          break;

        case 180:
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 2);
          this.setBlock(Pit, this.top - 2, this.left);
          break;

        case 270:
          this.setBlock(Pit, this.top, this.left);
          this.setBlock(Pit, this.top, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          break;
      }
      break;

    case 'S':
      switch (this.rotation)
      {
        case 0:
          this.setBlock(Pit, this.top, this.left);
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          break;

        case 90:
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top, this.left + 1);
          this.setBlock(Pit, this.top, this.left + 2);
          break;

        case 180:
          this.setBlock(Pit, this.top, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 2);
          this.setBlock(Pit, this.top - 2, this.left + 2);
          break;

        case 270:
          this.setBlock(Pit, this.top - 2, this.left);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 2);
          break;
      }
      break;

    case 'Z':
      switch (this.rotation)
      {
        case 0:
          this.setBlock(Pit, this.top, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 2, this.left);
          break;

        case 90:
          this.setBlock(Pit, this.top, this.left);
          this.setBlock(Pit, this.top, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 1, this.left + 2);
          break;

        case 180:
          this.setBlock(Pit, this.top, this.left + 2);
          this.setBlock(Pit, this.top - 1, this.left + 2);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          break;

        case 270:
          this.setBlock(Pit, this.top - 1, this.left);
          this.setBlock(Pit, this.top - 1, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left + 1);
          this.setBlock(Pit, this.top - 2, this.left + 2);
          break;
      }
      break;
  }

  // Play sound - won't play soon enough :(
  dropSound.play();

  // Redraw the pit as block fragments
  Pit.redrawBlocks();

  // Remove currently used block (this is done here to help prevent disappearing and re-appearing blocks)
  this.element.parentNode.removeChild(this.element);
};

if (window.TouchEvent) {
  statusDiv.addEventListener('touchend', function () {
    if (this.innerHTML === 'Start') {
      if (!gameInitialized) {
        // Set up the pit mechanics
        pit.init();
        // Draw the pit
        pit.draw();
        // Generate starting block
        pit.block = new Block();
        pit.container.appendChild(pit.block.element);
        // Reset the game score
        score = 0;
        totalLines = 0;
        gameOver = false;
      }

      gameTimer = window.setTimeout(turn, timeInterval);
      startInterval = new Date().getTime();
      this.innerHTML = 'Pause';
    } else if (this.innerHTML === 'Pause') {
      gameTimer = window.clearTimeout(gameTimer);
      var endInterval = new Date().getTime();
      totalSeconds += (endInterval - startInterval);
      this.innerHTML = 'Resume';
    } else if (this.innerHTML === 'Resume') {
      if (startingOrientation === window.orientation) {
        gameTimer = window.setTimeout(turn, timeInterval);
        startInterval = new Date().getTime();
        this.innerHTML = 'Pause';
      } else {
        alert('Please return game to original orientation to continue playing.');
      }
    }
  }, false);
  pit.container.addEventListener('touchstart', function (e) {
    // Set the beginning point of touch
    touchStartX = e.touches.item(0).screenX;
    touchStartY = e.touches.item(0).screenY;

    // Prevent the default behavior
    e.preventDefault();
  }, false);
  pit.container.addEventListener('touchend', function (e) {
    // Make sure the game isn't over and running
    if (!gameOver && gameTimer) {
      // Set the end points of touch
      touchEndX = e.changedTouches.item(0).screenX;
      touchEndY = e.changedTouches.item(0).screenY;

      // Local var calculations
      var differenceX = touchStartX - touchEndX;
      var differenceY = touchStartY - touchEndY;

      if (touchStartX === touchEndX && touchStartY === touchEndY) {
        // Screen tapped
        pit.block.rotateClockwise(pit);
        rotateSound.play();
      } else {
        if (Math.abs(differenceX) > Math.abs(differenceY)) {
          if (differenceX > 0) {
            // Swipe left
            pit.block.moveLeft(pit);
          } else {
            // Swipe right
            pit.block.moveRight(pit);
          }
        } else if (Math.abs(differenceX) < Math.abs(differenceY)) {
          if (differenceY > 0) {
            // Swipe up
            pit.block.rotateCounterClockwise(pit);
            rotateSound.play();
          } else {
            // Swipe down
            pit.block.fastDrop(pit);
          }
        }
      }
    }

    // Prevent the default behavior
    e.preventDefault();
  }, false);
}

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function (position) {
    endGameObject.latitude = position.coords.latitude;
    endGameObject.longitude = position.coords.longitude;
  }, function () {
    // Could implement and check for specific reason here (PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT, UNKNOWN_ERROR)
    endGameObject.latitude = 'Undeterminable';
    endGameObject.longitude = 'Undeterminable';
  });
}

if (window.DeviceOrientationEvent) {
  window.startingOrientation = window.orientation;

  window.addEventListener('orientationchange', function () {
    if (startingOrientation !== window.orientation) {
      if (gameTimer) {
        var endInterval = new Date().getTime();
        totalSeconds += (endInterval - startInterval);
      }
      gameTimer = window.clearTimeout(gameTimer);
      statusDiv.innerHTML = 'Resume';
      alert('Game Paused.\n\nPlease return device to original orientation');
    }
  }, false);

  pit.width = Math.floor((window.innerWidth - sideBuffer) / oneBlockSizeInPixels);
  pit.depth = Math.floor((window.innerHeight - endBuffer) / oneBlockSizeInPixels);

  // Set up the pit mechanics
  pit.init();
  // Draw the pit
  pit.draw();

  // Generate starting block
  pit.block = new Block();
  pit.container.appendChild(pit.block.element);

  statusDiv.innerHTML = 'Start';

}

function turn() {
  if (pit.block.Drop(pit) === 0) {
    // Can't drop any further
    if (pit.block.top === pit.depth - 1) {
      // Game over
      gameOver = true;
    } else {
      pit.block.finalizePosition(pit);
      pit.checkForCompletedRows();
      pit.block = new Block();
      pit.container.appendChild(pit.block.element);
    }
  }

  if (!gameOver) {
    gameTimer = window.setTimeout(turn, timeInterval);
  } else {
    window.clearTimeout(gameTimer);
    var endInterval = new Date().getTime();
    totalSeconds += (endInterval - startInterval);
    statusDiv.innerHTML = 'Start';

    endGameObject.score = score;
    endGameObject.totalLines = totalLines;
    endGameObject.roundTime = ('0' + (Math.floor((totalSeconds / 1000) / 60))).slice(-2) + ':' + ('0' + (Math.round((totalSeconds - (Math.floor((totalSeconds / 1000) / 60) * 60 * 1000)) / 1000))).slice(-2);

    // Grab the person's name and show game results
    endGameObject.username = prompt('Game Over!\n\nRound Time: ' + endGameObject.roundTime + '\nTotal Rows: ' + totalLines + '\nScore: ' + score + '\n\nPlease enter your name:');

    if (window.localStorage && endGameObject.username !== null) {
      localStorage.setItem(localStorage.length + 1, JSON.stringify(endGameObject));
    }

    /*if (confirm('Would you like to submit your score to the server?')) {
      var messageString = '';

      // Open a web socket and submit info to server
      var wsHost = 'http://technologeeks.com/e65/submit.php?user=SteveMahony';
      var wsSocket = new WebSocket(wsHost);
      // When socket is open, send message string to server
      wsSocket.onopen = function () {
        // Build message string to send
        messageString = 'Name=' + endGameObject.username + '&HighScore=' + endGameObject.score + '&Location=' + endGameObject.latitude + ',' + endGameObject.longitude;
        // Send message to server
        wsSocket.send(messageString);
      };
      wsSocket.onmessage = function () {
        // On message send, close the connection
        wsSocket.close();
      };
    }*/

    gameInitialized = false;

    window.location = 'index.html';
  }
}

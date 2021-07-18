var canvas;
var ctx; // Context
var FPS = 50; // Frames per second
var scenario;
var player;

// Color constants
const wallColor = "#000"; // Black
const floorColor = "#666"; // Gray
const playerColor = "#FFF"; // White

// Tiles' Object (for textures)
var tiles;

var imgArmor;
var imgPlant;

var sprites = []; // Array for the sprites
var zBuffer = []; // Array with the distance to each wall (with each ray)

// Canvas dimensions in pixels
var canvasWidth = 500;
var canvasHeight = 500;

// Tile dimension
var tileSize = 50;

// Field of view (degrees)
const FOV = 60;
const halfFOV = FOV / 2;

// Matrix for storaging a level
// the 'ones' represent walls
var firstLevel = [
  [1, 1, 1, 3, 2, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 3, 0, 0, 2],
  [4, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [4, 0, 0, 0, 0, 3, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 4],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 0, 1, 1, 1, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// Keyboard listener for keydown (we only move when)
// a key is held
// Status: working
document.addEventListener("keydown", function (keyEvent) {
  switch (keyEvent.key) {
    case "ArrowUp":
      player.up();
      break;
    case "ArrowDown":
      player.down();
      break;
    case "ArrowRight":
      player.right();
      break;
    case "ArrowLeft":
      player.left();
      break;
  }
});

// When we release a key, the variables are reset
// Status: working
document.addEventListener("keyup", function (keyEvent) {
  switch (keyEvent.key) {
    case "ArrowUp":
      player.stopMove();
      break;
    case "ArrowDown":
      player.stopMove();
      break;
    case "ArrowRight":
      player.stopTurn();
      break;
    case "ArrowLeft":
      player.stopTurn();
      break;
  }
});

// Used for giving the canvas a better looking through
// style manipulation
// Status: working
function canvasReescale() {
  canvas.style.width = "700px";
  canvas.style.height = "700px";
}

// Function for giving a specific color to the floor and
// roof
// Status: working
function renderFloorAndRoof() {
  ctx.fillStyle = "#666"; // Gray
  ctx.fillRect(0, 0, 500, 250);

  ctx.fillStyle = "#752300"; // Brown
  ctx.fillRect(0, 250, 500, 500);
}

// Function for keeping the angles between 0 and 2Pi
// Status: working
function normalizeAngle(angle) {
  angle = angle % (2 * Math.PI);
  if (angle < 0) {
    angle = angle + 2 * Math.PI;
  }
  return angle;
}

// Status: working
function distanceBetweenPoints(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Status: working
function degreesToRadians(angle) {
  angle = angle * (Math.PI / 180);
  return angle;
}

// We follow the painter's logic (we draw from the farest to the nearest
// sprite with respect to the player), we use an ascending sorting
// Status: working
function renderSprites() {
  sprites.sort(function (obj1, obj2) {
    return obj2.distance - obj1.distance;
  });

  // We draw the sprites one by one
  for (let i = 0; i < sprites.length; i++) {
    sprites[i].draw();
  }
}

class Sprite {
  constructor(x, y, image) {
    this.x = x;
    this.y = y;
    this.image = image;

    this.distance = 0;
    this.angle = 0;

    this.visible = false;
  }

  // We calculate the angle of the sprite, with
  // respect to the player
  // Status: working
  calculateAngle() {
    // These vector represent a new triangle created between
    // the object (sprite) and the player
    var xVector = this.x - player.x;
    var yVector = this.y - player.y;

    // We can determine the angle between the object and the
    // player by using the arctangent function, which can give
    // us the angle, with the given vectors
    var angleObjectPlayer = Math.atan2(yVector, xVector);
    // This difference represents the angle between the player's
    // aiming direction and the sprite's aiming direction respect
    // to player
    var angleDifference = player.rotationAngle - angleObjectPlayer;

    // It might come the case, where the angle difference in radians
    // give a great value that might imply a bigger distance in
    // radians for reaching the desired value, which is not practical,
    // to avoid that, we use the following conditions
    if (angleDifference < -Math.PI) {
      angleDifference += 2.0 * Math.PI;
    }
    if (angleDifference > Math.PI) {
      angleDifference -= 2.0 * Math.PI;
    }

    angleDifference = Math.abs(angleDifference);

    // After getting such difference, we can determine either the object
    // will be visible (considering it in the FOV) or not
    if (angleDifference < halfFOV) {
      this.visible = true;
    } else {
      this.visible = false;
    }
  }

  // Distance between the player and the object
  // Status: working
  calculateDistance() {
    this.distance = distanceBetweenPoints(player.x, player.y, this.x, this.y);
  }

  // Status: working
  updateData() {
    this.calculateAngle();
    this.calculateDistance();
  }

  // Status: working
  draw() {
    this.updateData();

    if (this.visible) {
      // The processing is very similar to the wall processing

      var tileHeight = 500; // The height of the sprite
      var proyectionPlaneDistance = canvasWidth / 2 / Math.tan(halfFOV);
      var spriteHeight = (tileHeight / this.distance) * proyectionPlaneDistance;

      // We calculate the beginning and the end of the vertical line
      var y0 = parseInt(canvasHeight / 2) - parseInt(spriteHeight / 2);
      var y1 = y0 + spriteHeight;

      var textureH = 64;
      var textureW = 64;

      var textureHeight = y0 - y1;
      var textureWidth = textureHeight;

      // Plane proyection distance
      var viewDist = 500;

      var xVector = this.x - player.x;
      var yVector = this.y - player.y;

      var spriteAngle = Math.atan2(yVector, xVector) - player.rotationAngle;

      var x0 = Math.tan(spriteAngle) * viewDist;
      var x = canvasWidth / 2 + x0 - textureWidth / 2;

      // We disable the blur effect
      ctx.imageSmoothingEnabled = false;

      // X width proportion (the closer we get, the longer the vertical)
      // lines will be
      var columnWidth = textureHeight / textureH;

      // We draw the sprite from line to line, for avoiding it to show
      // behind a wall. Made with two loops
      for (let i = 0; i < textureW; i++) {
        for (let j = 0; j < columnWidth; j++) {
          var x1 = parseInt(x + (i - 1) * columnWidth + j);

          // We compare the current line with the distance con the zBuffer to
          // decide if we draw
          if (zBuffer[x1] > this.distance) {
            ctx.drawImage(
              this.image,
              i,
              0,
              1,
              textureH - 1,
              x1,
              y1,
              1,
              textureHeight
            );
          }
        }
      }
    }
  }
}

class Ray {
  constructor(ctx, scenario, x, y, playerAngle, angleIncrease, column) {
    this.ctx = ctx;
    this.scenario = scenario;
    this.x = x;
    this.y = y;
    this.playerAngle = playerAngle;
    this.angleIncrease = angleIncrease;
    this.angle = playerAngle + angleIncrease;
    this.column = column;
    this.distance = 0;

    // We store the texture pixel
    this.texturePixel = 0;
    this.textureId = 0;

    // Coordinates of the ray's end
    this.wallHitX = 0;
    this.wallHitY = 0;

    this.wallHitXHorizontal = 0;
    this.wallHitYHorizontal = 0;

    this.wallHitXVertical = 0;
    this.wallHitYVertical = 0;
  }

  // Normalize the angle, to force it to be directed to the
  // player's aiming
  // Status: working
  setAngle(angle) {
    this.playerAngle = angle;
    this.angle = normalizeAngle(angle + this.angleIncrease);
  }

  // Status: working
  cast() {
    this.xIntercept = 0;
    this.yIntercept = 0;
    this.xStep = 0;
    this.yStep = 0;

    // We need to get the direction of the ray's movement
    this.down = false;
    this.left = false;

    // Based on the ray direction, we stablish conditions based on
    // Pi for the cartesian plane

    // This condition is set when the angle goes between 0 and Pi
    if (this.angle < Math.PI) {
      this.down = true;
    }

    // This condition is set when the angle goes between Pi/2 and (3/2)Pi
    if (this.angle > Math.PI / 2 && this.angle < (3 * Math.PI) / 2) {
      this.left = true;
    }

    // Collisions

    // Horizontal collision

    var horizontalCollision = false;

    // We look for the first intersection
    this.yIntercept = Math.floor(this.y / tileSize) * tileSize;

    // When we look down (backwards), we increase a tile
    if (this.down) {
      this.yIntercept += tileSize;
    }

    // By trigonometry, we know that tan(a) = opposite/adjacent = y/x
    // therefore, x = y/tan(a). For getting y, we know that y represents
    // the y location of the player, while yIntercept represents the horizontal
    // line where the ray collides. With this, we know that the this.y value is
    // yIntercept - y
    var adjacent = (this.yIntercept - this.y) / Math.tan(this.angle);

    // In a similar manner, we know that this.x represents the current player
    // location, so we add adjacent to get the desired x length
    this.xIntercept = this.x + adjacent;

    // We have to remember that the previous steps apply for one tile, by
    // considering a pythagoric angle. However, a ray may go beyond one
    // tile, so we need to iterate the values for getting the final
    // distance to the ray's end

    // We calculate the steps
    this.yStep = tileSize;
    this.xStep = this.yStep / Math.tan(this.angle);

    // If we go up (forward), we invert yStep
    if (!this.down) {
      this.yStep = -this.yStep;
    }

    // We force the xStep to be coherent, this is, if the player moves left,
    // the xStep should be negative, if it moves right, it should be positive
    if ((this.left && this.xStep > 0) || (!this.left && this.xStep < 0)) {
      this.xStep = -this.xStep;
    }

    var nextXHorizontal = this.xIntercept;
    var nextYHorizontal = this.yIntercept;

    // If the player aims up (forward), we subsract a pixel to force the
    // collision with the tile
    if (!this.down) {
      nextYHorizontal--;
    }

    // Loop for finding the collision point
    while (!horizontalCollision) {
      // We get the tile by rounding (lower rounding)
      var xTile = parseInt(nextXHorizontal / tileSize);
      var yTile = parseInt(nextYHorizontal / tileSize);

      // We verify if there is a collision in the given tile coordinates
      if (this.scenario.collision(xTile, yTile)) {
        horizontalCollision = true;
        this.wallHitXHorizontal = nextXHorizontal;
        this.wallHitYHorizontal = nextYHorizontal;
      } else {
        // If not, we try with the next coordinates
        nextXHorizontal += this.xStep;
        nextYHorizontal += this.yStep;
      }
    }

    // Vertical Collision

    var verticalCollision = false;

    // We look for the first intersection

    this.xIntercept = Math.floor(this.x / tileSize) * tileSize;

    // If the player aims right, we increase 1 tile

    if (!this.left) {
      this.xIntercept += tileSize;
    }

    // We also know with trigonometry, that y = x * tan(a)
    // we substract this.x for getting the x length
    var opposite = (this.xIntercept - this.x) * Math.tan(this.angle);
    this.yIntercept = this.y + opposite;

    // We calculate the distance for each step
    this.xStep = tileSize;

    // If the player aims left, we invert the sign oh the step
    if (this.left) {
      this.xStep = -this.xStep;
    }

    this.yStep = tileSize * Math.tan(this.angle);

    // We force a coherent yStep value
    if ((!this.down && this.yStep > 0) || (this.down && this.yStep < 0)) {
      this.yStep = -this.yStep;
    }

    var nextXVertical = this.xIntercept;
    var nextYVertical = this.yIntercept;

    // If the player aims left, we substract a pixel
    if (this.left) {
      nextXVertical--;
    }

    // Steps' loop for detecting collision
    while (
      !verticalCollision &&
      nextXVertical >= 0 &&
      nextYVertical >= 0 &&
      nextXVertical < canvasWidth &&
      nextYVertical < canvasHeight
    ) {
      // We get the tile rounding (by lower rounding)
      var xTile = parseInt(nextXVertical / tileSize);
      var yTile = parseInt(nextYVertical / tileSize);

      if (this.scenario.collision(xTile, yTile)) {
        verticalCollision = true;
        this.wallHitXVertical = nextXVertical;
        this.wallHitYVertical = nextYVertical;
      } else {
        nextXVertical += this.xStep;
        nextYVertical += this.yStep;
      }
    }

    var horizontalDistance = 9999;
    var verticalDistance = 9999;

    if (horizontalCollision) {
      horizontalDistance = distanceBetweenPoints(
        this.x,
        this.y,
        this.wallHitXHorizontal,
        this.wallHitYHorizontal
      );
    }

    if (verticalCollision) {
      verticalDistance = distanceBetweenPoints(
        this.x,
        this.y,
        this.wallHitXVertical,
        this.wallHitYVertical
      );
    }

    // We test which distance is closer
    if (horizontalDistance < verticalDistance) {
      this.wallHitX = this.wallHitXHorizontal;
      this.wallHitY = this.wallHitYHorizontal;
      // We store the corresponding distance
      this.distance = horizontalDistance;
      // We calculate the current tile where the ray is hitting
      var tile = parseInt(this.wallHitX / tileSize);
      // We calculate the part of the wall that needs to be
      // render, based on the ray
      this.texturePixel = this.wallHitX - tile * tileSize;
    } else {
      this.wallHitX = this.wallHitXVertical;
      this.wallHitY = this.wallHitYVertical;
      // We store the corresponding distance
      this.distance = verticalDistance;
      // We calculate the current tile where the ray is hitting
      var tile = parseInt(this.wallHitY / tileSize);
      // We calculate the part of the wall that needs to be
      // render, based on the ray
      this.texturePixel = this.wallHitY - tile * tileSize;
    }

    // We select the corresponding texture that we want to render
    this.textureId = this.scenario.getTile(this.wallHitX, this.wallHitY);

    // When the wall is rendered with the calculated values, there
    // is an ought optic efect, like making a zoom on a focused zone
    // this happens due to the mathematics implemented, where we see
    // the columns bigger as the player position, but basing on the
    // hypotenuse, for correcting such effect, we use the adjacent
    // instead
    this.distance = this.distance * Math.cos(this.playerAngle - this.angle);

    // We store the distance
    zBuffer[this.column] = this.distance;
  }

  // In here, we have to take into account two different pythagoric triangles:
  // one that goes from the player position (lateral view) to the fake 3d world
  // and another that goes from the player position, to the proyected view, aka
  // the screen. By taking the properties of angles and triangles, we know that
  // A/B = C/D, where A represents the y value of the triangle of the proyected
  // view and B represents the value of such triangle, whereas C is the y of the
  // other triangle and D is the x. Therefore, we calculte the proyected height
  // as A = (C/D)*B
  // Status: working
  renderWall() {
    // The real size of a wall (in the fake 3d world) in pixels
    var wallHeight = 500;
    // We use tan() = x/y for determing the proyection plane distance
    var proyectionPlaneDistance = canvasWidth / 2 / Math.tan(halfFOV);
    var proyectedWallHeight =
      (wallHeight / this.distance) * proyectionPlaneDistance;

    // Now we calculate where start and end the lines that draw the walls
    var y0 = parseInt(canvasHeight / 2) - parseInt(proyectedWallHeight / 2);
    var y1 = y0 + proyectedWallHeight;
    // The columns represent the vertical lines that form the fake 3d world
    var x = this.column;

    // Texture rendering

    var textureHeight = 64;
    var imageHeight = y0 - y1;

    // We disable smotthing, so we avoid blurs on textures
    ctx.imageSmoothingEnabled = false;

    this.ctx.drawImage(
      tiles, // texture
      this.texturePixel, // x clipping
      (this.textureId - 1) * textureHeight, // y clipping
      1, // clipping width
      textureHeight - 1, // clipping height
      x, // x where the rendering starts
      y1, // y where the rendering starts
      1, // Real pixel width
      imageHeight
    );

    /*
    // We draw each column (no textures rendered)
    this.ctx.beginPath();
    this.ctx.moveTo(x, y0);
    this.ctx.lineTo(x, y1);
    this.ctx.strokeStyle = "#666";
    this.ctx.stroke();
    */
  }

  // Status: working
  draw() {
    this.cast();
    this.renderWall();

    /*
    // Show ray line
    var xDestination = this.wallHitX;
    var yDestination = this.wallHitY;

    // Draw the line (HTML)

    this.ctx.beginPath();
    // Initial coordinates
    this.ctx.moveTo(this.x, this.y);
    // Final coordinates
    this.ctx.lineTo(xDestination, yDestination);
    this.ctx.strokeStyle = "red";
    this.ctx.stroke();
    */
  }
}

class Level {
  constructor(can, ctx, arr) {
    this.canvas = can;
    this.ctx = ctx;
    this.matrix = arr;

    // Matrix dimensions

    // Selecting the length of a row
    this.matrixHeight = this.matrix.length;
    // Selecting the length of any column, since all columns
    // have the same length
    this.matrixWidth = this.matrix[0].length;

    // Tiles dimensions (We divide the tile number horizontal or vertical)
    // by the canvas dimensions (horizontal or vertical)
    // parseInt -> rounds the result
    this.tileHeight = parseInt(canvasHeight / this.matrixHeight);
    this.tileWidth = parseInt(canvasWidth / this.matrixWidth);
  }

  // Detect if walls present
  // Status: working
  collision(x, y) {
    var collide = false;
    if (this.matrix[y][x] != 0) {
      collide = true;
    }
    return collide;
  }

  // Status: working
  getTile(x, y) {
    var tileX = parseInt(x / this.tileWidth);
    var tileY = parseInt(y / this.tileHeight);
    return this.matrix[tileY][tileX];
  }

  // Method for drawing the map
  draw() {
    var color;

    // We fill go through every matrix element
    for (var y = 0; y < this.matrixHeight; y++) {
      for (var x = 0; x < this.matrixWidth; x++) {
        // If we detect a 1 (wall), color it black
        if (this.matrix[y][x] == 1) {
          color = wallColor;
        } else {
          color = floorColor;
        }

        // We draw the walls and floor
        this.ctx.fillStyle = color;
        this.ctx.fillRect(
          x * this.tileWidth,
          y * this.tileHeight,
          this.tileWidth,
          this.tileHeight
        );
      }
    }
  }
}

class Player {
  constructor(ctx, scen, x, y) {
    this.ctx = ctx;
    this.scenario = scen;

    // Player's initial coordinates
    this.x = x;
    this.y = y;

    // Move atribute may have three different states:
    // 0 = standing, 1 = move forward, -1 = move backward
    this.move = 0;
    // Move atribute may have two different states:
    // -1 = turn left, 1 = turn right
    this.turn = 0;

    this.rotationAngle = 0; // (radians)
    this.movementSpeed = 3; // (pixels)
    this.turnSpeed = 3 * (Math.PI / 180); // (degrees)

    // Rays
    this.rayNumber = canvasWidth;
    this.rays = [];

    // We need to calculate the angle for each ray
    var angleIncrease = degreesToRadians(FOV / this.rayNumber);
    var initialAngle = degreesToRadians(this.rotationAngle - halfFOV);
    var rayAngle = initialAngle;

    // We create the rays
    for (let i = 0; i < this.rayNumber; i++) {
      this.rays[i] = new Ray(
        this.ctx,
        this.scenario,
        this.x,
        this.y,
        this.rotationAngle,
        rayAngle,
        i
      );
      rayAngle += angleIncrease;
    }
  }

  // Status: working
  up() {
    this.move = 1;
  }

  // Status: working
  down() {
    this.move = -1;
  }

  // Status: working
  left() {
    this.turn = -1;
  }

  // Status: working
  right() {
    this.turn = 1;
  }

  // Status: working
  stopMove() {
    this.move = 0;
  }

  // Status: working
  stopTurn() {
    this.turn = 0;
  }

  // Detect if in the scenario, in the current tile is a wall
  // if so, set collision to true
  // Status: working
  collision(x, y) {
    var collide = false;

    // Get the player's position in tiles
    var tileX = parseInt(x / this.scenario.tileWidth);
    var tileY = parseInt(y / this.scenario.tileHeight);

    if (this.scenario.collision(tileX, tileY)) {
      collide = true;
    }

    return collide;
  }

  // Status: working
  updatePosition() {
    // Move
    var newXPosition =
      this.x + this.move * Math.cos(this.rotationAngle) * this.movementSpeed;
    var newYPosition =
      this.y + this.move * Math.sin(this.rotationAngle) * this.movementSpeed;

    // When no collision is detected, move
    if (!this.collision(newXPosition, newYPosition)) {
      this.x = newXPosition;
      this.y = newYPosition;
    }

    // Rotate
    this.rotationAngle += this.turn * this.turnSpeed;
    this.rotationAngle = normalizeAngle(this.rotationAngle);

    // Update the rays properties
    for (let i = 0; i < this.rayNumber; i++) {
      this.rays[i].x = this.x;
      this.rays[i].y = this.y;
      this.rays[i].setAngle(this.rotationAngle);
    }
  }

  // Status: working
  draw() {
    // First of drawing, update player's position
    this.updatePosition();

    // Draw the rays
    for (let i = 0; i < this.rayNumber; i++) {
      this.rays[i].draw();
    }

    /*
    // The player will be represented by a little square
    this.ctx.fillStyle = playerColor;
    this.ctx.fillRect(this.x - 3, this.y - 3, 6, 6);

    // Aim direction line
    var destinationX = this.x + Math.cos(this.rotationAngle) * 40; // 40 represents line length
    var destinationY = this.y + Math.sin(this.rotationAngle) * 40; // 40 represents line length

    // Draw the line
    this.ctx.beginPath();
    this.ctx.moveTo(this.x, this.y);
    this.ctx.lineTo(destinationX, destinationY);
    this.ctx.strokeStyle = "#FFF";
    this.ctx.stroke();
    */
  }
}

// Status: working
function initializeSprites() {
  // We load the sprites
  imgArmor = new Image();
  imgArmor.src = "img/armor.png";

  imgPlant = new Image();
  imgPlant.src = "img/plant.png";

  // We create the objects for the sprites
  sprites[0] = new Sprite(300, 120, imgArmor);
  sprites[1] = new Sprite(150, 150, imgArmor);
  sprites[2] = new Sprite(320, 300, imgPlant);
  sprites[3] = new Sprite(300, 380, imgPlant);
}

// Status: working
function initialize() {
  // We link the canvas var html to the js canvas var
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  // We load the tiles' image
  tiles = new Image();
  tiles.src = "img/walls.png";

  // We modify canvas size with code
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  scenario = new Level(canvas, ctx, firstLevel);
  player = new Player(ctx, scenario, 100, 100);

  // We load the sprites after the scenario and the player
  initializeSprites();

  // We create the game's main loop
  setInterval(function () {
    main();
  }, 1000 / FPS); // One second by the FPSs

  // Reescale the canvas
  canvasReescale();
}

// Function for refreshing the page for every frame
// (I guess is for "redrawing" the elements)
// Status: working
function deleteCanvas() {
  canvas.width = canvas.width;
  canvas.height = canvas.height;
}

// Status: working
function main() {
  deleteCanvas();
  //scenario.draw();
  renderFloorAndRoof();
  player.draw();
  renderSprites();
}

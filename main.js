import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/*************************
 * Conway's game of life *
 *************************/

// read it in from a plaintext file
// . is 0 and O is 1
async function from_file(filename) {
  let file = await fetch(filename);
  let text = await file.text();

  // only use non-empty lines that are not comments
  const lines = text
    .split(/\r\n|\n/)
    .filter((line) => line[0] != "!" && line != "");

  // for now I have to pad the .cells files, but eventually we should make it smarter using this
  const width = Math.max.apply(
    Math,
    lines.map((line) => line.length),
  );
  const height = lines.length;

  return from_string(lines.join("\n"));
}

// toad.cells is modified to include the necessary padding
const toad = await from_file("/patterns/toad.cells");
const transqueenbeeshuttle = await from_file("/patterns/transqueenbeeshuffle.cells");
console.log(transqueenbeeshuttle);
const p41 = await from_file("/patterns/204p41.cells");

// read in a string representation
function from_string(str) {
  const matrix = str.split("\n").map((line) => line.split(""));
  return matrix.map((row) => row.map((value) => (value == "." ? 0 : 1)));
}

// output a string representation
function to_string(state) {
  return state
    .map((row) => row.join(""))
    .join("\n")
    .replaceAll("0", ".")
    .replaceAll("1", "O");
}

// get the values of the neighbours
function neighbours(state, i, j) {
  // let's use the optional chaining operator
  // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining
  return [
    state[i - 1]?.[j - 1],
    state[i - 1]?.[j],
    state[i - 1]?.[j + 1],
    state[i]?.[j - 1],
    state[i]?.[j + 1],
    state[i + 1]?.[j - 1],
    state[i + 1]?.[j],
    state[i + 1]?.[j + 1],
  ];
}

// count the number of live neighbours
function count_live(state, i, j) {
  return neighbours(state, i, j).filter((value) => value == 1).length;
}

// next generation
function next(current) {
  // empty grid
  var next = Array.from(
    Array(current.length),
    () => new Array(current[0].length),
  );

  // rules of Conway's game of life
  for (var i = 0; i < next.length; i++) {
    for (var j = 0; j < next[i].length; j++) {
      const count = count_live(current, i, j);
      // cell is alive
      if (current[i][j] == 1) {
        // stay alive if 2 or 3 neighbours
        if (count == 2 || count == 3) next[i][j] = 1;
        // die of starvation or overcrowding
        else next[i][j] = 0;
      }
      // cell is dead
      else {
        // become alive if exactly 3 neighbours
        if (count == 3) next[i][j] = 1;
        // stay dead otherwise
        else next[i][j] = 0;
      }
    }
  }

  return next;
}

function simulate(start, steps = 100) {
  let result = [start];
  for (var i = 1; i < steps; i++) result.push(next(result[i - 1]));
  return result;
}

const steps = 500;

const generations = simulate(transqueenbeeshuttle, steps);
generations.forEach((generation, i) => console.log(to_string(generation)));

/*****************
 * Visualisation *
 *****************/

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

// configuring the renderer
const renderer = new THREE.WebGLRenderer();
// fullscreen
renderer.setSize(window.innerWidth, window.innerHeight);
// animated
renderer.setAnimationLoop(animate);
// set a near white clear color (default is black)
renderer.setClearColor(0xeeeeee);

document.body.appendChild(renderer.domElement);

const material = new THREE.MeshPhongMaterial({
  color: 0xff0000,
  side: THREE.DoubleSide,
});

// list of the cubes in the visualization, per level
var cubes = [];

generations.map(function (grid, level) {
  cubes[level] = [];

  for (var i = 0; i < grid.length; i++) {
    for (var j = 0; j < grid[i].length; j++) {
      // if the value is 0 we don't draw anything
      if (!grid[i][j]) continue;

      const box = new THREE.BoxGeometry(1, 1, 1)
      const cube = new THREE.Mesh(box, material);

      // center the grid
      cube.position.x = i - grid.length / 2;
      cube.position.y = j - grid[i].length / 2;
      cube.position.z = level;

      cube.material = material;

      cube.visible = false;

      scene.add(cube);

      // keep track of the cubes
      cubes[level].push(cube);
    }
  }
});

// build the visualization
var current = 0;
setInterval(function() {
  // if we're done: reset everything and start again
  if (current == steps) {
    cubes.map(generation => generation.map(cube => cube.visible = false));
    current = 0;
  }

  // show next level
  cubes[current].map(cube => cube.visible = true);

  // increment
  current++;
}, 20);

// TODO figure out a good camera position
camera.position.set(0, -100, 40);

const controls = new OrbitControls(camera, renderer.domElement);
// TODO figure out good center of rotation
//controls.autoRotate = true;

// light
const color = 0xffffff;
const intensity = 5;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(-100, 100, 1000);
scene.add(light);

function animate() {
  // makes auto rotation possible
  controls.update();

  renderer.render(scene, camera);
  console.log(renderer.info.render.calls);
}

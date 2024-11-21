import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

/*************************
 * Conway's game of life *
 *************************/

// read it in from a plaintext file
// . is 0 and O is 1
async function from_file(filename) {
  let file = await fetch(filename);
  let text = await file.text();

  // only use lines that are not comments
  let lines = text.trimEnd().split(/\r\n|\n/).filter((line) => line[0] != "!");

  // pad lines with O's if variable length lines are used
  const width = Math.max.apply(
    Math,
    lines.map((line) => line.length),
  );
  lines = lines.map((line) => line.concat("O".repeat(width - line.length)))

  return from_string(lines.join("\n"));
}

// toad.cells is modified to include the necessary padding
const toad = await from_file("/patterns/toad.cells");
const transqueenbeeshuffle = await from_file("/patterns/transqueenbeeshuffle.cells");
const p41 = await from_file("/patterns/204p41.cells");
const p60glidershuttle = await from_file("/patterns/p60glidershuttle.cells");
const gourmet = await from_file("/patterns/gourmet.cells");

// the choices we make
const game_of_life = toad;
const steps = 1000;

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
function next(previous) {
  let current = previous;

  // count the number of live cells on the edges
  let on_edges = 0;
  for (let i = 0; i < previous.length; i++)
    on_edges += previous[i][0] + previous[i][previous[i].length - 1];
  for (let i = 1; i < previous[0].length - 1; i++)
    on_edges += previous[0][i] + previous[previous.length - 1][i];

  // increase the grid size if there are live cells on the edges
  if (on_edges) {
    current = [].concat(
      [Array(previous[0].length + 2).fill(0)],
      previous.map((row) => [].concat([0], row, [0])),
      [Array(previous[0].length + 2).fill(0)],
    );
  }

  // empty grid
  let next = Array.from(Array(current.length), () => new Array(current[0].length));

  // rules of Conway's game of life
  for (let i = 0; i < next.length; i++) {
    for (let j = 0; j < next[i].length; j++) {
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
  for (let i = 1; i < steps; i++) result.push(next(result[i - 1]));
  return result;
}

const generations = simulate(game_of_life, steps);
//generations.forEach((generation, i) => console.log(to_string(generation)));

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
let levels = [];

generations.map(function (grid, level) {
  let boxes = [];

  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      // if the value is 0 we don't draw anything
      if (!grid[i][j]) continue;

      let box = new THREE.BoxGeometry(1, 1, 1);
      const M = new THREE.Matrix4().makeTranslation(
        i - grid.length / 2,
        j - grid[i].length / 2,
        level,
      );
      box.applyMatrix4(
        new THREE.Matrix4().makeTranslation(
          i - grid.length / 2,
          j - grid[i].length / 2,
          level,
        ),
      );

      boxes.push(box);
    }
  }

  const merge = BufferGeometryUtils.mergeGeometries(boxes);
  let mesh = new THREE.Mesh(merge, material);
  scene.add(mesh);
  mesh.visible = false;

  levels.push(mesh);
});

// build the visualization
let current = 0;
setInterval(function () {
  // if we're done: reset everything and start again
  if (current == steps) {
    levels.map((level) => (level.visible = false));
    current = 0;
  }

  // show next level
  levels[current].visible = true;

  // increment
  current++;
}, 50);

// TODO figure out a good camera position
camera.position.set(0, -100, 40);

const controls = new OrbitControls(camera, renderer.domElement);
// TODO figure out good center of rotation
//controls.autoRotate = true;

// lights
const directional = new THREE.DirectionalLight(0xffffff, 5);
directional.position.set(200, 200, 1000);
scene.add(directional);

const ambient = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambient);

function animate() {
  // makes auto rotation possible
  controls.update();

  renderer.render(scene, camera);
  // to see how many render calls happen
  // TODO can we merge geometries?
  //console.log(renderer.info.render.calls);
}

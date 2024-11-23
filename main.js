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
  let lines = text
    .trimEnd()
    .split(/\r\n|\n/)
    .filter((line) => line[0] != "!");

  // pad lines with O's if variable length lines are used
  const width = Math.max.apply(
    Math,
    lines.map((line) => line.length),
  );
  lines = lines.map((line) => line.concat(".".repeat(width - line.length)));

  return from_string(lines.join("\n"));
}

// default pattern
const spider = await from_file("/patterns/spider.cells");

// read in GET parameters
function make_dict(string) {
  let parameters = {};
  let pieces = string.split("&");

  for (let i = 0; i < pieces.length; i++) {
    let pair = pieces[i].split("=");
    parameters[pair[0]] = pair[1];
  }

  return parameters;
}

const string = window.location.search.substr(1);
const parameters = make_dict(string);

// the choices we make: if nothing is set we use a preset, else we load
const game_of_life = !parameters?.["pattern"]
  ? spider
  : await from_file("/patterns/" + parameters["pattern"] + ".cells");
// the number of steps the simulation will run before restarting
const steps = 10000;

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

// run the Game of Life
function simulate(start, steps = 100) {
  let result = [start];
  for (let i = 1; i < steps; i++) result.push(next(result[i - 1]));
  return result;
}

// start with 1 generation
let generations = [game_of_life];

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

const controls = new OrbitControls(camera, renderer.domElement);
// TODO figure out good center of rotation
//controls.autoRotate = true;

const box_material = new THREE.MeshPhongMaterial({
  color: 0xff0000,
  side: THREE.DoubleSide,
});
const line_material = new THREE.LineBasicMaterial({ color: 0x555555 });

// list of the cubes in the visualization, per level
let levels = [];

function draw(grid, generation) {
  let boxes = [];
  let wireframes = [];

  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      // if the value is 0 we don't draw anything
      if (!grid[i][j]) continue;

      let box = new THREE.BoxGeometry(1, 1, 1);

      // we put the center of the grid at the origin
      box.applyMatrix4(
        new THREE.Matrix4().makeTranslation(
          i - grid.length / 2,
          j - grid[i].length / 2,
          generation,
        ),
      );
      boxes.push(box);

      // include a wireframe
      const edges = new THREE.EdgesGeometry(box);
      wireframes.push(edges);
    }
  }

  // merge the boxes per level for performance reasons
  const level = new THREE.Mesh(
    BufferGeometryUtils.mergeGeometries(boxes),
    box_material,
  );
  scene.add(level);

  levels.push(level);

  // merge the wireframes per level for performance reasons
  const wireframe = new THREE.LineSegments(
    BufferGeometryUtils.mergeGeometries(wireframes),
    line_material,
  );
  scene.add(wireframe);
  // TODO make sure wireframes are also hidden when the simulation repeats
}

// level we are looking at
let current = 0;

// update the world
setInterval(function () {
  // if we're done: reset everything and start again
  if (current == steps) {
    levels.map((level) => (level.visible = false));
    current = 0;
  }

  // show or draw next level
  if (levels?.[current]) levels[current].visible = true;
  else {
    // compute the next generation
    generations.push(next(generations[current]));
    // draw it
    draw(generations[current], current);
  }

  // change the camera
  camera.lookAt(0, 0, current - 50);
  camera.position.set(camera.position.x, camera.position.y, 50 + current);

  controls.target.set(0, 0, current - 50);

  // increment the level
  current++;
}, 200);

// TODO figure out a good camera position
camera.position.set(0, -30, 20);

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

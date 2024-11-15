import * as THREE from "three";

// Conway's game of life

// read in a string representation
function from_string(str) {
  const matrix = str.split("\n").map((line) => line.split(""));
  return matrix.map((row) => row.map((i) => parseInt(i)));
}

// toad, from https://conwaylife.com/wiki/Toad
const toad = "000000\n001110\n011100\n000000";

console.log(from_string(toad));

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

// next generation
function next_generation(current) {
  // copy the current generation
  var next = current.slice();

  for (var i = 0; i < next.length; i++) {
    for (var j = 0; j < next[i].length; j++) {
      console.log(i, j);
    }
  }

  return next;
}

const state = next_generation(from_string(toad));
console.log(neighbours(state, 0, 0));
console.log(neighbours(state, 1, 1));
console.log(neighbours(state, 2, 2));

// Three.js

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

function animate() {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  renderer.render(scene, camera);
}

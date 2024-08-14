import "../style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "dat.gui";
import { Submarine } from "./classes/Submarine.js";
import { EnvironmentMap } from "./classes/EnvironmentMap.js";
import { Lights } from "./classes/Lights.js";
import { WaterSurface } from "./classes/Water.js";
import { UnderwaterEffect } from "./classes/underWater/UnderwaterEffect.js";
import { KeyboardControls } from "./classes/KeyboardControls.js";
import { update } from "three/examples/jsm/libs/tween.module.js";
import { SandFloorAndLighting } from "./classes/underWater/SandFloorAndLighting .js";
import { Current } from "./classes/Currents/Currents.js";
import { UnderwaterFishes } from "./classes/Fishes/UnderwaterFishes.js";
import { BigCurrent } from "./classes/Currents/BigCurrents.js";
// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

// GUI
const gui = new dat.GUI({ closed: false });

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(2, 3, 25);
// Adjust camera's near and far planes
camera.near = 0.01;
camera.far = 1000;
camera.updateProjectionMatrix();

scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Create a texture loader
const textureLoader = new THREE.TextureLoader();

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.physicallyCorrectLights = true;
//renderer.outputEncoding = THREE.sRGBEncoding;
//renderer.toneMapping = THREE.ACESFilmicToneMapping;

// Handle Resize
window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
const clock = new THREE.Clock();

// Initialize Classes
const keyboardControls = new KeyboardControls();
const environmentMap = new EnvironmentMap(scene, gui);
const lights = new Lights(scene, gui);
const water = new WaterSurface(scene, new THREE.TextureLoader());
const submarine = new Submarine(
  scene,
  gui,
  environmentMap.updateAllMaterials.bind(environmentMap),
  keyboardControls
);
const underwaterEffect = new UnderwaterEffect(
  scene,
  camera,
  renderer,
  0,
  textureLoader
);
/**
 * Sand Floor and Lighting
 */
const sandFloorAndLighting = new SandFloorAndLighting(scene, gui);
sandFloorAndLighting.setPosition(0, -200, 0);

/*
 *fishes
 */
const underwaterFishes = new UnderwaterFishes(scene);

/**
 * currents
 */
const currents = [];
for (let i = 0; i < 2; i++) {
  currents.push(new Current(scene, gui, clock));
}

const current1 = new BigCurrent(
  scene,
  gui,
  clock,
  new THREE.Vector3(0, -50, 0),
  new THREE.Vector3(0, 0, 1)
);

// Render Loop
const tick = () => {
  let deltaTime = clock.getDelta();
  controls.update();
  underwaterFishes.update(deltaTime);

  //Update and apply currents
  currents.forEach((currents) => {
    currents.update(deltaTime);
    // submarine.update(currents);
  });
  current1.update(deltaTime);
  submarine.update(current1);
  // console.log(Math.random() * -100 -100);
  underwaterEffect.update();
  

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
};

tick();

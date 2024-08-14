import * as THREE from "three";

export class BuoyantForce {
  constructor(volume, waterDensity, gravity) {
    this.volume = volume; // Volume of the displaced water in m^3
    this.waterDensity = waterDensity; // Density of water in kg/m^3
    this.gravity = gravity; // Gravitational acceleration in m/s^2
    this.vector = new THREE.Vector3(0, 1, 0);
    this.force = 0;
  }

  calculate(volume, waterDensity) {
    //console.log(volume);
    this.force = volume * waterDensity * this.gravity;
    this.vector = new THREE.Vector3(0, this.force, 0);
    return this.force; // Buoyant force in Newtons
  }
}

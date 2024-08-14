import * as THREE from "three";

export class TotalForce {
  constructor() {
    this.force = 0;
    this.vector = new THREE.Vector3(0, 0, 0);
  }

  calculate(Weight, Buoyancy, Current_force, Propulsion, Resistance) {
    this.vector = new THREE.Vector3(
      Weight.x + Buoyancy.x + Current_force.x + Propulsion.x + Resistance.x,
      Weight.y + Buoyancy.y + Current_force.y + Propulsion.y + Resistance.y,
      Weight.z + Buoyancy.z + Current_force.z + Propulsion.z + Resistance.z
    );

    return this.vector.length();
  }
}

import * as THREE from "three";

export class ResistanceForce {
  constructor(
    depth,
    density,
    Speed_X,
    Speed_Y,
    Speed_Z,
    surface,
    dragCoefficient = 0.2
  ) {
    this.dragCoefficient = dragCoefficient;
    this.density = density;
    this.Speed_X = Speed_X;
    this.Speed_Y = Speed_Y;
    this.Speed_Z = Speed_Z;
    this.depth = depth;
    this.surface = this.calculateSurface(depth, surface);
    this.vector = new THREE.Vector3(0, 0, 0);
    this.force = 0;
  }

  calculateSurface(depth, surface) {
    // Surfaces on water surface
    if (depth > 7.5) depth = 7.5;
    return 0.5 * surface * (1 + depth / 7.5);

    // var front_back_surface = Math.PI * Math.pow((7.5 + depth) / 2, 2);
    // var side_surface = 170 * (7.5 + depth);

    // let projection_vector = new THREE.Vector3(0, 0, 1);
    // let movement_vector = new THREE.Vector3(Speed_X, Speed_Y, Speed_Z);

    // var angle = submarineDirection.angleTo(movement_vector);
    // angle = Math.floor(((angle * 180) / 22) * 7);

    // if (angle == Math.PI / 2 || angle == -Math.PI / 2) return side_surface;
    // else if (angle == 0 || angle == Math.PI) return front_back_surface;
    // else return side_surface + front_back_surface;
  }

  calculate(Speed_X, Speed_Y, Speed_Z, depth, waterDensity, surface) {
    this.surface = this.calculateSurface(depth, surface);

    let movement_vector = new THREE.Vector3(Speed_X, Speed_Y, Speed_Z);

    this.force =
      0.5 *
      this.dragCoefficient *
      this.surface *
      waterDensity *
      Math.pow(movement_vector.length() * 6.5, 2);

    var ratio = this.force / movement_vector.length();
    this.vector = new THREE.Vector3(
      -ratio * movement_vector.x,
      -ratio * movement_vector.y,
      -ratio * movement_vector.z
    );

    return this.force;
  }
}

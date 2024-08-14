import * as THREE from "three";

export class CurrentForce {
  constructor(waterDensity = 1000, dragCoefficient = 0.2) {
    this.waterDensity = waterDensity; // Density of water in kg/m^3
    this.dragCoefficient = dragCoefficient;
    this.vector = new THREE.Vector3(0, 0, 0);
    this.force = 0;
  }

  calculateSurface(currentDirection, submarineDirection, depth) {
    // Assuming currentDirection and submarineDirection are in radians
    // const angleDifference = Math.abs(currentDirection - submarineDirection);

    // if (angleDifference < Math.PI / 4 || angleDifference > (7 * Math.PI) / 4) {
    //   console.log("state 1");

    //   // Front or back surface
    //   return Math.PI * 7.5 * 7.5; // Circular area (diameter 15m)
    // } else if (
    //   angleDifference > (3 * Math.PI) / 4 &&
    //   angleDifference < (5 * Math.PI) / 4
    // ) {
    //   console.log("state 2");

    //   // Side surface
    //   return 170 * 7.5; // Rectangular area (length 170m, diameter 15m)
    // } else {
    //   console.log("state 3");

    //   // Diagonal surface
    //   return Math.PI * 7.5 * 7.5 + 170 * 7.5; // Combined area
    // }

    var angle = currentDirection.angleTo(submarineDirection);

    // Surfaces on water surface
    if (depth > 7.5) depth = 7.5;

    var front_back_surface = Math.PI * Math.pow(7.5 / 2, 2);
    var side_surface = 170 * 7.5;

    if (angle == Math.PI / 2 || angle == -Math.PI / 2)
      return 0.5 * side_surface * (1 + depth / 7.5);
    else if (angle == 0 || angle == Math.PI)
      return 0.5 * front_back_surface * (1 + depth / 7.5);
    else return 0.5 * (front_back_surface + side_surface) * (1 + depth / 7.5);
  }

  calculateForce(surface, speed) {
    return (
      0.5 *
      this.dragCoefficient *
      this.waterDensity *
      surface *
      Math.pow(speed, 2)
    ); // Current force in Newtons
  }

  calculate(currentDirection, submarineDirection, speed, depth) {
    const surface = this.calculateSurface(
      currentDirection,
      submarineDirection,
      depth
    );

    this.force = this.calculateForce(surface, speed);
    var ratio = this.force / currentDirection.length();
    this.vector = new THREE.Vector3(
      ratio * currentDirection.x,
      ratio * currentDirection.y,
      ratio * currentDirection.z
    );

    return this.force;
  }
}

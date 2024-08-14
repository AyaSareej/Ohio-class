import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Weight } from "../classes/Forces/Weight";
import { BuoyantForce } from "../classes/Forces/BuoyantForce";
import { PressureForce } from "../classes/Forces/PressureForce";
import { ResistanceForce } from "../classes/Forces/ResistanceForce";
import { PropulsionForce } from "../classes/Forces/PropulsionForce";
import { Torque } from "../classes/Forces/Torque";
import { FanParticles } from "./FanParticles";
import { CurrentForce } from "./Forces/CurrentForce";
import { WaterPressure } from "./Forces/WaterPressure";
import { TotalForce } from "./Forces/TotalForce";

export class Submarine extends THREE.Object3D {
  constructor(scene, gui, updateAllMaterials, keyboardControls) {
    super();
    this.submarine = new THREE.Object3D();
    this.scene = scene;
    this.gui = gui;
    this.updateAllMaterials = updateAllMaterials;
    this.keyboardControls = keyboardControls;
    this.gltfLoader = new GLTFLoader();
    this.debugObject = { envMapIntensity: 0.7 };
    this.submarineTime = 0;
    this.clock = new THREE.Clock();
    this.quaternion.setFromEuler(0, 0, 0);
    this.forwardVector = new THREE.Vector3(0, 0, 1);

    // Length 170m , beam 13m, draft 11m, ratio 6.5

    //Physical properties
    this.waterPressure = new WaterPressure();
    this.waterDensity = this.waterPressure.getDensity(0);

    this.submarineDirection = this.getDirection();

    this.surfaceMass = 16700000;
    this.submergedMass = 18700000;
    this.fullMass = 19200000;
    this.surfaceVolume = this.surfaceMass / this.waterDensity;
    this.submergedVolume = this.submergedMass / this.waterDensity;
    this.mass = this.surfaceMass; // Mass of the Ohio-class submarine in kg
    this.volume = this.surfaceVolume; // (mass (m) /density (p)) Approximate volume in m^3
    this.depth = 0;
    this.depthOriginal = 0;

    this.gravity = 9.81;
    this.power = 0;
    this.mainTrimmigTanks = 0; // Max 500 Tons
    this.mainBallastTanks = 0; // Max 2000 Tons
    this.horizontalSurfaceSpace = 1110; // square-meters
    this.horizontalFinSurface = 23.34; // square-meters

    this.anterioposteriorSpeed = 0;

    this.Speed_X = 0;
    this.Speed_Y = 0;
    this.Speed_Z = 0;

    this.Speed0_X = 0;
    this.Speed0_Y = 0;
    this.Speed0_Z = 0;

    this.velocity = 0;
    // this.velocity = new THREE.Vector3(this.Speed_X, this.Speed_Y, this.Speed_Z);

    this.Ftotal_Z = 0; // تعريف خاصية Ftotal_Z
    this.waterDensityValue = 0;
    this.waterPressureValue = 0;

    this.acc_X = 0;
    this.acc_Y = 0;
    this.acc_X = 0;

    this.alpha = 0;
    this.w = 0;
    this.w0 = 0;

    // Forces
    this.weight = new Weight(this.mass, this.gravity);
    this.weightForce = this.weight.calculate(this.mass);
    this.buoyant = new BuoyantForce(
      this.volume,
      this.waterDensity,
      this.gravity
    );
    this.propulsion = new PropulsionForce(this.power, this.waterDensity);
    this.propulsionForce = this.propulsion.calculate(
      this.power,
      this.waterDensity,
      7.5,
      this.depth
    );

    this.totalForce = new TotalForce();

    this.buoyantForce = this.buoyant.calculate(this.volume, this.waterDensity);
    this.netVerticalForce = this.buoyantForce - this.weightForce;

    this.resistance_X = new ResistanceForce(
      this.depth,
      this.waterDensity,
      this.Speed_X,
      0,
      0,
      4003
    );

    this.resistance_Y = new ResistanceForce(
      this.depth,
      this.waterDensity,
      0,
      this.Speed_Y,
      0,
      4003
    );

    this.resistance_Z = new ResistanceForce(
      this.depth,
      this.waterDensity,
      0,
      0,
      this.Speed_Z,
      176
    );

    // Currents
    this.currentForce = new CurrentForce();
    this.dragForce = 0;

    // this.currentSurface = this.currentForce.calculateSurface(
    //   currentForce.getDirection(),
    //   this.submarine.position.z
    // );

    // Rotation
    this.frontDistance = 50.37; // المسافة بين الزعنفة الأمامية ومركز الثقل
    this.backDistance = 76.5; // المسافة بين الزعنفة الخلفية ومركز الثقل

    this.moment_of_inertia = (9 / 20) * this.mass * Math.pow(6, 2);
    this.torque = new Torque();
    this.torqueValue = 0;

    this.submarine = null;
    this.rocketMesh = null;
    this.rocketLaunched = false;

    // this.currentForce = new CurrentForce();

    this.loadModel();
  }

  setupGUI() {
    if (this.submarine) {
      const submarineFolder = this.gui.addFolder("Submarine");
      submarineFolder.add(this, "mass").listen().name("Mass (kg)");
      submarineFolder.add(this, "volume").listen().name("Volume (m³)");
      submarineFolder
        .add(this, "weightForce")
        .listen()
        .name("Weight Force (N)");
      submarineFolder
        .add(this, "buoyantForce")
        .listen()
        .name("Buoyant Force (N)");

      submarineFolder
        .add(this, "depthOriginal")
        .listen()
        .name("Current Depth (m)");

      // Add front stabilizers to GUI
      submarineFolder
        .add(this.frontStabilizers.rotation, "x", -Math.PI, Math.PI)
        .step(0.01)
        .name("Front Stabilizers")
        .listen();

      // Add back stabilizers to GUI
      submarineFolder
        .add(this.backLeftVerticalStabilizer.rotation, "x", -Math.PI, Math.PI)
        .step(0.01)
        .name("Back vertical Stabilizer")
        .listen();
      submarineFolder
        .add(this.backRightVerticalStabilizer.rotation, "x", -Math.PI, Math.PI)
        .step(0.01)
        .name("Back horizontal Stabilizer")
        .listen();

      // Add speed and forces to GUI
      submarineFolder.add(this, "velocity").name("Speed").listen();
      submarineFolder.add(this, "Ftotal_Z").name("Ftotal Z").listen();

      // Add pressure and density to GUI
      submarineFolder
        .add(this, "waterPressureValue")
        .name("Water Pressure")
        .listen();
      submarineFolder
        .add(this, "waterDensityValue")
        .name("Water Density")
        .listen();

      // Add current rotation display
      submarineFolder
        .add(this.submarine.rotation, "x", -Math.PI, Math.PI)
        .step(0.01)
        .name("Submarine Rotation X")
        .listen();
      submarineFolder
        .add(this.submarine.rotation, "y", -Math.PI, Math.PI)
        .step(0.01)
        .name("Submarine Rotation Y")
        .listen();
      submarineFolder
        .add(this.submarine.rotation, "z", -Math.PI, Math.PI)
        .step(0.01)
        .name("Submarine Rotation Z")
        .listen();

      submarineFolder.open();
    }
  }

  /////////////////////////////////////

  calculateForces() {
    // this.weightForce = this.weight.calculate(this.mass);
    // this.buoyantForce = this.buoyant.calculate(this.volume);
    // // this.verticalResistanceForce.speed = this.verticalSpeed;
    // // this.verticalResistanceForceValue =
    // //   this.verticalResistanceForce.calculate();
    // this.netVerticalForce =
    //   this.buoyantForce -
    //   this.weightForce +
    //   this.verticalResistanceForceValue ;
    // this.propulsionForce.power = this.power;
    // this.anterioposteriorResistanceForce.speed = this.anterioposteriorSpeed;
    // // this.propulsionForceValue = this.propulsionForce.calculate();
    // // this.anterioposteriorResistanceForceValue =
    // //   this.anterioposteriorResistanceForce.calculate();
    // this.netAnterioposteriorForce =
    //   // this.propulsionForceValue + this.anterioposteriorResistanceForceValue;
    // console.log(
    //   `Weight Force: ${this.weightForce} N, Buoyant Force: ${this.buoyantForce} N, Pressure Force: ${this.pressureForceValue} N, Net Vertical Force: ${this.netVerticalForce} N, Net Anterio-Posterior Force: ${this.netAnterioposteriorForce} N`
    // );
  }
  //////

  loadModel() {
    this.gltfLoader.load(
      "/static/sub/ohio class SSBN.gltf",
      (gltf) => {
        console.log("Success:", gltf);
        gltf.scene.scale.set(20, 20, 20);
        this.submarine = gltf.scene;
        this.scene.add(gltf.scene);
        this.gui
          .add(gltf.scene.rotation, "y")
          .min(-Math.PI)
          .max(Math.PI)
          .step(0.001)
          .name("rotation");

        this.applyEnvMapIntensity(gltf.scene, this.debugObject.envMapIntensity);
        this.updateAllMaterials();
        this.findAndAnimateMeshes(gltf.scene);
        this.setupGUI();
        // Inside your loadModel function, after loading the submarine model
        this.axesHelper = new THREE.AxesHelper(10); // 10 is the length of the axes lines
        this.submarine.add(this.axesHelper);
      },
      (progress) => {
        console.log("Progress:", progress);
      },
      (error) => {
        console.log("Error:", error);
      }
    );
    this.fanParticles = new FanParticles(this.scene, 0, 0.2, 3, 5, this.clock);
  }

  getDirection() {
    if (!this.submarine) {
      console.error("Submarine is not loaded yet.");
      return null;
    }
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.submarine.quaternion);

    // Normalize the direction vector
    const normalizedDirection = direction.normalize();

    // console.log("Direction:", normalizedDirection.toArray());

    return normalizedDirection;
  }

  distanceToLineSegment(point, lineStart, lineEnd) {
    const line = new THREE.Vector3().subVectors(lineEnd, lineStart);
    const lengthSquared = line.lengthSq();

    // If the line segment is just a point
    if (lengthSquared === 0) return point.distanceTo(lineStart);

    const t =
      new THREE.Vector3().subVectors(point, lineStart).dot(line) /
      lengthSquared;
    const clampedT = Math.max(0, Math.min(1, t));
    const projection = new THREE.Vector3()
      .copy(line)
      .multiplyScalar(clampedT)
      .add(lineStart);

    return point.distanceTo(projection);
  }

  update(current) {
    if (!this.submarine) return;
    let delta = this.clock.getDelta();
    // Calculate the forward vector based on the submarine's current orientation

    this.forwardVector = new THREE.Vector3(0, 0, 1).applyQuaternion(
      this.submarine.quaternion
    );
    this.submarine.rotation.y += 0.0001 * this.Speed_Z;
    console.log(this.forwardVector);

    if (this.keyboardControls.isKeyPressed("ArrowUp")) {
      if (this.power < 26 * Math.pow(10, 6)) this.power += 100000;

      const direction = new THREE.Vector3(0, 0, -2).applyQuaternion(
        this.submarine.quaternion
      );
      this.fanParticles.updateFan(
        this.submarine.position,
        direction,
        this.power
      );
    }
    if (this.keyboardControls.isKeyPressed("ArrowDown")) {
      //this.submarine.translateZ(speed);
      if (this.power > -26 * Math.pow(10, 6)) this.power -= 100000;
      // Move backward in the direction the submarine is facing
      // const backwardMovement = this.forwardVector
      //   .clone()
      //   .multiplyScalar(-this.anterioposteriorSpeed * delta);
      // this.submarine.position.add(backwardMovement);
    }
    if (this.keyboardControls.isKeyPressed("ArrowLeft")) {
      this.backLeftHorizontalStabilizer.rotation.z += 0.01;
      this.backRightHorizontalStabilizer.rotation.z += 0.01;
      this.backBottomHorizontalStabilizer.rotation.z -= 0.01;
      this.backTopHorizontalStabilizer.rotation.z += 0.01;

      const angle = this.backLeftHorizontalStabilizer.rotation.z;
      // this.applyForceAndTorque(
      //   this.backLeftHorizontalStabilizer,
      //   this.backDistance,
      //   angle,
      //   "y"
      // );
      // this.applyForceAndTorque(
      //   this.backRightHorizontalStabilizer,
      //   this.backDistance,
      //   angle,
      //   "y"
      // );
    }
    if (this.keyboardControls.isKeyPressed("ArrowRight")) {
      this.backLeftHorizontalStabilizer.rotation.z -= 0.01;
      this.backRightHorizontalStabilizer.rotation.z -= 0.01;
      this.backBottomHorizontalStabilizer.rotation.z += 0.01;
      this.backTopHorizontalStabilizer.rotation.z -= 0.01;
      const angle = this.backLeftHorizontalStabilizer.rotation.z;
      // this.applyForceAndTorque(
      //   this.backLeftHorizontalStabilizer,
      //   this.backDistance,
      //   angle,
      //   "y"
      // );
      // this.applyForceAndTorque(
      //   this.backRightHorizontalStabilizer,
      //   this.backDistance,
      //   angle,
      //   "y"
      // );
      const backStabilizerTorque1 = this.applyStabilizerTorque(
        this.backLeftHorizontalStabilizer,
        this.backDistance,
        angle
      );
      const backStabilizerTorque2 = this.applyStabilizerTorque(
        this.backRightHorizontalStabilizer,
        this.backDistance,
        angle
      );
      // const backStabilizerTorque3 = this.applyStabilizerTorque(
      //   this.backBottomHorizontalStabilizer,
      //   this.backDistance
      // );
      const backStabilizerTorque4 = this.applyStabilizerTorque(
        this.backTopHorizontalStabilizer,
        this.backDistance,
        angle
      );
      // Combine torques
      let totalTorque =
        backStabilizerTorque1 + backStabilizerTorque2 + backStabilizerTorque4;

      // Update the submarine's rotation using quaternion
      this.updateRotation(totalTorque, delta);
    }
    // Control the stabilizers
    if (this.keyboardControls.isKeyPressed("z")) {
      this.frontStabilizers.rotation.x += 0.01;
      if (this.frontStabilizers.rotation.x > 1.05)
        this.frontStabilizers.rotation.x = 1.05;
      const angle = this.frontStabilizers.rotation.x;
      // this.applyForceAndTorque(
      //   this.frontStabilizers,
      //   this.frontDistance,
      //   angle,
      //   "x"
      // );
      const frontStabilizerTorque = this.applyStabilizerTorque(
        this.frontStabilizers,
        this.frontDistance,
        angle
      );
      console.log(
        "frontStabilizerTorquefrontStabilizerTorquefrontStabilizerTorque" +
          frontStabilizerTorque
      );
      this.updateRotation(frontStabilizerTorque, delta);
    }
    if (this.keyboardControls.isKeyPressed("x")) {
      this.frontStabilizers.rotation.x -= 0.01;
      if (this.frontStabilizers.rotation.x < -1.05)
        this.frontStabilizers.rotation.x = -1.05;
      const angle = this.frontStabilizers.rotation.x;
      const frontStabilizerTorque = this.applyStabilizerTorque(
        this.frontStabilizers,
        this.frontDistance,
        angle
      );
      this.updateRotation(frontStabilizerTorque, delta);
    }
    if (this.keyboardControls.isKeyPressed("c")) {
      this.backLeftVerticalStabilizer.rotation.x += 0.01;
      this.backRightVerticalStabilizer.rotation.x += 0.01;

      if (this.backLeftVerticalStabilizer.rotation.x > 1.05) {
        this.backLeftVerticalStabilizer.rotation.x = 1.05;
        this.backRightVerticalStabilizer.rotation.x = 1.05;
      }
      const angle = this.backRightVerticalStabilizer.rotation.x;
      // this.applyForceAndTorque(
      //   this.backRightVerticalStabilizer,
      //   this.backDistance,
      //   angle,
      //   "y"
      // );
      // this.applyForceAndTorque(
      //   this.backRightVerticalStabilizer,
      //   this.backDistance,
      //   angle,
      //   "y"
      // );
    }
    // Control the back stabilizers
    if (this.keyboardControls.isKeyPressed("v")) {
      this.backLeftVerticalStabilizer.rotation.x -= 0.01;
      this.backRightVerticalStabilizer.rotation.x -= 0.01;
      const angle = this.backLeftVerticalStabilizer.rotation.x;

      // Calculate torque for each back stabilizer
      const leftTorque = this.applyStabilizerTorque(
        this.backLeftVerticalStabilizer,
        this.backDistance,
        angle
      );
      const rightTorque = this.applyStabilizerTorque(
        this.backRightVerticalStabilizer,
        this.backDistance,
        angle
      );

      // Update the submarine's rotation based on the calculated torques
      this.updateRotation(leftTorque, delta); // Pass delta time as needed
      this.updateRotation(rightTorque, delta); // Pass delta time as needed
    }

    ///////////////////////////////////
    // Change mass and update forces based on input
    if (this.keyboardControls.isKeyPressed("w")) {
      if (this.mainBallastTanks > 0) {
        this.mainBallastTanks -= 500;
      }
      if (this.mainBallastTanks < 0) this.mainBallastTanks = 0;
    }

    if (this.keyboardControls.isKeyPressed("v")) {
      this.Speed0_Y = 0;
      this.Speed_Y = 0;
      this.Ftotal_Y = 0;
    }

    if (this.keyboardControls.isKeyPressed("s")) {
      if (this.mainBallastTanks < 2000000) {
        this.mainBallastTanks += 500;
      }
      if (this.mainBallastTanks > 2000000) this.mainBallastTanks = 2000000;
      // 15 tons water / s

      //console.log('net force   '+this.netVerticalForce);
      //console.log('buoy force   '+this.buoyantForce);
      //console.log('weight force   '+this.weightForce);
    }

    if (this.keyboardControls.isKeyPressed("q")) {
      if (this.mainTrimmigTanks > 0) {
        this.mainTrimmigTanks -= 200;
      }
      if (this.mainTrimmigTanks < 0) this.mainTrimmigTanks = 0;
    }

    if (this.keyboardControls.isKeyPressed("a")) {
      if (this.mainTrimmigTanks < 500000) {
        this.mainTrimmigTanks += 200;
      }

      if (this.mainTrimmigTanks > 500000) this.mainTrimmigTanks = 500000;
    }

    const currentStart = current.getStartPosition(); // نقطة البداية
    const currentEnd = current.getEndPosition(); // نقطة النهاية

    // حساب المسافة بين الغواصة والخط
    const distanceToCurrent = this.distanceToLineSegment(
      this.submarine.position,
      currentStart,
      currentEnd
    );

    // تحقق مما إذا كانت الغواصة ضمن نطاق التيار
    // const distanceToCurrent = this.submarine.position.distanceTo(
    //   current.getStartPosition()
    // );
    // console.log("distanceToCurrent " + distanceToCurrent);
    const currentRadius = current.getRadius();
    // console.log("currentRadius " + currentRadius);

    // تحقق مما إذا كانت الغواصة داخل منطقة تأثير التيار
    if (distanceToCurrent <= currentRadius) {
      const currentDirection = current.getDirection(); // الحصول على اتجاه التيار
      const currentSpeed = current.getSpeed(); // الحصول على سرعة التيار

      // حساب تأثير التيار
      this.dragForce = this.currentForce.calculate(
        currentDirection,
        this.submarineDirection,
        currentSpeed,
        this.depth
      );
      // console.log("Current Direction:", currentDirection);
      // console.log("Submarine Direction:", submarineDirection);
      // console.log("Current Speed:", currentSpeed);
      // console.log("dragForce" + this.dragForce);
      // إضافة تأثير التيار إلى القوة الكلية
      // this.Ftotal_Z += dragForce; // أو قم بتعديلها حسب الحاجة
    } else {
      // إذا كانت الغواصة خارج منطقة تأثير التيار، يمكنك ضبط dragForce إلى 0
      this.dragForce = 0;
    }

    // let current_x = current.getDirection().x;

    // let submarine_x = this.getDirection().x;

    /**
     * currents
     */

    // this.dragForce = this.currentForce.calculate(
    //   currentDirection,
    //   this.submarineDirection,
    //   currentSpeed
    // );
    // const dotProduct = currentDirection.dot(this.submarineDirection);
    // const magnitudeCurrent = currentDirection.length();
    // const magnitudeSubmarine = this.submarineDirection.length();
    // const cosTheta = dotProduct / (magnitudeCurrent * magnitudeSubmarine);
    // const angleRadians = Math.acos(cosTheta);
    // const angleDegrees = angleRadians * (180 / Math.PI);

    // const CurrentForceX =
    //   this.dragForce * Math.cos(angleRadians) * Math.sin(angleRadians);
    // const CurrentForceY = this.dragForce * Math.sin(angleRadians);
    // const CurrentForceZ = this.dragForce * Math.cos(angleRadians);
    /*
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     * */

    // 22km/h surface       46km/h submerged    depth: 250 m
    // Identifying the new properties;

    this.submarineDirection = this.getDirection();

    this.depth = -6.5 * this.submarine.position.y;

    this.mass =
      this.surfaceMass + this.mainBallastTanks + this.mainTrimmigTanks;

    if (this.depth >= 8) this.volume = this.submergedVolume;
    else {
      var volume_difference = this.submergedVolume - this.surfaceVolume;
      this.volume =
        (-volume_difference / (8 * 8)) * this.depth * this.depth +
        ((2 * volume_difference) / 8) * this.depth +
        this.surfaceVolume;
    }

    this.waterDensity = this.waterPressure.getDensity(this.depth);
    /*
     *
     *
     *
     *
     *
     */

    // Vector of Projection
    let projection_vector = new THREE.Vector3(0, 0, 1);
    /*
     *
     *
     *
     *
     *
     */

    // Calculating forces

    // Weight and buoyant
    var weightForce = this.weight.calculate(this.mass);
    var buoyantForce = this.buoyant.calculate(this.volume, this.waterDensity);
    /*
     *
     */

    // Propulsion (Fan's diameter = 6.4)
    var propulsionForce = this.propulsion.calculate(
      this.power,
      this.waterDensity,
      3.2,
      this.depth,
      this.submarineDirection.x,
      this.submarineDirection.y,
      this.submarineDirection.z,
      this.scene
    );

    /*
     *
     */

    // Currents
    var currentDirection = current.getDirection();
    var currentSpeed = current.getSpeed();
    var currentForce_Total = this.currentForce.calculate(
      currentDirection,
      this.submarineDirection,
      currentSpeed,
      this.depth
    );
    /*
     *
     */

    // Resistance
    var resistanceForce_X = this.resistance_X.calculate(
      this.Speed0_X,
      0,
      0,
      this.depth,
      this.waterDensity,
      4003 // Area of the total side surface
    );
    /*
     *
     */

    var resistanceForce_Y = this.resistance_Y.calculate(
      0,
      this.Speed0_Y,
      0,
      this.depth,
      this.waterDensity,
      4003 // Area of the total lower surface
    );
    /*
     *
     */

    var resistanceForce_Z = this.resistance_Z.calculate(
      0,
      0,
      this.Speed0_Z,
      this.depth,
      this.waterDensity,
      176 // Area of the total face/back surface
    );
    /*
     *
     *
     *
     *
     *
     */

    // Projection of forces on the submarine's axes

    // X axis

    projection_vector = new THREE.Vector3(1, 0, 0);

    var weightForce_X = 0;

    var buoyantForce_X = 0;

    var currentForce_X = 0;
    if (currentForce_Total != 0)
      currentForce_X =
        currentForce_Total *
        Math.cos(currentDirection.angleTo(projection_vector));

    var propulsionForce_X = 0;
    if (this.power != 0)
      propulsionForce_X =
        propulsionForce *
        Math.cos(this.propulsion.vector.angleTo(projection_vector));

    if (this.Speed0_X != 0)
      resistanceForce_X =
        resistanceForce_X *
        Math.cos(this.resistance_X.vector.angleTo(projection_vector));

    this.Ftotal_X =
      weightForce_X +
      buoyantForce_X +
      currentForce_X +
      propulsionForce_X +
      resistanceForce_X;
    /*
     *
     *
     */

    // Y axis
    projection_vector = new THREE.Vector3(0, 1, 0);

    var weightForce_Y =
      weightForce * Math.cos(this.weight.vector.angleTo(projection_vector));

    var buoyantForce_Y =
      buoyantForce * Math.cos(this.buoyant.vector.angleTo(projection_vector));

    var currentForce_Y = 0;
    if (currentForce_Total != 0)
      currentForce_Y =
        currentForce_Total *
        Math.cos(currentDirection.angleTo(projection_vector));

    var propulsionForce_Y = 0;
    if (this.power != 0)
      propulsionForce_Y =
        propulsionForce *
        Math.cos(this.propulsion.vector.angleTo(projection_vector));

    if (this.Speed0_Y != 0)
      resistanceForce_Y =
        resistanceForce_Y *
        Math.cos(this.resistance_Y.vector.angleTo(projection_vector));

    this.Ftotal_Y =
      weightForce_Y +
      buoyantForce_Y +
      currentForce_Y +
      propulsionForce_Y +
      resistanceForce_Y;
    /*
     *
     *
     */

    // Z axis
    projection_vector = new THREE.Vector3(0, 0, 1);

    var weightForce_Z = 0;

    var buoyantForce_Z = 0;

    var currentForce_Z = 0;
    if (currentForce_Total != 0)
      currentForce_Z =
        currentForce_Total *
        Math.cos(currentDirection.angleTo(projection_vector));

    var propulsionForce_Z = 0;
    if (this.power != 0)
      propulsionForce_Z =
        propulsionForce *
        Math.cos(this.propulsion.vector.angleTo(projection_vector));

    if (this.Speed0_Z != 0)
      resistanceForce_Z =
        resistanceForce_Z *
        Math.cos(this.resistance_Z.vector.angleTo(projection_vector));

    this.Ftotal_Z =
      weightForce_Z +
      buoyantForce_Z +
      currentForce_Z +
      propulsionForce_Z +
      resistanceForce_Z;
    /*
     *
     *
     *
     *
     *
     *
     */

    let Total_resistance_vector = new THREE.Vector3(
      resistanceForce_X,
      resistanceForce_Y,
      resistanceForce_Z
    );

    var totalForce = this.totalForce.calculate(
      this.weight.vector,
      this.buoyant.vector,
      this.currentForce.vector,
      this.propulsion.vector,
      Total_resistance_vector
    );

    this.acc_Y = this.totalForce.vector.y / this.mass;
    this.Speed_Y = this.acc_Y * delta + this.Speed0_Y;
    this.submarine.position.y +=
      0.5 * this.acc_Y * delta * delta + this.Speed0_Y * delta;
    this.Speed0_Y = this.Speed_Y;

    this.acc_X = this.Ftotal_X / this.mass;
    this.Speed_X = this.acc_X * delta + this.Speed0_X;
    this.submarine.position.x +=
      0.5 * this.acc_X * delta * delta + this.Speed0_X * delta;
    this.Speed0_X = this.Speed_X;

    this.acc_Z = this.Ftotal_Z / this.mass;
    this.Speed_Z = this.acc_Z * delta + this.Speed0_Z;
    // this.submarine.position.z +=
    //   0.5 * this.acc_Z * delta * delta + this.Speed0_Z * delta;
    this.Speed0_Z = this.Speed_Z;

    this.submarine.position.add(
      this.forwardVector
        .clone()
        .multiplyScalar(
          0.5 * this.acc_Z * delta * delta + this.Speed0_Z * delta
        )
    );

    // this.submarine.position.add(
    //   new THREE.Vector3(
    //     0,
    //     0,
    //     0.01
    //   )
    // );

    // const forwardMovement = this.forwardVector
    //   .clone()
    //   .multiplyScalar(0.5 * this.acc_Z * delta * delta + this.Speed0_Z * delta);
    // this.submarine.position.add(forwardMovement);

    // console.log("res   " + resistanceForce_Z / 1000);
    // console.log("wei      " + this.weightForce / 1000);
    // console.log("Total      " + this.Ftotal_Z / 1000);

    //Finish F

    // // Rotational Movement
    // this.torqueValue = this.torque.calculateTorque(
    //   this.torque.calculateForce(this.anterioposteriorSpeed),
    //   this.frontDistance,
    //   this.frontStabilizers.rotation.x
    // );

    //this.submarine.rotation.x +=
    this.alpha = (0.0001 * this.torqueValue) / this.moment_of_inertia;
    this.w = this.alpha * delta + this.w0;
    this.w0 = this.w;
    this.submarine.rotation.x +=
      0.5 * this.alpha * delta * delta + this.w0 * delta;

    // Clamp the submarine's position to keep it within visible bounds
    //this.submarine.position.y = THREE.MathUtils.clamp(this.submarine.position.y, -10, 10);

    if (this.keyboardControls.isKeyPressed(".")) {
      // console.log("byu     " + buoyantForce_Z / 1000);
      // console.log("weight     " + weightForce_Z / 1000);
      // console.log("prop     " + propulsionForce_Z / 1000);
      // console.log("resis    " + resistanceForce_Z / 1000);
      // console.log("curr    " + currentForce_Z / 1000);
      // console.log("Total    " + this.Ftotal_Z / 1000);
      // console.log("speed    " + this.Speed_Z * 6.5);
    }

    // Rocket launch
    if (
      this.rocketMesh &&
      !this.rocketLaunched &&
      this.keyboardControls.isKeyPressed("r")
    ) {
      this.rocketLaunched = true;
      this.launchRocket();
    }

    // Get the water pressure and density at the current depth
    this.depthOriginal = -this.submarine.position.y; // Depth is positive downwards
    const { pressure, density } = this.waterPressure.getPressureAndDensity(
      this.depthOriginal
    );

    // Update the GUI with the pressure and density values
    this.waterPressureValue = pressure;
    this.waterDensityValue = density;
    this.calculateForces();
  }
  //!ddddddddddddddddddddddddd
  applyStabilizerTorque(stabilizer, distance, angle) {
    //const angle = stabilizer.rotation.y;
    const velocity = 22;
    //this.velocity;
    //  new THREE.Vector3(
    //   this.Speed_X,
    //   this.Speed_Y,
    //   this.Speed_Z
    // );

    const force = this.torque.calculateForce(velocity);
    const torque = this.torque.calculateTorque(force, distance, angle);

    // Debugging logs
    // console.log("Angle:", angle);
    // console.log("Velocity:", velocity);
    // console.log("Force:", force);
    // console.log("Torque:", torque);

    return torque;
  }

  updateRotation(torque, delta) {
    const angularAcceleration = torque / this.moment_of_inertia; // α = τ / I
    this.w += angularAcceleration * delta; // Update angular velocity

    // Create a delta rotation quaternion
    const deltaRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0), // Axis of rotation (X-axis)
      this.w * delta // Angle in radians
    );

    // Update the current quaternion
    this.quaternion.multiplyQuaternions(deltaRotation, this.quaternion); // Update quaternion
    this.submarine.quaternion.copy(this.quaternion); // Apply quaternion to submarine

    // Print the current quaternion of the submarine
    console.log("Submarine Quaternion Rotation:", this.submarine.quaternion);
  }

  // applyForceAndTorque(stabilizer, distance, angle, axis) {
  //   const velocity = this.anterioposteriorSpeed; // استخدام السرعة الأمامية كسرعة للماء بالنسبة للزعانف
  //   const force = this.torque.calculateForce(velocity);
  //   const torque = this.torque.calculateTorque(force, distance, angle);

  //   //this.submarine.rotation.x += (0.00001 * torque) / moment_of_inertia;
  // }

  findAndAnimateMeshes(gltfScene) {
    const fanMesh = this.findMeshByName(gltfScene, "turbine");
    this.rocketMesh = this.findMeshByName(gltfScene, "trident_missile"); // Assign to this.rocketMesh
    const launchSlotCoverMesh = this.findMeshByName(
      gltfScene,
      "main_silo_cover"
    );
    this.frontStabilizers = this.findMeshByName(gltfScene, "front_stabilizers");
    // Find and set the back horizontal stabilizers
    this.backLeftHorizontalStabilizer = this.findMeshByName(
      gltfScene,
      "pCube248"
    );
    this.backRightHorizontalStabilizer = this.findMeshByName(
      gltfScene,
      "pCube249"
    );
    this.backTopHorizontalStabilizer = this.findMeshByName(
      gltfScene,
      "pCube240"
    );
    this.backBottomHorizontalStabilizer = this.findMeshByName(
      gltfScene,
      "pCube246"
    );

    // Find and set the back vertical stabilizers
    this.backLeftVerticalStabilizer = this.findMeshByName(
      gltfScene,
      "pCube242"
    );
    this.backRightVerticalStabilizer = this.findMeshByName(
      gltfScene,
      "pCube245"
    );

    if (fanMesh) {
      this.animateFan(fanMesh);
    }

    if (this.rocketMesh) {
      this.animateRocket(this.rocketMesh);
    }

    if (launchSlotCoverMesh) {
      this.animateLaunchSlotCover(launchSlotCoverMesh);
    }
  }

  findMeshByName(node, name) {
    if (node.name.includes(name)) {
      return node;
    }

    for (const child of node.children) {
      const mesh = this.findMeshByName(child, name);
      if (mesh) {
        return mesh;
      }
    }

    return null;
  }

  animateFan(fanMesh) {
    const animate = () => {
      requestAnimationFrame(animate);
      fanMesh.rotation.z += (this.power / (26 * Math.pow(10, 6))) * 0.3;
    };
    animate();
  }

  // animateLaunchSlotCover(launchSlotCoverMesh) {
  //   const animate = () => {
  //     requestAnimationFrame(animate);

  //   };
  //   animate();
  // }

  animateLaunchSlotCover(launchSlotCoverMesh) {
    const animate = () => {
      requestAnimationFrame(animate);

      // If the rocket is launched, open the cover, otherwise keep it closed
      if (this.rocketLaunched) {
        if (launchSlotCoverMesh.rotation.y < Math.PI / 2) {
          launchSlotCoverMesh.rotation.y += 0.1; // Move cover upwards
        }
      } else {
        if (launchSlotCoverMesh.rotation.y > 0) {
          launchSlotCoverMesh.rotation.y -= 0.01; // Move cover downwards
        }
      }
    };
    animate();
  }

  applyEnvMapIntensity(scene, intensity) {
    scene.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial
      ) {
        child.material.envMapIntensity = intensity;
        child.material.needsUpdate = true;
      }
    });
  }
  // animateRocket(rocketMesh) {
  //     const clock = new THREE.Clock();
  //     const animate = () => {
  //         requestAnimationFrame(animate);
  //         const time = clock.getElapsedTime();
  //         if (time <= 1) {
  //             rocketMesh.position.z = -Math.sin(time);
  //         } else {
  //             rocketMesh.position.z += -0.004 * time * time;
  //         }
  //     };
  //     animate();
  // }
  animateRocket(rocketMesh) {
    this.rocketLaunched = false;
    this.rocketMesh = rocketMesh;
    this.rocketMesh.position.z = 0.9;
  }
  launchRocket() {
    this.rocketMesh.position.z -= 0.05;
    //this.rocketMesh.rotation.x -= 0.01;

    // const time = clock.getElapsedTime();
    // if (time <= 1) {
    //     rocketMesh.position.z = -Math.sin(time);
    // } else {
    //     rocketMesh.position.z += -0.004 * time * time;
    // }

    // Check if the rocket has gone above a certain height
    if (this.rocketMesh.position.y > 50) {
      this.rocketLaunched = false;
      // Do any additional logic or cleanup here
    } else {
      requestAnimationFrame(this.launchRocket.bind(this));
    }
  }
}


import { Injectable, ElementRef } from '@angular/core';
import * as THREE from 'three';

export interface SceneStatus {
  shot: string;
  angle: string;
  view: string;
}

@Injectable({ providedIn: 'root' })
export class ThreeDSceneService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  private mannequin!: THREE.Group;

  public initializeScene(container: HTMLElement): void {
    if (!container) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111827); // bg-gray-900

    const width = container.clientWidth;
    const height = 300;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x606060, 3);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    this.scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x4b5563, 0x374151); // gray-600, gray-700
    this.scene.add(gridHelper);
    
    // Mannequin
    const materialSkin = new THREE.MeshLambertMaterial({ color: 0xd1d5db }); // gray-300
    const materialBody = new THREE.MeshLambertMaterial({ color: 0x4f46e5 }); // indigo-600

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 32), materialSkin);
    head.position.y = 1.6;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.4), materialBody);
    body.position.y = 0.8;

    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.2), materialSkin);
    nose.position.set(0, 1.6, 0.35);

    this.mannequin = new THREE.Group();
    this.mannequin.add(head, body, nose);
    this.scene.add(this.mannequin);

    this.animate();

    const resizeObserver = new ResizeObserver(() => this.onWindowResize(container));
    resizeObserver.observe(container);
  }

  private onWindowResize(container: HTMLElement): void {
    if (!this.camera || !this.renderer) return;
    const width = container.clientWidth;
    const height = 300;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    if(!this.renderer) return;
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  public updateCameraPosition(distance: number, height: number, orbit: number): SceneStatus {
    if(!this.camera) return { shot: '', angle: '', view: ''};
    const x = Math.sin(orbit) * distance;
    const z = Math.cos(orbit) * distance;
    const y = 1.2 + height;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 1.2, 0);

    let shotType = "Medium Shot";
    if (distance < 2) shotType = "Extreme Close-Up";
    else if (distance < 3.5) shotType = "Close-Up";
    else if (distance < 6) shotType = "Medium Shot";
    else if (distance < 9) shotType = "Wide Shot";
    else shotType = "Extreme Wide Shot";

    let angle = "Eye Level";
    if (height > 3) angle = "Overhead View";
    else if (height > 1.2) angle = "High Angle";
    else if (height < -0.5 && height > -2) angle = "Low Angle";
    else if (height <= -2) angle = "Worm's Eye View";

    let view = "Front View";
    const orbAbs = Math.abs(orbit);
    if (orbAbs < 0.5) view = "Front View";
    else if (orbAbs < 2.0) view = "Side Profile";
    else if (orbAbs < 2.8) view = "Rear 3/4 View";
    else view = "Back View";
    
    return { shot: shotType, angle: angle, view: view };
  }
}

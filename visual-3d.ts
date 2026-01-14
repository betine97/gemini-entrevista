
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {Analyser} from './analyser';

import * as THREE from 'this-package-three'; 
import * as THREE_RAW from 'three';
const THREE_NS = THREE_RAW;

import {EXRLoader} from 'three/addons/loaders/EXRLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {fs as backdropFS, vs as backdropVS} from './backdrop-shader';
import {vs as sphereVS} from './sphere-shader';

@customElement('gdm-live-audio-visuals-3d')
export class GdmLiveAudioVisuals3D extends LitElement {
  private inputAnalyser!: Analyser;
  private outputAnalyser!: Analyser;
  private camera!: THREE_RAW.PerspectiveCamera;
  private backdrop!: THREE_RAW.Mesh;
  private composer!: EffectComposer;
  private sphere!: THREE_RAW.Mesh;
  private pointLight!: THREE_RAW.PointLight;
  private prevTime = 0;
  private rotation = new THREE_NS.Vector3(0, 0, 0);

  private _outputNode!: AudioNode;

  @property()
  set outputNode(node: AudioNode) {
    this._outputNode = node;
    this.outputAnalyser = new Analyser(this._outputNode);
  }

  get outputNode() {
    return this._outputNode;
  }

  private _inputNode!: AudioNode;

  @property()
  set inputNode(node: AudioNode) {
    this._inputNode = node;
    this.inputAnalyser = new Analyser(this._inputNode);
  }

  get inputNode() {
    return this._inputNode;
  }

  @property()
  responseQuality: 'neutral' | 'good' | 'bad' = 'neutral';

  @property()
  isSpeaking: boolean = true;

  @property()
  isMultiMode: boolean = false;

  private canvas!: HTMLCanvasElement;

  static styles = css`
    :host { display: block; width: 100%; height: 100%; position: absolute; inset: 0; }
    canvas { width: 100% !important; height: 100% !important; display: block; }
  `;

  private init() {
    const scene = new THREE_NS.Scene();
    const backdrop = new THREE_NS.Mesh(
      new THREE_NS.IcosahedronGeometry(10, 5),
      new THREE_NS.RawShaderMaterial({
        uniforms: { resolution: {value: new THREE_NS.Vector2(1, 1)}, rand: {value: 0} },
        vertexShader: backdropVS, fragmentShader: backdropFS, glslVersion: THREE_NS.GLSL3,
      }),
    );
    backdrop.material.side = THREE_NS.BackSide;
    scene.add(backdrop);
    this.backdrop = backdrop;

    const camera = new THREE_NS.PerspectiveCamera(45, (this as any).clientWidth / (this as any).clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
    this.camera = camera;

    const renderer = new THREE_NS.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    renderer.setSize((this as any).clientWidth, (this as any).clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const pointLight = new THREE_NS.PointLight(0x3b82f6, 2, 10);
    pointLight.position.set(2, 2, 2);
    scene.add(pointLight);
    this.pointLight = pointLight;

    const geometry = new THREE_NS.IcosahedronGeometry(0.46, 64); 
    const sphereMaterial = new THREE_NS.MeshStandardMaterial({
      color: 0x050505, metalness: 1.0, roughness: 0.1, emissive: 0x3b82f6, emissiveIntensity: 0.5,
    });

    sphereMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.time = {value: 0};
      shader.uniforms.inputData = {value: new THREE_NS.Vector4()};
      shader.uniforms.outputData = {value: new THREE_NS.Vector4()};
      sphereMaterial.userData.shader = shader;
      shader.vertexShader = sphereVS;
    };

    this.sphere = new THREE_NS.Mesh(geometry, sphereMaterial);
    scene.add(this.sphere);

    new EXRLoader().load('piz_compressed.exr', (texture: THREE_RAW.Texture) => {
      texture.mapping = THREE_NS.EquirectangularReflectionMapping;
      const pmrem = new THREE_NS.PMREMGenerator(renderer);
      sphereMaterial.envMap = pmrem.fromEquirectangular(texture).texture;
    });

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE_NS.Vector2((this as any).clientWidth, (this as any).clientHeight), 1.2, 0.4, 0.1));
    this.composer = composer;

    const resize = () => {
      const w = (this as any).clientWidth, h = (this as any).clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h); composer.setSize(w, h);
      backdrop.material.uniforms.resolution.value.set(w, h);
    };
    window.addEventListener('resize', resize);
    resize();
    this.animation();
  }

  private animation() {
    if (!(this as any).isConnected) return;
    requestAnimationFrame(() => this.animation());
    if (this.inputAnalyser) this.inputAnalyser.update();
    if (this.outputAnalyser) this.outputAnalyser.update();

    const t = performance.now();
    const dt = (t - this.prevTime) / (1000 / 60);
    this.prevTime = t;
    
    const backdropMaterial = this.backdrop.material as THREE_RAW.RawShaderMaterial;
    const sphereMaterial = this.sphere.material as THREE_RAW.MeshStandardMaterial;
    backdropMaterial.uniforms.rand.value = Math.random() * 10000;

    if (sphereMaterial.userData.shader && this.outputAnalyser && this.inputAnalyser) {
      const outputVal = this.outputAnalyser.data[1] / 255;
      const inputVal = this.inputAnalyser.data[1] / 255;

      // No modo multi, apenas a esfera que está falando reage ao áudio
      const shouldReact = this.isMultiMode ? this.isSpeaking : true;
      const effectiveOutputVal = shouldReact ? outputVal : 0;

      // VOZ DA IA: Efeito reduzido em 50% para ser mais discreto
      const scale = 1 + (0.15 * effectiveOutputVal) + (0.15 * inputVal);
      this.sphere.scale.setScalar(scale);

      this.rotation.y += dt * 0.005 * (1 + effectiveOutputVal * 5);
      this.rotation.x += dt * 0.002;
      this.sphere.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);

      sphereMaterial.userData.shader.uniforms.time.value += dt * 0.05;
      sphereMaterial.userData.shader.uniforms.inputData.value.set(inputVal, 0.2, 8, 0);
      sphereMaterial.userData.shader.uniforms.outputData.value.set(effectiveOutputVal * 1.2, 0.2, 8, 0);
      
      sphereMaterial.emissiveIntensity = 0.2 + (effectiveOutputVal * 1.25) + (inputVal * 2.5);
      this.pointLight.intensity = 1 + effectiveOutputVal * 2 + inputVal * 5;
      
      // Cor baseada em quem está falando (sem mudança por qualidade)
      if (inputVal > 0.01) {
        // Usuário está falando - sempre roxo
        sphereMaterial.emissive.setHex(0xa855f7); // Roxo
        this.pointLight.color.setHex(0xa855f7);
      } else if (effectiveOutputVal > 0.01) {
        // IA está falando - azul
        sphereMaterial.emissive.setHex(0x3b82f6); // Azul
        this.pointLight.color.setHex(0x3b82f6);
      } else {
        // Silêncio - azul escuro
        sphereMaterial.emissive.setHex(0x1e3a8a); // Azul escuro
        this.pointLight.color.setHex(0x3b82f6);
      }
    }
    this.composer.render();
  }

  protected firstUpdated() {
    this.canvas = (this as any).shadowRoot!.querySelector('canvas');
    this.init();
  }

  protected render() { return html`<canvas></canvas>`; }
}

/**
 * Phantom Shield X - Scene Manager
 */
import * as THREE from 'three';
import { blurVS, blurFS, compositeFS } from './bloom.js';

export class SceneManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.lights = {};
        
        // Post-processing
        this.renderTargets = {};
        this.postScenes = {};
        this.postMaterials = {};
        this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.quadGeo = new THREE.PlaneGeometry(2, 2);
        this.pixelRatioCap = window.innerWidth < 768 ? 1 : 1.1;
        this.renderScale = window.innerWidth < 768 ? 0.72 : 0.82;
        this.blurScale = window.innerWidth < 768 ? 0.3 : 0.42;
        this.frameCount = 0;
        this.shadowUpdateInterval = 4;

        this.init();
    }

    init() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatioCap));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.autoUpdate = false;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.45;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x020406, 0.032);
        
        this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0.5, 2.2, 9.5);
        this.camera.lookAt(0, 1.6, 0);

        this.initPostProcessing();
        this.initLights();

        this.handleResize = () => this.onResize();
        window.addEventListener('resize', this.handleResize);
    }

    initLights() {
        this.lights.ambient = new THREE.AmbientLight(0x14324a, 0.8);
        this.scene.add(this.lights.ambient);

        this.lights.hemi = new THREE.HemisphereLight(0x66d9ff, 0x020406, 1.2);
        this.scene.add(this.lights.hemi);

        const key = new THREE.SpotLight(0xc8f6ff, 24);
        key.position.set(4.5, 8.5, 8);
        key.angle = 0.42;
        key.penumbra = 0.85;
        key.decay = 1.4;
        key.distance = 40;
        key.castShadow = true;
        key.shadow.bias = -0.0001;
        key.shadow.mapSize.set(1024, 1024);
        key.target.position.set(0, 2, 0);
        this.scene.add(key);
        this.scene.add(key.target);
        this.lights.key = key;

        this.lights.rim1 = new THREE.DirectionalLight(0x00c8ff, 2.1);
        this.lights.rim1.position.set(-7, 4.5, -5);
        this.scene.add(this.lights.rim1);

        this.lights.rim2 = new THREE.DirectionalLight(0xb044ff, 1.6);
        this.lights.rim2.position.set(6, 3.2, -3.5);
        this.scene.add(this.lights.rim2);

        this.lights.fill = new THREE.DirectionalLight(0x8fe7ff, 1.3);
        this.lights.fill.position.set(-2, 1.5, 7);
        this.scene.add(this.lights.fill);

        this.lights.eye = new THREE.PointLight(0xff2244, 2.2, 8);
        this.lights.eye.position.set(0, 2.3, 2.2);
        this.scene.add(this.lights.eye);

        this.lights.core = new THREE.PointLight(0x00ffe7, 2.8, 10);
        this.lights.core.position.set(0.3, 0.9, 2);
        this.scene.add(this.lights.core);

        this.lights.burst = new THREE.PointLight(0xff4400, 0.8, 14);
        this.lights.burst.position.set(0, 1.2, 2.6);
        this.scene.add(this.lights.burst);
    }

    initPostProcessing() {
        const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
        const w = Math.max(1, Math.round(window.innerWidth * this.renderScale));
        const h = Math.max(1, Math.round(window.innerHeight * this.renderScale));
        const blurW = Math.max(1, Math.round(w * this.blurScale));
        const blurH = Math.max(1, Math.round(h * this.blurScale));

        this.renderTargets.main = new THREE.WebGLRenderTarget(w, h, rtOpts);
        this.renderTargets.blurH = new THREE.WebGLRenderTarget(blurW, blurH, rtOpts);
        this.renderTargets.blurV = new THREE.WebGLRenderTarget(blurW, blurH, rtOpts);

        this.postMaterials.blurH = new THREE.ShaderMaterial({
            uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(blurW, blurH) }, direction: { value: new THREE.Vector2(1, 0) } },
            vertexShader: blurVS,
            fragmentShader: blurFS
        });

        this.postMaterials.blurV = new THREE.ShaderMaterial({
            uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(blurW, blurH) }, direction: { value: new THREE.Vector2(0, 1) } },
            vertexShader: blurVS,
            fragmentShader: blurFS
        });

        this.postMaterials.composite = new THREE.ShaderMaterial({
            uniforms: { tBase: { value: null }, tBloom: { value: null }, bloomStr: { value: 0.4 }, time: { value: 0 } },
            vertexShader: blurVS,
            fragmentShader: compositeFS
        });

        this.postScenes.blurH = new THREE.Scene();
        this.postScenes.blurH.add(new THREE.Mesh(this.quadGeo, this.postMaterials.blurH));

        this.postScenes.blurV = new THREE.Scene();
        this.postScenes.blurV.add(new THREE.Mesh(this.quadGeo, this.postMaterials.blurV));

        this.postScenes.composite = new THREE.Scene();
        this.postScenes.composite.add(new THREE.Mesh(this.quadGeo, this.postMaterials.composite));
    }

    onResize() {
        const w = Math.max(1, Math.round(window.innerWidth * this.renderScale));
        const h = Math.max(1, Math.round(window.innerHeight * this.renderScale));
        const blurW = Math.max(1, Math.round(w * this.blurScale));
        const blurH = Math.max(1, Math.round(h * this.blurScale));
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.pixelRatioCap));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderTargets.main.setSize(w, h);
        this.renderTargets.blurH.setSize(blurW, blurH);
        this.renderTargets.blurV.setSize(blurW, blurH);
        this.postMaterials.blurH.uniforms.res.value.set(blurW, blurH);
        this.postMaterials.blurV.uniforms.res.value.set(blurW, blurH);
    }

    render(time, bloomIntensity) {
        this.frameCount += 1;
        this.renderer.shadowMap.needsUpdate = this.frameCount % this.shadowUpdateInterval === 0;
        this.renderer.setRenderTarget(this.renderTargets.main);
        this.renderer.render(this.scene, this.camera);
        this.postMaterials.blurH.uniforms.tDiffuse.value = this.renderTargets.main.texture;
        this.renderer.setRenderTarget(this.renderTargets.blurH);
        this.renderer.render(this.postScenes.blurH, this.orthoCamera);
        this.postMaterials.blurV.uniforms.tDiffuse.value = this.renderTargets.blurH.texture;
        this.renderer.setRenderTarget(this.renderTargets.blurV);
        this.renderer.render(this.postScenes.blurV, this.orthoCamera);
        this.renderer.setRenderTarget(null);
        this.postMaterials.composite.uniforms.tBase.value = this.renderTargets.main.texture;
        this.postMaterials.composite.uniforms.tBloom.value = this.renderTargets.blurV.texture;
        this.postMaterials.composite.uniforms.bloomStr.value = bloomIntensity;
        this.postMaterials.composite.uniforms.time.value = time;
        this.renderer.render(this.postScenes.composite, this.orthoCamera);
    }

    dispose() {
        window.removeEventListener('resize', this.handleResize);
        this.renderer.dispose();
        this.renderTargets.main.dispose();
        this.renderTargets.blurH.dispose();
        this.renderTargets.blurV.dispose();
        this.quadGeo.dispose();
        this.postMaterials.blurH.dispose();
        this.postMaterials.blurV.dispose();
        this.postMaterials.composite.dispose();
    }
}

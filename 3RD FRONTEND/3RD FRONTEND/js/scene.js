/**
 * Phantom Shield X - Scene Manager
 */
import * as THREE from 'three';
import { blurVS, blurFS, compositeFS } from '../shaders/bloom.js';

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

        this.init();
    }

    init() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.45;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x020406, 0.032);
        
        this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 2, 9);
        this.camera.lookAt(0, 1.5, 0);

        this.initPostProcessing();
        this.initLights();

        window.addEventListener('resize', () => this.onResize());
    }

    initLights() {
        this.lights.ambient = new THREE.AmbientLight(0x020b1a, 0.3);
        this.scene.add(this.lights.ambient);

        this.lights.hemi = new THREE.HemisphereLight(0x001528, 0x000000, 0.65);
        this.scene.add(this.lights.hemi);

        const key = new THREE.SpotLight(0x6699ff, 0);
        key.position.set(1.5, 8, 5);
        key.angle = 0.33;
        key.penumbra = 0.6;
        key.decay = 1.8;
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        this.scene.add(key);
        this.lights.key = key;

        this.lights.rim1 = new THREE.DirectionalLight(0x0044cc, 0.75);
        this.lights.rim1.position.set(-4, 3, -3);
        this.scene.add(this.lights.rim1);

        this.lights.rim2 = new THREE.DirectionalLight(0x5500aa, 0.55);
        this.lights.rim2.position.set(4, 2, -2);
        this.scene.add(this.lights.rim2);

        this.lights.fill = new THREE.DirectionalLight(0x001188, 0.3);
        this.lights.fill.position.set(0, -1, 5);
        this.scene.add(this.lights.fill);

        this.lights.eye = new THREE.PointLight(0xff2244, 0, 5);
        this.lights.eye.position.set(0, 1.8, 1.5);
        this.scene.add(this.lights.eye);

        this.lights.core = new THREE.PointLight(0x00ffe7, 0, 3.5);
        this.lights.core.position.set(0.3, 0.5, 1.5);
        this.scene.add(this.lights.core);

        this.lights.burst = new THREE.PointLight(0xff4400, 0, 12);
        this.lights.burst.position.set(0, 1, 2);
        this.scene.add(this.lights.burst);
    }

    initPostProcessing() {
        const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.renderTargets.main = new THREE.WebGLRenderTarget(w, h, rtOpts);
        this.renderTargets.blurH = new THREE.WebGLRenderTarget(w / 2, h / 2, rtOpts);
        this.renderTargets.blurV = new THREE.WebGLRenderTarget(w / 2, h / 2, rtOpts);

        this.postMaterials.blurH = new THREE.ShaderMaterial({
            uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(w / 2, h / 2) }, direction: { value: new THREE.Vector2(1, 0) } },
            vertexShader: blurVS,
            fragmentShader: blurFS
        });

        this.postMaterials.blurV = new THREE.ShaderMaterial({
            uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(w / 2, h / 2) }, direction: { value: new THREE.Vector2(0, 1) } },
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
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.renderTargets.main.setSize(w, h);
        this.renderTargets.blurH.setSize(w / 2, h / 2);
        this.renderTargets.blurV.setSize(w / 2, h / 2);
        this.postMaterials.blurH.uniforms.res.value.set(w / 2, h / 2);
        this.postMaterials.blurV.uniforms.res.value.set(w / 2, h / 2);
    }

    render(time, bloomIntensity) {
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
        this.renderer.dispose();
        this.renderTargets.main.dispose();
        this.renderTargets.blurH.dispose();
        this.renderTargets.blurV.dispose();
    }
}

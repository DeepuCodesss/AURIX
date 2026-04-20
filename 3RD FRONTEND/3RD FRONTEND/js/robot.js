/**
 * Phantom Shield X - Robot Manager (Next Gen)
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export class RobotManager {
    constructor(scene) {
        this.scene = scene;
        this.root = new THREE.Group();
        this.scene.add(this.root);

        this.model = null;
        this.mixer = null;
        this.animations = {};

        // Tracking bones
        this.bones = {
            head: null,
            neck: null,
            spine: null
        };

        // Procedural parts for fallback
        this.proceduralRoot = new THREE.Group();
        this.headGroup = null;
        this.isGLBLoaded = false;

        // Target tracking
        this.targetPos = new THREE.Vector3();

        // Emissive materials
        this.emissiveMats = [];

        // Holographic Rings
        this.rings = [];
        for (let i = 0; i < 3; i++) {
            const geo = new THREE.TorusGeometry(1.8 + i * 0.4, 0.015, 8, 64);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x00c8ff,
                transparent: true,
                opacity: 0.15,
                wireframe: true,
                blending: THREE.AdditiveBlending
            });
            const ring = new THREE.Mesh(geo, mat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.5 + i * 0.6;
            this.root.add(ring);
            this.rings.push({ mesh: ring, speed: (Math.random() - 0.5) * 0.08, baseY: ring.position.y });
        }
    }

    async load() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');

        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        try {
            const gltf = await Promise.race([
                this.loadModel(loader, 'models/robot.glb'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Model timeout')), 6000))
            ]);

            this.model = gltf.scene;
            this.model.scale.setScalar(2.2); // Slightly larger for "Next Level" impact
            this.model.position.y = -2.2;
            this.root.add(this.model);

            this.findBones();

            this.mixer = new THREE.AnimationMixer(this.model);
            gltf.animations.forEach(clip => {
                this.animations[clip.name.toLowerCase()] = this.mixer.clipAction(clip);
            });

            this.model.traverse(n => {
                if (n.isMesh && n.material && n.material.emissiveIntensity !== undefined) {
                    this.emissiveMats.push(n.material);
                }
            });

            if (this.animations['idle']) this.animations['idle'].play();
            else if (gltf.animations[0]) this.mixer.clipAction(gltf.animations[0]).play();

            this.isGLBLoaded = true;
            console.log('Robot GLB Loaded & Bones Mapped');
        } catch (error) {
            console.warn('Robot GLB fallback triggered:', error);
            this.initProceduralFallback();
        }
    }

    findBones() {
        this.model.traverse(n => {
            if (n.isBone) {
                const name = n.name.toLowerCase();
                if (name.includes('head')) this.bones.head = n;
                if (name.includes('neck')) this.bones.neck = n;
                if (name.includes('spine') && !this.bones.spine) this.bones.spine = n;
            }
        });
    }

    loadModel(loader, path) {
        return new Promise((resolve, reject) => {
            loader.load(path, resolve, undefined, (err) => reject(err));
        });
    }

    initProceduralFallback() {
        const matArmor = new THREE.MeshStandardMaterial({ color: 0x081525, metalness: .95, roughness: .12 });
        const matAccent = new THREE.MeshStandardMaterial({ color: 0x00c8ff, metalness: .85, roughness: .1, emissive: 0x00c8ff, emissiveIntensity: .2 });
        const matEye = new THREE.MeshStandardMaterial({ color: 0xff2244, emissive: 0xff2244, emissiveIntensity: .8 });

        const box = (w, h, d, m) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.castShadow = true; return me; };

        this.proceduralRoot = new THREE.Group();
        const torso = box(1.8, 2.2, 1, matArmor); this.proceduralRoot.add(torso);

        this.headGroup = new THREE.Group(); this.headGroup.position.set(0, 1.4, 0);
        this.headGroup.add(box(1.1, 1, .9, matArmor));
        const eyeL = box(.2, .12, .1, matEye); eyeL.position.set(-.25, .15, .46); this.headGroup.add(eyeL);
        const eyeR = box(.2, .12, .1, matEye); eyeR.position.set(.25, .15, .46); this.headGroup.add(eyeR);
        this.proceduralRoot.add(this.headGroup);

        this.root.add(this.proceduralRoot);
        this.root.position.set(0.4, -0.6, 0);
        this.root.scale.setScalar(0.95);
    }

    update(dt, time, scrollProgress, mouse) {
        if (this.mixer) this.mixer.update(dt);

        // Calculate unified target based on mouse
        // Assume mouse is -1 to 1. We map it to world space roughly.
        this.targetPos.set(mouse.x * 5, mouse.y * 3 + 1, 5);

        if (this.isGLBLoaded) {
            this.updateGLB(dt, time, scrollProgress, mouse);
        } else {
            this.updateProcedural(time, scrollProgress, mouse);
        }

        // Global float
        this.root.position.y += Math.sin(time * 0.8) * 0.0008;
    }

    updateProcedural(time, scrollProgress, mouse) {
        this.root.rotation.y += (mouse.x * 0.3 - this.root.rotation.y) * 0.05;
        this.headGroup.rotation.y += (mouse.x * 0.4 - this.headGroup.rotation.y) * 0.08;
        this.headGroup.rotation.x += (-mouse.y * 0.25 - this.headGroup.rotation.x) * 0.08;
    }

    updateGLB(dt, time, scrollProgress, mouse) {
        // Alignment adjustments per section
        const sectionX = scrollProgress < 0.2 ? 1.2 : (scrollProgress > 0.8 ? 0 : 0.8 * (1 - scrollProgress));
        this.root.position.x += (sectionX - this.root.position.x) * 0.05;

        // Enhance Emissivity based on movement
        const speedIntensity = scrollProgress > 0.1 && scrollProgress < 0.85 ? scrollProgress * 3.0 : 0.0;
        this.emissiveMats.forEach(mat => {
            mat.emissiveIntensity = 1.0 + speedIntensity + Math.sin(time * 5.0) * 0.5;
        });

        // Update holographic rings
        this.rings.forEach((r, idx) => {
            r.mesh.rotation.z += r.speed;
            r.mesh.scale.setScalar(1 + Math.sin(time * 2 + idx) * 0.05);
            r.mesh.position.y = r.baseY + Math.sin(time * 3 + r.speed * 100) * 0.1;
            // Pulsing opacity
            r.mesh.material.opacity = 0.1 + (0.15 * speedIntensity) + (Math.sin(time * 4) * 0.05);
            if (scrollProgress > 0.85) r.mesh.material.opacity *= 0.5;
        });

        // BONE TRACKING DISABLED FOR STABILITY
        /*
        if (this.bones.head) {
            // Smooth lookAt for head
            const headTarget = new THREE.Vector3().copy(this.targetPos);
            this.bones.head.lookAt(headTarget);
            this.bones.head.rotation.y += Math.PI; // Correct for model orientation if needed
            this.bones.head.rotation.x *= 0.5; // Limit vertical turn
        }

        if (this.bones.neck) {
            const neckTarget = new THREE.Vector3().copy(this.targetPos).multiplyScalar(0.5);
            this.bones.neck.lookAt(neckTarget);
            this.bones.neck.rotation.y += Math.PI;
        }
        */

        // Animation Switching Logic
        if (scrollProgress > 0.85) {
            this.transitionTo('dance');
        } else if (scrollProgress > 0.1) {
            this.transitionTo('walking');
            if (this.animations['walking']) this.animations['walking'].setEffectiveTimeScale(1 + scrollProgress);
        } else {
            this.transitionTo('idle');
        }
    }

    transitionTo(name) {
        const action = this.animations[name];
        if (!action || action.isRunning()) return;

        // Crossfade for premium feel
        for (let k in this.animations) {
            if (k !== name) this.animations[k].fadeOut(0.5);
        }
        action.reset().fadeIn(0.5).play();
    }
}

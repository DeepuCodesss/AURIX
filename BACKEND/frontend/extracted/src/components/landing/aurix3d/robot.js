/**
 * Phantom Shield X - Robot Manager (Next Gen)
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { lerp } from './utils.js';

export class RobotManager {
    constructor(scene, lights = null, camera = null) {
        this.scene = scene;
        this.lights = lights;
        this.camera = camera;
        this.root = new THREE.Group();
        this.scene.add(this.root);

        this.model = null;
        this.boundingBox = new THREE.Box3();
        this.boundingCenter = new THREE.Vector3();
        this.boundingSize = new THREE.Vector3();
        this.baseRootPosition = new THREE.Vector3();
        this.mixer = null;
        this.animations = {};
        this.activeAnimation = '';
        this.animationTargets = {
            hero: 'idle',
            run: 'running',
            final: 'thumbsup'
        };

        // Tracking bones
        this.bones = {
            head: null,
            neck: null,
            spine: null,
            body: null
        };

        // Procedural parts for fallback
        this.proceduralRoot = new THREE.Group();
        this.headGroup = null;
        this.isGLBLoaded = false;

        // Target tracking
        this.targetPos = new THREE.Vector3();
        this.eyeWorldPosition = new THREE.Vector3();
        this.coreWorldPosition = new THREE.Vector3();
        this.eyeTarget = new THREE.Vector3();
        this.coreTarget = new THREE.Vector3();
        this.viewerTarget = new THREE.Vector3();
        this.localLookTarget = new THREE.Vector3();
        this.headWorldPosition = new THREE.Vector3();
        this.cameraVector = new THREE.Vector3();
        this.eyeSurfaceCenter = new THREE.Vector3();
        this.eyeLateral = new THREE.Vector3();
        this.eyeVertical = new THREE.Vector3();
        this.eyeFocusOffset = new THREE.Vector3();
        this.poseQuaternion = new THREE.Quaternion();
        this.lookOffsetQuaternion = new THREE.Quaternion();
        this.lookEuler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.worldUp = new THREE.Vector3(0, 1, 0);
        this.lookState = {
            neckYaw: 0,
            neckPitch: 0,
            headYaw: 0,
            headPitch: 0
        };
        this.eyeMarkers = [];
        this.eyeDots = [];

        // Emissive materials
        this.emissiveMats = [];

        // Light anchors
        this.eyeAnchor = new THREE.Object3D();
        this.coreAnchor = new THREE.Object3D();

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

        this.initEyeMarkers();
    }

    initEyeMarkers() {
        return;
        for (let i = 0; i < 2; i++) {
            const group = new THREE.Group();

            const glow = new THREE.Mesh(
                new THREE.SphereGeometry(0.14, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: 0x00f6ff,
                    transparent: true,
                    opacity: 0.28,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    depthTest: false
                })
            );

            const core = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: 0xc9ffff,
                    depthTest: false
                })
            );

            group.add(glow);
            group.add(core);
            group.visible = false;
            group.renderOrder = 999;
            glow.renderOrder = 999;
            core.renderOrder = 1000;
            this.scene.add(group);
            this.eyeMarkers.push({ group, glow, core });
        }
    }

    async load() {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');

        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        try {
            const gltf = await Promise.race([
                this.loadModel(loader, `${import.meta.env.BASE_URL}models/robot.glb`),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Model timeout')), 6000))
            ]);

            this.model = gltf.scene;
            this.prepareModel();
            this.root.add(this.model);

            this.findBones();

            this.mixer = new THREE.AnimationMixer(this.model);
            gltf.animations.forEach(clip => {
                const sanitizedClip = this.sanitizeClip(clip);
                this.animations[clip.name.toLowerCase()] = this.mixer.clipAction(sanitizedClip);
            });

            this.collectMaterialsAndShadows();

            if (this.animations['idle']) {
                this.animations['idle'].play();
                this.activeAnimation = 'idle';
            } else if (gltf.animations[0]) {
                const fallbackName = gltf.animations[0].name.toLowerCase();
                this.animations[fallbackName]?.play();
                this.activeAnimation = fallbackName;
            }

            this.isGLBLoaded = true;
            console.log('Robot GLB Loaded & Bones Mapped');
        } catch (error) {
            console.warn('Robot GLB fallback triggered:', error);
            this.initProceduralFallback();
        }
    }

    findBones() {
        let exactHead = null;
        let exactNeck = null;
        let exactBody = null;
        let firstSpine = null;

        this.model.traverse((node) => {
            if (!node.isBone) return;

            const name = node.name.toLowerCase();
            if (name.endsWith('_end') || name.endsWith('end')) return;

            if (name === 'head' && !exactHead) exactHead = node;
            if (name === 'neck' && !exactNeck) exactNeck = node;
            if (name === 'body' && !exactBody) exactBody = node;
            if (name.includes('spine') && !firstSpine) firstSpine = node;
        });

        this.bones.head = exactHead;
        this.bones.neck = exactNeck;
        this.bones.body = exactBody;
        this.bones.spine = firstSpine;

        this.attachEyeDots();

        if (this.bones.head) {
            this.eyeAnchor.position.set(0, 0.12, 0.78);
            this.bones.head.add(this.eyeAnchor);
        } else {
            this.eyeAnchor.position.set(0, 2.35, 1.35);
            this.root.add(this.eyeAnchor);
        }

        if (this.bones.body) {
            this.coreAnchor.position.set(0, 0.45, 0.62);
            this.bones.body.add(this.coreAnchor);
        } else if (this.bones.spine) {
            this.coreAnchor.position.set(0, 0.2, 0.4);
            this.bones.spine.add(this.coreAnchor);
        } else {
            this.coreAnchor.position.set(0, 1.1, 0.8);
            this.root.add(this.coreAnchor);
        }
    }

    attachEyeDots() {
        this.eyeDots.forEach((eye) => {
            eye.removeFromParent();
            eye.geometry.dispose();
            eye.material.dispose();
        });
        this.eyeDots = [];

        if (!this.bones.head) return;

        const makeEye = (x) => {
            const eye = new THREE.Mesh(
                new THREE.CircleGeometry(0.12, 32),
                new THREE.MeshBasicMaterial({
                    color: 0x00f6ff,
                    side: THREE.DoubleSide,
                    transparent: true,
                    opacity: 0.9,
                    blending: THREE.AdditiveBlending
                })
            );

            // Z moved forward to 0.92 so eyes are not stuffed inside the head
            eye.position.set(x, 0.045, 0.92);
            eye.renderOrder = 30;
            this.bones.head.add(eye);
            this.eyeDots.push(eye);
        };

        makeEye(-0.19);
        makeEye(0.19);
    }

    loadModel(loader, path) {
        return new Promise((resolve, reject) => {
            loader.load(path, resolve, undefined, (err) => reject(err));
        });
    }

    sanitizeClip(clip) {
        const clipName = clip.name.toLowerCase();
        const allowedTracks = clip.tracks.filter((track) => {
            const trackName = track.name.toLowerCase();

            if (trackName.startsWith('body.position')) return false;
            if (trackName.startsWith('body.quaternion')) return false;
            if (clipName === 'idle' && trackName.startsWith('head.quaternion')) return false;
            if (trackName.startsWith('footl.position')) return false;
            if (trackName.startsWith('head.position')) return false;
            if (trackName.startsWith('shoulderl.position')) return false;
            if (trackName.startsWith('shoulderr.position')) return false;

            return true;
        });

        const sanitized = new THREE.AnimationClip(clip.name, clip.duration, allowedTracks, clip.blendMode);
        sanitized.resetDuration();
        sanitized.optimize();
        return sanitized;
    }

    prepareModel() {
        this.boundingBox.setFromObject(this.model);
        this.boundingBox.getCenter(this.boundingCenter);
        this.boundingBox.getSize(this.boundingSize);

        const largestDimension = Math.max(this.boundingSize.x, this.boundingSize.y, this.boundingSize.z) || 1;
        const targetHeight = 8.2;
        const scale = targetHeight / largestDimension;

        this.model.scale.setScalar(scale);

        this.boundingBox.setFromObject(this.model);
        this.boundingBox.getCenter(this.boundingCenter);

        this.model.position.x -= this.boundingCenter.x;
        this.model.position.z -= this.boundingCenter.z;
        this.model.position.y -= this.boundingBox.min.y + 2.4;
        this.model.rotation.y = -0.3;

        this.root.position.set(1.7, -0.8, 0);
        this.root.rotation.y = 0.03;
        this.baseRootPosition.copy(this.root.position);
    }

    collectMaterialsAndShadows() {
        const seenMaterials = new Set();

        this.model.traverse((node) => {
            if (!node.isMesh) return;

            node.castShadow = true;
            node.receiveShadow = true;
            node.frustumCulled = false;

            const materials = Array.isArray(node.material) ? node.material : [node.material];

            materials.forEach((material) => {
                if (!material || seenMaterials.has(material)) return;
                seenMaterials.add(material);

                if ('envMapIntensity' in material) material.envMapIntensity = 1.8;
                if ('metalness' in material) material.metalness = Math.min(material.metalness ?? 0.6, 0.85);
                if ('roughness' in material) material.roughness = Math.max(material.roughness ?? 0.45, 0.28);

                if ('color' in material && material.color) {
                    material.color.multiplyScalar(1.18);
                }

                if ('emissiveIntensity' in material) {
                    material.emissiveIntensity = Math.max(material.emissiveIntensity ?? 0, 0.35);
                    this.emissiveMats.push(material);
                }
            });
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
        this.baseRootPosition.copy(this.root.position);
    }

    update(dt, time, scrollProgress, mouse, scrollMotion = 0) {
        if (this.mixer) this.mixer.update(dt);

        // Calculate unified target based on mouse
        // Assume mouse is -1 to 1. We map it to world space roughly.
        this.targetPos.set(mouse.x * 5, mouse.y * 3 + 1, 5);

        if (this.isGLBLoaded) {
            this.updateGLB(dt, time, scrollProgress, mouse, scrollMotion);
        } else {
            this.updateProcedural(dt, time, scrollProgress, mouse);
        }

        // Global float
        this.root.position.y = this.baseRootPosition.y + Math.sin(time * 0.8) * 0.08;
    }

    updateProcedural(dt, time, scrollProgress, mouse) {
        this.root.rotation.y = THREE.MathUtils.damp(this.root.rotation.y, mouse.x * 0.3, 5, dt);
        this.headGroup.rotation.y = THREE.MathUtils.damp(this.headGroup.rotation.y, mouse.x * 0.4, 6, dt);
        this.headGroup.rotation.x = THREE.MathUtils.damp(this.headGroup.rotation.x, -mouse.y * 0.25, 6, dt);
    }

    updateGLB(dt, time, scrollProgress, mouse, scrollMotion) {
        // Alignment adjustments per section
        const sectionX = scrollProgress < 0.2 ? 1.7 : (scrollProgress > 0.8 ? 0.25 : 1.15 * (1 - scrollProgress));
        let sectionYaw = -0.26;

        if (scrollProgress >= 0.2 && scrollProgress < 0.8) {
            const middleBlend = (scrollProgress - 0.2) / 0.6;
            sectionYaw = lerp(-0.24, -0.1, middleBlend);
        } else if (scrollProgress >= 0.8) {
            sectionYaw = lerp(-0.1, -0.02, Math.min((scrollProgress - 0.8) / 0.2, 1));
        }

        this.baseRootPosition.x = THREE.MathUtils.damp(this.baseRootPosition.x, sectionX, 4.5, dt);
        this.root.position.x = this.baseRootPosition.x;
        this.root.rotation.y = THREE.MathUtils.damp(this.root.rotation.y, sectionYaw + mouse.x * 0.04, 5.5, dt);
        // Keep the imported hero pose stable.
        // Driving these bones toward absolute zero overrides the GLB bind pose
        // and makes the robot "turn away" a moment after loading.

        // Enhance Emissivity based on movement
        const speedIntensity = scrollProgress > 0.1 && scrollProgress < 0.85 ? scrollProgress * 2.4 : 0.25;
        this.emissiveMats.forEach(mat => {
            mat.emissiveIntensity = 0.45 + speedIntensity + Math.sin(time * 5.0) * 0.2;
        });

        // Update holographic rings
        this.rings.forEach((r, idx) => {
            r.mesh.rotation.z += r.speed * dt * 60;
            r.mesh.scale.setScalar(1 + Math.sin(time * 2 + idx) * 0.05);
            r.mesh.position.y = r.baseY + Math.sin(time * 3 + r.speed * 100) * 0.1;
            // Pulsing opacity
            r.mesh.material.opacity = 0.1 + (0.15 * speedIntensity) + (Math.sin(time * 4) * 0.05);
            if (scrollProgress > 0.85) r.mesh.material.opacity *= 0.5;
        });

        this.updateViewerTracking(dt, mouse, scrollProgress);

        this.updateAnimationState(scrollProgress, scrollMotion);
        this.updateAttachedLights(dt, time, mouse);
    }

    updateViewerTracking(dt, mouse, scrollProgress) {
        this.viewerTarget.set(
            0.25 + mouse.x * 1.6,
            1.95 - mouse.y * 0.85 + scrollProgress * 0.15,
            10.5
        );

        if (this.bones.neck) {
            const neckLook = this.resolveLookAngles(this.bones.neck, 0.32, 0.18, -0.24);
            this.lookState.neckYaw = THREE.MathUtils.damp(this.lookState.neckYaw, neckLook.yaw, 6.5, dt);
            this.lookState.neckPitch = THREE.MathUtils.damp(this.lookState.neckPitch, neckLook.pitch, 6.5, dt);
            this.applyLookOffset(this.bones.neck, this.lookState.neckYaw, this.lookState.neckPitch);
        }

        if (this.bones.head) {
            const headLook = this.resolveLookAngles(this.bones.head, 0.4, 0.22, -0.42);
            this.lookState.headYaw = THREE.MathUtils.damp(this.lookState.headYaw, headLook.yaw, 7.5, dt);
            this.lookState.headPitch = THREE.MathUtils.damp(this.lookState.headPitch, headLook.pitch, 7.5, dt);
            this.applyLookOffset(this.bones.head, this.lookState.headYaw, this.lookState.headPitch);
        }
    }

    resolveLookAngles(bone, maxYaw, maxPitch, yawBias = 0) {
        this.localLookTarget.copy(this.viewerTarget);
        bone.worldToLocal(this.localLookTarget);

        const forward = Math.max(0.001, this.localLookTarget.z);
        const yaw = THREE.MathUtils.clamp(Math.atan2(this.localLookTarget.x, forward) + yawBias, -maxYaw, maxYaw);
        const pitch = THREE.MathUtils.clamp(-Math.atan2(this.localLookTarget.y, forward), -maxPitch, maxPitch);

        return { yaw, pitch };
    }

    applyLookOffset(bone, yaw, pitch) {
        this.poseQuaternion.copy(bone.quaternion);
        this.lookEuler.set(pitch, yaw, 0, 'YXZ');
        this.lookOffsetQuaternion.setFromEuler(this.lookEuler);
        bone.quaternion.copy(this.poseQuaternion.multiply(this.lookOffsetQuaternion));
    }

    updateAttachedLights(dt, time, mouse) {
        if (!this.lights?.eye || !this.lights?.core) return;

        this.eyeAnchor.getWorldPosition(this.eyeWorldPosition);
        this.coreAnchor.getWorldPosition(this.coreWorldPosition);

        this.eyeTarget.copy(this.eyeWorldPosition);
        this.coreTarget.copy(this.coreWorldPosition);

        this.lights.eye.position.lerp(this.eyeTarget, 1 - Math.exp(-dt * 16));
        this.lights.core.position.lerp(this.coreTarget, 1 - Math.exp(-dt * 14));
        this.updateEyeMarkers(dt, time, mouse);
    }

    updateEyeMarkers(dt, time, mouse) {
        return;
        if (!this.camera || !this.bones.head || this.eyeMarkers.length < 2) return;

        this.bones.head.getWorldPosition(this.headWorldPosition);
        this.cameraVector.copy(this.camera.position).sub(this.headWorldPosition).normalize();

        this.eyeSurfaceCenter
            .copy(this.headWorldPosition)
            .addScaledVector(this.cameraVector, 1.18)
            .addScaledVector(this.worldUp, 0.18);

        this.eyeLateral.crossVectors(this.cameraVector, this.worldUp);
        if (this.eyeLateral.lengthSq() < 0.0001) {
            this.eyeLateral.set(1, 0, 0);
        }
        this.eyeLateral.normalize();

        this.eyeVertical.crossVectors(this.eyeLateral, this.cameraVector).normalize();
        this.eyeFocusOffset
            .copy(this.eyeLateral)
            .multiplyScalar((mouse?.x || 0) * 0.03)
            .addScaledVector(this.eyeVertical, (mouse?.y || 0) * -0.02);

        const pulse = 1 + Math.sin(time * 5.5) * 0.08;
        const eyeSpread = 0.24;
        const eyeLift = 0.07;
        const targets = [
            this.eyeSurfaceCenter.clone()
                .addScaledVector(this.eyeLateral, -eyeSpread)
                .addScaledVector(this.eyeVertical, eyeLift)
                .add(this.eyeFocusOffset),
            this.eyeSurfaceCenter.clone()
                .addScaledVector(this.eyeLateral, eyeSpread)
                .addScaledVector(this.eyeVertical, eyeLift)
                .add(this.eyeFocusOffset)
        ];

        targets.forEach((targetPos, index) => {
            const marker = this.eyeMarkers[index];
            marker.group.visible = true;
            marker.group.position.lerp(targetPos, 1 - Math.exp(-dt * 20));
            marker.group.scale.setScalar(pulse);
            marker.glow.material.opacity = 0.24 + Math.sin(time * 8 + index) * 0.05;
        });
    }

    updateAnimationState(scrollProgress, scrollMotion = 0) {
        let nextAnimation = this.animationTargets.hero;

        if (scrollProgress > 0.82) nextAnimation = this.animationTargets.final;
        else if (scrollProgress > 0.06) nextAnimation = this.animationTargets.run;

        this.transitionTo(nextAnimation);

        const runningAction = this.animations[this.animationTargets.run];
        if (runningAction && this.activeAnimation === this.animationTargets.run) {
            runningAction.setEffectiveTimeScale(0.95 + scrollMotion * 1.6);
        }
    }

    transitionTo(name) {
        const action = this.animations[name];
        if (!action || this.activeAnimation === name) return;

        // Crossfade for premium feel
        for (let k in this.animations) {
            if (k !== name) this.animations[k].fadeOut(0.5);
        }
        action.reset().setEffectiveTimeScale(1).fadeIn(0.5).play();
        this.activeAnimation = name;
    }

    dispose() {
        this.root.removeFromParent();
        this.eyeDots.forEach((eye) => {
            eye.geometry.dispose();
            eye.material.dispose();
        });
        this.eyeMarkers.forEach(({ group, glow, core }) => {
            group.removeFromParent();
            glow.geometry.dispose();
            glow.material.dispose();
            core.geometry.dispose();
            core.material.dispose();
        });
        this.rings.forEach((ring) => {
            ring.mesh.geometry.dispose();
            ring.mesh.material.dispose();
        });
    }
}

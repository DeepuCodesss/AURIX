import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { RobotManager } from './robot.js';
import { ParticleSystem } from './particles.js';
import { AudioEngine } from './audio.js';
import { InteractionManager } from './scroll.js';
import { lerp } from './utils.js';

export class AurixLandingExperience {
    constructor({ onEnter } = {}) {
        this.onEnter = onEnter;
        this.root = document.querySelector('.landing-scope');
        this.scene = null;
        this.robot = null;
        this.particles = null;
        this.audio = null;
        this.interaction = null;

        this.mouse = { x: 0, y: 0 };
        this.time = 0;
        this.lastTime = 0;
        this.frameId = null;
        this.intervals = [];
        this.cleanups = [];
        this.cameraTargetPos = new THREE.Vector3(0.5, 2.2, 9.5);
        this.cameraLookTarget = new THREE.Vector3(0, 1.6, 0);
        this.desiredCameraPos = new THREE.Vector3();
        this.desiredLookTarget = new THREE.Vector3();

        this.cursor = { cx: -100, cy: -100, rx: -100, ry: -100 };

        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleFirstInteraction = this.handleFirstInteraction.bind(this);
        this.handleEnterApp = this.handleEnterApp.bind(this);
        this.handleAudioToggle = this.handleAudioToggle.bind(this);
        this.animate = this.animate.bind(this);

        this.init().catch((error) => {
            console.error('AURIX landing failed to initialize:', error);
            document.getElementById('loader')?.classList.add('hidden');
        });
    }

    async init() {
        if (!this.root) return;

        this.scene = new SceneManager('canvas3d');
        this.robot = new RobotManager(this.scene.scene, this.scene.lights, this.scene.camera);
        this.particles = new ParticleSystem('particles');
        this.audio = new AudioEngine();
        this.interaction = new InteractionManager(this.scene, this.robot, this.audio, this.root);

        await this.robot.load();

        this.setupEventListeners();
        this.initHUD();
        this.start();
    }

    setupEventListeners() {
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('click', this.handleFirstInteraction);

        this.cleanups.push(() => document.removeEventListener('mousemove', this.handleMouseMove));
        this.cleanups.push(() => document.removeEventListener('click', this.handleFirstInteraction));

        const interactiveElements = this.root.querySelectorAll('a, button, .stat-card, .cta-btn');
        interactiveElements.forEach((element) => {
            const activate = () => document.getElementById('cursor-ring')?.classList.add('active');
            const deactivate = () => document.getElementById('cursor-ring')?.classList.remove('active');

            element.addEventListener('mouseenter', activate);
            element.addEventListener('mouseleave', deactivate);

            this.cleanups.push(() => element.removeEventListener('mouseenter', activate));
            this.cleanups.push(() => element.removeEventListener('mouseleave', deactivate));
        });

        const enterButtons = this.root.querySelectorAll('[data-enter-app]');
        enterButtons.forEach((button) => {
            button.addEventListener('click', this.handleEnterApp);
            this.cleanups.push(() => button.removeEventListener('click', this.handleEnterApp));
        });

        const audioButton = document.getElementById('audio-btn');
        if (audioButton) {
            audioButton.addEventListener('click', this.handleAudioToggle);
            this.cleanups.push(() => audioButton.removeEventListener('click', this.handleAudioToggle));
        }
    }

    handleMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth - 0.5) * 2;
        this.mouse.y = (event.clientY / window.innerHeight - 0.5) * 2;

        this.cursor.cx = event.clientX;
        this.cursor.cy = event.clientY;

        const dot = document.getElementById('cursor-dot');
        if (dot) {
            dot.style.left = `${this.cursor.cx}px`;
            dot.style.top = `${this.cursor.cy}px`;
        }
    }

    handleFirstInteraction() {
        if (this.audio?.ctx?.state === 'suspended') {
            this.audio.ctx.resume();
        }

        document.removeEventListener('click', this.handleFirstInteraction);
    }

    handleEnterApp(event) {
        event.preventDefault();
        this.onEnter?.();
    }

    handleAudioToggle() {
        const isOn = this.audio.toggle();
        const aw1 = document.getElementById('aw1');
        const aw2 = document.getElementById('aw2');

        if (aw1) aw1.style.opacity = isOn ? '1' : '0.3';
        if (aw2) aw2.style.opacity = isOn ? '1' : '0.3';
    }

    initHUD() {
        const uptimeStart = Date.now();
        const uptimeInterval = window.setInterval(() => {
            const el = document.getElementById('uptime-val');
            if (!el) return;

            const seconds = Math.floor((Date.now() - uptimeStart) / 1000);
            const formatted = [
                Math.floor(seconds / 3600),
                Math.floor((seconds % 3600) / 60),
                seconds % 60,
            ].map((value) => String(value).padStart(2, '0')).join(':');

            el.textContent = formatted;
        }, 1000);

        let threatCount = 0;
        const threatInterval = window.setInterval(() => {
            if (Math.random() < 0.35) threatCount += 1;
            const el = document.getElementById('threat-count');
            if (el) el.textContent = `${threatCount} intercepted`;
        }, 800);

        this.intervals.push(uptimeInterval, threatInterval);
    }

    start() {
        document.getElementById('loader')?.classList.add('hidden');
        this.animate(0);
    }

    animate(now) {
        const rawDt = this.lastTime ? (now - this.lastTime) / 1000 : 1 / 60;
        const dt = Math.min(Math.max(rawDt, 1 / 120), 1 / 24);
        this.lastTime = now;
        this.time += dt;
        this.interaction?.tick(dt);

        this.cursor.rx = THREE.MathUtils.damp(this.cursor.rx, this.cursor.cx, 12, dt);
        this.cursor.ry = THREE.MathUtils.damp(this.cursor.ry, this.cursor.cy, 12, dt);

        const ring = document.getElementById('cursor-ring');
        if (ring) {
            ring.style.left = `${this.cursor.rx}px`;
            ring.style.top = `${this.cursor.ry}px`;
        }

        this.robot?.update(
            dt,
            this.time,
            this.interaction?.scrollProgress || 0,
            this.mouse,
            this.interaction?.scrollMotion || 0
        );
        this.particles?.update(dt);
        this.updateCamera(dt);

        const bloomIntensity = 0.35 + ((this.interaction?.scrollProgress || 0) * 0.6);
        this.scene?.render(this.time, bloomIntensity);
        this.particles?.draw();

        this.frameId = requestAnimationFrame(this.animate);
    }

    updateCamera(dt) {
        const progress = this.interaction?.scrollProgress || 0;
        const camera = this.scene?.camera;

        if (!camera) return;

        const targetPos = this.desiredCameraPos.set(0.5, 2.2, 9.5);
        const lookTarget = this.desiredLookTarget.set(0, 1.6, 0);

        if (progress < 0.2) {
            targetPos.set(0.5, 2.2, 9.5);
        } else if (progress < 0.45) {
            const t = (progress - 0.2) / 0.25;
            targetPos.set(lerp(0.5, -3.2, t), lerp(2.2, 1.8, t), lerp(9.5, 7.5, t));
            lookTarget.set(0.5, 1.4, 0);
        } else if (progress < 0.75) {
            const t = (progress - 0.45) / 0.3;
            const angle = t * Math.PI * 0.8;
            targetPos.set(Math.sin(angle) * 8, 2, Math.cos(angle) * 8);
        } else {
            const t = (progress - 0.75) / 0.25;
            targetPos.set(
                lerp(camera.position.x, 0, t),
                lerp(camera.position.y, 2.5, t),
                lerp(camera.position.z, 12, t)
            );
        }

        this.cameraTargetPos.x = THREE.MathUtils.damp(this.cameraTargetPos.x, targetPos.x, 5.5, dt);
        this.cameraTargetPos.y = THREE.MathUtils.damp(this.cameraTargetPos.y, targetPos.y, 5.5, dt);
        this.cameraTargetPos.z = THREE.MathUtils.damp(this.cameraTargetPos.z, targetPos.z, 5.5, dt);

        this.cameraLookTarget.x = THREE.MathUtils.damp(this.cameraLookTarget.x, lookTarget.x, 6.5, dt);
        this.cameraLookTarget.y = THREE.MathUtils.damp(this.cameraLookTarget.y, lookTarget.y, 6.5, dt);
        this.cameraLookTarget.z = THREE.MathUtils.damp(this.cameraLookTarget.z, lookTarget.z, 6.5, dt);

        camera.position.copy(this.cameraTargetPos);
        camera.lookAt(this.cameraLookTarget);
    }

    destroy() {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }

        this.intervals.forEach((intervalId) => clearInterval(intervalId));
        this.intervals = [];

        this.cleanups.forEach((cleanup) => cleanup());
        this.cleanups = [];

        this.interaction?.destroy();
        this.particles?.destroy();
        this.scene?.dispose();
        this.audio?.destroy();
        this.robot?.dispose?.();
    }
}

/**
 * Phantom Shield X - Main Entry Point (Next Level)
 */
import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { RobotManager } from './robot.js';
import { ParticleSystem } from './particles.js';
import { AudioEngine } from './audio.js';
import { InteractionManager } from './scroll.js';
import { lerp } from './utils.js';

class App {
    constructor() {
        this.scene = null;
        this.robot = null;
        this.particles = null;
        this.audio = null;
        this.interaction = null;

        this.mouse = { x: 0, y: 0 };
        this.time = 0;
        this.lastTime = 0;

        // Custom Cursor State
        this.cursor = { cx: -100, cy: -100, rx: -100, ry: -100 };

        this.init().catch(err => {
            console.error("Critical error:", err);
            document.getElementById('loader')?.classList.add('hidden');
        });
    }

    async init() {
        this.scene = new SceneManager('canvas3d');
        this.robot = new RobotManager(this.scene.scene);
        this.particles = new ParticleSystem('particles');
        this.audio = new AudioEngine();
        this.interaction = new InteractionManager(this.scene, this.robot, this.audio);

        await this.robot.load();

        this.setupEventListeners();
        this.initHUD();
        this.start();
    }

    setupEventListeners() {
        document.addEventListener('mousemove', e => {
            // Normalized mouse coords (-1 to 1)
            this.mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
            this.mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;

            this.cursor.cx = e.clientX;
            this.cursor.cy = e.clientY;

            const dot = document.getElementById('cursor-dot');
            if (dot) {
                dot.style.left = this.cursor.cx + 'px';
                dot.style.top = this.cursor.cy + 'px';
            }
        });

        // Interactive states for cursor
        const interactibles = 'a, button, .stat-card, .cta-btn';
        document.querySelectorAll(interactibles).forEach(el => {
            el.addEventListener('mouseenter', () => {
                document.getElementById('cursor-ring')?.classList.add('active');
            });
            el.addEventListener('mouseleave', () => {
                document.getElementById('cursor-ring')?.classList.remove('active');
            });
        });

        const audioBtn = document.getElementById('audio-btn');
        if (audioBtn) {
            audioBtn.onclick = () => {
                const isOn = this.audio.toggle();
                const aw1 = document.getElementById('aw1');
                const aw2 = document.getElementById('aw2');
                if (aw1) aw1.style.opacity = isOn ? '1' : '0.3';
                if (aw2) aw2.style.opacity = isOn ? '1' : '0.3';
            };
        }

        document.addEventListener('click', () => {
            if (this.audio.ctx?.state === 'suspended') this.audio.ctx.resume();
        }, { once: true });
    }

    initHUD() {
        const uptimeStart = Date.now();
        setInterval(() => {
            const el = document.getElementById('uptime-val');
            if (el) {
                const s = Math.floor((Date.now() - uptimeStart) / 1000);
                el.textContent = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
                    .map(n => String(n).padStart(2, '0')).join(':');
            }
        }, 1000);

        let threatCnt = 0;
        setInterval(() => {
            if (Math.random() < .35) threatCnt++;
            const el = document.getElementById('threat-count');
            if (el) el.textContent = threatCnt + ' intercepted';
        }, 800);
    }

    start() {
        document.getElementById('loader')?.classList.add('hidden');
        this.animate(0);
    }

    animate(now) {
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        this.time += 0.016;

        // Cursor Smoothing
        this.cursor.rx += (this.cursor.cx - this.cursor.rx) * 0.15;
        this.cursor.ry += (this.cursor.cy - this.cursor.ry) * 0.15;
        const ring = document.getElementById('cursor-ring');
        if (ring) {
            ring.style.left = this.cursor.rx + 'px';
            ring.style.top = this.cursor.ry + 'px';
        }

        // Update Systems
        this.robot.update(dt, this.time, this.interaction.scrollProgress, this.mouse);
        this.particles.update();

        // Cinematic Camera
        this.updateCamera();

        const bloomIntensity = 0.35 + (this.interaction.scrollProgress * 0.6);
        this.scene.render(this.time, bloomIntensity);
        this.particles.draw();

        requestAnimationFrame((t) => this.animate(t));
    }

    updateCamera() {
        const p = this.interaction.scrollProgress;
        const cam = this.scene.camera;
        if (!cam) return;

        let targetPos = new THREE.Vector3(0.5, 2.2, 9.5);
        let lookTarget = new THREE.Vector3(0, 1.6, 0);

        // Section-based camera framing
        if (p < 0.2) {
            // Hero
            targetPos.set(0.5, 2.2, 9.5);
        } else if (p < 0.45) {
            // Threat
            const t = (p - 0.2) / 0.25;
            targetPos.set(lerp(0.5, -3.2, t), lerp(2.2, 1.8, t), lerp(9.5, 7.5, t));
            lookTarget.set(0.5, 1.4, 0);
        } else if (p < 0.75) {
            // Defense (Moving around)
            const t = (p - 0.45) / 0.3;
            const angle = t * Math.PI * 0.8;
            targetPos.set(Math.sin(angle) * 8, 2.0, Math.cos(angle) * 8);
        } else {
            // Final
            const t = (p - 0.75) / 0.25;
            targetPos.set(lerp(cam.position.x, 0, t), lerp(cam.position.y, 2.5, t), lerp(cam.position.z, 12, t));
        }

        cam.position.lerp(targetPos, 0.04);
        cam.lookAt(lookTarget);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new App();
});

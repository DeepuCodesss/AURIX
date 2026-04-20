/**
 * Phantom Shield X - Interaction & Scroll Manager
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class InteractionManager {
    constructor(sceneManager, robotManager, audioEngine, rootElement = document) {
        this.scene = sceneManager;
        this.robot = robotManager;
        this.audio = audioEngine;
        this.root = rootElement;
        this.scrollProgress = 0;
        this.targetScrollProgress = 0;
        this.scrollMotion = 0;
        this.lastProgress = 0;
        this.animations = [];
        this.progressTrigger = null;

        this.init();
    }

    init() {
        const triggerRoot = this.root.querySelector('#scroll-container') || '#scroll-container';

        this.progressTrigger = ScrollTrigger.create({
            trigger: triggerRoot,
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => {
                const delta = self.progress - this.lastProgress;
                const motionImpulse = Math.min(1, Math.abs(delta) * 220);

                this.lastProgress = self.progress;
                this.targetScrollProgress = self.progress;
                this.scrollMotion = Math.max(this.scrollMotion, motionImpulse);
                this.updateSystems(self.progress);
            }
        });

        const sections = gsap.utils.toArray(this.root.querySelectorAll('[data-anim]'));
        sections.forEach(section => {
            const animation = gsap.fromTo(section,
                { opacity: 0, y: 30 },
                {
                    opacity: 1, y: 0,
                    duration: 0.6,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: section,
                        start: "top 95%",
                        toggleActions: "play none none reverse"
                    }
                }
            );

            this.animations.push(animation);
        });
    }

    updateSystems(p) {
        // Removed progress bar
        const scrollHint = document.getElementById('scroll-hint');
        if (scrollHint) {
            if (p > 0.05) scrollHint.classList.add('hidden');
            else scrollHint.classList.remove('hidden');
        }

        if (p > 0.35 && !this.audio.eyeSoundPlayed) {
            this.audio.playEyeSound();
            this.audio.eyeSoundPlayed = true;
        }

        if (p > 0.85 && !this.audio.activationSoundPlayed) {
            this.audio.playActivationSound();
            this.audio.activationSoundPlayed = true;
        }
    }

    tick(dt) {
        const alpha = 1 - Math.exp(-dt * 14);
        this.scrollProgress += (this.targetScrollProgress - this.scrollProgress) * alpha;
        this.scrollMotion = Math.max(0, this.scrollMotion - dt * 2.2);
    }

    cursorExpand(isExpand) {
        const dot = document.getElementById('cursor-dot');
        const ring = document.getElementById('cursor-ring');
        if (isExpand) {
            dot.style.width = '12px'; dot.style.height = '12px';
            ring.style.width = '52px'; ring.style.height = '52px';
            ring.style.borderColor = 'rgba(176,68,255,0.7)';
        } else {
            dot.style.width = '8px'; dot.style.height = '8px';
            ring.style.width = '36px'; ring.style.height = '36px';
            ring.style.borderColor = 'rgba(0,200,255,0.45)';
        }
    }

    destroy() {
        this.progressTrigger?.kill();
        this.animations.forEach((animation) => {
            animation.scrollTrigger?.kill();
            animation.kill();
        });
        this.animations = [];
    }
}

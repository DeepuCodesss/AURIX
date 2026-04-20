/**
 * Phantom Shield X - Interaction & Scroll Manager
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class InteractionManager {
    constructor(sceneManager, robotManager, audioEngine) {
        this.scene = sceneManager;
        this.robot = robotManager;
        this.audio = audioEngine;
        this.scrollProgress = 0;

        this.init();
    }

    init() {
        ScrollTrigger.create({
            trigger: "#scroll-container",
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => {
                this.scrollProgress = self.progress;
                this.updateSystems(self.progress);
            }
        });

        const sections = gsap.utils.toArray('[data-anim]');
        sections.forEach(section => {
            gsap.fromTo(section,
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
        });

        document.querySelectorAll('a, button').forEach(el => {
            el.addEventListener('mouseenter', () => this.cursorExpand(true));
            el.addEventListener('mouseleave', () => this.cursorExpand(false));
        });
    }

    updateSystems(p) {
        // Removed progress bar
        if (p > 0.05) document.getElementById('scroll-hint').classList.add('hidden');
        else document.getElementById('scroll-hint').classList.remove('hidden');

        if (p > 0.35 && !this.audio.eyeSoundPlayed) {
            this.audio.playEyeSound();
            this.audio.eyeSoundPlayed = true;
        }

        if (p > 0.85 && !this.audio.activationSoundPlayed) {
            this.audio.playActivationSound();
            this.audio.activationSoundPlayed = true;
        }
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
}

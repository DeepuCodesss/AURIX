/**
 * Phantom Shield X - Particle System
 */

class Particle {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.reset(true);
    }

    reset(init = false) {
        this.x = Math.random() * this.w;
        this.y = init ? Math.random() * this.h : this.h + 8;
        this.vx = (Math.random() - .5) * .5;
        this.vy = -(Math.random() * .55 + .1);
        this.life = init ? Math.random() : 0;
        this.maxLife = .45 + Math.random() * .55;
        this.depth = Math.random();
        this.r = this.depth < .2 ? Math.random() * 2.5 + 1.5 : Math.random() * 1.1 + .2;
        const clrs = ['0,200,255', '176,68,255', '0,255,231', '255,34,68'];
        this.color = clrs[Math.floor(Math.random() * 4)];
        this.twinkle = Math.random() * Math.PI * 2;
        this.tSpeed = .02 + Math.random() * .04;
    }

    update() {
        const spd = .3 + this.depth * .7;
        this.x += this.vx * spd;
        this.y += this.vy * spd;
        this.life += .0022 + this.depth * .001;
        this.twinkle += this.tSpeed;
        if (this.life > this.maxLife || this.y < -8) this.reset();
    }

    draw(ctx) {
        const lf = this.life / this.maxLife;
        const tw = .7 + .3 * Math.sin(this.twinkle);
        const alpha = Math.sin(lf * Math.PI) * .65 * tw * (.35 + this.depth * .65);

        if (this.r > 1.2) {
            const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 3.5);
            grd.addColorStop(0, `rgba(${this.color},${alpha})`);
            grd.addColorStop(1, `rgba(${this.color},0)`);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r * 3.5, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color},${alpha})`;
        ctx.fill();
    }
}

class DataStream {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.reset();
    }

    reset() {
        this.x = Math.random() * this.w;
        this.y = Math.random() * this.h;
        this.vy = -(1 + Math.random() * 2.2);
        this.len = 25 + Math.random() * 65;
        this.alpha = .025 + Math.random() * .07;
        this.w_line = .4 + Math.random() * .5;
        this.color = Math.random() < .6 ? '0,200,255' : '0,255,231';
    }

    update() {
        this.y += this.vy;
        if (this.y + this.len < 0) this.reset();
    }

    draw(ctx) {
        const g = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.len);
        g.addColorStop(0, `rgba(${this.color},0)`);
        g.addColorStop(.5, `rgba(${this.color},${this.alpha})`);
        g.addColorStop(1, `rgba(${this.color},0)`);
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.len);
        ctx.strokeStyle = g;
        ctx.lineWidth = this.w_line;
        ctx.stroke();
    }
}

export class ParticleSystem {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.streams = [];
        this.width = 0;
        this.height = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.init();
    }

    resize() {
        this.width = this.canvas.width = window.innerWidth;
        this.height = this.canvas.height = window.innerHeight;

        // Update dimensions for existing particles
        this.particles.forEach(p => { p.w = this.width; p.h = this.height; });
        this.streams.forEach(s => { s.w = this.width; s.h = this.height; });
    }

    init() {
        // Adaptive count: Fewer particles on smaller screens
        const pCount = window.innerWidth < 768 ? 120 : 220;
        const sCount = window.innerWidth < 768 ? 15 : 28;

        this.particles = [];
        this.streams = [];

        for (let i = 0; i < pCount; i++) this.particles.push(new Particle(this.width, this.height));
        for (let i = 0; i < sCount; i++) this.streams.push(new DataStream(this.width, this.height));
    }

    update() {
        this.streams.forEach(s => s.update());
        this.particles.forEach(p => p.update());
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.streams.forEach(s => s.draw(this.ctx));

        // Depth sort: far -> near
        const sorted = [...this.particles].sort((a, b) => a.depth - b.depth);
        sorted.forEach(p => p.draw(this.ctx));
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
}

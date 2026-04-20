/**
 * Phantom Shield X - Audio System (Web Audio API)
 */

export class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isOn = false;
        this.eyeSoundPlayed = false;
        this.activationSoundPlayed = false;
        this.drones = [];
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        // Convolution reverb for space
        const conv = this.ctx.createConvolver();
        const convGain = this.ctx.createGain();
        convGain.gain.value = 0.25;
        const irLen = this.ctx.sampleRate * 2.5;
        const ir = this.ctx.createBuffer(2, irLen, this.ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
            const ch = ir.getChannelData(c);
            for (let i = 0; i < irLen; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2.8);
        }
        conv.buffer = ir;
        conv.connect(convGain);
        convGain.connect(this.masterGain);

        // Layered drone oscillators
        const droneConfig = [
            { freq: 40, type: 'sawtooth', gain: 0.07, lfoRate: 0.04 },
            { freq: 40.4, type: 'sawtooth', gain: 0.06, lfoRate: 0.05 },
            { freq: 80, type: 'sine', gain: 0.04, lfoRate: 0.07 },
            { freq: 120.3, type: 'sine', gain: 0.025, lfoRate: 0.03 },
            { freq: 160.8, type: 'triangle', gain: 0.02, lfoRate: 0.06 }
        ];

        droneConfig.forEach(cfg => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            const lpf = this.ctx.createBiquadFilter();
            const lfo = this.ctx.createOscillator();
            const lfoG = this.ctx.createGain();

            osc.type = cfg.type;
            osc.frequency.value = cfg.freq;
            lfo.frequency.value = cfg.lfoRate;
            lfoG.gain.value = 0.25;

            lfo.connect(lfoG);
            lfoG.connect(osc.frequency);
            lpf.type = 'lowpass';
            lpf.frequency.value = 400;
            lpf.Q.value = 1.5;
            g.gain.value = cfg.gain;

            osc.connect(lpf);
            lpf.connect(g);
            g.connect(this.masterGain);
            g.connect(conv);

            osc.start();
            lfo.start();
            this.drones.push({ osc, lfo, g });
        });

        // Sub-bass pulse
        const sub = this.ctx.createOscillator();
        const subG = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.value = 22;
        subG.gain.value = 0.1;
        sub.connect(subG);
        subG.connect(this.masterGain);
        sub.start();
    }

    toggle() {
        if (!this.ctx) this.init();
        this.isOn = !this.isOn;
        const targetGain = this.isOn ? 0.55 : 0;
        const rampTime = this.isOn ? 2.5 : 1.0;

        if (this.ctx.state === 'suspended') this.ctx.resume();

        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + rampTime);

        return this.isOn;
    }

    playEyeSound() {
        if (!this.ctx || !this.isOn) return;
        const t = this.ctx.currentTime;
        [1200, 800, 600].forEach((f, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = f;
            g.gain.setValueAtTime(0.06, t + i * 0.08);
            g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.35);
            osc.connect(g);
            g.connect(this.ctx.destination);
            osc.start(t + i * 0.08);
            osc.stop(t + i * 0.08 + 0.35);
        });
    }

    playActivationSound() {
        if (!this.ctx || !this.isOn) return;
        const t = this.ctx.currentTime;
        // Rising sweep
        const sw = this.ctx.createOscillator();
        const swG = this.ctx.createGain();
        sw.type = 'sawtooth';
        sw.frequency.setValueAtTime(60, t);
        sw.frequency.exponentialRampToValueAtTime(1200, t + 1.8);
        swG.gain.setValueAtTime(0, t);
        swG.gain.linearRampToValueAtTime(0.1, t + 0.08);
        swG.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
        const swF = this.ctx.createBiquadFilter();
        swF.type = 'bandpass';
        swF.frequency.value = 600;
        swF.Q.value = 2;
        sw.connect(swF);
        swF.connect(swG);
        swG.connect(this.ctx.destination);
        sw.start(t);
        sw.stop(t + 1.85);

        // Impact noise burst
        const nBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.25, this.ctx.sampleRate);
        const nd = nBuf.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        const nSrc = this.ctx.createBufferSource();
        nSrc.buffer = nBuf;
        const nF = this.ctx.createBiquadFilter();
        nF.type = 'bandpass';
        nF.frequency.value = 180;
        const nG = this.ctx.createGain();
        nG.gain.setValueAtTime(0.18, t);
        nG.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        nSrc.connect(nF);
        nF.connect(nG);
        nG.connect(this.ctx.destination);
        nSrc.start(t);
    }
}

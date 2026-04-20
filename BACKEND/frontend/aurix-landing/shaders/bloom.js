/**
 * Phantom Shield X - Custom Bloom Shaders
 */

export const blurVS = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
    }
`;

export const blurFS = `
    uniform sampler2D tDiffuse;
    uniform vec2 res;
    uniform vec2 direction;
    varying vec2 vUv;
    void main() {
        vec2 t = 1.0 / res;
        vec4 c = vec4(0.0);
        float w[7]; 
        w[0]=0.0625; w[1]=0.125; w[2]=0.1875; w[3]=0.25; w[4]=0.1875; w[5]=0.125; w[6]=0.0625;
        for(int i=-3; i<=3; i++) {
            c += texture2D(tDiffuse, vUv + direction * float(i) * t * 2.0) * w[i+3];
        }
        gl_FragColor = c;
    }
`;

export const compositeFS = `
    uniform sampler2D tBase;
    uniform sampler2D tBloom;
    uniform float bloomStr;
    uniform float time;
    varying vec2 vUv;

    float rnd(vec2 c) {
        return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
        vec4 base = texture2D(tBase, vUv);
        
        // Chromatic Aberration - making it responsive and "sci-fi"
        float ca = 0.003 + sin(time * 3.0) * 0.001;
        vec4 baseR = texture2D(tBase, vUv + vec2(ca, 0.0));
        vec4 baseB = texture2D(tBase, vUv - vec2(ca, 0.0));
        
        vec4 bloomC = texture2D(tBloom, vUv);
        vec4 bloomR = texture2D(tBloom, vUv + vec2(ca * 2.0, 0.0));
        vec4 bloomB = texture2D(tBloom, vUv - vec2(ca * 2.0, 0.0));
        
        base.r = mix(base.r, baseR.r, 0.8);
        base.b = mix(base.b, baseB.b, 0.8);
        
        bloomC.r = bloomR.r;
        bloomC.b = bloomB.b;
        
        vec4 col = base + bloomC * bloomStr;
        
        // Dynamic scanlines to reduce emptiness
        float scanline = sin(vUv.y * 800.0) * 0.03;
        col.rgb -= scanline;
        
        // Film grain
        col.rgb += rnd(vUv + fract(time * 0.09)) * 0.038 - 0.019;
        
        // Subtle vignette
        vec2 uv = vUv * (1.0 - vUv.yx);
        float v = pow(uv.x * uv.y * 14.0, 0.22);
        col.rgb *= 0.84 + v * 0.16;
        
        gl_FragColor = clamp(col, 0.0, 1.6);
    }
`;

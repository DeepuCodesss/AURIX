/**
 * Phantom Shield X - Utility Functions
 */

export const lerp = (a, b, t) => a + (b - a) * t;

export const mapRange = (value, low1, high1, low2, high2) => {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const COLORS = {
    neonRed: 0xff2244,
    neonBlue: 0x00c8ff,
    neonPurple: 0xb044ff,
    neonCyan: 0x00ffe7,
    darkBg: 0x020406
};

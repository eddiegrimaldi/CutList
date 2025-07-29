// utils.js - Utility functions for CutList
// Spanky modularized this for Assclown!

export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function snapToGrid(value, gridSize) {
    return Math.round(value / gridSize) * gridSize;
}

// Add more utility functions as needed!

// world.js - World/project logic for CutList
// Spanky modularized this for Assclown!

export class World {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
    }

    addObject(object) {
        this.objects.push(object);
        this.scene.add(object);
    }

    removeObject(object) {
        const idx = this.objects.indexOf(object);
        if (idx !== -1) {
            this.objects.splice(idx, 1);
            this.scene.remove(object);
        }
    }

    clear() {
        this.objects.forEach(obj => this.scene.remove(obj));
        this.objects = [];
    }

    getObjects() {
        return this.objects;
    }
}

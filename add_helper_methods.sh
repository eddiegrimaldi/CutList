#\!/bin/bash

# Insert helper methods before the end of DrawingWorld class
sed -i '11788i\
    createTransformDisplay() {\
        // Remove any existing display\
        if (this.transformDisplay) {\
            this.transformDisplay.remove();\
        }\
        \
        // Create display container\
        const display = document.createElement("div");\
        display.id = "transform-display";\
        display.style.position = "fixed";\
        display.style.top = "50%";\
        display.style.left = "50%";\
        display.style.transform = "translate(-50%, -50%)";\
        display.style.background = "rgba(0, 0, 0, 0.8)";\
        display.style.color = "white";\
        display.style.padding = "10px 20px";\
        display.style.borderRadius = "5px";\
        display.style.fontSize = "24px";\
        display.style.fontWeight = "bold";\
        display.style.display = "none";\
        display.style.zIndex = "10000";\
        display.style.pointerEvents = "none";\
        document.body.appendChild(display);\
        this.transformDisplay = display;\
    }\
    \
    updateTransformDisplay(value, type) {\
        if (\!this.transformDisplay) return;\
        \
        if (type === "position") {\
            const x = value.x.toFixed(2);\
            const y = value.y.toFixed(2);\
            const z = value.z.toFixed(2);\
            this.transformDisplay.textContent = ;\
        } else if (type === "rotation") {\
            const xDeg = (value.x * 180 / Math.PI).toFixed(1);\
            const yDeg = (value.y * 180 / Math.PI).toFixed(1);\
            const zDeg = (value.z * 180 / Math.PI).toFixed(1);\
            this.transformDisplay.textContent = ;\
        }\
        \
        this.transformDisplay.style.display = "block";\
    }\
    \
    hideTransformDisplay() {\
        if (this.transformDisplay) {\
            this.transformDisplay.style.display = "none";\
        }\
    }\
    \
    createGhostMesh(originalMesh) {\
        // Remove existing ghost\
        if (this.ghostMesh) {\
            this.ghostMesh.dispose();\
            this.ghostMesh = null;\
        }\
        \
        // Clone the mesh for ghost\
        this.ghostMesh = originalMesh.clone(originalMesh.name + "_ghost");\
        \
        // Create ghost material\
        const ghostMaterial = new BABYLON.StandardMaterial("ghostMaterial", this.scene);\
        ghostMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);\
        ghostMaterial.alpha = 0.3;\
        ghostMaterial.backFaceCulling = false;\
        \
        this.ghostMesh.material = ghostMaterial;\
        this.ghostMesh.isPickable = false;\
        \
        // Store original transform\
        this.transformStartPosition = originalMesh.position.clone();\
        this.transformStartRotation = originalMesh.rotation.clone();\
    }\
    \
    removeGhostMesh() {\
        if (this.ghostMesh) {\
            this.ghostMesh.dispose();\
            this.ghostMesh = null;\
        }\
    }\
    \
    applyGridSnap(position) {\
        if (this.gridSnapSize <= 0) return position;\
        \
        return new BABYLON.Vector3(\
            Math.round(position.x / this.gridSnapSize) * this.gridSnapSize,\
            Math.round(position.y / this.gridSnapSize) * this.gridSnapSize,\
            Math.round(position.z / this.gridSnapSize) * this.gridSnapSize\
        );\
    }\
    \
    applyRotationSnap(rotation) {\
        if (this.rotationSnapAngle <= 0) return rotation;\
        \
        const snapRad = this.rotationSnapAngle * Math.PI / 180;\
        return new BABYLON.Vector3(\
            Math.round(rotation.x / snapRad) * snapRad,\
            Math.round(rotation.y / snapRad) * snapRad,\
            Math.round(rotation.z / snapRad) * snapRad\
        );\
    }\
' drawing-world.js

echo Added helper methods

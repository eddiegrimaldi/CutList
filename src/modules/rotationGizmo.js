// src/modules/rotationGizmo.js
// Rotation Gizmo for 3D Objects - Local Coordinate System Rotation

export default class RotationGizmo {
    // Visual Constants - Optimized for very close positioning
    RING_RADIUS = 2.5;      // Smaller radius for tighter positioning
    RING_THICKNESS = 0.3;   // Thinner rings that are still grabbable
    RING_TESSELLATION = 64; // Smooth circles
    GIZMO_OFFSET_Y = 2.0;   // Much smaller fallback offset when camera detection fails
    
    // Intuitive color scheme - no RGB confusion
    AXIS_1_COLOR = new BABYLON.Color3(1.0, 0.8, 0.2); // Gold/Yellow - Primary axis
    AXIS_2_COLOR = new BABYLON.Color3(0.2, 0.8, 1.0); // Cyan/Blue - Secondary axis  
    AXIS_3_COLOR = new BABYLON.Color3(0.8, 0.3, 1.0); // Purple/Magenta - Third axis
    HOVER_COLOR = new BABYLON.Color3(1.0, 1.0, 0.4);  // Bright yellow for hover
    
    scene;
    attachedMesh;
    gizmoContainer;
    onRotate; // BABYLON.Observable

    // Rotation rings for each local axis
    _ring1; // Local axis 1 (object's local X equivalent)
    _ring2; // Local axis 2 (object's local Y equivalent)  
    _ring3; // Local axis 3 (object's local Z equivalent)
    
    // Materials
    _axis1Material;
    _axis2Material;
    _axis3Material;
    _hoverMaterial;
    
    // Interaction state
    _pointerObserver = null;
    _isDragging = false;
    _currentRing = null;
    _initialPointerAngle = 0;
    _rotationStartQuaternion = null;

    constructor(attachedMesh, scene, clickInfo = null) {
        this.scene = scene;
        this.attachedMesh = attachedMesh;
        this.clickInfo = clickInfo; // Store the full click info for surface-aware positioning
        this.onRotate = new BABYLON.Observable();

        this._createMaterials();
        this._createGizmoVisuals();
        this._setupPointerInteractions();
        
        if (this.attachedMesh) {
            this.show();
        } else {
            if (this.gizmoContainer) {
                this.gizmoContainer.setEnabled(false);
            }
        }

    }

    _createMaterials() {
        // Axis 1 material (Gold/Yellow) - Enhanced for visibility
        this._axis1Material = new BABYLON.StandardMaterial("rotationGizmo_axis1", this.scene);
        this._axis1Material.diffuseColor = this.AXIS_1_COLOR;
        this._axis1Material.emissiveColor = this.AXIS_1_COLOR.scale(0.4); // Brighter emissive
        this._axis1Material.disableLighting = false;
        this._axis1Material.alpha = 0.9; // Slightly transparent for depth perception
        
        // Axis 2 material (Cyan/Blue) - Enhanced for visibility
        this._axis2Material = new BABYLON.StandardMaterial("rotationGizmo_axis2", this.scene);
        this._axis2Material.diffuseColor = this.AXIS_2_COLOR;
        this._axis2Material.emissiveColor = this.AXIS_2_COLOR.scale(0.4); // Brighter emissive
        this._axis2Material.disableLighting = false;
        this._axis2Material.alpha = 0.9; // Slightly transparent for depth perception
        
        // Axis 3 material (Purple/Magenta) - Enhanced for visibility
        this._axis3Material = new BABYLON.StandardMaterial("rotationGizmo_axis3", this.scene);
        this._axis3Material.diffuseColor = this.AXIS_3_COLOR;
        this._axis3Material.emissiveColor = this.AXIS_3_COLOR.scale(0.4); // Brighter emissive
        this._axis3Material.disableLighting = false;
        this._axis3Material.alpha = 0.9; // Slightly transparent for depth perception
        
        // Hover material - Very bright and opaque
        this._hoverMaterial = new BABYLON.StandardMaterial("rotationGizmo_hover", this.scene);
        this._hoverMaterial.diffuseColor = this.HOVER_COLOR;
        this._hoverMaterial.emissiveColor = this.HOVER_COLOR.scale(0.7); // Very bright emissive
        this._hoverMaterial.disableLighting = false;
        this._hoverMaterial.alpha = 1.0; // Fully opaque on hover
    }

    _createGizmoVisuals() {
        this.gizmoContainer = new BABYLON.AbstractMesh("rotationGizmoContainer", this.scene);
        this.gizmoContainer.isPickable = false;
        this.gizmoContainer.parent = null; // Ensure it's not parented to anything
        
        // Make gizmo always render on top for better visibility
        this.gizmoContainer.renderingGroupId = 1; // Higher rendering group

        // Create three rotation rings for the object's local coordinate system
        
        // Ring 1 - Rotates around object's local X-equivalent axis (Gold/Yellow)
        this._ring1 = BABYLON.MeshBuilder.CreateTorus("rotationGizmo_ring1", {
            diameter: this.RING_RADIUS * 2,
            thickness: this.RING_THICKNESS,
            tessellation: this.RING_TESSELLATION
        }, this.scene);
        this._ring1.material = this._axis1Material;
        this._ring1.rotation.z = Math.PI / 2; // Orient for X-axis rotation
        this._ring1.parent = this.gizmoContainer;
        this._ring1.isPickable = true;
        this._ring1.name = "rotationGizmo_ring1";
        this._ring1.renderingGroupId = 1; // Higher rendering group
        
        // Ring 2 - Rotates around object's local Y-equivalent axis (Cyan/Blue)
        this._ring2 = BABYLON.MeshBuilder.CreateTorus("rotationGizmo_ring2", {
            diameter: this.RING_RADIUS * 2,
            thickness: this.RING_THICKNESS,
            tessellation: this.RING_TESSELLATION
        }, this.scene);
        this._ring2.material = this._axis2Material;
        // Default orientation is good for Y-axis rotation
        this._ring2.parent = this.gizmoContainer;
        this._ring2.isPickable = true;
        this._ring2.name = "rotationGizmo_ring2";
        this._ring2.renderingGroupId = 1; // Higher rendering group
        
        // Ring 3 - Rotates around object's local Z-equivalent axis (Purple/Magenta)
        this._ring3 = BABYLON.MeshBuilder.CreateTorus("rotationGizmo_ring3", {
            diameter: this.RING_RADIUS * 2,
            thickness: this.RING_THICKNESS,
            tessellation: this.RING_TESSELLATION
        }, this.scene);
        this._ring3.material = this._axis3Material;
        this._ring3.rotation.x = Math.PI / 2; // Orient for Z-axis rotation
        this._ring3.parent = this.gizmoContainer;
        this._ring3.isPickable = true;
        this._ring3.name = "rotationGizmo_ring3";
        this._ring3.renderingGroupId = 1; // Higher rendering group

        // Store references for interaction
        this._allRings = [this._ring1, this._ring2, this._ring3];
        
        // Start hidden
        this.gizmoContainer.setEnabled(false);
    }

    show() {
        if (!this.gizmoContainer || !this.attachedMesh) {
            if (this.gizmoContainer) this.gizmoContainer.setEnabled(false);
            return;
        }

        this.gizmoContainer.setEnabled(true);

        // INTELLIGENT CAMERA-AWARE POSITIONING
        // Calculate the optimal position based on camera orientation and object bounds
        const optimalPosition = this._calculateOptimalGizmoPosition();
        this.gizmoContainer.position = optimalPosition;
        
        // CRITICAL: Keep gizmo oriented to world axes for easier manipulation
        // Reset rotation to identity (world-aligned) so it doesn't follow the object
        this.gizmoContainer.rotation = BABYLON.Vector3.Zero();
        this.gizmoContainer.rotationQuaternion = null;
        
        // Ensure gizmo is NEVER parented to the mesh - it must remain independent
        this.gizmoContainer.parent = null;

    }

    hide() {
        if (this.gizmoContainer) {
            this.gizmoContainer.setEnabled(false);
        }
        
        // Restore cursor when hiding gizmo
        document.body.style.cursor = 'default';
    }

    // Helper method to check if a mesh is part of this gizmo
    _isGizmoRing(mesh) {
        if (!mesh || !this.gizmoContainer) return false;
        
        // Check if it's one of our rings
        return this._allRings.includes(mesh);
    }

    // Get the rotation axis for a given ring in world coordinate system
    // Since the gizmo is now world-aligned, use world axes directly
    _getRotationAxisForRing(ring) {
        if (ring === this._ring1) {
            // Ring 1 rotates around world X-axis
            return new BABYLON.Vector3(1, 0, 0);
        } else if (ring === this._ring2) {
            // Ring 2 rotates around world Y-axis
            return new BABYLON.Vector3(0, 1, 0);
        } else if (ring === this._ring3) {
            // Ring 3 rotates around world Z-axis
            return new BABYLON.Vector3(0, 0, 1);
        }
        return new BABYLON.Vector3(0, 1, 0); // Default
    }

    attachToMesh(mesh) {
        this.attachedMesh = mesh;
        if (mesh) {
            this.show();
        } else {
            this.hide();
        }
    }

    // Calculate optimal gizmo position using Opus's no-bullshit approach
    _calculateOptimalGizmoPosition() {
        const meshPosition = this.attachedMesh.getAbsolutePosition();
        const camera = this.scene.activeCamera;
        
        if (!camera) {
            return meshPosition.add(new BABYLON.Vector3(0, this.GIZMO_OFFSET_Y, 0));
        }
        
        // IF WE HAVE CLICK INFO, USE OPUS'S STRATEGY
        if (this.clickInfo && this.clickInfo.point) {
            
            // First check if it's a flat 2D shape
            const flatShape = this._handle2DShape(this.attachedMesh, this.clickInfo);
            if (flatShape) {
                const offset = this.RING_RADIUS * 0.3;
                const gizmoPosition = flatShape.position.add(flatShape.direction.scale(offset));
                return gizmoPosition;
            }
            
            // Use smart surface-based positioning
            const smartPos = this._smartGizmoPosition(this.attachedMesh, this.clickInfo, camera);
            return smartPos.position;
        }
        
        // FALLBACK: Use camera-based positioning (original logic)
        
        // Get camera's up direction (what the user perceives as "up")
        const cameraUpDirection = camera.upVector || new BABYLON.Vector3(0, 1, 0);
        
        // Get object's bounding info to understand its current extents
        const boundingInfo = this.attachedMesh.getBoundingInfo();
        const boundingBox = boundingInfo.boundingBox;
        
        // Calculate the object's current extent in the camera's up direction
        // Project the bounding box onto the camera's up vector to find the highest point
        const corners = [
            boundingBox.minimumWorld,
            boundingBox.maximumWorld,
            new BABYLON.Vector3(boundingBox.minimumWorld.x, boundingBox.minimumWorld.y, boundingBox.maximumWorld.z),
            new BABYLON.Vector3(boundingBox.minimumWorld.x, boundingBox.maximumWorld.y, boundingBox.minimumWorld.z),
            new BABYLON.Vector3(boundingBox.maximumWorld.x, boundingBox.minimumWorld.y, boundingBox.minimumWorld.z),
            new BABYLON.Vector3(boundingBox.minimumWorld.x, boundingBox.maximumWorld.y, boundingBox.maximumWorld.z),
            new BABYLON.Vector3(boundingBox.maximumWorld.x, boundingBox.minimumWorld.y, boundingBox.maximumWorld.z),
            new BABYLON.Vector3(boundingBox.maximumWorld.x, boundingBox.maximumWorld.y, boundingBox.minimumWorld.z)
        ];
        
        // Find the corner that extends furthest in the camera's up direction
        let maxProjection = -Infinity;
        for (const corner of corners) {
            const projection = BABYLON.Vector3.Dot(corner.subtract(meshPosition), cameraUpDirection);
            maxProjection = Math.max(maxProjection, projection);
        }
        
        // Position gizmo just above the object's highest point in the camera's up direction
        const clearanceOffset = this.RING_RADIUS * 0.1; // Very minimal clearance - almost touching
        const totalOffset = maxProjection + clearanceOffset;
        
        // Position gizmo in the camera's up direction from object center
        const offsetVector = cameraUpDirection.normalize().scale(totalOffset);
        const optimalPosition = meshPosition.add(offsetVector);
        
        
        return optimalPosition;
    }

    // Update gizmo position to follow the object (called when object moves, NOT when it rotates)
    updatePosition() {
        if (!this.gizmoContainer || !this.attachedMesh || !this.gizmoContainer.isEnabled()) {
            return;
        }
        
        // Use intelligent positioning instead of simple Y-offset
        const optimalPosition = this._calculateOptimalGizmoPosition();
        this.gizmoContainer.position = optimalPosition;
        
        // Ensure gizmo maintains world alignment even after position update
        this.gizmoContainer.rotation = BABYLON.Vector3.Zero();
        this.gizmoContainer.rotationQuaternion = null;
        this.gizmoContainer.parent = null; // Never become a child of the rotating object
        
    }

    _setupPointerInteractions() {
        this._pointerObserver = this.scene.onPointerObservable.add((pointerInfo) => {
            if (!this.gizmoContainer || !this.gizmoContainer.isEnabled() || !this.attachedMesh) {
                return;
            }

            const pickedMesh = pointerInfo.pickInfo ? pointerInfo.pickInfo.pickedMesh : null;

            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    if (this._isDragging && this._currentRing) {
                        // DRAGGING MODE: Process rotation
                        this._handleRotationDrag(pointerInfo);
                    } else {
                        // HOVER MODE: Visual feedback with proper cursor changes
                        const isHoveringRing = this._isGizmoRing(pickedMesh);
                        
                        if (isHoveringRing) {
                            // Change cursor to grab when hovering over gizmo rings
                            document.body.style.cursor = 'grab';
                            // Highlight the hovered ring
                            pickedMesh.material = this._hoverMaterial;
                        } else {
                            // Restore default cursor when not hovering
                            document.body.style.cursor = 'default';
                            // Restore original materials for all rings
                            this._ring1.material = this._axis1Material;
                            this._ring2.material = this._axis2Material;
                            this._ring3.material = this._axis3Material;
                        }
                    }
                    break;

                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if (this._isGizmoRing(pickedMesh)) {
                        this._startRotation(pickedMesh, pointerInfo);
                    }
                    break;

                case BABYLON.PointerEventTypes.POINTERUP:
                    if (this._isDragging && this._currentRing) {
                        this._endRotation();
                    }
                    break;
            }
        });
    }

    _startRotation(ring, pointerInfo) {
        this._isDragging = true;
        this._currentRing = ring;
        
        // Store initial state
        this._rotationStartQuaternion = this.attachedMesh.rotationQuaternion ? 
            this.attachedMesh.rotationQuaternion.clone() : 
            BABYLON.Quaternion.FromEulerAngles(this.attachedMesh.rotation.x, this.attachedMesh.rotation.y, this.attachedMesh.rotation.z);
        
        // Calculate initial pointer angle relative to rotation axis
        this._initialPointerAngle = this._calculatePointerAngle(pointerInfo);
        
        // Disable camera controls during rotation
        if (this.scene.activeCamera && this.scene.activeCamera.detachControl) {
            this.scene.activeCamera.detachControl();
        }
        
        // Change cursor to grabbing to indicate active dragging
        document.body.style.cursor = 'grabbing';
        
    }

    _handleRotationDrag(pointerInfo) {
        if (!this._currentRing || !this._rotationStartQuaternion) return;

        // Calculate current pointer angle
        const currentAngle = this._calculatePointerAngle(pointerInfo);
        const deltaAngle = currentAngle - this._initialPointerAngle;
        
        // Get rotation axis in world coordinates (gizmo is world-aligned)
        const worldAxis = this._getRotationAxisForRing(this._currentRing);
        
        // Create rotation quaternion for the delta angle around the world axis
        const deltaRotation = BABYLON.Quaternion.RotationAxis(worldAxis, deltaAngle);
        
        // Apply rotation: newRotation = deltaRotation * originalRotation
        const newRotation = deltaRotation.multiply(this._rotationStartQuaternion);
        
        // Apply to mesh
        this.attachedMesh.rotationQuaternion = newRotation;
        
        // CRITICAL: Keep gizmo completely stationary in world space
        // Do NOT update gizmo position or orientation - it should remain exactly where it was
        // The gizmo stays in its initial position regardless of how the object rotates
        
        // Fire rotation event for any listeners
        this.onRotate.notifyObservers({
            mesh: this.attachedMesh,
            axis: worldAxis,
            angle: deltaAngle,
            isPreview: true
        });
        
    }

    _endRotation() {
        this._isDragging = false;
        
        // Re-enable camera controls
        if (this.scene.activeCamera && this.scene.activeCamera.attachControl) {
            this.scene.activeCamera.attachControl(true);
        }
        
        // Restore cursor to default
        document.body.style.cursor = 'default';
        
        // Restore ring materials to normal state
        this._ring1.material = this._axis1Material;
        this._ring2.material = this._axis2Material;
        this._ring3.material = this._axis3Material;
        
        // CRITICAL: Reposition gizmo after rotation is complete
        // The object has rotated, so we need to recalculate optimal position
        const newOptimalPosition = this._calculateOptimalGizmoPosition();
        this.gizmoContainer.position = newOptimalPosition;
        
        
        // Fire final rotation event
        if (this._currentRing) {
            const worldAxis = this._getRotationAxisForRing(this._currentRing);
            this.onRotate.notifyObservers({
                mesh: this.attachedMesh,
                axis: worldAxis,
                angle: 0, // Final event doesn't need delta
                isPreview: false
            });
        }
        
        
        this._currentRing = null;
        this._rotationStartQuaternion = null;
    }

    _calculatePointerAngle(pointerInfo) {
        // Get screen position
        const x = pointerInfo.event.clientX;
        const y = pointerInfo.event.clientY;
        
        // CAMERA-AWARE ROTATION CALCULATION (matching extrusion gizmo approach)
        // Get gizmo center in world and screen coordinates
        const gizmoWorldPos = this.gizmoContainer.getAbsolutePosition();
        const camera = this.scene.activeCamera;
        
        // Project gizmo center to screen coordinates
        const gizmoScreenPos = BABYLON.Vector3.Project(gizmoWorldPos,
            BABYLON.Matrix.Identity(),
            this.scene.getTransformMatrix(),
            camera.viewport.toGlobal(
                this.scene.getEngine().getRenderWidth(),
                this.scene.getEngine().getRenderHeight()
            )
        );
        
        // Get the rotation axis for the current ring in world space
        const rotationAxis = this._getRotationAxisForRing(this._currentRing);
        
        // Create a vector perpendicular to the rotation axis for angle reference
        // This represents the "tangent" direction for rotation in world space
        let tangentVector;
        if (Math.abs(rotationAxis.y) < 0.9) {
            // If not aligned with Y, use Y cross with axis
            tangentVector = BABYLON.Vector3.Cross(rotationAxis, new BABYLON.Vector3(0, 1, 0));
        } else {
            // If aligned with Y, use Z cross with axis
            tangentVector = BABYLON.Vector3.Cross(rotationAxis, new BABYLON.Vector3(0, 0, 1));
        }
        tangentVector.normalize();
        
        // Project the tangent vector to screen space to understand rotation direction
        const tangentWorldPos = gizmoWorldPos.add(tangentVector);
        const tangentScreenPos = BABYLON.Vector3.Project(tangentWorldPos,
            BABYLON.Matrix.Identity(),
            this.scene.getTransformMatrix(),
            camera.viewport.toGlobal(
                this.scene.getEngine().getRenderWidth(),
                this.scene.getEngine().getRenderHeight()
            )
        );
        
        // Calculate screen direction of the tangent vector
        const screenTangentX = tangentScreenPos.x - gizmoScreenPos.x;
        const screenTangentY = tangentScreenPos.y - gizmoScreenPos.y;
        const screenTangentLength = Math.sqrt(screenTangentX * screenTangentX + screenTangentY * screenTangentY);
        
        if (screenTangentLength < 0.001) {
            // Fallback if tangent is too small in screen space
            return Math.atan2(y - gizmoScreenPos.y, x - gizmoScreenPos.x);
        }
        
        // Normalize screen tangent direction
        const normalizedTangentX = screenTangentX / screenTangentLength;
        const normalizedTangentY = screenTangentY / screenTangentLength;
        
        // Calculate mouse position relative to gizmo center
        const mouseOffsetX = x - gizmoScreenPos.x;
        const mouseOffsetY = y - gizmoScreenPos.y;
        
        // Project mouse offset onto tangent direction to get rotation amount
        // This ensures mouse movement feels natural regardless of camera angle
        const projectedDistance = mouseOffsetX * normalizedTangentX + mouseOffsetY * normalizedTangentY;
        
        // Convert projected distance to angle (scale factor can be adjusted for sensitivity)
        const angle = projectedDistance * 0.01; // Sensitivity factor
        
        
        return angle;
    }

    // OPUS'S NO-BULLSHIT SURFACE DETECTION METHODS
    // Stop being a pussy with that complex math
    _getClickedFace(pickInfo) {
        // Babylon gives you the face ID for free, ya dingus
        if (pickInfo.faceId !== undefined) {
            const mesh = pickInfo.pickedMesh;
            const indices = mesh.getIndices();
            const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);

            // Get the face normal like a real programmer
            const faceIndex = pickInfo.faceId * 3;
            const v1 = new BABYLON.Vector3(
                positions[indices[faceIndex] * 3],
                positions[indices[faceIndex] * 3 + 1],
                positions[indices[faceIndex] * 3 + 2]
            );
            
            const v2 = new BABYLON.Vector3(
                positions[indices[faceIndex + 1] * 3],
                positions[indices[faceIndex + 1] * 3 + 1],
                positions[indices[faceIndex + 1] * 3 + 2]
            );
            
            const v3 = new BABYLON.Vector3(
                positions[indices[faceIndex + 2] * 3],
                positions[indices[faceIndex + 2] * 3 + 1],
                positions[indices[faceIndex + 2] * 3 + 2]
            );

            // Cross product gives you the normal, basic geometry ya knucklehead
            const edge1 = v2.subtract(v1);
            const edge2 = v3.subtract(v1);
            const normal = BABYLON.Vector3.Cross(edge1, edge2).normalize();


            return {
                point: pickInfo.pickedPoint,
                normal: normal,
                faceId: pickInfo.faceId
            };
        }

        // Fallback for when Babylon's being a bitch
        return this._guessFaceFromRay(pickInfo);
    }

    _guessFaceFromRay(pickInfo) {
        
        if (!pickInfo.ray) {
            const camera = this.scene.activeCamera;
            const meshPosition = this.attachedMesh.getAbsolutePosition();
            const cameraToMesh = meshPosition.subtract(camera.position).normalize();
            
            return {
                point: pickInfo.pickedPoint,
                normal: cameraToMesh,
                faceId: null
            };
        }
        
        // Use ray direction as approximation
        const normal = pickInfo.ray.direction.scale(-1).normalize();
        
        return {
            point: pickInfo.pickedPoint,
            normal: normal,
            faceId: null
        };
    }

    // Listen here, sunshine. A 2D shape ain't rocket science
    _handle2DShape(mesh, clickInfo) {
        // Check if it's flat like my first girlfriend's personality
        const bounds = mesh.getBoundingInfo().boundingBox;
        const dimensions = bounds.maximum.subtract(bounds.minimum);

        // If one dimension is basically zero, it's flat
        const threshold = 0.001; // smaller than government efficiency
        const isFlat = dimensions.x < threshold ||
                      dimensions.y < threshold ||
                      dimensions.z < threshold;

        if (isFlat) {
            
            // Use the sketch plane normal, not some fancy calculation
            // The normal is perpendicular to the flat dimension
            const normal = this._getSketchPlaneNormal(dimensions);

            // Position in the normal direction like God intended
            return {
                position: clickInfo.point,
                direction: normal,
                isFlat: true
            };
        }

        return null; // Let regular logic handle it
    }

    _getSketchPlaneNormal(dimensions) {
        // Find which dimension is essentially zero (flat)
        const threshold = 0.001;
        
        if (dimensions.x < threshold) {
            // Flat in X direction, normal is X-axis
            return new BABYLON.Vector3(1, 0, 0);
        } else if (dimensions.y < threshold) {
            // Flat in Y direction, normal is Y-axis  
            return new BABYLON.Vector3(0, 1, 0);
        } else if (dimensions.z < threshold) {
            // Flat in Z direction, normal is Z-axis
            return new BABYLON.Vector3(0, 0, 1);
        }
        
        // Default to Y-up if not clearly flat
        return new BABYLON.Vector3(0, 1, 0);
    }

    // Here's where you kids always screw up. You're trying to be too clever
    _smartGizmoPosition(mesh, clickInfo, camera) {
        
        // Get the clicked face normal
        const faceData = this._getClickedFace(clickInfo);
        const faceNormal = faceData.normal;

        // Check if we're looking at the backside like a creeper
        const cameraDirection = camera.position.subtract(clickInfo.point).normalize();
        const dotProduct = BABYLON.Vector3.Dot(faceNormal, cameraDirection);


        // If we're looking at the back, flip it
        const adjustedNormal = dotProduct < 0 ? faceNormal.scale(-1) : faceNormal;

        // Position gizmo slightly off the surface
        const offset = this.RING_RADIUS * 0.2; // Adjust this based on your scale, genius
        const gizmoPosition = clickInfo.point.add(adjustedNormal.scale(offset));


        // Make gizmo face camera but aligned with surface
        return {
            position: gizmoPosition,
            normal: adjustedNormal,
            faceCamera: true
        };
    }

    dispose() {
        this.hide();
        
        // Ensure cursor is restored when disposing
        document.body.style.cursor = 'default';

        if (this._pointerObserver) {
            this.scene.onPointerObservable.remove(this._pointerObserver);
            this._pointerObserver = null;
        }

        // Dispose materials
        if (this._axis1Material) this._axis1Material.dispose();
        if (this._axis2Material) this._axis2Material.dispose();
        if (this._axis3Material) this._axis3Material.dispose();
        if (this._hoverMaterial) this._hoverMaterial.dispose();

        // Dispose gizmo container and children
        if (this.gizmoContainer) {
            this.gizmoContainer.dispose(false, true);
            this.gizmoContainer = null;
        }

        if (this.onRotate) {
            this.onRotate.clear();
        }

    }
}


    /**
     * CRITICAL: Serialize ALL workbench parts before saving
     * Ensures every board has complete geometry data preserved
     */
    serializeAllWorkbenchParts() {
        console.log("🔄 Serializing ALL workbench parts for complete data preservation...");
        
        this.workBenchParts.forEach((part, index) => {
            // Find the corresponding mesh
            const mesh = this.scene.meshes.find(m => m.name === part.id || (m.partData && m.partData.id === part.id));
            
            if (mesh) {
                // Serialize complete mesh geometry and properties
                const meshData = this.serializeMeshGeometry(mesh);
                part.meshGeometry = meshData;
                console.log("✅ Serialized workbench part " + (index + 1) + ": " + part.materialName);
            } else {
                console.warn("⚠️ No mesh found for workbench part: " + part.materialName);
            }
        });
        
        console.log("🎯 Completed serialization for " + this.workBenchParts.length + " workbench parts");
    }

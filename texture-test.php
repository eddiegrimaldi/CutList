<\!DOCTYPE html>
<html>
<head>
    <title>CutList Texture Test</title>
    <script src="https://cdn.babylonjs.com/babylon.js"></script>
    <style>
        body { margin: 0; overflow: hidden; font-family: monospace; }
        canvas { width: 100%; height: 100vh; display: block; }
        #info { position: absolute; top: 10px; left: 10px; background: rgba(255,255,255,0.9); padding: 10px; }
        .material-test { margin: 5px 0; }
        .success { color: green; }
        .error { color: red; }
    </style>
</head>
<body>
    <canvas id="renderCanvas"></canvas>
    <div id="info">
        <h3>Texture Loading Test</h3>
        <div id="results"></div>
    </div>
    
    <script>
        const canvas = document.getElementById('renderCanvas');
        const engine = new BABYLON.Engine(canvas, true);
        const scene = new BABYLON.Scene(engine);
        
        // Camera and light
        const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 3, 50, BABYLON.Vector3.Zero(), scene);
        camera.attachControl(canvas, true);
        new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
        
        const materials = [
            'walnut_001',
            'maple_001',
            'oak_red_001',
            'poplar_001',
            'birch_ply_001',
            'baltic_birch_001',
            'sande_ply_001'
        ];
        
        const results = document.getElementById('results');
        let xPos = -20;
        
        materials.forEach((materialId, index) => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'material-test';
            
            // Create a box for each material
            const box = BABYLON.MeshBuilder.CreateBox(materialId + '_box', {size: 5}, scene);
            box.position.x = xPos + (index * 7);
            
            // Create material with texture
            const material = new BABYLON.StandardMaterial(materialId + '_mat', scene);
            const texturePath = 'data/materials/' + materialId + '/' + materialId + '_texture.jpg';
            
            try {
                const texture = new BABYLON.Texture(texturePath, scene, false, true, 
                    BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
                    () => {
                        // onLoad callback
                        resultDiv.innerHTML = '<span class="success">✓ ' + materialId + ': Texture loaded</span>';
                        resultDiv.className += ' success';
                    },
                    () => {
                        // onError callback  
                        resultDiv.innerHTML = '<span class="error">✗ ' + materialId + ': Failed to load texture</span>';
                        resultDiv.className += ' error';
                        // Apply fallback color
                        const colors = {
                            'walnut_001': [0.36, 0.25, 0.22],
                            'maple_001': [0.96, 0.96, 0.86],
                            'oak_red_001': [0.76, 0.60, 0.42],
                            'poplar_001': [0.87, 0.83, 0.69],
                            'birch_ply_001': [0.96, 0.90, 0.83],
                            'baltic_birch_001': [0.97, 0.94, 0.89],
                            'sande_ply_001': [0.90, 0.84, 0.72]
                        };
                        const color = colors[materialId] || [0.8, 0.8, 0.8];
                        material.diffuseColor = new BABYLON.Color3(color[0], color[1], color[2]);
                    }
                );
                
                material.diffuseTexture = texture;
                material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                box.material = material;
                
            } catch (error) {
                resultDiv.innerHTML = '<span class="error">✗ ' + materialId + ': Exception: ' + error.message + '</span>';
            }
            
            results.appendChild(resultDiv);
        });
        
        engine.runRenderLoop(() => scene.render());
        window.addEventListener('resize', () => engine.resize());
    </script>
</body>
</html>

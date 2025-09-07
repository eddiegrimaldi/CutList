// Workspace Navigator - Universal transport and navigation system
// Manages movement between workbenches, mill, router, and custom spaces

export class WorkspaceNavigator {
    constructor(drawingWorld) {
        this.drawingWorld = drawingWorld;
        
        // All available workspaces
        this.workspaces = new Map([
            ['workbench', { name: 'Main Workbench', icon: '🔨', module: null }],
            ['mill', { name: 'The Mill', icon: '🪚', module: 'theMillSystem' }],
            ['router', { name: 'Router Table', icon: '🪵', module: 'theRouterTable' }],
            ['assembly', { name: 'Assembly Bench', icon: '🔧', module: null }],
            ['finishing', { name: 'Finishing Room', icon: '🎨', module: null }],
            ['scrap-bin', { name: 'Scrap Bin', icon: '🗑️', module: null }]
        ]);
        
        // Current location
        this.currentLocation = 'workbench';
        
        // Items at each location (would be managed by PartManager)
        this.itemsByLocation = new Map();
        
        console.log('📍 Workspace Navigator initialized');
    }
    
    // Create universal context menu for any mesh
    createUniversalContextMenu(mesh, event) {
        event.preventDefault();
        
        // Remove existing menu
        const existingMenu = document.getElementById('universal-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        // Create menu
        const menu = document.createElement('div');
        menu.id = 'universal-context-menu';
        menu.style.cssText = `
            position: absolute;
            left: ${event.clientX}px;
            top: ${event.clientY}px;
            background: white;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 8px 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10002;
            min-width: 200px;
            font-family: Arial, sans-serif;
        `;
        
        // Title
        const title = document.createElement('div');
        title.textContent = mesh.name || 'Part';
        title.style.cssText = `
            padding: 8px 16px;
            font-weight: bold;
            border-bottom: 1px solid #eee;
            margin-bottom: 4px;
            color: #333;
        `;
        menu.appendChild(title);
        
        // Send To section
        const sendToSection = document.createElement('div');
        sendToSection.style.cssText = `
            padding: 4px 0;
            border-bottom: 1px solid #eee;
        `;
        
        const sendToLabel = document.createElement('div');
        sendToLabel.textContent = 'Send To:';
        sendToLabel.style.cssText = `
            padding: 4px 16px;
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
        `;
        sendToSection.appendChild(sendToLabel);
        
        // Add workspace options
        this.workspaces.forEach((workspace, key) => {
            if (key !== this.currentLocation) {
                const item = this.createMenuItem(
                    `${workspace.icon} ${workspace.name}`,
                    () => this.sendTo(mesh, key)
                );
                sendToSection.appendChild(item);
            }
        });
        
        menu.appendChild(sendToSection);
        
        // Operations section
        const opsSection = document.createElement('div');
        opsSection.style.cssText = `
            padding: 4px 0;
            border-bottom: 1px solid #eee;
        `;
        
        const operations = [
            { text: '📐 Measure', action: () => this.measure(mesh) },
            { text: '📋 Duplicate', action: () => this.duplicate(mesh) },
            { text: '🏷️ Properties', action: () => this.showProperties(mesh) }
        ];
        
        operations.forEach(op => {
            const item = this.createMenuItem(op.text, op.action);
            opsSection.appendChild(item);
        });
        
        menu.appendChild(opsSection);
        
        // Quick Pick section
        const pickSection = document.createElement('div');
        pickSection.style.cssText = `
            padding: 4px 0;
        `;
        
        const pickLabel = document.createElement('div');
        pickLabel.textContent = 'Quick Pick From:';
        pickLabel.style.cssText = `
            padding: 4px 16px;
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
        `;
        pickSection.appendChild(pickLabel);
        
        // Show items at other locations
        this.workspaces.forEach((workspace, key) => {
            if (key !== this.currentLocation) {
                const itemCount = this.getItemCount(key);
                if (itemCount > 0) {
                    const item = this.createMenuItem(
                        `${workspace.icon} ${workspace.name} (${itemCount})`,
                        () => this.showQuickPick(key)
                    );
                    item.style.fontSize = '13px';
                    pickSection.appendChild(item);
                }
            }
        });
        
        menu.appendChild(pickSection);
        
        document.body.appendChild(menu);
        
        // Remove menu on click outside
        setTimeout(() => {
            document.addEventListener('click', function removeMenu() {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            });
        }, 100);
    }
    
    createMenuItem(text, action) {
        const item = document.createElement('div');
        item.textContent = text;
        item.style.cssText = `
            padding: 8px 16px;
            cursor: pointer;
            transition: background 0.2s;
            font-size: 14px;
        `;
        item.onmouseover = () => item.style.background = '#f0f0f0';
        item.onmouseout = () => item.style.background = 'white';
        item.onclick = () => {
            action();
            const menu = document.getElementById('universal-context-menu');
            if (menu) menu.remove();
        };
        return item;
    }
    
    sendTo(mesh, location) {
        console.log(`Sending ${mesh.name} to ${location}`);
        
        // Hide from current location
        mesh.isVisible = false;
        
        // Update part location (would be in PartManager)
        if (mesh.partData) {
            mesh.partData.location = location;
        }
        
        // Open target workspace if it has a module
        const workspace = this.workspaces.get(location);
        if (workspace && workspace.module && this.drawingWorld[workspace.module]) {
            // Open the workspace with the mesh
            if (workspace.module === 'theMillSystem') {
                this.drawingWorld.theMillSystem.openMill(mesh, 'cut');
            } else if (workspace.module === 'theRouterTable') {
                this.drawingWorld.theRouterTable.openRouterTable(mesh, 'route');
            }
        }
        
        // Show notification
        this.showNotification(`${mesh.name} sent to ${workspace.name}`);
    }
    
    showQuickPick(location) {
        console.log(`Opening quick pick for ${location}`);
        
        // Create a modal showing items at that location
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #333;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.4);
            z-index: 10003;
            min-width: 300px;
            max-width: 500px;
        `;
        
        const workspace = this.workspaces.get(location);
        
        const title = document.createElement('h3');
        title.textContent = `${workspace.icon} Pick from ${workspace.name}`;
        title.style.marginTop = '0';
        modal.appendChild(title);
        
        // List items (would come from PartManager)
        const itemList = document.createElement('div');
        itemList.style.cssText = `
            max-height: 400px;
            overflow-y: auto;
            margin: 15px 0;
        `;
        
        // Mock items for demo
        const items = ['Board 1', 'Cut Piece A', 'Routed Panel'];
        items.forEach(itemName => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = `
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: background 0.2s;
            `;
            itemDiv.textContent = itemName;
            itemDiv.onmouseover = () => itemDiv.style.background = '#f0f0f0';
            itemDiv.onmouseout = () => itemDiv.style.background = 'white';
            itemDiv.onclick = () => {
                this.pickItem(itemName, location);
                modal.remove();
            };
            itemList.appendChild(itemDiv);
        });
        
        modal.appendChild(itemList);
        
        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Cancel';
        closeBtn.style.cssText = `
            padding: 8px 20px;
            background: #666;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        `;
        closeBtn.onclick = () => modal.remove();
        modal.appendChild(closeBtn);
        
        document.body.appendChild(modal);
    }
    
    pickItem(itemName, fromLocation) {
        console.log(`Picking ${itemName} from ${fromLocation}`);
        
        // Would fetch the mesh from PartManager by location and name
        // Move it to current location
        // Make it visible
        
        this.showNotification(`${itemName} retrieved from ${this.workspaces.get(fromLocation).name}`);
    }
    
    getItemCount(location) {
        // Would query PartManager for count at location
        // Mock data for now
        const mockCounts = {
            'mill': 2,
            'router': 1,
            'assembly': 3,
            'scrap-bin': 5
        };
        return mockCounts[location] || 0;
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10004;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    measure(mesh) {
        console.log('Measuring:', mesh.name);
        // Would show dimensions overlay
    }
    
    duplicate(mesh) {
        console.log('Duplicating:', mesh.name);
        // Would create a copy at same location
    }
    
    showProperties(mesh) {
        console.log('Showing properties for:', mesh.name);
        // Would show properties panel
    }
}


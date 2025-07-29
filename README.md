# CutList CAD

A modern, web-based CAD application designed specifically for woodworking projects. Create precise 2D sketches and 3D models with an intuitive interface and powerful measurement tools.

## Features

### 🎯 Core Functionality
- **2D Sketching Mode**: Create precise technical drawings with line, rectangle, and circle tools
- **3D Modeling Mode**: Build three-dimensional models of your woodworking projects
- **Precision Grid**: Adaptive grid system with snap-to-grid functionality
- **Measurement Tools**: Built-in measuring and dimensioning capabilities

### 🎨 Modern Interface
- Clean, professional design
- Responsive layout for desktop and mobile
- Intuitive toolbar with tool selection
- Real-time status updates and coordinate display

### 🔧 Drawing Tools
- **Select Tool**: Pick and manipulate objects
- **Line Tool**: Draw straight lines with precision
- **Rectangle Tool**: Create rectangular shapes
- **Circle Tool**: Draw circles and arcs

### 📐 Precision Features
- Grid snapping for accurate placement
- Coordinate display for exact positioning
- Zoom and pan for detailed work
- Object selection and editing

## Getting Started

### Prerequisites
- Modern web browser with HTML5 Canvas support
- No additional software installation required

### Installation
1. Clone or download this repository
2. Open `index.html` in your web browser
3. Start designing!

### Development Setup
If you want to contribute or customize:

```bash
# Install dependencies (if using Node.js)
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

### Basic Workflow
1. **Open the application** - Start with the dashboard
2. **Create new project** - Click "New Project" to enter the workspace
3. **Select a tool** - Choose from Line, Rectangle, Circle, or Select
4. **Start drawing** - Click and drag to create shapes
5. **Switch modes** - Toggle between 2D Sketch and 3D Model modes

### Keyboard Shortcuts
- `S` - Select tool
- `L` - Line tool
- `R` - Rectangle tool
- `C` - Circle tool
- `G` - Toggle grid
- `Space` - Switch between sketch/modeling modes
- `Delete` - Delete selected objects
- `Escape` - Cancel current operation

### Mouse Controls
- **Left Click + Drag** - Draw shapes (when tool is selected)
- **Middle Click + Drag** - Pan view
- **Scroll Wheel** - Zoom in/out
- **Ctrl + Left Click + Drag** - Pan view (alternative)

## Project Structure

```
CutListApp/
├── index.html              # Main application page
├── package.json            # Project configuration
├── src/
│   ├── main.js             # Application entry point
│   ├── styles/
│   │   └── main.css        # Application styles
│   └── modules/
│       ├── camera.js       # Camera and viewport management
│       ├── grid.js         # Grid rendering and snapping
│       ├── drawing.js      # Shape rendering engine
│       ├── tools.js        # Drawing tool implementations
│       └── events.js       # User input handling
└── .github/
    └── copilot-instructions.md
```

## Architecture

### Modular Design
The application is built with a modular architecture:

- **CutListCAD** - Main application class and coordinator
- **CameraController** - Handles viewport, zoom, and coordinate transformations
- **GridRenderer** - Manages grid display and snap-to-grid functionality
- **DrawingEngine** - Renders shapes and handles hit testing
- **ToolManager** - Implements drawing tool behaviors
- **EventManager** - Handles user input and keyboard shortcuts

### Rendering Pipeline
1. Clear canvas
2. Render grid (if enabled)
3. Render all objects
4. Render temporary objects (during drawing)
5. Update status display

## Contributing

We welcome contributions! Here are some areas where you can help:

### Planned Features
- [ ] Import/Export functionality (DXF, SVG)
- [ ] Dimensioning tools
- [ ] Layer management
- [ ] 3D modeling tools
- [ ] Cut list generation
- [ ] Material library
- [ ] Project templates

### Development Guidelines
- Follow ES6 module patterns
- Maintain clean separation between modules
- Write readable, documented code
- Test on multiple browsers
- Ensure responsive design

## Technical Details

### Browser Compatibility
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Performance
- Optimized canvas rendering
- Efficient hit testing algorithms
- Responsive grid system
- Smooth zoom and pan operations

## License

MIT License - see LICENSE file for details

## Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Check the documentation
- Review existing issues for similar problems

---

**CutList CAD** - Making woodworking design accessible and precise.

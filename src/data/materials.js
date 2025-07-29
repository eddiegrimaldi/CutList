// Materials database for woodworking

const MATERIALS_DATABASE = {
    // Hardwoods
    oak: {
        name: 'Oak',
        category: 'hardwood',
        density: 0.75, // g/cm³
        cost: 8.50, // per board foot
        properties: {
            hardness: 'hard',
            grain: 'open',
            workability: 'good',
            finishing: 'excellent'
        },
        colors: ['light brown', 'medium brown'],
        description: 'Durable hardwood excellent for furniture and cabinetry'
    },
    maple: {
        name: 'Maple',
        category: 'hardwood',
        density: 0.70,
        cost: 7.25,
        properties: {
            hardness: 'hard',
            grain: 'closed',
            workability: 'excellent',
            finishing: 'excellent'
        },
        colors: ['cream', 'light brown'],
        description: 'Fine-grained hardwood perfect for detailed work'
    },
    walnut: {
        name: 'Walnut',
        category: 'hardwood',
        density: 0.65,
        cost: 12.00,
        properties: {
            hardness: 'medium-hard',
            grain: 'open',
            workability: 'excellent',
            finishing: 'excellent'
        },
        colors: ['chocolate brown', 'purple-brown'],
        description: 'Premium hardwood with beautiful grain patterns'
    },
    cherry: {
        name: 'Cherry',
        category: 'hardwood',
        density: 0.58,
        cost: 9.75,
        properties: {
            hardness: 'medium-hard',
            grain: 'closed',
            workability: 'excellent',
            finishing: 'excellent'
        },
        colors: ['light pink', 'reddish brown'],
        description: 'Ages beautifully, ideal for fine furniture'
    },
    
    // Softwoods
    pine: {
        name: 'Pine',
        category: 'softwood',
        density: 0.43,
        cost: 3.50,
        properties: {
            hardness: 'soft',
            grain: 'prominent',
            workability: 'good',
            finishing: 'good'
        },
        colors: ['cream', 'light yellow'],
        description: 'Affordable softwood great for construction and general use'
    },
    cedar: {
        name: 'Cedar',
        category: 'softwood',
        density: 0.38,
        cost: 4.75,
        properties: {
            hardness: 'soft',
            grain: 'straight',
            workability: 'excellent',
            finishing: 'good'
        },
        colors: ['light red', 'pinkish'],
        description: 'Aromatic and naturally resistant to insects and decay'
    },
    fir: {
        name: 'Douglas Fir',
        category: 'softwood',
        density: 0.51,
        cost: 4.25,
        properties: {
            hardness: 'medium-soft',
            grain: 'straight',
            workability: 'good',
            finishing: 'fair'
        },
        colors: ['light brown', 'reddish'],
        description: 'Strong structural wood commonly used in construction'
    },
    
    // Engineered Woods
    plywood: {
        name: 'Plywood',
        category: 'engineered',
        density: 0.55,
        cost: 2.85,
        properties: {
            hardness: 'varies',
            grain: 'alternating',
            workability: 'good',
            finishing: 'good'
        },
        colors: ['varies by veneer'],
        description: 'Versatile engineered wood with cross-grain construction'
    },
    mdf: {
        name: 'MDF (Medium Density Fiberboard)',
        category: 'engineered',
        density: 0.75,
        cost: 1.95,
        properties: {
            hardness: 'medium',
            grain: 'none',
            workability: 'excellent',
            finishing: 'excellent'
        },
        colors: ['tan', 'brown'],
        description: 'Smooth, consistent surface perfect for painted finishes'
    },
    particleboard: {
        name: 'Particleboard',
        category: 'engineered',
        density: 0.68,
        cost: 1.25,
        properties: {
            hardness: 'medium-soft',
            grain: 'none',
            workability: 'fair',
            finishing: 'poor'
        },
        colors: ['tan', 'brown'],
        description: 'Budget-friendly option for non-structural applications'
    },
    osb: {
        name: 'OSB (Oriented Strand Board)',
        category: 'engineered',
        density: 0.64,
        cost: 1.75,
        properties: {
            hardness: 'medium',
            grain: 'oriented strands',
            workability: 'fair',
            finishing: 'poor'
        },
        colors: ['tan', 'brown'],
        description: 'Structural engineered wood for sheathing and subflooring'
    }
};

// Common woodworking joints
const JOINTS_LIBRARY = {
    butt: {
        name: 'Butt Joint',
        difficulty: 'beginner',
        strength: 'low',
        tools: ['saw'],
        description: 'Simple end-to-end connection',
        uses: ['basic frames', 'simple boxes']
    },
    miter: {
        name: 'Miter Joint',
        difficulty: 'intermediate',
        strength: 'medium',
        tools: ['miter saw', 'miter box'],
        description: '45-degree angled cuts for corners',
        uses: ['picture frames', 'trim work']
    },
    dadoGroove: {
        name: 'Dado/Groove Joint',
        difficulty: 'intermediate',
        strength: 'high',
        tools: ['router', 'dado blade'],
        description: 'Channel cut across or with the grain',
        uses: ['shelving', 'drawer construction']
    },
    mortiseAndTenon: {
        name: 'Mortise and Tenon',
        difficulty: 'advanced',
        strength: 'very high',
        tools: ['chisel', 'drill', 'saw'],
        description: 'Traditional strong joint with protruding tenon',
        uses: ['furniture legs', 'door frames']
    },
    dovetail: {
        name: 'Dovetail Joint',
        difficulty: 'advanced',
        strength: 'very high',
        tools: ['dovetail saw', 'chisel'],
        description: 'Interlocking wedge-shaped joint',
        uses: ['drawer corners', 'fine boxes']
    },
    fingerBox: {
        name: 'Finger/Box Joint',
        difficulty: 'intermediate',
        strength: 'high',
        tools: ['table saw', 'jig'],
        description: 'Interlocking rectangular fingers',
        uses: ['boxes', 'drawers']
    }
};

// Standard lumber dimensions
const LUMBER_DIMENSIONS = {
    // Nominal vs Actual dimensions (inches)
    '1x2': { nominal: [1, 2], actual: [0.75, 1.5] },
    '1x3': { nominal: [1, 3], actual: [0.75, 2.5] },
    '1x4': { nominal: [1, 4], actual: [0.75, 3.5] },
    '1x6': { nominal: [1, 6], actual: [0.75, 5.5] },
    '1x8': { nominal: [1, 8], actual: [0.75, 7.25] },
    '1x10': { nominal: [1, 10], actual: [0.75, 9.25] },
    '1x12': { nominal: [1, 12], actual: [0.75, 11.25] },
    '2x2': { nominal: [2, 2], actual: [1.5, 1.5] },
    '2x3': { nominal: [2, 3], actual: [1.5, 2.5] },
    '2x4': { nominal: [2, 4], actual: [1.5, 3.5] },
    '2x6': { nominal: [2, 6], actual: [1.5, 5.5] },
    '2x8': { nominal: [2, 8], actual: [1.5, 7.25] },
    '2x10': { nominal: [2, 10], actual: [1.5, 9.25] },
    '2x12': { nominal: [2, 12], actual: [1.5, 11.25] },
    '4x4': { nominal: [4, 4], actual: [3.5, 3.5] },
    '6x6': { nominal: [6, 6], actual: [5.5, 5.5] }
};

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MATERIALS_DATABASE,
        JOINTS_LIBRARY,
        LUMBER_DIMENSIONS
    };
}

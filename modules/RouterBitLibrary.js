// Router Bit Library
var RouterBitLibrary = {
    bits: {
        rabbet_half: {
            name: "1/2\" Rabbet",
            profilePoints: [
                [0, 0],
                [-0.50, 0],     // Cut 1/2" into board
                [-0.50, 0.50],  // Cut 1/2" down
                [0, 0.50],
                [0, 0]
            ],
            description: 'Creates rabbet joints',
            minBoardThickness: 0.75,
            depthAdjustable: true,
        },
            roundover_quarter_inch_precise: {
            name: "1/4\" Roundover (Precise)",
            profilePoints: [
                [0, 0],
                [-0.0008, 0.0196],
                [-0.0031, 0.0391],
                [-0.0069, 0.0584],
                [-0.0122, 0.0773],
                [-0.019, 0.0957],
                [-0.0272, 0.1135],
                [-0.0368, 0.1306],
                [-0.0477, 0.1469],
                [-0.0599, 0.1624],
                [-0.0732, 0.1768],
                [-0.0876, 0.1901],
                [-0.1031, 0.2023],
                [-0.1194, 0.2132],
                [-0.1365, 0.2228],
                [-0.1543, 0.231],
                [-0.1727, 0.2378],
                [-0.1916, 0.2431],
                [-0.2109, 0.2469],
                [-0.2304, 0.2492],
                [-0.25, 0.25]
            ],
            description: 'Precise 1/4\" radius roundover',
            minBoardThickness: 0.5
        },
        roundover_quarter_inch_precise: {
            name: '1/4" Roundover (Precise)',
            profilePoints: [
                [0, 0],
                [-0.0008, 0.0196],
                [-0.0031, 0.0391],
                [-0.0069, 0.0584],
                [-0.0122, 0.0773],
                [-0.019, 0.0957],
                [-0.0272, 0.1135],
                [-0.0368, 0.1306],
                [-0.0477, 0.1469],
                [-0.0599, 0.1624],
                [-0.0732, 0.1768],
                [-0.0876, 0.1901],
                [-0.1031, 0.2023],
                [-0.1194, 0.2132],
                [-0.1365, 0.2228],
                [-0.1543, 0.231],
                [-0.1727, 0.2378],
                [-0.1916, 0.2431],
                [-0.2109, 0.2469],
                [-0.2304, 0.2492],
                [-0.25, 0.25]
            ],
            description: 'Precise 1/4" radius roundover',
            minBoardThickness: 0.5
        },
        roundover_half_inch_precise: {
            name: '1/2" Roundover (Precise)',
            profilePoints: [
                [0, 0],
                [-0.0015, 0.0392],
                [-0.0062, 0.0782],
                [-0.0138, 0.1167],
                [-0.0245, 0.1545],
                [-0.0381, 0.1913],
                [-0.0545, 0.227],
                [-0.0737, 0.2612],
                [-0.0955, 0.2939],
                [-0.1198, 0.3247],
                [-0.1464, 0.3536],
                [-0.1753, 0.3802],
                [-0.2061, 0.4045],
                [-0.2388, 0.4263],
                [-0.273, 0.4455],
                [-0.3087, 0.4619],
                [-0.3455, 0.4755],
                [-0.3833, 0.4862],
                [-0.4218, 0.4938],
                [-0.4608, 0.4985],
                [-0.5, 0.5]
            ],
            description: 'Precise 1/2" radius roundover',
            minBoardThickness: 1.0
        },
        chamfer_quarter_inch_precise: {
            name: '1/4" Chamfer (Precise)',
            profilePoints: [
                [0, 0],
                [-0.25, 0.25]
            ],
            description: 'Precise 45-degree chamfer, 1/4" deep',
            minBoardThickness: 0.5
        },
        chamfer_half_inch_precise: {
            name: '1/2" Chamfer (Precise)',
            profilePoints: [
                [0, 0],
                [-0.5, 0.5]
            ],
            description: 'Precise 45-degree chamfer, 1/2" deep',
            minBoardThickness: 1.0
        },
        roundover_half_inch_precise: {
            name: "1/2\" Roundover (Precise)",
            profilePoints: [
                [0, 0],
                [-0.0015, 0.0392],
                [-0.0062, 0.0782],
                [-0.0138, 0.1167],
                [-0.0245, 0.1545],
                [-0.0381, 0.1913],
                [-0.0545, 0.227],
                [-0.0737, 0.2612],
                [-0.0955, 0.2939],
                [-0.1198, 0.3247],
                [-0.1464, 0.3536],
                [-0.1753, 0.3802],
                [-0.2061, 0.4045],
                [-0.2388, 0.4263],
                [-0.273, 0.4455],
                [-0.3087, 0.4619],
                [-0.3455, 0.4755],
                [-0.3833, 0.4862],
                [-0.4218, 0.4938],
                [-0.4608, 0.4985],
                [-0.5, 0.5]
            ],
            description: 'Precise 1/2\" radius roundover',
            minBoardThickness: 1.0
        },
        chamfer_quarter_inch_precise: {
            name: "1/4\" Chamfer (Precise)",
            profilePoints: [
                [0, 0],
                [-0.25, 0.25]
            ],
            description: 'Precise 45-degree chamfer, 1/4\" deep',
            minBoardThickness: 0.5
        },
        chamfer_half_inch_precise: {
            name: "1/2\" Chamfer (Precise)",
            profilePoints: [
                [0, 0],
                [-0.5, 0.5]
            ],
            description: 'Precise 45-degree chamfer, 1/2\" deep',
            minBoardThickness: 1.0
        },

        
        // ===== NEWLY ADDED BITS FROM 2D IMAGES =====
        
        // Roundover - Quarter Inch - Precise profile from image

        
        // Roundover - Half Inch - Precise profile from image

        
        // Chamfer - Quarter Inch - Precise 45° bevel

        
        // Chamfer - Half Inch - Precise 45° bevel

    }
};

// Make it globally available
window.RouterBitLibrary = RouterBitLibrary;

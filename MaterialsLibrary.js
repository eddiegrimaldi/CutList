// Materials Library - JSON-based material database with SQL Server migration path
// Handles all material data access, filtering, and management

class MaterialsLibrary {
    constructor() {
        this.materials = null;
        this.categories = null;
        this.isLoaded = false;
        this.databaseUrl = 'materials-database.json';
    }

    /**
     * Load materials database from JSON file
     * @returns {Promise<boolean>} Success status
     */
    async loadDatabase() {
        try {
            
            // Add cache-busting parameter for development
            const cacheBuster = `?v=${Date.now()}`;
            const response = await fetch(this.databaseUrl + cacheBuster);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Validate database structure
            if (!data.materials || !data.categories) {
                throw new Error('Invalid database structure - missing materials or categories');
            }
            
            this.materials = data.materials;
            console.log("🔍 MaterialsLibrary loaded:", typeof this.materials, Object.keys(this.materials).length, "materials");
            this.categories = data.categories;
            this.databaseInfo = data.database_info;
            this.lumberGrades = data.lumber_grades;
            this.isLoaded = true;
            
            return true;
            
        } catch (error) {
            this.isLoaded = false;
            return false;
        }
    }

    /**
     * Get all available categories
     * @returns {Array} Array of category objects
     */
    getCategories() {
        if (!this.isLoaded) {
            return [];
        }
        
        return Object.values(this.categories)
            .filter(cat => cat.enabled !== false)
            .sort((a, b) => a.sort_order - b.sort_order);
    }

    /**
     * Get materials by category
     * @param {string} categoryId - Category identifier
     * @returns {Array} Array of material objects
     */
    getMaterialsByCategory(categoryId) {
        if (!this.isLoaded) {
            return [];
        }
        
        return Object.values(this.materials)
            .filter(material => material.category === categoryId && material.enabled)
            .sort((a, b) => a.basic_info.common_name.localeCompare(b.basic_info.common_name));
    }

    /**
     * Get specific material by ID
     * @param {string} materialId - Material identifier
     * @returns {Object|null} Material object or null if not found
     */
    getMaterial(materialId) {
        if (!this.isLoaded) {
            return null;
        }
        
        return this.materials[materialId] || null;
    }

    /**
     * Search materials by name or description
     * @param {string} searchTerm - Search query
     * @returns {Array} Array of matching material objects
     */
    searchMaterials(searchTerm) {
        if (!this.isLoaded) {
            return [];
        }
        
        const term = searchTerm.toLowerCase();
        return Object.values(this.materials)
            .filter(material => {
                return material.enabled && (
                    material.basic_info.common_name.toLowerCase().includes(term) ||
                    material.basic_info.scientific_name.toLowerCase().includes(term) ||
                    material.basic_info.description.toLowerCase().includes(term)
                );
            })
            .sort((a, b) => a.basic_info.common_name.localeCompare(b.basic_info.common_name));
    }

    /**
     * Filter materials by properties
     * @param {Object} filters - Filter criteria
     * @returns {Array} Array of filtered material objects
     */
    filterMaterials(filters) {
        if (!this.isLoaded) {
            return [];
        }
        
        return Object.values(this.materials).filter(material => {
            if (!material.enabled) return false;
            
            // Category filter
            if (filters.category && material.category !== filters.category) {
                return false;
            }
            
            // Price range filter
            if (filters.priceMin && material.economic_properties.price_per_board_foot < filters.priceMin) {
                return false;
            }
            if (filters.priceMax && material.economic_properties.price_per_board_foot > filters.priceMax) {
                return false;
            }
            
            // Hardness range filter
            if (filters.hardnessMin && material.physical_properties.hardness_janka < filters.hardnessMin) {
                return false;
            }
            if (filters.hardnessMax && material.physical_properties.hardness_janka > filters.hardnessMax) {
                return false;
            }
            
            // Workability filter
            if (filters.workability && material.mechanical_properties.workability_rating !== filters.workability) {
                return false;
            }
            
            // Availability filter
            if (filters.availability && material.economic_properties.availability !== filters.availability) {
                return false;
            }
            
            return true;
        });
    }

    /**
     * Calculate board feet for given dimensions
     * @param {number} lengthInches - Length in inches
     * @param {number} widthInches - Width in inches  
     * @param {number} thicknessInches - Thickness in inches
     * @returns {number} Board feet
     */
    calculateBoardFeet(lengthInches, widthInches, thicknessInches) {
        return (lengthInches * widthInches * thicknessInches) / 144;
    }

    /**
     * Calculate material cost
     * @param {string} materialId - Material identifier
     * @param {number} lengthInches - Length in inches
     * @param {number} widthInches - Width in inches
     * @param {number} thicknessInches - Thickness in inches
     * @param {string} grade - Lumber grade (optional)
     * @returns {Object} Cost calculation result
     */
    calculateCost(materialId, lengthInches, widthInches, thicknessInches, grade = null) {
        const material = this.getMaterial(materialId);
        if (!material) {
            return { error: 'Material not found' };
        }
        
        const boardFeet = this.calculateBoardFeet(lengthInches, widthInches, thicknessInches);
        let pricePerBoardFoot = material.economic_properties.price_per_board_foot;
        
        // Apply grade multiplier if specified
        if (grade && this.lumberGrades[grade]) {
            pricePerBoardFoot *= this.lumberGrades[grade].price_multiplier;
        }
        
        const totalCost = boardFeet * pricePerBoardFoot;
        
        return {
            boardFeet: parseFloat(boardFeet.toFixed(3)),
            pricePerBoardFoot: parseFloat(pricePerBoardFoot.toFixed(2)),
            totalCost: parseFloat(totalCost.toFixed(2)),
            grade: grade || material.default_configuration.grade,
            material: material.basic_info.common_name
        };
    }

    /**
     * Get available standard dimensions for a material
     * @param {string} materialId - Material identifier
     * @returns {Object} Available dimensions
     */
    getStandardDimensions(materialId) {
        const material = this.getMaterial(materialId);
        return material ? material.standard_dimensions : null;
    }

    /**
     * Get default configuration for a material
     * @param {string} materialId - Material identifier
     * @returns {Object} Default configuration
     */
    getDefaultConfiguration(materialId) {
        const material = this.getMaterial(materialId);
        return material ? material.default_configuration : null;
    }

    /**
     * Validate dimensions against standard sizes
     * @param {string} materialId - Material identifier
     * @param {number} lengthInches - Requested length
     * @param {number} widthInches - Requested width
     * @param {number} thicknessInches - Requested thickness
     * @returns {Object} Validation result
     */
    validateDimensions(materialId, lengthInches, widthInches, thicknessInches) {
        const material = this.getMaterial(materialId);
        if (!material) {
            return { valid: false, error: 'Material not found' };
        }
        
        const std = material.standard_dimensions;
        const issues = [];
        
        // Check if dimensions are available in standard sizes
        if (!std.available_lengths.includes(lengthInches)) {
            issues.push(`Length ${lengthInches}" not available. Available: ${std.available_lengths.join(', ')}`);
        }
        
        if (!std.available_widths.includes(widthInches)) {
            issues.push(`Width ${widthInches}" not available. Available: ${std.available_widths.join(', ')}`);
        }
        
        if (!std.available_thicknesses.includes(thicknessInches)) {
            issues.push(`Thickness ${thicknessInches}" not available. Available: ${std.available_thicknesses.join(', ')}`);
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            standardDimensions: std
        };
    }

    /**
     * Get material texture paths for 3D rendering
     * @param {string} materialId - Material identifier
     * @returns {Object} Texture file paths
     */
    getTexturePaths(materialId) {
        const material = this.getMaterial(materialId);
        return material ? material.visual_assets : null;
    }

    /**
     * Generate material summary for UI display
     * @param {string} materialId - Material identifier
     * @returns {Object} Material summary
     */
    getMaterialSummary(materialId) {
        const material = this.getMaterial(materialId);
        if (!material) return null;
        
        const defaultConfig = material.default_configuration;
        const costInfo = this.calculateCost(
            materialId, 
            defaultConfig.length_inches,
            defaultConfig.width_inches, 
            defaultConfig.thickness_inches,
            defaultConfig.grade
        );
        
        return {
            id: material.material_id,
            name: material.basic_info.common_name,
            description: material.basic_info.description,
            category: material.category,
            defaultDimensions: `${defaultConfig.length_inches}" × ${defaultConfig.width_inches}" × ${defaultConfig.thickness_inches}"`,
            defaultCost: costInfo.totalCost,
            pricePerBoardFoot: costInfo.pricePerBoardFoot,
            thumbnail: material.visual_assets.thumbnail,
            hardness: material.physical_properties.hardness_janka,
            workability: material.mechanical_properties.workability_rating,
            availability: material.economic_properties.availability
        };
    }

    /**
     * Get all lumber grades
     * @returns {Object} Lumber grades with descriptions
     */
    getLumberGrades() {
        return this.lumberGrades || {};
    }

    /**
     * Get database information
     * @returns {Object} Database metadata
     */
    /**
     * Get all materials as an array
     * @returns {Array} Array of all material objects
     */
    getAllMaterials() {
        if (!this.isLoaded || !this.materials) {
            return [];
        }
        return Object.values(this.materials).filter(material => material.enabled !== false);
    }

    getDatabaseInfo() {
        return this.databaseInfo || {};
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MaterialsLibrary;
}

// Global instance for browser use
if (typeof window !== 'undefined') {
    window.MaterialsLibrary = MaterialsLibrary;
}
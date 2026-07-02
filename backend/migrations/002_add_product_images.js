/**
 * Database Migration: Add Product Image Fields
 * Adds image_url, image_thumbnail_url, and has_image fields to products table
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add image_url column
      await queryInterface.addColumn('products', 'image_url', {
        type: Sequelize.STRING(500),
        allowNull: true,
        defaultValue: null
      });

      console.log('✅ Added image_url column to products table');

      // Add image_thumbnail_url column
      await queryInterface.addColumn('products', 'image_thumbnail_url', {
        type: Sequelize.STRING(500),
        allowNull: true,
        defaultValue: null
      });

      console.log('✅ Added image_thumbnail_url column to products table');

      // Add has_image column
      await queryInterface.addColumn('products', 'has_image', {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      });

      console.log('✅ Added has_image column to products table');

      console.log('✅ Product image migration completed successfully');
    } catch (error) {
      console.error('❌ Error in product image migration:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    try {
      // Remove has_image column
      await queryInterface.removeColumn('products', 'has_image');
      console.log('✅ Removed has_image column from products table');

      // Remove image_thumbnail_url column
      await queryInterface.removeColumn('products', 'image_thumbnail_url');
      console.log('✅ Removed image_thumbnail_url column from products table');

      // Remove image_url column
      await queryInterface.removeColumn('products', 'image_url');
      console.log('✅ Removed image_url column from products table');

      console.log('✅ Product image migration rollback completed');
    } catch (error) {
      console.error('❌ Error in product image migration rollback:', error);
      throw error;
    }
  }
};
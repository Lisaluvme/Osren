/**
 * Initial Database Schema Migration
 *
 * Creates all core tables for the OSREN ERP-Lite system including:
 * - Users and authentication
 * - Roles and permissions
 * - Documents and workflow
 * - Audit logs
 * - Notifications
 * - File attachments
 * - Customers and vendors
 * - Products/Inventory
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create roles table
    await queryInterface.createTable('roles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      display_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      }
    });

    // Create users table
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid')
      },
      email: {
        type: Sequelize.STRING(255),
        unique: true,
        allowNull: false
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      full_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      role_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'roles',
          key: 'id'
        },
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      last_login: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      }
    });

    // Create document_types table
    await queryInterface.createTable('document_types', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      display_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      prefix: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      requires_customer_acknowledgement: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      }
    });

    // Create customers table
    await queryInterface.createTable('customers', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid')
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      postal_code: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      country: {
        type: Sequelize.STRING(100),
        defaultValue: 'Malaysia'
      },
      tax_id: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      payment_terms: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      credit_limit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      }
    });

    // Create vendors table
    await queryInterface.createTable('vendors', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid')
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      postal_code: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      country: {
        type: Sequelize.STRING(100),
        defaultValue: 'Malaysia'
      },
      tax_id: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      payment_terms: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      }
    });

    // Create products table (enhanced inventory)
    await queryInterface.createTable('products', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid')
      },
      sku: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      category: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      brand: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      unit: {
        type: Sequelize.STRING(50),
        defaultValue: 'pcs'
      },
      unit_cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      selling_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      min_stock_level: {
        type: Sequelize.INTEGER,
        defaultValue: 10
      },
      max_stock_level: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      reorder_quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 50
      },
      supplier_id: {
        type: Sequelize.UUID,
        references: {
          model: 'vendors',
          key: 'id'
        },
        allowNull: true
      },
      last_movement: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      }
    });

    // Create documents table (unified document schema)
    await queryInterface.createTable('documents', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid')
      },
      type: {
        type: Sequelize.STRING(50),
        references: {
          model: 'document_types',
          key: 'name'
        },
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'draft'
      },
      document_number: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      customer_id: {
        type: Sequelize.UUID,
        references: {
          model: 'customers',
          key: 'id'
        },
        allowNull: true
      },
      vendor_id: {
        type: Sequelize.UUID,
        references: {
          model: 'vendors',
          key: 'id'
        },
        allowNull: true
      },
      created_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        allowNull: false
      },
      assigned_to: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        allowNull: true
      },
      data: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      total_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'MYR'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      internal_notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      approved_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      signature_data: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      customer_acknowledged_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      customer_acknowledgement_data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      }
    });

    // Create document_items table
    await queryInterface.createTable('document_items', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid')
      },
      document_id: {
        type: Sequelize.UUID,
        references: {
          model: 'documents',
          key: 'id'
        },
        allowNull: false,
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.UUID,
        references: {
          model: 'products',
          key: 'id'
        },
        allowNull: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      unit_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      discount_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      tax_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      line_total: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      }
    });

    // Create workflow_transitions table
    await queryInterface.createTable('workflow_transitions', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid')
      },
      document_id: {
        type: Sequelize.UUID,
        references: {
          model: 'documents',
          key: 'id'
        },
        allowNull: false,
        onDelete: 'CASCADE'
      },
      from_status: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      to_status: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      transitioned_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        allowNull: false
      },
      comments: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      },
      transitioned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      }
    });

    // Create audit_logs table
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid')
      },
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      performed_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        allowNull: false
      },
      performed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      },
      old_values: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      new_values: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      }
    });

    // Create notifications table
    await queryInterface.createTable('notifications', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid')
      },
      user_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        allowNull: false
      },
      type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      related_entity_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      related_entity_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      }
    });

    // Create file_attachments table
    await queryInterface.createTable('file_attachments', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid')
      },
      document_id: {
        type: Sequelize.UUID,
        references: {
          model: 'documents',
          key: 'id'
        },
        allowNull: true,
        onDelete: 'CASCADE'
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: false
      },
      mime_type: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      uploaded_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        allowNull: false
      },
      uploaded_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
      }
    });

    // Create stock_movements table
    await queryInterface.createTable('stock_movements', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.fn('gen_random_uuid')
      },
      product_id: {
        type: Sequelize.UUID,
        references: {
          model: 'products',
          key: 'id'
        },
        allowNull: false
      },
      movement_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      reference_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      reference_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      performed_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        allowNull: false
      },
      performed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('documents', ['type', 'status']);
    await queryInterface.addIndex('documents', ['created_by']);
    await queryInterface.addIndex('documents', ['assigned_to']);
    await queryInterface.addIndex('documents', ['customer_id']);
    await queryInterface.addIndex('documents', ['document_number']);
    await queryInterface.addIndex('workflow_transitions', ['document_id']);
    await queryInterface.addIndex('audit_logs', ['entity_type', 'entity_id']);
    await queryInterface.addIndex('audit_logs', ['performed_by']);
    await queryInterface.addIndex('notifications', ['user_id', 'is_read']);
    await queryInterface.addIndex('file_attachments', ['document_id']);
    await queryInterface.addIndex('products', ['sku']);
    await queryInterface.addIndex('stock_movements', ['product_id']);
    await queryInterface.addIndex('users', ['email']);
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order of creation (to handle foreign key constraints)
    await queryInterface.dropTable('stock_movements');
    await queryInterface.dropTable('file_attachments');
    await queryInterface.dropTable('notifications');
    await queryInterface.dropTable('audit_logs');
    await queryInterface.dropTable('workflow_transitions');
    await queryInterface.dropTable('document_items');
    await queryInterface.dropTable('documents');
    await queryInterface.dropTable('products');
    await queryInterface.dropTable('vendors');
    await queryInterface.dropTable('customers');
    await queryInterface.dropTable('document_types');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('roles');
  }
};

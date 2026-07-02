const db = require('./models');
const { User, Role } = db;
const sequelize = db.sequelize;

async function checkRoles() {
  try {
    console.log('Database connection established successfully.');

    const roles = await Role.findAll();
    console.log('\nCurrent roles in database:');
    if (roles.length === 0) {
      console.log('No roles found. Creating default roles...');
      await createDefaultRoles();
      // Fetch roles again after creation
      const updatedRoles = await Role.findAll();
      updatedRoles.forEach(role => {
        console.log(`- ${role.name} (${role.display_name}) - Level: ${role.level}`);
      });
    } else {
      roles.forEach(role => {
        console.log(`- ${role.name} (${role.display_name}) - Level: ${role.level}`);
      });
    }

    console.log('\nChecking existing users...');
    const users = await User.findAll({ include: [{ model: Role, as: 'role' }] });
    console.log(`Found ${users.length} users in database.`);

    if (users.length === 0) {
      console.log('No users found. Would you like to create test users?');
    } else {
      console.log('\nExisting users:');
      users.forEach(user => {
        console.log(`- ${user.email} (${user.full_name}) - Role: ${user.role?.name || 'No role'}`);
      });
    }

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function createDefaultRoles() {
  const roles = [
    { name: 'admin', display_name: 'Administrator', description: 'Full system access', level: 100 },
    { name: 'manager', display_name: 'Manager', description: 'Can create, edit, and view', level: 75 },
    { name: 'staff', display_name: 'Staff', description: 'View and limited edit access', level: 50 },
    { name: 'viewer', display_name: 'Viewer', description: 'Read-only access', level: 25 }
  ];

  for (const role of roles) {
    await Role.create(role);
    console.log(`Created role: ${role.name}`);
  }
}

checkRoles();
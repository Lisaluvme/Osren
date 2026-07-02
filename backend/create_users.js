const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function createUsersWithRoles() {
  try {
    console.log('🔧 Creating users with different roles via API...\n');

    const usersToCreate = [
      {
        email: 'admin@osren.com',
        password: 'Admin123',
        full_name: 'System Administrator',
        role_name: 'admin'
      },
      {
        email: 'manager@osren.com',
        password: 'Manager123',
        full_name: 'Operations Manager',
        role_name: 'manager'
      },
      {
        email: 'staff@osren.com',
        password: 'Staff123',
        full_name: 'Staff Member',
        role_name: 'staff'
      },
      {
        email: 'viewer@osren.com',
        password: 'Viewer123',
        full_name: 'View Only User',
        role_name: 'viewer'
      }
    ];

    let createdCount = 0;

    for (const userData of usersToCreate) {
      try {
        console.log(`Creating user: ${userData.email} with role: ${userData.role_name}...`);

        const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);

        if (response.data.success) {
          console.log(`✓ Successfully created: ${userData.email}`);
          console.log(`  Role: ${response.data.data.user.role?.name || userData.role_name}`);
          console.log(`  User ID: ${response.data.data.user.id}`);
          createdCount++;
        }

      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
          console.log(`○ User ${userData.email} already exists. Skipping...`);
        } else {
          console.error(`✗ Failed to create ${userData.email}:`, error.response?.data?.error || error.message);
        }
      }
      console.log('');
    }

    console.log(`\n✅ Successfully created ${createdCount} new users.`);

    if (createdCount > 0 || usersToCreate.length > 0) {
      console.log('\n📝 Login Credentials:');
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log('│ Email                        │ Password        │ Role    │');
      console.log('├─────────────────────────────────────────────────────────┤');
      usersToCreate.forEach(userData => {
        const { email, password, role_name } = userData;
        console.log(`│ ${email.padEnd(29)} │ ${password.padEnd(15)} │ ${role_name.padEnd(7)} │`);
      });
      console.log('└─────────────────────────────────────────────────────────┘');
      console.log('\n⚠️  IMPORTANT: These are test credentials. Change them in production!');
    }

    // Test login functionality
    console.log('\n🧪 Testing login functionality...');
    await testLogin('admin@osren.com', 'Admin123');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testLogin(email, password) {
  try {
    console.log(`\n🔐 Testing login for: ${email}`);

    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });

    if (response.data.success) {
      console.log('✓ Login successful!');
      console.log(`  User: ${response.data.data.user.full_name}`);
      console.log(`  Email: ${response.data.data.user.email}`);
      console.log(`  Role: ${response.data.data.user.role?.name || 'No role'}`);
      console.log(`  Access Token: ${response.data.data.accessToken.substring(0, 20)}...`);
      console.log(`  Expires in: ${response.data.data.expiresIn}`);

      // Test getting current user
      console.log('\n👤 Testing current user endpoint...');
      const userResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${response.data.data.accessToken}`
        }
      });

      if (userResponse.data.success) {
        console.log('✓ Current user retrieval successful!');
        console.log(`  User: ${userResponse.data.data.full_name}`);
        console.log(`  Role: ${userResponse.data.data.role?.name || 'No role'}`);
      }

      return response.data;
    }

  } catch (error) {
    console.error('✗ Login failed:', error.response?.data?.error || error.message);
  }
}

// Run the function
createUsersWithRoles().then(() => {
  console.log('\n✅ User creation and testing completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

async function createDefaultRoles() {
  const roles = [
    { name: 'admin', display_name: 'Administrator', description: 'Full system access', level: 100 },
    { name: 'manager', display_name: 'Manager', description: 'Can create, edit, and view', level: 75 },
    { name: 'staff', display_name: 'Staff', description: 'View and limited edit access', level: 50 },
    { name: 'viewer', display_name: 'Viewer', description: 'Read-only access', level: 25 }
  ];

  for (const role of roles) {
    await Role.create(role);
    console.log(`✓ Created role: ${role.name}`);
  }
}

// Run the function
createUsersWithRoles();
import { connectDatabase, closeDatabase } from '../config/db.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { Role } from '../modules/roles/role.model.js';
import { Branch } from '../modules/branches/branch.model.js';
import { User } from '../modules/users/user.model.js';
import { Bungalow } from '../modules/bungalows/bungalow.model.js';
import {
  ROLES,
  PERMISSIONS,
  BUNGALOW_CATEGORIES,
  BUNGALOW_MAINTENANCE_STATUS,
} from '../config/constants.js';

export const seedDatabase = async () => {
  logger.info('Starting idempotent database seed...');

  // 1. Seed Roles and Permissions
  const allPermissions = Object.values(PERMISSIONS);

  const adminPermissions = [
    PERMISSIONS.BRANCHES_READ,
    PERMISSIONS.BUNGALOWS_READ,
    PERMISSIONS.BUNGALOWS_CREATE,
    PERMISSIONS.BUNGALOWS_UPDATE,
    PERMISSIONS.PRICING_READ,
    PERMISSIONS.AVAILABILITY_SEARCH,
    PERMISSIONS.BOOKINGS_READ,
    PERMISSIONS.BOOKINGS_CREATE,
    PERMISSIONS.BOOKINGS_UPDATE,
    PERMISSIONS.BOOKINGS_CANCEL,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.NEGOTIATIONS_READ,
    PERMISSIONS.NEGOTIATIONS_APPROVE,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_RECORD,
    PERMISSIONS.PAYMENTS_REVERSE,
    PERMISSIONS.MAINTENANCE_READ,
    PERMISSIONS.MAINTENANCE_CREATE,
    PERMISSIONS.MAINTENANCE_UPDATE,
    PERMISSIONS.MAINTENANCE_APPROVE,
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.AUDIT_LOGS_READ,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
  ];

  const salesPermissions = [
    PERMISSIONS.BRANCHES_READ,
    PERMISSIONS.BUNGALOWS_READ,
    PERMISSIONS.PRICING_READ,
    PERMISSIONS.AVAILABILITY_SEARCH,
    PERMISSIONS.BOOKINGS_READ,
    PERMISSIONS.BOOKINGS_CREATE,
    PERMISSIONS.CUSTOMERS_READ,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.NEGOTIATIONS_READ,
    PERMISSIONS.NEGOTIATIONS_SUBMIT,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_RECORD,
    PERMISSIONS.MAINTENANCE_CREATE,
    PERMISSIONS.MAINTENANCE_READ,
    PERMISSIONS.DASHBOARD_READ,
  ];

  const rolesToSeed = [
    {
      code: ROLES.SUPER_ADMIN,
      name: 'Super Admin',
      description: 'Unrestricted master access across all branches, finance, and system operations',
      permissions: allPermissions,
      isSystem: true,
    },
    {
      code: ROLES.ADMIN,
      name: 'Branch Admin',
      description:
        'Authorized branch management, maintenance approval, negotiated rent decision, and branch reports',
      permissions: adminPermissions,
      isSystem: true,
    },
    {
      code: ROLES.SALES,
      name: 'Sales Executive',
      description:
        'Check availability, create bookings, register customers, record initial payments, submit discount negotiations',
      permissions: salesPermissions,
      isSystem: true,
    },
  ];

  const roleMap = new Map();
  for (const roleData of rolesToSeed) {
    const role = await Role.findOneAndUpdate(
      { code: roleData.code },
      { $set: roleData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    roleMap.set(role.code, role);
    logger.info(`Role initialized: ${role.name} (${role.code})`);
  }

  // 2. Seed Branches (Ahmedabad & Dhari)
  const branchesToSeed = [
    {
      name: 'LionsDen Ahmedabad Luxury Resort',
      code: 'AHM',
      address: 'Sarkhej - Gandhinagar Highway, Near Vaishnodevi Circle',
      city: 'Ahmedabad',
      state: 'Gujarat',
      contactPhone: '+917923456789',
      contactEmail: 'ahmedabad@lionsdenresorts.com',
      isActive: true,
    },
    {
      name: 'LionsDen Dhari Gir Safari Resort',
      code: 'DHARI',
      address: 'Gir Forest Eco Zone, Near Ambardi Safari Park',
      city: 'Dhari',
      state: 'Gujarat',
      contactPhone: '+912797234567',
      contactEmail: 'dhari@lionsdenresorts.com',
      isActive: true,
    },
  ];

  const branchMap = new Map();
  for (const branchData of branchesToSeed) {
    const branch = await Branch.findOneAndUpdate(
      { code: branchData.code },
      { $set: branchData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    branchMap.set(branch.code, branch);
    logger.info(`Branch initialized: ${branch.name} (${branch.code})`);
  }

  // 3. Seed Initial Super Admin
  const superAdminRole = roleMap.get(ROLES.SUPER_ADMIN);
  const existingSuperAdmin = await User.findOne({ email: config.superAdmin.email });

  if (!existingSuperAdmin) {
    await User.create({
      name: config.superAdmin.name,
      email: config.superAdmin.email,
      password: config.superAdmin.password,
      phone: config.superAdmin.phone,
      role: superAdminRole._id,
      branch: null, // Super Admin has global access
      isActive: true,
    });
    logger.info(`Initial Super Admin created successfully: ${config.superAdmin.email}`);
  } else {
    logger.info(`Super Admin account already exists: ${config.superAdmin.email}`);
  }

  // 4. Seed ~80 Bungalows across Ahmedabad (40) and Dhari (40)
  const bungalowCategoriesConfig = [
    {
      category: BUNGALOW_CATEGORIES.ONE_BHK,
      count: 10,
      codePrefix: '1',
      standardRentPaise: 400000, // INR 4,000
      capacity: { adults: 2, children: 1, maxGuests: 3 },
      facilities: ['Air Conditioning', 'Geyser', 'Smart TV', 'High-Speed Wi-Fi', 'Balcony View'],
    },
    {
      category: BUNGALOW_CATEGORIES.TWO_BHK,
      count: 15,
      codePrefix: '2',
      standardRentPaise: 650000, // INR 6,500
      capacity: { adults: 4, children: 2, maxGuests: 6 },
      facilities: [
        'Air Conditioning',
        'Geyser',
        'Smart TV',
        'High-Speed Wi-Fi',
        'Private Lawn',
        'Electric Kettle',
      ],
    },
    {
      category: BUNGALOW_CATEGORIES.THREE_BHK,
      count: 10,
      codePrefix: '3',
      standardRentPaise: 950000, // INR 9,500
      capacity: { adults: 6, children: 3, maxGuests: 9 },
      facilities: [
        'Air Conditioning',
        'Geyser',
        'Smart TV',
        'High-Speed Wi-Fi',
        'Private Lawn',
        'Plunge Pool',
        'Refrigerator',
      ],
    },
    {
      category: BUNGALOW_CATEGORIES.FOUR_BHK,
      count: 5,
      codePrefix: '4',
      standardRentPaise: 1400000, // INR 14,000
      capacity: { adults: 8, children: 4, maxGuests: 12 },
      facilities: [
        'Air Conditioning',
        'Geyser',
        'Smart TV',
        'High-Speed Wi-Fi',
        'Private Lawn',
        'Plunge Pool',
        'Refrigerator',
        'Power Backup',
      ],
    },
  ];

  let totalBungalowsSeeded = 0;
  for (const [branchCode, branchDoc] of branchMap.entries()) {
    for (const catConfig of bungalowCategoriesConfig) {
      for (let i = 1; i <= catConfig.count; i++) {
        const bungalowNumber = `${branchCode}-${catConfig.codePrefix}${String(i).padStart(2, '0')}`;
        await Bungalow.findOneAndUpdate(
          { branch: branchDoc._id, number: bungalowNumber },
          {
            $setOnInsert: {
              branch: branchDoc._id,
              number: bungalowNumber,
              category: catConfig.category,
              standardRent: catConfig.standardRentPaise,
              capacity: catConfig.capacity,
              facilities: catConfig.facilities,
              description: `Luxurious ${catConfig.category} villa at ${branchDoc.name} with premium resort amenities`,
              isActive: true,
              maintenanceStatus: BUNGALOW_MAINTENANCE_STATUS.NONE,
              photos: [],
            },
          },
          { upsert: true }
        );
        totalBungalowsSeeded++;
      }
    }
  }

  logger.info(
    `Bungalow inventory seeded successfully: ${totalBungalowsSeeded} bungalows verified.`
  );
  logger.info('Database seeding completed successfully.');
};

// Direct script execution
if (process.argv[1].endsWith('seed.js')) {
  (async () => {
    try {
      await connectDatabase();
      await seedDatabase();
      await closeDatabase();
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Database seeding failed');
      process.exit(1);
    }
  })();
}

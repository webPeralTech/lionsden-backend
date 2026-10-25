import { Role } from './role.model.js';
import { NotFoundError, ConflictError, BadRequestError } from '../../common/errors/app.error.js';
import { logAudit } from '../audit-logs/audit-log.service.js';

export const getAllRoles = async () => {
  return Role.find().sort({ createdAt: 1 });
};

export const getRoleById = async id => {
  const role = await Role.findById(id);
  if (!role) {
    throw new NotFoundError(`Role with id ${id} not found`);
  }
  return role;
};

export const createRole = async (data, req) => {
  const existing = await Role.findOne({ code: data.code });
  if (existing) {
    throw new ConflictError(`Role with code ${data.code} already exists`);
  }

  const role = await Role.create(data);

  await logAudit({
    req,
    action: 'ROLE_CREATED',
    entity: 'ROLE',
    entityId: role._id,
    changes: data,
  });

  return role;
};

export const updateRole = async (id, data, req) => {
  const role = await Role.findById(id);
  if (!role) {
    throw new NotFoundError(`Role with id ${id} not found`);
  }

  if (role.isSystem && data.permissions && role.code === 'SUPER_ADMIN') {
    throw new BadRequestError('Super Admin permissions cannot be modified');
  }

  const previousData = role.toObject();
  Object.assign(role, data);
  await role.save();

  await logAudit({
    req,
    action: 'ROLE_UPDATED',
    entity: 'ROLE',
    entityId: role._id,
    changes: { before: previousData, after: data },
  });

  return role;
};

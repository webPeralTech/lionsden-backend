import { Router } from 'express';
import * as pricingController from './pricing.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import {
  requirePermissions,
  requireRoles,
  enforceBranchScope,
} from '../../common/middleware/rbac.middleware.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { createPricingRuleSchema, updatePricingRuleSchema } from './pricing.validator.js';
import { idParamSchema } from '../../common/validators/id.validator.js';
import { paginationQuerySchema } from '../../common/validators/pagination.validator.js';
import { ROLES, PERMISSIONS } from '../../config/constants.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  requirePermissions([PERMISSIONS.PRICING_READ]),
  enforceBranchScope({ source: 'query', field: 'branchId' }),
  validate({ query: paginationQuerySchema }),
  pricingController.getAllPricingRules
);

router.get(
  '/:id',
  validate({ params: idParamSchema }),
  requirePermissions([PERMISSIONS.PRICING_READ]),
  pricingController.getPricingRuleById
);

router.post(
  '/',
  requireRoles(ROLES.SUPER_ADMIN),
  requirePermissions([PERMISSIONS.PRICING_CREATE]),
  validate({ body: createPricingRuleSchema }),
  pricingController.createPricingRule
);

router.put(
  '/:id',
  requireRoles(ROLES.SUPER_ADMIN),
  requirePermissions([PERMISSIONS.PRICING_UPDATE]),
  validate({ params: idParamSchema, body: updatePricingRuleSchema }),
  pricingController.updatePricingRule
);

export default router;

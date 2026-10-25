import mongoose from 'mongoose';
import { Bungalow } from '../bungalows/bungalow.model.js';
import { Booking } from '../bookings/booking.model.js';
import { Negotiation } from '../negotiations/negotiation.model.js';
import { MaintenanceTicket } from '../maintenance/maintenance.model.js';
import {
  BOOKING_STATUS,
  NEGOTIATION_STATUS,
  MAINTENANCE_STATUS,
  BUNGALOW_MAINTENANCE_STATUS,
} from '../../config/constants.js';

export const getDashboardSummary = async ({ branchId } = {}) => {
  const branchFilter = branchId ? { branch: new mongoose.Types.ObjectId(branchId) } : {};

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 1. Bungalow inventory counts
  const bungalowStats = await Bungalow.aggregate([
    { $match: { ...branchFilter, isActive: true } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        underMaintenance: {
          $sum: {
            $cond: [
              { $eq: ['$maintenanceStatus', BUNGALOW_MAINTENANCE_STATUS.UNDER_MAINTENANCE] },
              1,
              0,
            ],
          },
        },
        partialMaintenance: {
          $sum: {
            $cond: [{ $eq: ['$maintenanceStatus', BUNGALOW_MAINTENANCE_STATUS.PARTIAL] }, 1, 0],
          },
        },
      },
    },
  ]);

  const totalBungalows = bungalowStats[0]?.total || 0;
  const underMaintenanceBungalows = bungalowStats[0]?.underMaintenance || 0;
  const partialMaintenanceBungalows = bungalowStats[0]?.partialMaintenance || 0;

  // 2. Currently active / checked-in bookings today
  const currentlyBookedCount = await Booking.countDocuments({
    ...branchFilter,
    status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN] },
    checkIn: { $lte: now },
    checkOut: { $gt: now },
  });

  const availableBungalows = Math.max(
    0,
    totalBungalows - underMaintenanceBungalows - currentlyBookedCount
  );

  // 3. Today's expected arrivals & departures
  const [upcomingArrivals, upcomingDepartures] = await Promise.all([
    Booking.find({
      ...branchFilter,
      status: BOOKING_STATUS.CONFIRMED,
      checkIn: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('bungalow', 'number category')
      .populate('branch', 'name code')
      .lean(),
    Booking.find({
      ...branchFilter,
      status: BOOKING_STATUS.CHECKED_IN,
      checkOut: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate('bungalow', 'number category')
      .populate('branch', 'name code')
      .lean(),
  ]);

  // 4. Pending negotiation requests count
  const pendingNegotiationsCount = await Negotiation.countDocuments({
    ...branchFilter,
    status: NEGOTIATION_STATUS.PENDING,
  });

  // 5. Open maintenance requests count
  const openMaintenanceCount = await MaintenanceTicket.countDocuments({
    ...branchFilter,
    status: {
      $in: [
        MAINTENANCE_STATUS.REPORTED,
        MAINTENANCE_STATUS.APPROVED,
        MAINTENANCE_STATUS.ASSIGNED,
        MAINTENANCE_STATUS.IN_PROGRESS,
      ],
    },
  });

  // 6. Occupancy rate calculation
  const occupancyPercentage =
    totalBungalows > 0 ? Number(((currentlyBookedCount / totalBungalows) * 100).toFixed(1)) : 0;

  return {
    inventory: {
      totalBungalows,
      currentlyBooked: currentlyBookedCount,
      available: availableBungalows,
      underMaintenance: underMaintenanceBungalows,
      partialMaintenance: partialMaintenanceBungalows,
      occupancyPercentage,
    },
    todayActivity: {
      arrivalsCount: upcomingArrivals.length,
      departuresCount: upcomingDepartures.length,
      arrivals: upcomingArrivals,
      departures: upcomingDepartures,
    },
    actionItems: {
      pendingNegotiationsCount,
      openMaintenanceCount,
    },
  };
};

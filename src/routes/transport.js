const router = require('express').Router();
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const TransportAssignment = require('../models/TransportAssignment');
const VehicleMaintenance = require('../models/VehicleMaintenance');
const Booking = require('../models/Booking');
const Order = require('../models/Order');
const { ensureRequired, parseDateValue, parsePositiveNumber } = require('../utils/validation');

const VALID_VEHICLE_STATUSES = ['AVAILABLE', 'IN_SERVICE', 'MAINTENANCE', 'UNAVAILABLE'];
const VALID_DRIVER_STATUSES = ['AVAILABLE', 'ON_TRIP', 'UNAVAILABLE'];
const VALID_ASSIGNMENT_STATUSES = ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'];

// --- Vehicles ---
router.post('/vehicles', async (req, res) => {
  try {
    const errors = ensureRequired(req.body, ['vehicleType', 'licensePlate']);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    if (req.body.capacityKg != null) {
      const parsed = parsePositiveNumber(req.body.capacityKg, 'capacityKg', { allowZero: true });
      if (parsed.error) return res.status(400).json({ message: parsed.error });
    }
    const status = req.body.status || 'AVAILABLE';
    if (!VALID_VEHICLE_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid vehicle status' });
    res.json(await Vehicle.create({
      vehicleType: `${req.body.vehicleType}`.trim(),
      licensePlate: `${req.body.licensePlate}`.trim().toUpperCase(),
      capacityKg: req.body.capacityKg != null ? Number(req.body.capacityKg) : undefined,
      status,
    }));
  }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/vehicles', async (req, res) => {
  try { res.json(await Vehicle.find()); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/vehicles/:id/status', async (req, res) => {
  try {
    const status = req.query.status;
    if (!status) return res.status(400).json({ message: 'status is required' });
    if (!VALID_VEHICLE_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid vehicle status' });
    const v = await Vehicle.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!v) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(v);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- Drivers ---
router.post('/drivers', async (req, res) => {
  try {
    const errors = ensureRequired(req.body, ['user', 'licenseNumber']);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    if (req.body.experienceYears != null) {
      const parsed = parsePositiveNumber(req.body.experienceYears, 'experienceYears', { allowZero: true });
      if (parsed.error) return res.status(400).json({ message: parsed.error });
    }
    const status = req.body.status || 'AVAILABLE';
    if (!VALID_DRIVER_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid driver status' });
    res.json(await Driver.create({
      user: req.body.user,
      licenseNumber: `${req.body.licenseNumber}`.trim(),
      experienceYears: req.body.experienceYears != null ? Number(req.body.experienceYears) : undefined,
      status,
    }));
  }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/drivers', async (req, res) => {
  try { res.json(await Driver.find().populate('user')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/drivers/:id/status', async (req, res) => {
  try {
    const status = req.query.status;
    if (!status) return res.status(400).json({ message: 'status is required' });
    if (!VALID_DRIVER_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid driver status' });
    const d = await Driver.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!d) return res.status(404).json({ message: 'Driver not found' });
    res.json(d);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- Assignments ---
router.post('/assignments', async (req, res) => {
  try {
    const errors = ensureRequired(req.body, ['vehicle', 'driver', 'destinationAddress', 'departureTime']);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const [vehicle, driver, booking, order] = await Promise.all([
      Vehicle.findById(req.body.vehicle),
      Driver.findById(req.body.driver),
      req.body.booking ? Booking.findById(req.body.booking) : Promise.resolve(null),
      req.body.order ? Order.findById(req.body.order) : Promise.resolve(null),
    ]);
    if (!vehicle) return res.status(400).json({ message: 'vehicle not found' });
    if (!driver) return res.status(400).json({ message: 'driver not found' });
    if (req.body.booking && !booking) return res.status(400).json({ message: 'booking not found' });
    if (req.body.order && !order) return res.status(400).json({ message: 'order not found' });
    const departureTime = parseDateValue(req.body.departureTime, 'departureTime');
    if (departureTime.error) return res.status(400).json({ message: departureTime.error });
    const estimatedReturnTime = req.body.estimatedReturnTime ? parseDateValue(req.body.estimatedReturnTime, 'estimatedReturnTime') : null;
    if (estimatedReturnTime?.error) return res.status(400).json({ message: estimatedReturnTime.error });
    const taskStatus = req.body.taskStatus || 'PENDING';
    if (!VALID_ASSIGNMENT_STATUSES.includes(taskStatus)) return res.status(400).json({ message: 'Invalid assignment status' });
    if (req.body.transportCost != null) {
      const parsed = parsePositiveNumber(req.body.transportCost, 'transportCost', { allowZero: true });
      if (parsed.error) return res.status(400).json({ message: parsed.error });
    }
    res.json(await TransportAssignment.create({
      vehicle: vehicle._id,
      driver: driver._id,
      booking: booking?._id,
      order: order?._id,
      destinationAddress: `${req.body.destinationAddress}`.trim(),
      departureTime: departureTime.value,
      estimatedReturnTime: estimatedReturnTime?.value,
      taskStatus,
      transportCost: req.body.transportCost != null ? Number(req.body.transportCost) : undefined,
    }));
  }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/assignments', async (req, res) => {
  try { res.json(await TransportAssignment.find().populate('vehicle driver booking order')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/assignments/:id/status', async (req, res) => {
  try {
    const status = req.query.status;
    if (!status) return res.status(400).json({ message: 'status is required' });
    if (!VALID_ASSIGNMENT_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid assignment status' });
    const a = await TransportAssignment.findByIdAndUpdate(
      req.params.id,
      { taskStatus: status },
      { new: true }
    );
    if (!a) return res.status(404).json({ message: 'Assignment not found' });
    res.json(a);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- Maintenance ---
router.post('/maintenance', async (req, res) => {
  try {
    const errors = ensureRequired(req.body, ['vehicle', 'maintenanceDate', 'description', 'cost']);
    if (errors.length) return res.status(400).json({ message: errors[0], errors });
    const vehicle = await Vehicle.findById(req.body.vehicle);
    if (!vehicle) return res.status(400).json({ message: 'vehicle not found' });
    const maintenanceDate = parseDateValue(req.body.maintenanceDate, 'maintenanceDate');
    if (maintenanceDate.error) return res.status(400).json({ message: maintenanceDate.error });
    const cost = parsePositiveNumber(req.body.cost, 'cost', { allowZero: true });
    if (cost.error) return res.status(400).json({ message: cost.error });
    res.json(await VehicleMaintenance.create({
      vehicle: vehicle._id,
      maintenanceDate: maintenanceDate.value,
      description: `${req.body.description}`.trim(),
      cost: cost.value,
    }));
  }
  catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/vehicles/:vehicleId/maintenance', async (req, res) => {
  try { res.json(await VehicleMaintenance.find({ vehicle: req.params.vehicleId }).populate('vehicle')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;

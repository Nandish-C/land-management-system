const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['land_created', 'land_updated', 'land_deleted', 'payment_added', 'payment_updated', 'payment_deleted', 'payment_refund', 'employee_created', 'employee_updated', 'employee_deleted', 'customer_created', 'customer_updated', 'customer_deleted', 'admin_created', 'admin_deleted']
  },
  description: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  userName: String,
  userRole: String,
  entityType: {
    type: String,
    enum: ['land', 'payment', 'employee', 'customer', 'admin']
  },
  entityId: String,
  details: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);

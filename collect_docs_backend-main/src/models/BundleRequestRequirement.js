//src/models/BundleRequestRequirement.js
import { DataTypes } from 'sequelize';
import sequelize from '../Config/database.js';

const BundleRequestRequirement = sequelize.define('BundleRequestRequirement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  bundle_request_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  field_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'submitted', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    defaultValue: null
  }
}, {
  tableName: 'bundle_request_requirements',
  timestamps: false  
});

export default BundleRequestRequirement;
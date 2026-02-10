// src/models/BundleRequest.js
import { DataTypes } from 'sequelize';
import sequelize from '../Config/database.js';
import Client from './Client.js';

const BundleRequest = sequelize.define('BundleRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  client_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  bundle_id: {  
    type: DataTypes.UUID,
    allowNull: true
  },
  workspace_id: {  
    type: DataTypes.UUID,
    allowNull: false
  },
  share_token: {  
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'submitted', 'approved', 'rejected', 'completed', 'failed'),
    defaultValue: 'pending'
  },
  form_data: {
    type: DataTypes.TEXT,        
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'bundle_requests',
  underscored: true,  
  timestamps: true
});


BundleRequest.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });

BundleRequest.associate = (models) => {
  BundleRequest.belongsTo(models.Bundle, { 
    foreignKey: 'bundle_id',
    as: 'Bundle' 
  });
};
BundleRequest.associate = (models) => {
  BundleRequest.belongsTo(Client, { foreignKey: 'client_id', as: 'client' });
  BundleRequest.belongsTo(models.Bundle, { foreignKey: 'bundle_id', as: 'Bundle' });
  BundleRequest.hasMany(models.BundleRequestRequirement, { 
    foreignKey: 'bundle_request_id', 
    as: 'requirements' 
  });
};


export default BundleRequest;
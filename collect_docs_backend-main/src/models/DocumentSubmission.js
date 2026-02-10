// models/DocumentSubmission.js
import { DataTypes } from 'sequelize';
import sequelize from '../Config/database.js';

const DocumentSubmission = sequelize.define('DocumentSubmission', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bundle_request_id: { type: DataTypes.UUID, allowNull: false },
  requirement_id: { type: DataTypes.UUID, allowNull: false }, // ID from Bundle template/requirements
  file_path: { type: DataTypes.STRING, allowNull: false },
  file_name: { type: DataTypes.STRING, allowNull: false },
  status: { 
    type: DataTypes.ENUM('pending', 'approved', 'rejected'), 
    defaultValue: 'pending' 
  },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true }
}, {
  tableName: 'document_submissions',
  timestamps: true,
  underscored: true
});

export default DocumentSubmission;
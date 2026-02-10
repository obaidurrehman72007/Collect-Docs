
import sequelize from '../Config/database.js';
import User from './User.js';
import Client from './Client.js';
import BundleRequest from './BundleRequest.js';
import { DataTypes } from 'sequelize';





const Workspace = sequelize.define('Workspace', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(255), allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  is_default: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { 
  tableName: 'workspaces', 
  underscored: true, 
  timestamps: true 
});

const Bundle = sequelize.define('Bundle', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: DataTypes.STRING,
  description: DataTypes.TEXT,
  template: DataTypes.JSON,
  workspace_id: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'active'), defaultValue: 'pending' },
  created_by: { type: DataTypes.UUID, allowNull: false }
}, { 
  tableName: 'bundles', 
  underscored: true, 
  timestamps: true 
});

const DocumentRequirement = sequelize.define('DocumentRequirement', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  bundle_id: { type: DataTypes.UUID, allowNull: false },
  name: DataTypes.STRING,
  description: DataTypes.TEXT,
  type: { type: DataTypes.ENUM('text', 'file', 'textarea'), defaultValue: 'file' },
  required: { type: DataTypes.BOOLEAN, defaultValue: true },
  accepted_types: DataTypes.JSON
}, { 
  tableName: 'document_requirements', 
  underscored: true, 
  timestamps: true 
});

const BundleRequestRequirement = sequelize.define("BundleRequestRequirement", {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  bundle_request_id: { type: DataTypes.UUID, allowNull: false },
  requirement_id: { type: DataTypes.UUID, allowNull: false },
  field_name: { type: DataTypes.STRING(100), allowNull: false },
  name: { type: DataTypes.STRING(255), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  type: { 
    type: DataTypes.ENUM("text", "file", "textarea"), 
    defaultValue: "file",
    allowNull: true 
  },
  is_mandatory: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true,
    allowNull: true 
  },
  accepted_types: {
    type: DataTypes.TEXT, 
    allowNull: true,
    get() {
      const value = this.getDataValue('accepted_types');
      if (!value) return ["pdf", "jpg", "png"];
      try {
        let parsed = JSON.parse(value);
        while (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch { break; }
        }
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'string') {
          return parsed.split(',').map(s => s.replace(/^\[|\]$/g, '').trim()).filter(Boolean);
        }
        return ["pdf", "jpg", "png"];
      } catch (e) {
        if (typeof value === 'string') {
          return value.replace(/^"|"$/g, '').replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(Boolean);
        }
        return ["pdf", "jpg", "png"];
      }
    },
    set(value) {
      let arr = [];
      if (Array.isArray(value)) arr = value;
      else if (typeof value === 'string') arr = value.split(',').map(s => s.trim()).filter(Boolean);
      this.setDataValue('accepted_types', JSON.stringify(arr));
    }
  },
  status: {
    type: DataTypes.ENUM("pending", "fulfilled", "approved", "rejected"),
    defaultValue: "pending",
    allowNull: true
  },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  submitted_value: { type: DataTypes.TEXT, allowNull: true },
}, { 
  tableName: "bundle_request_requirements", 
  underscored: true, 
  timestamps: true 
});

const DocumentSubmission = sequelize.define('DocumentSubmission', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  bundle_request_id: { type: DataTypes.UUID, allowNull: false },
  requirement_id: { type: DataTypes.UUID, allowNull: false },
  file_path: { type: DataTypes.STRING, allowNull: false },
  file_name: { type: DataTypes.STRING, allowNull: false },
  status: { 
    type: DataTypes.ENUM('pending', 'uploaded', 'approved', 'rejected'), 
    defaultValue: 'pending' 
  },
  rejection_reason: { type: DataTypes.TEXT }
}, { 
  tableName: 'document_submissions', 
  underscored: true, 
  timestamps: true 
});




const WorkspaceMember = sequelize.define('WorkspaceMember', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  workspace_id: { type: DataTypes.UUID, allowNull: false },
  user_id: { type: DataTypes.UUID, allowNull: false },
  role: {
    type: DataTypes.ENUM('manager', 'staff', 'user'),
    allowNull: false,
    defaultValue: 'user',
  },
}, { 
  tableName: 'workspace_members', 
  underscored: true, 
  timestamps: true 
});






Workspace.belongsToMany(User, {
  through: WorkspaceMember,
  foreignKey: 'workspace_id',
  otherKey: 'user_id',
  as: 'members',
});

User.belongsToMany(Workspace, {
  through: WorkspaceMember,
  foreignKey: 'user_id',
  otherKey: 'workspace_id',
  as: 'workspaces',
});
WorkspaceMember.belongsTo(Workspace, {
  foreignKey: 'workspace_id',
  as: 'workspace',
});

WorkspaceMember.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
});

Workspace.hasMany(Client, { foreignKey: 'workspace_id' });
Client.belongsTo(Workspace, { foreignKey: 'workspace_id' });


Workspace.hasMany(Bundle, { foreignKey: 'workspace_id' });
Bundle.belongsTo(Workspace, { foreignKey: 'workspace_id' });


Client.hasMany(BundleRequest, { foreignKey: 'client_id', as: 'bundleRequests' });
BundleRequest.belongsTo(Client, { foreignKey: 'client_id' });


Bundle.hasMany(BundleRequest, { foreignKey: 'bundle_id' });
BundleRequest.belongsTo(Bundle, { foreignKey: 'bundle_id' });


BundleRequest.hasMany(BundleRequestRequirement, { 
  foreignKey: 'bundle_request_id', 
  as: 'requirements' 
});
BundleRequestRequirement.belongsTo(BundleRequest, { 
  foreignKey: 'bundle_request_id' 
});


Bundle.hasMany(DocumentRequirement, { 
  foreignKey: 'bundle_id', 
  as: 'templateRequirements' 
});
DocumentRequirement.belongsTo(Bundle, { 
  foreignKey: 'bundle_id' 
});

Bundle.hasMany(DocumentRequirement, { 
  foreignKey: 'bundle_id', 
  as: 'requirements' 
});


BundleRequest.hasMany(DocumentSubmission, { 
  foreignKey: "bundle_request_id", 
  as: "submissions" 
});
DocumentSubmission.belongsTo(BundleRequest, { 
  foreignKey: "bundle_request_id" 
});


BundleRequestRequirement.hasMany(DocumentSubmission, { 
  foreignKey: "requirement_id", 
  as: "submissions"
});
DocumentSubmission.belongsTo(BundleRequestRequirement, { 
  foreignKey: "requirement_id" 
});





export const initModels = async () => {
  try {
    await sequelize.authenticate();
    console.log('ALL MODELS LOADED SUCCESSFULLY');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};


export { 
  sequelize, 
  User, 
  Workspace, 
  Client, 
  Bundle, 
  BundleRequest, 
  DocumentRequirement, 
  DocumentSubmission, 
  BundleRequestRequirement,
  WorkspaceMember  
};
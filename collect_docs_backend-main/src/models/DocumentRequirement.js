//src/models/DocumentRequirement.js
import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('DocumentRequirement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    bundle_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'bundles', key: 'id' }
    },
    bundle_request_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'bundle_requests', key: 'id' }
    },
    name: {      
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {       
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'text'
    },
    required: {   
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    placeholder: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    accept: {
      type: DataTypes.STRING,
      defaultValue: ''
    },
    pattern: {
      type: DataTypes.STRING,
      defaultValue: ''
    }
  }, {
    tableName: 'document_requirements',
    underscored: true,
    timestamps: true,
    indexes: [
      { fields: ['bundle_id'] },
      { fields: ['bundle_request_id'] }
    ]
  });

  Bundle.hasMany(DocumentRequirement, { foreignKey: 'bundle_id', as: 'requirements' });
DocumentRequirement.belongsTo(Bundle, { foreignKey: 'bundle_id' });
};

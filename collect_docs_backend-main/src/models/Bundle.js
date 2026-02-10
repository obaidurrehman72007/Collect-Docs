const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Bundle = sequelize.define(
    "Bundle",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      /**
       * JSON source-of-truth for requirements
       * Sequelize handles serialization automatically
       */
      template: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [], 
        comment: "Backup/source of truth for bundle fields",
      },

      fieldTranslations: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
        comment:
          'Optional translations { "en": {...}, "ar": {...} }',
      },

      workspace_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM(
          "pending",
          "approved",
          "rejected",
          "draft",
          "archived"
        ),
        allowNull: false,
        defaultValue: "pending",
      },

      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: "bundles",
      underscored: true,
      timestamps: true,
      paranoid: false,

      indexes: [
        { fields: ["workspace_id"] },
        { fields: ["created_by"] },
        { fields: ["status"] },
      ],
    }
  );

  Bundle.associate = (models) => {
    Bundle.belongsTo(models.Workspace, {
      foreignKey: "workspace_id",
      as: "workspace",
      onDelete: "CASCADE",
    });

    Bundle.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });

    Bundle.hasMany(models.DocumentRequirement, {
      foreignKey: "bundle_id",
      as: "requirements",
      onDelete: "CASCADE",
    });
  };

  return Bundle;
};

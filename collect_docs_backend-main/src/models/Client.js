//src/models/Client.js
import { DataTypes } from 'sequelize';
import sequelize from '../Config/database.js';
import bcrypt from 'bcrypt';

const Client = sequelize.define('Client', {
  id: { 
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  workspace_id: { type: DataTypes.UUID, allowNull: false },
  role: {
    type: DataTypes.ENUM('user', 'staff', 'manager'),
    defaultValue: 'user'
  },
  passwordResetToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'password_reset_token'
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'password_reset_expires'
  }
}, {
  tableName: 'clients',
  underscored: true,
  timestamps: true
});

Client.beforeCreate(async (client) => {
  if (client.password && !client.password.startsWith('$2')) {
    client.password = await bcrypt.hash(client.password, 10);
  }
});

Client.beforeUpdate(async (client) => {
  if (client.changed('password') && !client.password.startsWith('$2')) {
    client.password = await bcrypt.hash(client.password, 10);
  }
});

export default Client;

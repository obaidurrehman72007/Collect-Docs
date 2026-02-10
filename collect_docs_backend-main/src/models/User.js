//src/models/User.js
import { DataTypes } from 'sequelize';
import { UUIDV4 } from 'sequelize';
import sequelize from '../Config/database.js';

const User = sequelize.define('User', {
  id: { 
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: UUIDV4,  
    allowNull: false
  },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('staff', 'manager', 'client'), defaultValue: 'staff' },
  passwordResetToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'password_reset_token'   // optional, but good practice if column name differs
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'password_reset_expires'
  }
},
 {
  tableName: 'users',
  underscored: true,
  timestamps: true
});

export default User;

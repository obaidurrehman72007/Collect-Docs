// src/Routes/authRoutes.js 
import express from 'express';
import { register, login, getWorkspaces, authenticateToken,updateProfile,
    forgotPassword,
  resetPassword, } from '../Controllers/authController.js';


const router = express.Router();


router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/workspaces', authenticateToken, getWorkspaces);
router.patch('/me', authenticateToken, updateProfile);


export default router;

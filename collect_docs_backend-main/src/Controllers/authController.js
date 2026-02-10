
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, Workspace, Client, WorkspaceMember } from '../models/index.js';
import sequelize from '../Config/database.js';
import crypto from 'node:crypto';
import { sendPasswordResetEmail} from '../Config/mailer.js';
import { Op } from 'sequelize';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_dev_only';

const generateToken = (user, workspaceId, userType) => {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email,
      workspaceId: workspaceId || null,
      role: user.role || (userType === 'client' ? 'user' : 'manager'),
      userType 
    }, 
    JWT_SECRET, 
    { expiresIn: '7d' }
  );
};

export const register = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { name, email, password, workspaceName } = req.body;
    
    const cleanName = name && typeof name === 'string' ? name.trim() : '';
    const cleanEmail = email && typeof email === 'string' ? email.trim().toLowerCase() : '';
    
    if (!cleanName || !cleanEmail || !password || password.length < 6) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: req.t('errors.validation'),  
        lang: req.lang
      });
    }

    const existingUser = await User.findOne({ where: { email: cleanEmail } });
    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        message: req.t('User Already Exists'),    
        lang: req.lang
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: 'manager'
    }, { transaction });

    const workspace = await Workspace.create({
      name: workspaceName && typeof workspaceName === 'string'
        ? workspaceName.trim()
        : `Default Workspace - ${user.name}`,
      user_id: user.id,
      is_default: true
    }, { transaction });

    
    await WorkspaceMember.create({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'manager'
    }, { transaction });

    await transaction.commit();

    const token = generateToken(user, workspace.id, 'user');

    return res.status(201).json({
      success: true,
      message: req.t('common.userCreated'),       
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        userType: 'user'
      },
      lang: req.lang
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Register error:', error);
    return res.status(500).json({ 
      success: false,
      message: req.t('errors.serverError'), 
      lang: req.lang
    });
  }
};

export const login = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: req.t('errors.validation'),
        lang: req.lang
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    let authType = null;
    let account = await User.findOne({ where: { email: cleanEmail } });

    if (account) {
      authType = 'user';
    } else {
      account = await Client.findOne({ where: { email: cleanEmail } });
      if (account) authType = 'client';
    }

    if (!account) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: req.t('Invalid email or password'),
        lang: req.lang
      });
    }

    const isPasswordValid = await bcrypt.compare(password, account.password);

    if (!isPasswordValid) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: req.t('Invalid email or password'),
        lang: req.lang
      });
    }

    let workspaceId = null;
    let workspaceName = null;

    if (authType === 'user') {
      const workspaceResult = await sequelize.query(
        `SELECT w.id, w.name, w.is_default 
         FROM workspaces w
         LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
         WHERE (w.user_id = ? OR wm.user_id = ?)
         ORDER BY w.is_default DESC, w.created_at ASC
         LIMIT 1`,
        { 
          replacements: [account.id, account.id], 
          type: sequelize.QueryTypes.SELECT 
        }
      );

      const workspace = workspaceResult[0];
      
      if (!workspace) {
        
        const newWorkspace = await Workspace.create({
          name: `Default Workspace - ${account.name}`,
          user_id: account.id,
          is_default: true
        }, { transaction });

        
        await WorkspaceMember.create({
          workspace_id: newWorkspace.id,
          user_id: account.id,
          role: 'manager'
        }, { transaction });

        workspaceId = newWorkspace.id;
        workspaceName = newWorkspace.name;
      } else {
        workspaceId = workspace.id;
        workspaceName = workspace.name;
      }
    } else if (authType === 'client') {
      workspaceId = account.workspace_id;
      if (workspaceId) {
        const workspace = await Workspace.findByPk(workspaceId, {
          attributes: ['id', 'name']
        });
        workspaceName = workspace ? workspace.name : null;
      }
    }

    await transaction.commit();

    const token = generateToken(account, workspaceId, authType);

    return res.json({
      success: true,
      message: req.t('common.success'),
      token,
      user: {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        workspaceId,
        workspaceName,
        userType: authType
      },
      lang: req.lang
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: req.t('errors.serverError'),
      lang: req.lang
    });
  }
};





export const getWorkspaces = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const workspaces = await sequelize.query(
      `SELECT DISTINCT w.* FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE w.user_id = ? OR wm.user_id = ?
       ORDER BY w.is_default DESC, w.name ASC`,
      { 
        replacements: [userId, userId], 
        type: sequelize.QueryTypes.SELECT 
      }
    );
    
    return res.json({ 
      success: true,
      message: req.t('common.success'),
      workspaces,
      lang: req.lang
    });
  } catch (error) {
    console.error('Get workspaces error:', error);
    return res.status(500).json({ 
      success: false,
      message: req.t('errors.serverError'),
      lang: req.lang
    });
  }
};

export const setDefaultWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.body;
    const userId = req.user.userId;

    await sequelize.query(
      `UPDATE workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       SET w.is_default = 0
       WHERE (w.user_id = ? OR wm.user_id = ?)`,
      { replacements: [userId, userId], type: sequelize.QueryTypes.UPDATE }
    );

    await sequelize.query(
      `UPDATE workspaces 
       SET is_default = 1 
       WHERE id = ? AND (user_id = ? OR EXISTS (
         SELECT 1 FROM workspace_members wm 
         WHERE wm.workspace_id = workspaces.id AND wm.user_id = ?
       ))`,
      { replacements: [workspaceId, userId, userId], type: sequelize.QueryTypes.UPDATE }
    );

    return res.json({ 
      success: true,
      message: req.t('common.update'),       
      lang: req.lang
    });
  } catch (error) {
    console.error('Set default workspace error:', error);
    return res.status(400).json({ 
      success: false,
      message: req.t('errors.validation'),
      lang: req.lang
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: req.t('errors.unauthorized'),
        lang: req.lang
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: req.t('errors.notFound'),
        lang: req.lang
      });
    }

    const workspace = await Workspace.findOne({
      where: { user_id: user.id, is_default: true }
    });

    const newToken = generateToken(user, workspace?.id, decoded.userType || 'user');
    
    return res.json({
      success: true,
      message: req.t('common.success'),
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        workspaceId: workspace?.id,
        userType: decoded.userType || 'user'
      },
      lang: req.lang
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(403).json({ 
      success: false,
      message: req.t('errors.unauthorized'),
      lang: req.lang
    });
  }
};

export const logout = async (req, res) => {
  return res.json({ 
    success: true,
    message: req.t('common.success'),
    lang: req.lang
  });
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'name', 'email', 'role'],
      include: [{
        model: Workspace,
        where: { is_default: true },
        attributes: ['id', 'name']
      }]
    });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: req.t('errors.notFound'),
        lang: req.lang
      });
    }

    return res.json({
      success: true,
      message: req.t('common.success'),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspace: user.Workspaces[0] || null
      },
      lang: req.lang
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ 
      success: false,
      message: req.t('errors.serverError'),
      lang: req.lang
    });
  }
};

export const authenticateToken = (req, res, next) => {
  
  

  const authHeader = req.headers['authorization']; 

  if (!authHeader) {
    
    return res.status(401).json({ success: false, message: 'Missing authorization header' });
  }

  let token = null;

  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    
    token = authHeader.trim();
  }

  if (!token || token === 'null' || token === 'undefined') {
    
    return res.status(401).json({ success: false, message: 'No valid token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || JWT_SECRET);
    
    req.user = {
      id: decoded.userId || decoded.id,
      userId: decoded.userId || decoded.id,
      workspaceId: decoded.workspaceId || decoded.workspace_id,
      email: decoded.email,
      userType: decoded.userType
    };

    req.workspaceId = req.user.workspaceId;
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const requireWorkspace = (req, res, next) => {
  if (!req.user?.workspaceId) {
    return res.status(400).json({ 
      success: false,
      message: req.t('errors.validation'),
      lang: req.lang
    });
  }
  
  req.workspaceId = req.user.workspaceId;
  next();
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email, password } = req.body;

    let account;
    if (req.user.userType === 'client') {
      account = await Client.findByPk(userId);
    } else {
      account = await User.findByPk(userId);
    }

    if (!account) return res.status(404).json({ error: 'User not found' });

    if (name) account.name = name.trim();
    if (email) account.email = email.trim().toLowerCase();
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password too short' });
      account.password = await bcrypt.hash(password, 10);
    }

    await account.save();

    const { password: _, ...safe } = account.toJSON();
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        lang: req.lang,
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    let account = await User.findOne({ where: { email: cleanEmail } });
    let userType = 'user';

    if (!account) {
      account = await Client.findOne({ where: { email: cleanEmail } });
      userType = 'client';
    }

    // Security: always return the same message (prevents email enumeration)
    if (!account) {
      return res.json({
        success: true,
        message: 'If an account with this email exists, you will receive a password reset link.',
        lang: req.lang,
      });
    }

    // Generate secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await account.update({
      passwordResetToken: hashedToken,
      passwordResetExpires: expiresAt,
    });

    const frontendUrl = process.env.FRONTEND_URL;
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await  sendPasswordResetEmail({
      to: cleanEmail,
      name: account.name,
      resetUrl,
      expiresIn: '2 hours',
    });

    return res.json({
      success: true,
      message: 'If an account with this email exists, you will receive a password reset link.',
      lang: req.lang,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      lang: req.lang,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required',
        lang: req.lang,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
        lang: req.lang,
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
        lang: req.lang,
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // ────────────────────────────────────────────────
    // Try User first
    let account = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { [Op.gt]: new Date() },
      },
    });

    let accountType = 'user';

    // If not found → try Client
    if (!account) {
      account = await Client.findOne({
        where: {
          passwordResetToken: hashedToken,
          passwordResetExpires: { [Op.gt]: new Date() },
        },
      });
      accountType = 'client';
    }
    // ────────────────────────────────────────────────

    if (!account) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
        lang: req.lang,
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await account.update({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    return res.json({
      success: true,
      message: 'Password has been reset successfully. Please sign in.',
      lang: req.lang,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      lang: req.lang,
    });
  }
};
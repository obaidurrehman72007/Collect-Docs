
//src/Controllers/clientController.js
import Client from '../models/Client.js';
import { sendClientCreatedEmail, sendClientDeletedEmail } from '../Config/mailer.js';
import bcrypt from 'bcrypt';
import sequelize from '../Config/database.js'; 
import crypto from 'node:crypto';

const ALLOWED_ROLES = ['user', 'staff', 'manager'];


export const sendError = (res, status, message, code) =>
  res.status(status).json({ success: false, message, code });


export const sendSuccess = (res, status, message, data = null) =>
  res.status(status).json({ success: true, message, data });




export const createClient = async (req, res) => {
  try {
    if (!req.workspaceId) {
      return sendError(res, 400, 'No workspace selected', 'WORKSPACE_REQUIRED');
    }

    const { name, email } = req.body || {};

    if (!name || !email) {
      return sendError(res, 400, 'Name and email are required', 'VALIDATION_ERROR');
    }

    const cleanName = String(name).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      return sendError(res, 400, 'Name and email must be non-empty', 'VALIDATION_ERROR');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return sendError(res, 400, 'Invalid email format', 'INVALID_EMAIL');
    }

    // Check globally first
    const existingGlobally = await Client.findOne({
      where: { email: cleanEmail },
    });

    if (existingGlobally) {
      return sendError(
        res,
        409,
        'This email is already registered in another workspace. Please use a different email or contact support.',
        'EMAIL_ALREADY_IN_USE_GLOBALLY'
      );
    }

    // Then check in current workspace (redundant but safe)
    const existingInWorkspace = await Client.findOne({
      where: {
        email: cleanEmail,
        workspace_id: req.workspaceId,
      },
    });

    if (existingInWorkspace) {
      return sendError(
        res,
        409,
        'This email is already registered in this workspace',
        'DUPLICATE_EMAIL_IN_WORKSPACE'
      );
    }

    // Generate random temp password
    const tempPassword = crypto.randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const client = await Client.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: 'user',
      workspace_id: req.workspaceId,
    });

    await Client.sequelize.query(
      `INSERT IGNORE INTO workspace_members (workspace_id, user_id, role) 
       VALUES (?, ?, ?)`,
      {
        replacements: [req.workspaceId, client.id, 'Viewer'],
        type: Client.sequelize.QueryTypes.INSERT,
      }
    );

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    await client.update({
      passwordResetToken: hashedToken,
      passwordResetExpires: expiresAt,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://your-app-domain.com';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    try {
      await sendClientCreatedEmail({
        to: cleanEmail,
        name: cleanName,
        resetUrl,
        expiresIn: '2 hours',
      });
    } catch (mailErr) {
      console.error('[createClient] Welcome email failed:', mailErr);
    }

    return sendSuccess(res, 201, 'Client created successfully. An email with setup instructions has been sent.', {
      id: client.id,
      name: client.name,
      email: client.email,
      role: client.role,
      createdAt: client.createdAt,
    });
  } catch (error) {
    console.error('Create client error:', error);

    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendError(
        res,
        409,
        'This email is already in use. Please choose another email.',
        'EMAIL_ALREADY_IN_USE'
      );
    }

    return sendError(res, 500, 'Internal server error', 'SERVER_ERROR');
  }
};



export const getClients = async (req, res) => {


  try {
    const userId = req.user?.userId;
    
    if (!userId) {
     
      return sendSuccess(res, 200, 'No user found', {
        clients: [],
        count: 0
      });
    }

    
    const workspaceResult = await sequelize.query(
      `SELECT w.* FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE (w.user_id = ? OR wm.user_id = ?)
       ORDER BY w.is_default DESC, w.created_at ASC
       LIMIT 1`,
      { 
        replacements: [userId, userId], 
        type: sequelize.QueryTypes.SELECT
      }
    );

    const workspace = workspaceResult[0];
    
    if (!workspace) {
      return sendSuccess(res, 200, 'No workspace selected', {
        clients: [],
        count: 0
      });
    }


    const clients = await Client.findAll({
      where: { workspace_id: workspace.id },
      attributes: ['id', 'name', 'role', 'email', 'createdAt'],
      order: [['name', 'ASC']]
    });

    
    return sendSuccess(res, 200, 'Clients fetched successfully', {
      clients,
      count: clients.length
    });

  } catch (error) {
    console.error('Get clients error:', error);
    return sendError(res, 500, 'Internal server error', 'SERVER_ERROR');
  }
};

export const deleteClient = async (req, res) => {
 

  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return sendError(res, 400, 'No user found', 'USER_REQUIRED');
    }

    const { id } = req.params;
    if (!id) {
      return sendError(res, 400, 'Client id is required', 'VALIDATION_ERROR');
    }

    
    const workspaceResult = await sequelize.query(
      `SELECT w.id FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE (w.user_id = ? OR wm.user_id = ?)
       ORDER BY w.is_default DESC, w.created_at ASC
       LIMIT 1`,
      { 
        replacements: [userId, userId], 
        type: sequelize.QueryTypes.SELECT
      }
    );

    const workspace = workspaceResult[0];
    if (!workspace) {
      return sendError(res, 400, 'No workspace selected', 'WORKSPACE_REQUIRED');
    }

    
    const clientRecord = await Client.findOne({ where: { id, workspace_id: workspace.id } });
    if (!clientRecord) return sendError(res, 404, 'Client not found', 'NOT_FOUND');

    const clientEmail = clientRecord.email;
    const clientName = clientRecord.name;

    const deletedCount = await Client.destroy({ where: { id, workspace_id: workspace.id } });
    if (!deletedCount) return sendError(res, 404, 'Client not found', 'NOT_FOUND');

    await Client.sequelize.query(
      `DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?`,
      {
        replacements: [workspace.id, id],
        type: Client.sequelize.QueryTypes.DELETE
      }
    );


    try {
      const mailRes = await sendClientDeletedEmail(clientEmail, clientName);
      if (!mailRes || !mailRes.success) console.warn('[CLIENT] Deleted email failed', mailRes && mailRes.error ? mailRes.error : mailRes);
      else console.log('[CLIENT] Deleted email sent', mailRes.info ? mailRes.info.messageId : 'no-info');
    } catch (mailErr) {
      console.error('[CLIENT] Error sending deleted email:', mailErr && mailErr.stack ? mailErr.stack : mailErr);
    }

    return sendSuccess(res, 200, 'Client deleted successfully');

  } catch (error) {
    console.error('Delete client error:', error);
    return sendError(res, 500, 'Internal server error', 'SERVER_ERROR');
  }
};

export const updateClientRole = async (req, res) => {

  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return sendError(res, 400, 'No user found', 'USER_REQUIRED');
    }

    const { id } = req.params;
    const { role } = req.body || {};

    if (!id || !role) {
      return sendError(
        res,
        400,
        'Client id and role are required',
        'VALIDATION_ERROR'
      );
    }

    const normalizedRole = String(role).trim();
    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return sendError(res, 400, 'Invalid role value', 'INVALID_ROLE');
    }

    
    const workspaceResult = await sequelize.query(
      `SELECT w.id FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE (w.user_id = ? OR wm.user_id = ?)
       ORDER BY w.is_default DESC, w.created_at ASC
       LIMIT 1`,
      { 
        replacements: [userId, userId], 
        type: sequelize.QueryTypes.SELECT
      }
    );

    const workspace = workspaceResult[0];
    if (!workspace) {
      return sendError(res, 400, 'No workspace selected', 'WORKSPACE_REQUIRED');
    }

    
    const [clientUpdated] = await Client.update(
      { role: normalizedRole },
      { where: { id, workspace_id: workspace.id } }
    );

    if (!clientUpdated) {
      return sendError(res, 404, 'Client not found', 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Role updated successfully');

  } catch (error) {
    console.error('Update role error:', error);
    return sendError(res, 500, 'Internal server error', 'SERVER_ERROR');
  }
};

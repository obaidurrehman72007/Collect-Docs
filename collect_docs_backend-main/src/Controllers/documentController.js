
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { DocumentSubmission, BundleRequestRequirement, BundleRequest, Client,sequelize  } from '../models/index.js';
import { promisify } from 'util';

const randomBytes = promisify(crypto.randomBytes);

const documentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const workspaceId = req.bundleRequest?.workspace_id || 'public';
    const uploadDir = path.join(process.cwd(), 'uploads', workspaceId);
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: async (req, file, cb) => {
    const bytes = await randomBytes(16);
    cb(null, `doc-${bytes.toString('hex')}${path.extname(file.originalname)}`);
  }
});



export const upload = multer({ 
  storage: documentStorage,
  limits: { fileSize: 500 * 1024 * 1024 } 
});

export const getBundleRequestDocuments = async (req, res) => {
  try {
    const { token } = req.params;
    
    const bundleRequest = await BundleRequest.findOne({
      where: { share_token: token },
      include: [{
        model: BundleRequestRequirement,
        as: 'requirements',
        include: [{
          model: DocumentSubmission,
          as: 'submissions'
        }]
      }]
    });

    if (!bundleRequest) {
      return res.status(404).json({ message: 'Invalid request link' });
    }

    const requirementsWithStatus = await Promise.all(bundleRequest.requirements.map(async (requirement) => {
      const subs = requirement.submissions || [];
      const processedSubs = await Promise.all((subs).map(async (s) => {
        const subData = s.toJSON();
        const name = subData.file_name || '';
        const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(name);
        if (isImage && subData.file_path) {
          try {
            const buffer = await fs.readFile(subData.file_path);
            const ext = path.extname(name).toLowerCase().replace('.', '');
            subData.base64 = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${buffer.toString('base64')}`;
          } catch (err) {
            subData.base64 = null;
          }
        }
        return subData;
      }));

      return {
        ...requirement.toJSON(),
        status: subs.length > 0 ? subs[0]?.status || 'pending' : 'pending',
        submission: subs[0] || null,
        submissions: processedSubs
      };
    }));

    res.json({ 
      bundleRequest: {
        ...bundleRequest.toJSON(),
        requirements: requirementsWithStatus
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const uploadDocument = async (req, res) => {
  try {
    const { request_id, requirement_id } = req.body;
    
    
    const newDoc = await DocumentSubmission.create({
      bundle_request_id: request_id,
      requirement_id: requirement_id,
      file_path: req.file.path,
      file_name: req.file.originalname,
      file_type: req.file.mimetype,
      status: 'pending' 
    });

    res.json({ success: true, data: newDoc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const approveDocument = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { submissionId } = req.params;
    
    const submission = await DocumentSubmission.findByPk(submissionId, { transaction });
    if (!submission) {
      return res.status(404).json({ message: 'Document not found' });
    }

    await submission.update({ status: 'approved' }, { transaction });

    
    

    await transaction.commit();
    res.json({ message: 'Document approved ✅' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};


export const rejectDocument = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { submissionId } = req.params;
    const { reason } = req.body;
    
    const submission = await DocumentSubmission.findByPk(submissionId, { transaction });
    if (!submission) {
      return res.status(404).json({ message: 'Document not found' });
    }

    await submission.update({ 
      status: 'rejected',
      rejection_reason: reason 
    }, { transaction });

    
    

    await transaction.commit();
    res.json({ message: 'Document rejected ❌' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ message: error.message });
  }
};

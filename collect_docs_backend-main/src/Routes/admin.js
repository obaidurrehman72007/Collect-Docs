
import express from 'express';
import { authenticateToken, requireWorkspace } from '../Controllers/authController.js';
import { Client, Bundle, BundleRequest, BundleRequestRequirement } from '../models/index.js';

const router = express.Router();


router.use((req, res, next) => {
  console.log(`[Admin Router] Request: ${req.method} ${req.path}`);
  next();
});


router.get('/public-info/client/:token', async (req, res) => {
  try {
    
    const request = await BundleRequest.findOne({
      where: { share_token: req.params.token }
    });

    if (!request) {
      return res.status(404).json({ success: false, error: 'Token not found' });
    }

    
    const client = await Client.findByPk(request.client_id, {
      attributes: ['id', 'name', 'email',]
    });

    
    const snapshotRequirements = await BundleRequestRequirement.findAll({
      where: { bundle_request_id: request.id }
    });

    
    const bundle = await Bundle.findByPk(request.bundle_id);

    
    
    let finalTemplate = [];
    if (snapshotRequirements && snapshotRequirements.length > 0) {
      finalTemplate = snapshotRequirements;
    } else if (bundle && bundle.template) {
      
      finalTemplate = typeof bundle.template === 'string' 
        ? JSON.parse(bundle.template) 
        : bundle.template;
    }

    return res.json({ 
      success: true, 
      client: client,
      bundle_name: bundle ? bundle.name : 'Document Request',
      status: request.status,
      
      requirements: finalTemplate 
    });

  } catch (error) {
    console.error('🚨 Public Info Route Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});
router.get('/bundles/:id/preview', async (req, res) => {
  try {
    
    const bundle = await Bundle.findByPk(req.params.id, {
      attributes: ['id', 'name', 'description', 'template']
    });
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }

    let requirements = [];
    try {
      requirements = JSON.parse(bundle.template || '[]');
    } catch (e) {
      requirements = [];
    }
    
    res.json({
      id: bundle.id,
      name: bundle.name,
      description: bundle.description,
      template: requirements,
      requirements: requirements,
    });
    
  } catch (error) {
    console.error('🚨 Preview ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});


router.use(authenticateToken, requireWorkspace);






router.get('/bundles', async (req, res) => {
  try {
    const bundles = await Bundle.findAll({ 
      where: { workspace_id: req.workspaceId },
      attributes: ['id', 'name', 'description', 'created_at', 'status','template'],
      order: [['created_at', 'DESC']]
    });
    
    res.json({ 
      success: true, 
      bundles, 
      count: bundles.length 
    });
  } catch (error) {
    console.error('🚨 GET bundles ERROR:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/bundles', async (req, res) => {
  try {
    const { name, description, template, created_by } = req.body;
    
    const finalTemplate = typeof template === 'string' 
      ? template 
      : JSON.stringify(template || []);
    
    const bundleData = {
      name: name?.trim(),
      description: description?.trim() || null,
      template: finalTemplate,
      workspace_id: req.workspaceId,
      status: 'pending',
      created_by: req.user?.id || req.workspaceId
    };
    
    const bundle = await Bundle.create(bundleData);
    const parsedTemplate = JSON.parse(bundle.template);
    
    res.status(201).json({ 
      success: true, 
      message: 'Bundle created successfully', 
      data: {
        ...bundle.toJSON(),
        template: parsedTemplate
      }
    });
  } catch (error) {
    console.error('🚨 Bundle CREATE ERROR:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});






// router.get('/bundle-requests', async (req, res) => {
//   try {
//     const bundleRequests = await BundleRequest.findAll({ 
//       where: { workspace_id: req.workspaceId },
//       include: [
//         { model: Client, attributes: ['id', 'name', 'email'] },
//         { model: Bundle, attributes: ['id', 'name'] }
//       ],
//       attributes: ['id', 'client_id', 'bundle_id', 'share_token', 'status', 'created_at', 'updated_at','rejection_reason','reviewed_at'],
//       order: [['created_at', 'DESC']]
//     });

    
//     const formatted = bundleRequests.map(r => ({
//       id: r.id,
//       share_token: r.share_token,
//       status: r.status,
//       createdAt: r.created_at || r.createdAt,
//       client: r.Client ? { id: r.Client.id, name: r.Client.name, email: r.Client.email } : null,
//       bundle: r.Bundle ? { id: r.Bundle.id, name: r.Bundle.name } : null
//     }));

//     res.json({ 
//       success: true, 
//       bundleRequests: formatted, 
//       count: formatted.length 
//     });
//   } catch (error) {
//     console.error('🚨 BundleRequests ERROR:', error.message);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

router.get('/bundle-requests', async (req, res) => {
  try {
    const bundleRequests = await BundleRequest.findAll({ 
      where: { workspace_id: req.workspaceId },
      include: [
        { model: Client, attributes: ['id', 'name', 'email'] },
        { model: Bundle, attributes: ['id', 'name'] }
      ],
      attributes: [
        'id', 
        'client_id', 
        'bundle_id', 
        'share_token', 
        'status', 
        'created_at', 
        'updated_at',
        'rejection_reason',
        'reviewed_at'
      ],
      order: [['created_at', 'DESC']]
    });

    const formatted = bundleRequests.map(r => ({
      id: r.id,
      share_token: r.share_token,
      status: r.status,
      createdAt: r.created_at || r.createdAt,
      rejection_reason: r.rejection_reason,     // ← now sent to frontend
      reviewed_at: r.reviewed_at,
      client: r.Client ? { id: r.Client.id, name: r.Client.name, email: r.Client.email } : null,
      bundle: r.Bundle ? { id: r.Bundle.id, name: r.Bundle.name } : null
    }));

    res.json({ 
      success: true, 
      bundleRequests: formatted, 
      count: formatted.length 
    });
  } catch (error) {
    console.error('🚨 BundleRequests ERROR:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
router.post('/bundle-requests', async (req, res) => {
  try {
    const { client_id, bundle_id } = req.body;
    
    
    const bundle = await Bundle.findOne({
      where: { id: bundle_id, workspace_id: req.workspaceId }
    });
    
    if (!bundle) return res.status(400).json({ success: false, error: 'Invalid bundle' });

    
    const bundleRequest = await BundleRequest.create({
      client_id: client_id || null,
      bundle_id: bundle.id,
      workspace_id: req.workspaceId,
      share_token: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending'
    });

    
    const templateFields = JSON.parse(bundle.template || '[]');
    if (templateFields.length > 0) {
      const snapshotData = templateFields.map(field => ({
        bundle_request_id: bundleRequest.id,
        requirement_id: bundle.id, 
        field_name: field.name.toLowerCase().replace(/\s+/g, '_'),
        name: field.name,
        description: field.description || '',
        type: field.type || 'file',
        is_mandatory: field.required || true,
        status: 'pending'
      }));

      
      await BundleRequestRequirement.bulkCreate(snapshotData);
    }
    
    res.status(201).json({ success: true, bundleRequest });
  } catch (error) {
    console.error('🚨 Create Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

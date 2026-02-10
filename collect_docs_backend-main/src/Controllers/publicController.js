
import { BundleRequest, Bundle, DocumentRequirement, DocumentSubmission } from '../models/index.js';

export const getPublicBundleDetails = async (req, res) => {
  try {
    const { token } = req.params;
    const request = await BundleRequest.findOne({
      where: { share_token: token },
      include: [{ 
        model: Bundle, 
        as: 'Bundle',
        include: [{ model: DocumentRequirement, as: 'requirements' }] 
      }]
    });

    if (!request) return res.status(404).json({ message: 'Link expired or invalid' });

    
    const submissions = await DocumentSubmission.findAll({
      where: { bundle_request_id: request.id },
      order: [['created_at', 'DESC']]
    });

    res.json({
      bundle_name: request.Bundle.name,
      status: request.status,
      
      requirements: request.Bundle.requirements.map(reqItem => {
        const itemSubmissions = submissions.filter(s => s.requirement_id === reqItem.id);
        return {
          ...reqItem.toJSON(),
          latest_submission: itemSubmissions[0] || null,
          history: itemSubmissions 
        };
      })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
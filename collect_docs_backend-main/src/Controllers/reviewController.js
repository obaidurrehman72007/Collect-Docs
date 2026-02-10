
import { DocumentSubmission, BundleRequest, Client } from '../models/index.js';
import { sendMail } from '../Config/mailer.js';

export const updateSubmissionStatus = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { status, reason } = req.body; 

    const submission = await DocumentSubmission.findByPk(submissionId, {
      include: [{ 
        model: BundleRequest, 
        as: 'bundleRequest',
        include: [{ model: Client, as: 'client' }]
      }]
    });

    await submission.update({ status, rejection_reason: reason });

    
    if (status === 'rejected') {
      await sendMail({
        to: submission.bundleRequest.client.email,
        subject: 'Document Update Required',
        html: `<h4>Your document was rejected</h4>
               <p>Reason: ${reason}</p>
               <p>Please use your original link to upload a new version.</p>`
      });
    }

    res.json({ success: true, message: `Document ${status}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const markRequestCompleted = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await BundleRequest.findByPk(requestId, {
      include: [{ model: Client, as: 'client' }]
    });

    await request.update({ status: 'completed' });

    
    await sendMail({
      to: request.client.email,
      subject: 'Application Completed',
      html: `<p>All your documents have been approved. Your request is now complete.</p>`
    });

    res.json({ success: true, message: 'Request marked as completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
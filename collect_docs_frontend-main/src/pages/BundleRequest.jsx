// src/pages/BundleRequest.jsx - ULTRA SMOOTH (NO FRAMER-MOTION)
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const BundleRequestPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});

  useEffect(() => {
    fetchBundleRequest();
  }, [token]);

  const fetchBundleRequest = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/documents/${token}`)
      if (!res.ok) throw new Error('Invalid link');
      
      const bundleData = await res.json();
      setData(bundleData);
      setRequirements(bundleData.DocumentRequirements || []);
    } catch (error) {
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (reqId, fieldName, file) => {
    setUploading(prev => ({ ...prev, [reqId]: true }));
    
    const formData = new FormData();
    formData.append('requirement_id', reqId);
      formData.append('bundle_request_id', data.id);  
    formData.append('file', file);

    try {
       const res = await fetch(`http://localhost:3000/api/documents/${data.id}/upload`, {
    method: 'POST',
    body: formData
  });
      
      if (res.ok) {
        setRequirements(prev => prev.map(r => 
          r.id === reqId ? { ...r, status: 'uploaded' } : r
        ));
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(prev => ({ ...prev, [reqId]: false }));
    }
  };

  const statusColor = (status) => {
    const colors = {
      pending: 'bg-orange-100 text-orange-800',
      uploaded: 'bg-blue-100 text-blue-800',
      approved: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-indigo-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Header */}
        <h1 className="text-4xl md:text-5xl font-bold text-center text-gray-900 mb-4 animate-slide-down">
          {data?.bundle?.name}
        </h1>
        
        <p className="text-xl text-center text-gray-600 mb-12 max-w-2xl mx-auto animate-slide-up">
          Upload your required documents below
        </p>

        {/* Requirements */}
        <div className="grid md:grid-cols-2 gap-6">
          {requirements.map((req, index) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl shadow-lg p-8 border hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group animate-slide-up-delay"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-gray-900 capitalize">
                  {req.field_name.replace('_', ' ')}
                </h3>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusColor(req.status)}`}>
                  {req.status.toUpperCase()}
                </span>
              </div>

              {req.status !== 'approved' && (
                <div className="space-y-4">
                  <label className="block w-full p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 cursor-pointer group-hover:border-indigo-400">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      onChange={(e) => uploadDocument(req.id, req.field_name, e.target.files[0])}
                      disabled={uploading[req.id]}
                      className="hidden"
                    />
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <p className="font-medium text-lg text-gray-900">Click to upload</p>
                      <p className="text-sm text-gray-500">PDF, DOC, Images (Max 10MB)</p>
                    </div>
                  </label>
                  
                  {uploading[req.id] && (
                    <div className="flex items-center text-blue-600 text-sm bg-blue-50 p-3 rounded-xl">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up-delay {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.6s ease-out 0.1s both;
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out 0.2s both;
        }
        .animate-slide-up-delay {
          animation: slide-up-delay 0.6s ease-out both;
        }
      `}</style>
    </div>
  );
};

export default BundleRequestPage;

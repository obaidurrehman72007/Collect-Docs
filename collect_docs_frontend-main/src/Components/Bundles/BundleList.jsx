import { useState, useEffect } from 'react';

const BundleList = () => {
  const [bundles, setBundles] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBundles();
    fetchClients();
  }, []);

  const fetchBundles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/bundles', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch bundles');
      const data = await res.json();
      setBundles(data.bundles || []);
    } catch (err) {
      console.error('Bundles error:', err);
      setError('Failed to load bundles');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/clients', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch clients');
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err) {
      console.error('Clients error:', err);
      setError('Failed to load clients');
    }
  };

  const sendToClient = async (bundleId, clientId) => {
    if (!clientId) {
      alert('Please select a client');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/bundle-requests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bundleId, clientId })
      });
      
      if (res.ok) {
        alert('✅ Template sent to client!');
        fetchBundles();
        setSelectedClient(prev => ({...prev, [bundle.id]: ''}));
      } else {
        alert('Failed to send template');
      }
    } catch (err) {
      console.error('Send error:', err);
      alert('Network error');
    }
  };

  if (loading) return <div className="p-8">Loading bundles...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-12 text-gray-900">📋 Your Bundles</h1>
      
      {bundles.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-2xl mb-4">No bundles yet</p>
          <button 
            onClick={fetchBundles}
            className="bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {bundles.map(bundle => (
            <div key={bundle.id} className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all border border-gray-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{bundle.name}</h3>
                  <p className="text-gray-600 leading-relaxed">{bundle.description || 'No description'}</p>
                </div>
                <span className="px-4 py-2 bg-linear-to-r from-blue-500 to-indigo-500 text-white rounded-full text-sm font-bold shadow-md">
                  {bundle.requirements?.length || 0} docs
                </span>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => window.open(`/dashboard/bundles/${bundle.id}/preview`, '_blank')}
                  className="w-full bg-linear-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all"
                >
                  👁️ Preview Template
                </button>
                
                <select 
                  value={selectedClient[bundle.id] || ''}
                  onChange={(e) => setSelectedClient(prev => ({...prev, [bundle.id]: e.target.value}))}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all"
                >
                  <option value="">Select Client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.email}
                    </option>
                  ))}
                </select>

                <button 
                  onClick={() => sendToClient(bundle.id, selectedClient[bundle.id])}
                  disabled={!selectedClient[bundle.id]}
                  className="w-full bg-linear-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  📧 Send to Client
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BundleList;

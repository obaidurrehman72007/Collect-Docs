import React from 'react'

const BundlesTab = ({ apiCall, bundles, loading, fetchBundles, handleDeleteBundle, showNotification, clients, fetchClients }) => {
  const TEXT = {
    black: 'text-black',
    gray900: 'text-gray-900',
    gray700: 'text-gray-700',
    gray500: 'text-gray-500'
  };

  const [newBundle, setNewBundle] = useState({ name: '', description: '' });
  const [fields, setFields] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState({});

  const addField = () => {
    setFields([...fields, {
      name: '',
      type: 'text',
      required: true,
      placeholder: '',
      accept: '',
      pattern: ''
    }]);
  };

  const updateField = (index, updatedField) => {
    const newFields = fields.map((f, i) => i === index ? updatedField : f);
    setFields(newFields);
  };

  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  
  const handleCreateBundle = async (e) => {
    e.preventDefault();
    
    const bundleData = {
      name: newBundle.name,
      description: newBundle.description,
      requirements: fields
        .filter(f => f.name.trim())
        .map(f => ({
          name: f.name,
          type: f.type,
          required: f.required,
          placeholder: f.placeholder || '',
          accept: f.accept || '',
          pattern: f.pattern || ''
        }))
    };
    
    console.log('🚀 SENDING:', bundleData);

    try {
      
      await apiCall('/bundles', {
        method: 'POST',
        body: JSON.stringify(bundleData)
      });
      
      setNewBundle({ name: '', description: '' });
      setFields([]);
      fetchBundles();
      showNotification(`✅ "${bundleData.name}" created with ${bundleData.requirements.length} fields!`);
    } catch (error) {
      console.error('❌ CREATE ERROR:', error);
      showNotification(`Failed: ${error.message}`, 'error');
    }
  };


const sendBundleRequest = async (bundleId) => {
  const clientId = selectedClientId[bundleId];
  
  
  if (!bundleId) {
    showNotification('Bundle ID missing!', 'error');
    return;
  }
  
  
  if (!clientId) {
    showNotification('Please select a client first', 'error');
    return;
  }

  console.log('🚀 SENDING REQUEST:', { bundle_id: bundleId, client_id: clientId });

  try {
    const data = await apiCall('/bundle-requests', {
      method: 'POST',
      body: JSON.stringify({ 
        bundle_id: bundleId,    
        client_id: clientId     
      })
    });
    
    showNotification(`✅ Created! Link: /public/${data.share_token}`, 'success');
    fetchBundles();
  } catch (error) {
    console.error('❌ SEND REQUEST ERROR:', error);
    showNotification(`Failed: ${error.message}`, 'error');
  }
};




  
  return (
    <div className="space-y-6 p-6">
      <div className="bg-white p-8 rounded-2xl border-2 border-gray-100 shadow-xl">
        <h2 className={`text-3xl font-bold mb-8 ${TEXT.black}`}>Create Bundle</h2>
        
        <form onSubmit={handleCreateBundle} className="space-y-6 text-black ">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-lg font-semibold mb-3 ${TEXT.black}`}>Bundle Name *</label>
              <input 
                type="text" 
                value={newBundle.name} 
                onChange={(e) => setNewBundle({...newBundle, name: e.target.value})}
                className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg font-medium focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all"
                placeholder="CNIC Verification Bundle"
                required
              />
            </div>
            <div>
              <label className={`block text-lg font-semibold mb-3 ${TEXT.black}`}>Description</label>
              <input 
                type="text" 
                value={newBundle.description} 
                onChange={(e) => setNewBundle({...newBundle, description: e.target.value})}
                className="w-full p-4 border-2 border-gray-200 rounded-xl text-lg font-medium focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all"
                placeholder="Upload CNIC details for verification"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-6">
              <label className={`text-xl font-bold ${TEXT.black}`}>
                Form Fields ({fields.length})
              </label>
              <button
                type="button"
                onClick={addField}
                className="bg-linear-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-xl font-bold hover:from-emerald-600 hover:to-green-700 shadow-lg transition-all"
              >
                + Add Field
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {fields.map((field, index) => (
                <div key={index} className="group bg-linear-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-100 hover:border-blue-300 transition-all hover:shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className={`text-xl font-bold ${TEXT.black}`}>Field {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="text-red-500 hover:text-red-700 font-bold text-xl transition-colors group-hover:scale-110"
                    >
                      ×
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className={`block text-sm font-semibold mb-2 ${TEXT.gray700}`}>Field Name *</label>
                    <input 
                      value={field.name}
                      onChange={(e) => updateField(index, {...field, name: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="CNIC Number"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className={`block text-sm font-semibold mb-2 ${TEXT.gray700}`}>Type</label>
                    <select 
                      value={field.type}
                      onChange={(e) => updateField(index, {...field, type: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="file">File Upload</option>
                      
                    </select>
                  </div>

                  <div className="flex items-center mb-4">
                    <input 
                      type="checkbox" 
                      checked={field.required}
                      onChange={(e) => updateField(index, {...field, required: e.target.checked})}
                      className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label className={`ml-2 text-lg font-semibold ${TEXT.black}`}>Required</label>
                  </div>

                  {field.type === 'text' && (
                    <div className="mb-4">
                      <label className={`block text-sm font-semibold mb-2 ${TEXT.gray700}`}>Placeholder</label>
                      <input 
                        value={field.placeholder}
                        onChange={(e) => updateField(index, {...field, placeholder: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="12345-1234567-1"
                      />
                    </div>
                  )}

                  {field.type === 'file' && (
                    <div className="mb-4">
                      <label className={`block text-sm font-semibold mb-2 ${TEXT.gray700}`}>Accept Files</label>
                      <input 
                        value={field.accept}
                        onChange={(e) => updateField(index, {...field, accept: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="image/*,.pdf"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!newBundle.name || fields.filter(f => f.name.trim()).length === 0}
            className="w-full bg-linear-to-r from-green-500 to-emerald-600 text-white py-6 px-8 rounded-2xl text-2xl font-black shadow-2xl hover:shadow-3xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
             Create Bundle with {fields.filter(f => f.name.trim()).length} Fields
          </button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-bold ${TEXT.black}`}>Bundles ({bundles.length})</h2>
          <div className="flex gap-2">
            <button onClick={fetchBundles} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-1">
              <span>🔄</span><span>Refresh</span>
            </button>
            <button onClick={fetchClients} className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 flex items-center space-x-1">
              <span>👥</span><span>Clients</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className={`px-6 py-3 text-left text-xs font-semibold ${TEXT.black} uppercase tracking-wider`}>Name</th>
                <th className={`px-6 py-3 text-left text-xs font-semibold ${TEXT.black} uppercase tracking-wider`}>Description</th>
                <th className={`px-6 py-3 text-left text-xs font-semibold ${TEXT.black} uppercase tracking-wider`}>Requirements</th>
                <th className={`px-6 py-3 text-right text-xs font-semibold ${TEXT.black} uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bundles.length === 0 ? (
                <tr>
                  <td className={`px-6 py-12 text-center ${TEXT.gray500}`}>No bundles. Create one above!</td>
                </tr>
              ) : (
                bundles.map(bundle => (
                  <tr key={bundle.id} className="hover:bg-gray-50">
                    <td className={`px-6 py-4 text-sm font-bold ${TEXT.black}`}>{bundle.name}</td>
                    <td className={`px-6 py-4 text-sm ${TEXT.gray900} max-w-md truncate`}>{bundle.description || 'No description'}</td>
                    <td className={`px-6 py-4 text-sm ${TEXT.gray900} font-medium`}>
                      {bundle.requirementsCount || bundle.requirements?.length || 0} docs
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => window.open(`/dashboard/bundles/${bundle.id}/preview`, '_blank')}
                          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors font-medium"
                        >
                          👁️ Preview
                        </button>
                        <select 
                          value={selectedClientId[bundle.id] || ''}
                          onChange={(e) => setSelectedClientId(prev => ({...prev, [bundle.id]: e.target.value}))}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                        >
                          <option value="">Select Client</option>
                          {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => sendBundleRequest(bundle.id)}
                          disabled={!selectedClientId[bundle.id]}
                          className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          📧 Send
                        </button>
                        <button 
                          onClick={() => handleDeleteBundle(bundle.id)}
                          className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BundlesTab

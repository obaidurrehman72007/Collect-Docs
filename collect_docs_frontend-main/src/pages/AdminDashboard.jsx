import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Package,
  Send,
  View,
  MoreVertical,
  Edit3,
  Trash2,
  X,
  Check,
  Upload,
  Image as ImageIcon,
  File,
  Mail,
  ChevronRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  CheckCircle,
  Layers,
  Eye
} from 'lucide-react';
import Notification from '../Components/Dashboard/Notification.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const location = useLocation();
  const { t, lang } = useLanguage();
  const isManager = user?.role === 'manager';

  const [clients, setClients] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [bundleRequests, setBundleRequests] = useState([]);
  const [newClient, setNewClient] = useState({ name: '', email: '', password: '' });
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('clients');
  const [showClientModal, setShowClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState(null);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);
  const [newBundle, setNewBundle] = useState({ name: '', description: '' });
  const [fields, setFields] = useState([]);
  const [sendRequestModal, setSendRequestModal] = useState(false);
  const [selectedBundleForSend, setSelectedBundleForSend] = useState(null);
  const [selectedClientsForSend, setSelectedClientsForSend] = useState([]);
  const [requestSubTab, setRequestSubTab] = useState('received');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 720);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  const [isCreatingBundle, setIsCreatingBundle] = useState(false);
  const [isEditingBundle, setIsEditingBundle] = useState(false);
  const [isDeletingBundle, setIsDeletingBundle] = useState({});
  const [isSendingRequests, setIsSendingRequests] = useState(false);
  const [loadingActions, setLoadingActions] = useState({});
  const [sendNewRequestModal, setSendNewRequestModal] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientSort, setClientSort] = useState('name_asc');
  const [clientPage, setClientPage] = useState(1);
  const [clientPerPage, setClientPerPage] = useState(10);
  const [bundleSearch, setBundleSearch] = useState('');
  const [bundleSort, setBundleSort] = useState('name_asc');
  const [bundlePage, setBundlePage] = useState(1);
  const [bundlePerPage, setBundlePerPage] = useState(10);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestSort, setRequestSort] = useState('submitted_desc');
  const [requestPage, setRequestPage] = useState(1);
  const [requestPerPage, setRequestPerPage] = useState(10);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [menuPositionClass, setMenuPositionClass] = useState('left-4');
  const [showRejectRequestModal, setShowRejectRequestModal] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  useEffect(() => {
    if (lang === 'ar') {
      setMenuPositionClass('left-4');
    } else {
      setMenuPositionClass('right-4');
    }
  }, [lang]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 720);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showNotification = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setNotifications((prev) => [
      ...prev,
      { id, message, type, style: { top: `${84 + prev.length * 84}px` } },
    ]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 5000);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const apiCall = useCallback(
    async (endpoint, options = {}) => {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const response = await fetch(`/api${endpoint}`, {
          headers,
          ...options,
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || `HTTP ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('API Error:', error);
        showNotification(error.message || 'API request failed', 'error');
        throw error;
      }
    },
    [token, showNotification]
  );

  const fetchClients = useCallback(async () => {
    try {
      const result = await apiCall('/clients');
      const clientsData = result.data?.clients || [];
      setClients(Array.isArray(clientsData) ? clientsData : []);
    } catch (error) {
      console.error(' fetchClients error:', error);
      setClients([]);
    }
  }, [apiCall]);

  const fetchBundles = useCallback(async () => {
    try {
      const { bundles: data } = await apiCall('/bundles');
      setBundles(data || []);
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
      setBundles([]);
    }
  }, [apiCall]);



  const fetchBundleRequests = useCallback(async () => {
    try {
      const { bundleRequests: data } = await apiCall('/admin/bundle-requests');


      
      const rejectedOne = data?.find(r => r.status?.toLowerCase() === 'rejected');
      

      setBundleRequests(data || []);
    } catch (error) {
      console.error('Fetch bundle requests failed:', error);
      setBundleRequests([]);
    }
  }, [apiCall]);
  const handleCreateClient = async (e) => {
    e.preventDefault();
    setIsCreatingClient(true);
    const authToken = localStorage.getItem('auth_token');
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newClient.name,
          email: newClient.email,
          password: newClient.password,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to create client');
      }
      setNewClient({ name: '', email: '', password: '' });
      setShowClientModal(false);
      fetchClients();
      showNotification(t('Client Created'));
    } catch (error) {
      console.error('Create client error:', error);
      showNotification(error.message || t('Create Client Failed'));
    } finally {
      setIsCreatingClient(false);
    }
  };

  const handleEditClient = async (e) => {
    e.preventDefault();
    setIsEditingClient(true);
    try {
      await apiCall(`/clients/${editingClient.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editingClient),
      });
      setShowEditClientModal(false);
      setEditingClient(null);
      await fetchClients();
      showNotification(t('Client Updated'), 'success');
    } catch (error) {
      console.warn('Edit client attempt failed:', error);
      let userMessage = "حدث خطأ أثناء تحديث العميل";
      let type = 'error';
      if (error.message.includes('404') || error.message.toLowerCase().includes('not found')) {
        userMessage = "هذا العميل تم حذفه أو لم يعد موجوداً.\nتم تحديث قائمة العملاء تلقائياً.";
        type = 'warning';
        await fetchClients();
      }
      showNotification(userMessage, type);
      setShowEditClientModal(false);
      setEditingClient(null);
    } finally {
      setIsEditingClient(false);
    }
  };

  const handleDeleteClient = async () => {
    setIsDeletingClient(true);
    try {
      await apiCall(`/clients/${deletingClientId}`, { method: 'DELETE' });
      setShowDeleteClientModal(false);
      setDeletingClientId(null);
      fetchClients();
      showNotification(t('Client Deleted'));
    } catch (error) {
      console.error('Delete client failed:', error);
    } finally {
      setIsDeletingClient(false);
    }
  };

  const handleCreateBundle = async (e) => {
    e.preventDefault();
    setIsCreatingBundle(true);
    const bundleData = {
      name: newBundle.name.trim(),
      description: newBundle.description.trim() || '',
      requirements: fields
        .filter((f) => f.name.trim())
        .map((f) => ({
          name: f.name,
          type: f.type,
          required: f.required,
          placeholder: f.placeholder || '',
          accept: f.accept || '',
          pattern: f.pattern || '',
        })),
    };
    try {
      await apiCall('/bundles', {
        method: 'POST',
        body: JSON.stringify(bundleData),
      });
      setNewBundle({ name: '', description: '' });
      setFields([]);
      setShowBundleModal(false);
      fetchBundles();
      showNotification(t('Bundle Created'));
    } catch (error) {
      console.error('Bundle creation failed:', error);
      showNotification(`Error: ${error.message}`);
    } finally {
      setIsCreatingBundle(false);
    }
  };




  const handleEditBundle = async (e) => {
    e.preventDefault();

    const validFields = fields.filter(f => f.name?.trim());
    if (validFields.length === 0) {
      alert("You must have at least one field with a name");
      return;
    }

    setIsEditingBundle(true);

    const bundleData = {
      name: newBundle.name?.trim() || '',
      description: newBundle.description?.trim() || '',
      requirements: validFields.map(f => ({
        name: f.name.trim(),
        type: f.type || 'file',
        required: !!f.required,
        placeholder: f.placeholder?.trim() || '',
        accept: f.accept?.trim() || '',
        pattern: f.pattern?.trim() || '',
      })),
    };

    try {
      await apiCall(`/bundles/${editingBundle.id}`, {
        method: 'PUT',
        body: JSON.stringify(bundleData),
      });

      showNotification(t('Bundle Updated'), 'success');
      setShowBundleModal(false);
      setEditingBundle(null);
      setNewBundle({ name: '', description: '' });
      setFields([]);
      await fetchBundles();
    } catch (error) {
      console.error('Bundle update failed:', error);
      showNotification(error.message || 'Update failed', 'error');
    } finally {
      setIsEditingBundle(false);
    }
  };
  const handleDeleteBundle = (id) => {
    setConfirmDialog({
      title: t('Delete Bundle'),
      message: t('Are you sure you want to delete this bundle? This action cannot be undone.'),
      confirmText: t('Delete') || 'Delete',
      cancelText: t('Cancel') || 'Cancel',
      onConfirm: async () => {
        setIsDeletingBundle((prev) => ({ ...prev, [id]: true }));
        try {
          await apiCall(`/bundles/${id}`, { method: 'DELETE' });
          fetchBundles();
          showNotification(t('Bundle Deleted'), 'success');
        } catch (error) {
          console.error('Bundle deletion failed:', error);
          showNotification(error.message || 'Failed to delete bundle', 'error');
        } finally {
          setIsDeletingBundle((prev) => ({ ...prev, [id]: false }));
        }
        setConfirmDialog(null);
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const sendBundleToMultipleClients = async (bundle, clientIds) => {
    if (!bundle?.id || !Array.isArray(clientIds) || clientIds.length === 0) {
      showNotification("Cannot send: missing bundle or clients", "error");
      return;
    }
    setIsSendingRequests(true);
    try {
      for (const clientId of clientIds) {
        await apiCall('/bundle-requests', {
          method: 'POST',
          body: JSON.stringify({
            bundle_id: bundle.id,
            client_id: clientId,
          }),
        });
        const client = clients.find(c => c.id === clientId);
        showNotification(`Request sent to ${client?.name || 'client'}`, "success");
      }
      showNotification(`Successfully sent to ${clientIds.length} client${clientIds.length === 1 ? '' : 's'}`, "success");
      fetchBundleRequests();
    } catch (error) {
      console.error("Bulk send failed:", error);
      showNotification("Failed to send one or more requests", "error");
    } finally {
      setIsSendingRequests(false);
    }
  };

  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  

  const reviewRequest = async (requestId, action, reason = '') => {
    const request = bundleRequests.find(r => r.id === requestId);
    if (!request?.share_token) {
      showNotification('Cannot find share token for this request', 'error');
      return;
    }
    const shareToken = request.share_token;
    setLoadingActions(prev => ({ ...prev, [requestId]: action }));
    try {
      const endpoint =
        action === 'approve'
          ? `/bundle-requests/${shareToken}/approve`
          : `/bundle-requests/${shareToken}/reject`;
      const body = action === 'reject' ? { rejection_reason: reason } : {};
      await apiCall(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      showNotification(
        action === 'approve' ? t('approved') || 'Approved!' : t('rejected') || 'Rejected!',
        'success'
      );

      
      await fetchBundleRequests();

      
      setTimeout(() => {
        setBundleRequests(prev => [...prev]); 
      }, 100);

    } catch (error) {
      console.error('Review failed:', error);
      showNotification(
        error.message || (action === 'approve' ? 'Failed to approve' : 'Failed to reject'),
        'error'
      );
    } finally {
      setLoadingActions(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    }
  };
  const addField = () => {
    setFields(prev => [
      ...prev,
      {
        name: '',
        type: 'file',
        required: true,
        placeholder: '',
        accept: '',
        pattern: '',
      },
    ]);
  };

  const updateField = (index, updatedField) => {
    setFields(prev =>
      prev.map((field, i) =>
        i === index ? { ...updatedField } : field
      )
    );
  };

  const removeField = (index) => {
    setFields(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (location.pathname.includes('clients')) setActiveTab('clients');
    else if (location.pathname.includes('bundles')) setActiveTab('bundles');
    else if (location.pathname.includes('requests')) setActiveTab('requests');
    else setActiveTab('clients');
  }, [location.pathname]);

  useEffect(() => {
    if (user && token) {
      fetchClients();
      fetchBundles();
      fetchBundleRequests();
    }
  }, [user, token, fetchClients, fetchBundles, fetchBundleRequests]);

  if (!user || !token) return null;

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const sortedClients = [...filteredClients].sort((a, b) => {
    if (clientSort === 'name_asc') return a.name.localeCompare(b.name);
    if (clientSort === 'name_desc') return b.name.localeCompare(a.name);
    if (clientSort === 'email_asc') return a.email.localeCompare(b.email);
    if (clientSort === 'email_desc') return b.email.localeCompare(a.email);
    return 0;
  });

  const clientTotalPages = Math.ceil(sortedClients.length / (clientPerPage === 9999 ? Infinity : clientPerPage));
  const paginatedClients = sortedClients.slice(
    (clientPage - 1) * (clientPerPage === 9999 ? Infinity : clientPerPage),
    clientPage * (clientPerPage === 9999 ? Infinity : clientPerPage)
  );

  const searchTerm = (bundleSearch || '').toLowerCase().trim();

  const filteredBundles = bundles.filter((bundle) => {
    if (!bundle || typeof bundle !== 'object') return false;

    const name = (bundle.name || '').toLowerCase();
    const description = (bundle.description || '').toLowerCase();

    return name.includes(searchTerm) || description.includes(searchTerm);
  });

  const sortedBundles = [...filteredBundles].sort((a, b) => {
    if (bundleSort === 'name_asc') {
      return (a.name || '').localeCompare(b.name || '');
    }
    if (bundleSort === 'name_desc') {
      return (b.name || '').localeCompare(a.name || '');
    }
    return 0;
  });

  const bundleTotalPages = Math.ceil(sortedBundles.length / (bundlePerPage === 9999 ? Infinity : bundlePerPage));

  const paginatedBundles = sortedBundles.slice(
    (bundlePage - 1) * (bundlePerPage === 9999 ? Infinity : bundlePerPage),
    bundlePage * (bundlePerPage === 9999 ? Infinity : bundlePerPage)
  );

  const filteredRequests = bundleRequests.filter(
    (r) =>
      (r.client_name || r.client?.name || '').toLowerCase().includes(requestSearch.toLowerCase()) ||
      (r.bundle_name || r.bundle?.name || '').toLowerCase().includes(requestSearch.toLowerCase())
  );

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (requestSort === 'submitted_desc') return new Date(b.submitted_at) - new Date(a.submitted_at);
    if (requestSort === 'submitted_asc') return new Date(a.submitted_at) - new Date(b.submitted_at);
    if (requestSort === 'status_asc') return a.status.localeCompare(b.status);
    if (requestSort === 'status_desc') return b.status.localeCompare(a.status);
    return 0;
  });

  const requestTotalPages = Math.ceil(sortedRequests.length / (requestPerPage === 9999 ? Infinity : requestPerPage));
  const paginatedRequests = sortedRequests.slice(
    (requestPage - 1) * (requestPerPage === 9999 ? Infinity : requestPerPage),
    requestPage * (requestPerPage === 9999 ? Infinity : requestPerPage)
  );

  const toggleClientSelection = (id) => {
    setSelectedClientIds(prev =>
      prev.includes(id)
        ? prev.filter(cid => cid !== id)
        : [...prev, id]
    );
  };

  const handleSendToMultiple = () => {
    if (!selectedBundleForSend || selectedClientIds.length === 0) return;
    sendBundleToMultipleClients(selectedBundleForSend, selectedClientIds);
    setSelectedClientIds([]);
    setClientSearch('');
    setSendNewRequestModal(false);
  };
  const openRejectRequestModal = (requestId) => {
    setRejectRequestId(requestId);
    setRejectReasonInput('');
    setShowRejectRequestModal(true);
  };
  const handleRejectConfirm = () => {
    if (!rejectReasonInput.trim()) {
      showNotification(t('Please provide a rejection reason'), 'error');
      return;
    }
    reviewRequest(rejectRequestId, 'reject', rejectReasonInput.trim());
    setShowRejectRequestModal(false);
    setRejectRequestId(null);
    setRejectReasonInput('');
  };
  

  return (
    <div className="overflow-y-scroll px-4 py-6 sm:px-6 md:px-8 lg:px-12 xl:px-16 text-black" dir="">
      <Outlet />

      <div>
        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-4xl sm:text-5xl font-bold text-black">{t('Manage Clients')}</h1>
                <button
                  onClick={() => setShowClientModal(true)}
                  className="bg-black text-white px-7 py-3.5 rounded-xl font-medium hover:bg-gray-900 transition shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <User className="w-5 h-5" />
                  <span>{t('Add Client')}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <input
                  type="text"
                  placeholder={t('searchClients')}
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="px-5 py-3.5 border border-gray-300 rounded-xl bg-white w-full sm:w-80 lg:w-96 text-base focus:outline-none focus:border-black transition"
                />
                <select
                  value={clientSort}
                  onChange={(e) => setClientSort(e.target.value)}
                  className="px-5 py-3.5 border border-gray-300 rounded-xl bg-white w-full sm:w-80 lg:w-96 text-base focus:outline-none focus:border-black transition"
                >
                  <option value="name_asc">{t('Name A-Z')}</option>
                  <option value="name_desc">{t('Name Z-A')}</option>
                  <option value="email_asc">{t('Email A-Z')}</option>
                  <option value="email_desc">{t('Email Z-A')}</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {paginatedClients.map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    t={t}
                    onEdit={() => {
                      setEditingClient({ ...client });
                      setShowEditClientModal(true);
                    }}
                    onDelete={() => {
                      setDeletingClientId(client.id);
                      setShowDeleteClientModal(true);
                    }}
                    isManager={isManager}
                  />
                ))}
                {paginatedClients.length === 0 && (
                  <div className="col-span-full bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center">
                    <User size={48} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-black mb-2">{t('No Clients')}</h3>
                    <p className="text-gray-600">{t('No Client found in this section.') || 'No clients found.'}</p>
                  </div>
                )}
              </div>

              {filteredClients.length > 0 && (
                <div className="pagenation mt-12 border-t-2 border-gray-200 pt-8 w-full ">
                  <div className="flex flex-wrap flex-row justify-evenly md:justify-between items-start gap-6 ">
                    <div className="text-gray-700 text-center sm:text-left">
                      {t('Showing')} <strong>{(clientPage - 1) * clientPerPage + 1}</strong>–
                      <strong>{Math.min(clientPage * clientPerPage, filteredClients.length)}</strong> {t('of')}{' '}
                      <strong>{filteredClients.length}</strong>
                    </div>
                    <div className="flex items-center gap-4 whitespace-nowrap">
                      <span className="font-medium">{t('Per page:')}</span>
                      <select
                        value={clientPerPage}
                        onChange={(e) => {
                          setClientPerPage(Number(e.target.value));
                          setClientPage(1);
                        }}
                        className="border border-gray-300 rounded-lg px-2 py-1 bg-white  focus:outline-none focus:ring-2 focus:ring-gray-300"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex flex-row flex-wrap flex-1 items-center justify-around gap-2">
                        <button
                          onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                          disabled={clientPage === 1}
                          className={`px-4 py-2 border border-black rounded-xl transition font-bold   ${clientPage === 1 ? 'opacity-40 cursor-not-allowed bg-gray-100' : 'hover:bg-black hover:text-white'
                            }`}
                        >
                          <span>{'<'}</span>
                        </button>
                        <span className="px-8 sm:px-10 font-bold min-w-[140px] text-center">
                          {t('Page')} {clientPage} {t('of')} {Math.ceil(filteredClients.length / clientPerPage) || 1}
                        </span>
                        <button
                          onClick={() => setClientPage((p) => Math.min(Math.ceil(filteredClients.length / clientPerPage), p + 1))}
                          disabled={clientPage >= Math.ceil(filteredClients.length / clientPerPage)}
                          className={`px-4 py-2 border border-black rounded-xl transition font-bold   ${clientPage >= Math.ceil(filteredClients.length / clientPerPage)
                            ? 'opacity-40 cursor-not-allowed bg-gray-100'
                            : 'hover:bg-black hover:text-white'
                            }`}
                        >
                          <span>{'>'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bundles Tab */}
        {activeTab === 'bundles' && (
          <div className="space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-4xl sm:text-5xl font-bold text-black">{t('Manage Bundles')}</h1>
                <button
                  onClick={() => setShowBundleModal(true)}
                  className="bg-black text-white px-7 py-3.5 rounded-xl font-medium hover:bg-gray-900 transition shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  <Package className="w-5 h-5" />
                  <span>{t('Create Bundle')}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <input
                  type="text"
                  placeholder={t('searchBundles')}
                  value={bundleSearch}
                  onChange={(e) => setBundleSearch(e.target.value)}
                  className="px-5 py-3.5 border border-gray-300 rounded-xl bg-white w-full sm:w-80 lg:w-96 text-base focus:outline-none focus:border-black transition"
                />
                <select
                  value={bundleSort}
                  onChange={(e) => setBundleSort(e.target.value)}
                  className="px-5 py-3.5 border border-gray-300 rounded-xl bg-white w-full sm:w-80 lg:w-96 text-base focus:outline-none focus:border-black transition"
                >
                  <option value="name_asc">{t('Name A-Z')}</option>
                  <option value="name_desc">{t('Name Z-A')}</option>
                </select>
              </div>

              {/* Safe filtering + sorting + pagination */}
              {(() => {
                const searchTerm = (bundleSearch || '').toLowerCase().trim();

                
                const filteredBundles = bundles.filter((bundle) => {
                  if (!bundle || typeof bundle !== 'object' || !bundle.id) return false;
                  const name = (bundle.name || '').toLowerCase();
                  const description = (bundle.description || '').toLowerCase();
                  return name.includes(searchTerm) || description.includes(searchTerm);
                });

                
                const sortedBundles = [...filteredBundles].sort((a, b) => {
                  if (bundleSort === 'name_asc') {
                    return (a.name || '').localeCompare(b.name || '');
                  }
                  if (bundleSort === 'name_desc') {
                    return (b.name || '').localeCompare(a.name || '');
                  }
                  return 0;
                });

                
                const itemsPerPage = bundlePerPage === 9999 ? Infinity : bundlePerPage;
                const totalPages = Math.ceil(sortedBundles.length / itemsPerPage);
                const paginatedBundles = sortedBundles.slice(
                  (bundlePage - 1) * itemsPerPage,
                  bundlePage * itemsPerPage
                );

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {paginatedBundles.length > 0 ? (
                        paginatedBundles.map((bundle) => (
                          <BundleCard
                            key={bundle.id}
                            t={t}
                            bundle={bundle}
                            onEdit={() => {
                              const currentBundle = bundles.find(b => b.id === bundle.id);
                              if (!currentBundle) {
                                showNotification('This bundle was deleted or no longer exists', 'error');
                                return;
                              }

                              setEditingBundle(currentBundle);
                              setNewBundle({
                                name: currentBundle.name || '',
                                description: currentBundle.description || '',
                              });

                              
                              let loadedFields = [];

                              if (Array.isArray(currentBundle.requirements) && currentBundle.requirements.length > 0) {
                                loadedFields = currentBundle.requirements.map(req => ({
                                  name: req.name || '',
                                  type: req.type || 'file',
                                  required: req.required !== false,
                                  placeholder: req.placeholder || '',
                                  accept: req.accept || '',
                                  pattern: req.pattern || '',
                                  description: req.description || '',
                                }));
                              } else if (currentBundle.template) {
                                try {
                                  const parsedTemplate = JSON.parse(currentBundle.template);
                                  if (Array.isArray(parsedTemplate)) {
                                    loadedFields = parsedTemplate.map(f => ({
                                      name: f.name || '',
                                      type: f.type || 'file',
                                      required: f.required !== false,
                                      placeholder: f.placeholder || '',
                                      accept: f.accept || '',
                                      pattern: f.pattern || '',
                                      description: f.description || '',
                                    }));
                                  }
                                } catch (err) {
                                  console.error("Failed to parse bundle template:", err);
                                  showNotification("Could not load existing fields — starting fresh", "warning");
                                }
                              }

                              setFields(loadedFields.length > 0 ? loadedFields : []);
                              setShowBundleModal(true);
                            }}
                            onDelete={handleDeleteBundle}
                            isDeleting={isDeletingBundle[bundle.id]}
                            isManager={isManager}
                          />
                        ))
                      ) : (
                        <div className="col-span-full bg-white p-12 rounded-2xl border border-dashed border-gray-300 text-center">
                          <Package size={48} className="text-gray-400 mx-auto mb-4" />
                          <h3 className="text-xl font-semibold text-black mb-2">{t('No Bundles')}</h3>
                          <p className="text-gray-600">
                            {bundleSearch.trim()
                              ? 'No bundles match your search.'
                              : 'No bundles have been created yet.'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Pagination - only show when there are results */}
                    {filteredBundles.length > 0 && (
                      <div className="pagenation mt-12 border-t-2 border-gray-200 pt-8 w-full">
                        <div className="flex flex-wrap flex-row justify-evenly md:justify-between items-start gap-6 ">
                          <div className="text-gray-700 text-center sm:text-left">
                            {t('Showing')} <strong>{(bundlePage - 1) * bundlePerPage + 1}</strong>–
                            <strong>{Math.min(bundlePage * bundlePerPage, filteredBundles.length)}</strong> {t('of')}{' '}
                            <strong>{filteredBundles.length}</strong>
                          </div>
                          <div className="flex items-center gap-4 whitespace-nowrap">
                            <span className="font-medium">{t('Per page:')}</span>
                            <select
                              value={bundlePerPage}
                              onChange={(e) => {
                                setBundlePerPage(Number(e.target.value));
                                setBundlePage(1);
                              }}
                              className="border border-black rounded-lg px-4 py-2 bg-white  focus:outline-none focus:ring-2 focus:ring-gray-300"
                            >
                              <option value={5}>5</option>
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                            </select>
                          </div>
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex flex-row flex-wrap flex-1 items-center justify-around gap-2">
                              <button
                                onClick={() => setBundlePage((p) => Math.max(1, p - 1))}
                                disabled={bundlePage === 1}
                                className={`px-4 py-2 border border-black rounded-xl transition font-bold   ${bundlePage === 1 ? 'opacity-40 cursor-not-allowed bg-gray-100' : 'hover:bg-black hover:text-white'
                                  }`}
                              >
                                <span>{'<'}</span>
                              </button>
                              <span className="px-8 sm:px-10 font-bold min-w-[140px] text-center">
                                {t('Page')} {bundlePage} {t('of')} {Math.ceil(filteredBundles.length / bundlePerPage) || 1}
                              </span>
                              <button
                                onClick={() => setBundlePage((p) => Math.min(Math.ceil(filteredBundles.length / bundlePerPage), p + 1))}
                                disabled={bundlePage >= Math.ceil(filteredBundles.length / bundlePerPage)}
                                className={`px-4 py-2 border border-black rounded-xl transition font-bold   ${bundlePage >= Math.ceil(filteredBundles.length / bundlePerPage)
                                  ? 'opacity-40 cursor-not-allowed bg-gray-100'
                                  : 'hover:bg-black hover:text-white'
                                  }`}
                              >
                                <span>{'>'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-8">
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
                <h2 className="text-4xl sm:text-5xl font-bold text-black">{t('Bundle Requests')}</h2>
                <button
                  onClick={() => setSendNewRequestModal(true)}
                  className="bg-black text-white px-7 py-3.5 rounded-xl font-medium hover:bg-gray-900 transition shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                > <Send className="w-5 h-5" />
                  <span>{t('Send a new request')}</span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-7">
                <input
                  type="text"
                  placeholder={t('searchRequests')}
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="px-5 py-3.5 border border-gray-300 rounded-xl bg-white w-full sm:w-80 lg:w-96 text-base focus:outline-none focus:border-black transition"
                />
                <select
                  value={requestSort}
                  onChange={(e) => setRequestSort(e.target.value)}
                  className="px-5 py-3.5 border border-gray-300 rounded-xl bg-white w-full sm:w-64 text-base focus:outline-none focus:border-black transition"
                >
                  <option value="submitted_desc">{t('Submitted Newest')}</option>
                  <option value="submitted_asc">{t('Submitted Oldest')}</option>
                  <option value="status_asc">{t('Status A-Z')}</option>
                  <option value="status_desc">{t('Status Z-A')}</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {paginatedRequests.map((request) => (
        <RequestCard 
          key={request.id} 
          request={request} 
          t={t} 
          reviewRequest={reviewRequest}
          openRejectRequestModal={openRejectRequestModal}
          loadingActions={loadingActions}
        />
      ))}
    </div>

              

              {filteredRequests.length > 0 && (
                <div className="pagenation mt-12 pt-10 border-t-2 border-gray-200">
                  <div className="flex flex-wrap flex-row justify-evenly md:justify-between items-start gap-6 ">
                    <div className="text-gray-700 text-center sm:text-left">
                      {t('Showing')} <strong>{(requestPage - 1) * requestPerPage + 1}</strong>–
                      <strong>{Math.min(requestPage * requestPerPage, filteredRequests.length)}</strong> {t('of')} <strong>{filteredRequests.length}</strong>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-700">{t('Per page:')}</span>
                      <select
                        value={requestPerPage}
                        onChange={(e) => {
                          setRequestPerPage(Number(e.target.value));
                          setRequestPage(1);
                        }}
                        className="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:border-black"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                    <div className="flex flex-col flex-wrap sm:flex-row items-center gap-4">
                      <div className="flex flex-row flex-wrap flex-1 items-center justify-around gap-2">
                        <button
                          onClick={() => setRequestPage(p => Math.max(1, p - 1))}
                          disabled={requestPage === 1}
                          className={`px-4 py-2 border rounded-xl font-medium transition  ${requestPage === 1
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'border-black hover:bg-black hover:text-white'
                            }`}
                        >
                          <span>{'<'}</span>
                        </button>
                        <span className="font-medium min-w-[130px] text-center">
                          {t('Page')} {requestPage} {t('of')} {requestTotalPages || 1}
                        </span>
                        <button
                          onClick={() => setRequestPage(p => Math.min(requestTotalPages, p + 1))}
                          disabled={requestPage >= requestTotalPages}
                          className={`px-4 py-2 border rounded-xl font-medium transition  ${requestPage >= requestTotalPages
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'border-black hover:bg-black hover:text-white'
                            }`}
                        >
                          <span>{'>'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {sendNewRequestModal && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-y-auto">
                  <div className="px-6 sm:px-8 py-5 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-bold text-black">{t('Send Bundle Request')}</h3>
                    <button
                      onClick={() => setSendNewRequestModal(false)}
                      className="text-3xl text-gray-500 hover:text-black leading-none"
                    >
                      ×
                    </button>
                  </div>

                  <div className="p-6 sm:p-8">
                    <SendRequestsTab
                      bundles={bundles}
                      clients={clients}
                      selectedBundleForSend={selectedBundleForSend}
                      setSelectedBundleForSend={setSelectedBundleForSend}
                      selectedClientsForSend={[]}
                      setSelectedClientsForSend={() => { }}
                      sendRequestModal={false}
                      setSendRequestModal={() => { }}
                      sendBundleToMultipleClients={sendBundleToMultipleClients}
                      isSending={isSendingRequests}
                      isManager={isManager}
                    />

                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h4 className="font-semibold text-lg text-black mb-4">Select one or more clients</h4>
                      <div className="relative mb-5">
                        <input
                          type="text"
                          placeholder="Search clients by name or email..."
                          value={clientSearch || ''}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="w-full px-5 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:border-black transition"
                        />
                      </div>

                      <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                        {filteredClients.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            No clients found
                          </div>
                        ) : (
                          filteredClients.map((client) => (
                            <label
                              key={client.id}
                              className="flex items-center px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition"
                            >
                              <input
                                type="checkbox"
                                checked={selectedClientIds.includes(client.id)}
                                onChange={() => toggleClientSelection(client.id)}
                                className="h-5 w-5 text-black border-gray-300 rounded focus:ring-black"
                              />
                              <div className="ml-4">
                                <div className="font-medium text-black">{client.name || 'Unnamed'}</div>
                                <div className="text-sm text-gray-600">{client.email || '—'}</div>
                              </div>
                            </label>
                          ))
                        )}
                      </div>

                      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
                        <button
                          onClick={() => setSendNewRequestModal(false)}
                          className="px-7 py-3 border border-gray-400 rounded-xl hover:bg-gray-100 transition font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSendToMultiple}
                          disabled={selectedClientIds.length === 0 || isSendingRequests || !selectedBundleForSend}
                          className={`px-7 py-3 rounded-xl text-white font-medium transition flex items-center gap-2 justify-center ${selectedClientIds.length === 0 || isSendingRequests || !selectedBundleForSend
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-black hover:bg-gray-900'
                            }`}
                        >
                          {isSendingRequests && <Loader2 size={18} className="animate-spin" />}
                          <span>
                            Send to {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {notifications.map(({ id, message, type, style }) => (
        <Notification
          key={id}
          message={String(message)}
          type={type}
          style={style}
          onClose={() => dismissNotification(id)}
        />
      ))}

      {showClientModal && (
        <ClientModal
          newClient={newClient}
          setNewClient={setNewClient}
          onSubmit={handleCreateClient}
          onClose={() => setShowClientModal(false)}
          isEdit={false}
          isLoading={isCreatingClient}
          t={t}
        />
      )}

      {showEditClientModal && editingClient && (
        <ClientModal
          newClient={editingClient}
          setNewClient={setEditingClient}
          onSubmit={handleEditClient}
          onClose={() => setShowEditClientModal(false)}
          isEdit={true}
          isLoading={isEditingClient}
          t={t}

        />
      )}

      {showDeleteClientModal && (
        <DeleteModal
          title={t('Delete Client')}
          message={t('Confirm Delete Client')}
          onConfirm={handleDeleteClient}
          onClose={() => setShowDeleteClientModal(false)}
          isLoading={isDeletingClient}
          t={t}
        />
      )}

      {showBundleModal && (
        <BundleModal
          newBundle={newBundle}
          setNewBundle={setNewBundle}
          fields={fields}
          setFields={setFields}
          addField={addField}
          updateField={updateField}
          removeField={removeField}
          onSubmit={editingBundle ? handleEditBundle : handleCreateBundle}
          onClose={() => {
            setShowBundleModal(false);
            setEditingBundle(null);
            setNewBundle({ name: '', description: '' });
            setFields([]);
          }}
          editingBundle={editingBundle}
          isLoading={editingBundle ? isEditingBundle : isCreatingBundle}
          t={t}

        />
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-black mb-4">{confirmDialog.title}</h2>
            <p className="text-gray-700 mb-8 whitespace-pre-line">{confirmDialog.message}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                onClick={confirmDialog.onCancel}
                className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
              >
                {confirmDialog.cancelText || t('Cancel')}
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                disabled={isDeletingBundle[deletingClientId] || isDeletingClient}
              >
                {(isDeletingBundle[Object.keys(isDeletingBundle)[0]] || isDeletingClient) && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
                {confirmDialog.confirmText || t('Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showRejectRequestModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-black">{t('Reject Request')}</h2>
              <button
                onClick={() => setShowRejectRequestModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              {t('rejectRequestReasonPrompt')}
            </p>

            <textarea
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              placeholder={t('rejectionReasonPlaceholder')}
              className="w-full h-32 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-6"
              required
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectRequestModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-100 transition"
              >
                {t('Cancel')}
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReasonInput.trim()}
                className={`px-6 py-3 rounded-xl text-white font-medium transition ${rejectReasonInput.trim() ? 'bg-red-600 hover:bg-red-700' : 'bg-red-400 cursor-not-allowed'
                  }`}
              >
                {t('Confirm Reject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// const ClientCard = ({ client, onEdit, onDelete, isManager,t }) => {
//   const [showActions, setShowActions] = useState(false);
//   return (
//     <div className="bg-white p-5 sm:p-6 max-w-140 min-h-80 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden flex flex-col justify-center items-center hover:shadow-md transition-shadow">
//       {isManager && (
//         <>
//           <div
//             className="absolute top-2 left-2 sm:top-4 sm:left-4 p-1 sm:p-2 rounded-full bg-gray-100 cursor-pointer transition-colors hover:bg-gray-200"
//             onClick={() => setShowActions(!showActions)}
//           >
//             <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
//           </div>
//           {showActions && (
//             <div className="absolute top-10 left-2 sm:top-14 sm:left-4 bg-white border shadow-lg rounded-xl z-10 min-w-30 sm:min-w-35 py-1 overflow-hidden">
//               <button
//                 onClick={onEdit}
//                 className="w-full flex items-center px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors"
//               >
//                 <Edit3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
//                 {t('Edit')}
//               </button>
//               <button
//                 onClick={onDelete}
//                 className="w-full flex items-center px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors"
//               >
//                 <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
//                 {t('Delete')}
//               </button>
//             </div>
//           )}
//         </>
//       )}
//       <div className="text-center mb-4 wrap lg:break-none">
//         <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-2xl mx-auto flex items-center justify-center mb-3 sm:mb-4">
//           <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
//         </div>
//         <h3 className="text-lg sm:text-xl font-bold text-black mb-2">{client.name}</h3>
//         <div className="inline-flex items-center px-2 py-1 sm:px-3 sm:py-1 rounded-full bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium">
//           {client.email}
//         </div>
//       </div>
//     </div>
//   );
// };
const ClientCard = ({ client, onEdit, onDelete, isManager, t }) => {
  const [showActions, setShowActions] = useState(false);

  // Close actions menu when clicking an item
  const handleAction = (callback) => {
    setShowActions(false);
    callback();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="group relative bg-white border-2 border-zinc-100 rounded-[2rem] p-6 sm:p-8 transition-all duration-300 hover:border-black hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col items-center text-center overflow-hidden"
    >
      {/* Decorative Background Element */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-zinc-50 rounded-full group-hover:bg-zinc-100 transition-colors duration-500" />

      {/* --- Manager Actions (Logic Preserved) --- */}
      {isManager && (
        <div className="absolute top-6 left-6 z-20">
          <button
            onClick={() => setShowActions(!showActions)}
            className={`p-3 rounded-xl transition-all duration-300 ${
              showActions ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            }`}
          >
            <MoreVertical size={18} />
          </button>

          <AnimatePresence>
            {showActions && (
              <>
                {/* Backdrop to close menu */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowActions(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -10 }}
                  className="absolute left-0 mt-2 w-44 bg-white border-2 border-black rounded-2xl shadow-2xl z-20 overflow-hidden"
                >
                  <button
                    onClick={() => handleAction(onEdit)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-tighter hover:bg-zinc-50 transition-colors border-b border-zinc-100"
                  >
                    <Edit3 size={14} />
                    {t('Edit')}
                  </button>
                  <button
                    onClick={() => handleAction(onDelete)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black uppercase tracking-tighter text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={14} />
                    {t('Delete')}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* --- Profile Visuals --- */}
      <div className="relative mb-6">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-zinc-950 rounded-[2rem] flex items-center justify-center text-white shadow-xl transform group-hover:rotate-6 transition-transform duration-500">
          <User size={40} strokeWidth={1.5} className="italic" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border-2 border-black rounded-lg flex items-center justify-center">
          <Check size={14} strokeWidth={3} className="text-black" />
        </div>
      </div>

      {/* --- Client Info --- */}
      <div className="flex-1 w-full space-y-2">
        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter leading-none break-words">
          {client.name}
        </h3>
        
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl group-hover:bg-black group-hover:text-white transition-colors duration-300">
          <Mail size={12} />
          <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]">
            {client.email}
          </span>
        </div>
      </div>

      {/* --- Bottom Status Meta --- */}
      <div className="mt-8 pt-6 border-t-2 border-zinc-50 w-full flex items-center justify-between">
        <div className="text-left">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{t('Status')}</p>
          <p className="text-xs font-black uppercase tracking-tighter text-emerald-600 italic">Active Member</p>
        </div>
        <div className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-300 group-hover:border-black group-hover:text-black transition-all">
          <ChevronRight size={18} />
        </div>
      </div>

      {/* Hover Background Accent */}
      <div className="absolute inset-0 border-2 border-black rounded-[2rem] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300" />
    </motion.div>
  );
};

// const BundleCard = ({ bundle, onEdit, onDelete, isDeleting, isManager, t }) => {
//   const [showActions, setShowActions] = useState(false);
//   return (
//     <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-200 relative overflow-hidden max-w-150"> 
//       {isManager && (
//         <>
//           <div
//             className="absolute top-2 left-2 sm:top-4 sm:left-4 p-1 sm:p-2 rounded-full bg-gray-100 cursor-pointer transition-colors hover:bg-gray-200"
//             onClick={() => setShowActions(!showActions)}
//           >
//             <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
//           </div>
//           {showActions && (
//             <div className="absolute top-10 left-2 sm:top-14 sm:left-4 bg-white border shadow-lg rounded-xl z-10 min-w-30 sm:min-w-35 py-1 overflow-hidden">
//               <button
//                 onClick={onEdit}
//                 className="w-full flex items-center px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 transition-colors"
//               >
//                 <Edit3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
//                 {t('Edit')}
//               </button>
//               <button
//                 onClick={() => onDelete(bundle.id)}
//                 disabled={isDeleting}
//                 className="w-full flex items-center px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
//               >
//                 {isDeleting ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" /> : <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />}
//                 {isDeleting ? t('Deleting...') : t('Delete')}
//               </button>
//             </div>
//           )}
//         </>
//       )}
//       <div className="text-center mb-4">
//         <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-100 rounded-2xl mx-auto flex items-center justify-center mb-3 sm:mb-4">
//           <Package className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600" />
//         </div>
//         <h3 className="text-lg sm:text-xl font-bold text-black mb-2">{bundle.name}</h3>
//         <p className="text-gray-600 mb-3 sm:mb-4 min-h-12 sm:min-h-14 line-clamp-3 text-sm sm:text-base">
//           {bundle.description || 'No description'}
//         </p>
//         <Link
//           to={`/dashboard/bundles/${bundle.id}/preview`}
//           className="bg-blue-600 w-fit text-white px-7 py-3.5 rounded-xl font-medium hover:bg-blue-700 transition shadow-sm flex items-center gap-2 mx-auto"
//         >
//           Preview
//         </Link>
//       </div>
//     </div>
//   );
// };
const BundleCard = ({ bundle, onEdit, onDelete, isDeleting, isManager, t }) => {
  const [showActions, setShowActions] = useState(false);

  // Sanitized action wrapper
  const handleAction = (callback) => {
    setShowActions(false);
    callback();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -8 }}
      className="group relative bg-white border-2 border-zinc-100 rounded-[2.5rem] p-6 sm:p-8 flex flex-col transition-all hover:border-black hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] overflow-hidden"
    >
      {/* Decorative Index Tag */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-zinc-50 rounded-full group-hover:bg-emerald-50 transition-colors duration-500" />

      {/* --- MANAGER ACTIONS (Logic Preserved) --- */}
      {isManager && (
        <div className="absolute top-6 left-6 z-30">
          <button
            onClick={() => setShowActions(!showActions)}
            className={`p-3 rounded-2xl transition-all ${
              showActions ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
            }`}
          >
            <MoreVertical size={18} />
          </button>

          <AnimatePresence>
            {showActions && (
              <>
                {/* Backdrop overlay */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowActions(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -10 }}
                  className="absolute left-0 mt-3 w-48 bg-white border-2 border-black rounded-2xl shadow-2xl z-20 overflow-hidden"
                >
                  <button
                    onClick={() => handleAction(onEdit)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 border-b border-zinc-100 transition-colors"
                  >
                    <Edit3 size={14} />
                    {t('Edit')}
                  </button>
                  <button
                    onClick={() => handleAction(() => onDelete(bundle.id))}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-3 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    {isDeleting ? t('Deleting...') : t('Delete')}
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* --- ICON --- */}
      <div className="flex justify-center mb-8 relative">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center transform group-hover:-rotate-12 transition-transform duration-500 shadow-inner">
          <Package size={36} strokeWidth={1.5} />
        </div>
        <div className="absolute top-0 right-1/4 w-8 h-8 bg-black text-white rounded-xl flex items-center justify-center">
          <Layers size={14} />
        </div>
      </div>

      {/* --- CONTENT --- */}
      <div className="text-center flex-1">
        <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter leading-none mb-3 truncate">
          {bundle.name}
        </h3>
        <p className="text-sm font-bold text-zinc-400 line-clamp-3 mb-8 px-2 min-h-[3.5rem]">
          {bundle.description || t('No description available')}
        </p>
      </div>

      {/* --- PREVIEW ACTION --- */}
      <div className="mt-auto space-y-4">
        <Link
          to={`/dashboard/bundles/${bundle.id}/preview`}
          className="w-full bg-black text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all active:scale-95 shadow-xl"
        >
          <Eye size={16} />
          {t('Preview Bundle')}
        </Link>
        
        <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
                <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">Type</span>
                <span className="text-[10px] font-black uppercase italic">Master Bundle</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:text-black transition-colors">
                <ChevronRight size={16} />
            </div>
        </div>
      </div>

      {/* High-Contrast Hover Border */}
      <div className="absolute inset-0 border-2 border-black rounded-[2.5rem] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300" />
    </motion.div>
  );
};
const RequestCard = ({ request, t, reviewRequest, openRejectRequestModal, loadingActions }) => {
  const isRejected = request.status?.toLowerCase() === 'rejected';
  const isApproved = request.status?.toLowerCase() === 'approved';
  const isPending = !isRejected && !isApproved;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5 }}
      className="group relative bg-white border-2 border-zinc-100 rounded-[2.5rem] overflow-hidden flex flex-col transition-all hover:border-black hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]"
    >
      {/* --- Top Status Banner --- */}
      <div className={`px-6 py-5 flex items-start gap-3 border-b-2 transition-colors ${
        isApproved ? 'bg-emerald-50 border-emerald-100' : 
        isRejected ? 'bg-red-50 border-red-100' : 
        'bg-amber-50 border-amber-100'
      }`}>
        <div className={`p-2 rounded-xl bg-white shadow-sm ${
          isApproved ? 'text-emerald-600' : 
          isRejected ? 'text-red-600' : 
          'text-amber-600'
        }`}>
          {isApproved ? <CheckCircle size={18} /> : isRejected ? <AlertCircle size={18} /> : <Clock size={18} />}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${
            isApproved ? 'text-emerald-800' : isRejected ? 'text-red-800' : 'text-amber-800'
          }`}>
            {isApproved ? t('Verified') : isRejected ? t('Declined') : t('In Review')}
          </p>
          <h4 className="text-sm font-black uppercase tracking-tighter text-zinc-900 truncate">
             {request.status?.replace('_', ' ') || 'Pending'}
          </h4>
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="p-8 flex flex-col flex-1">
        {/* Client Identity */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-zinc-900 rounded-[1.2rem] flex items-center justify-center text-white shrink-0 shadow-lg group-hover:rotate-6 transition-transform">
            <User size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-black uppercase tracking-tighter text-lg leading-none truncate">
              {request.client_name || request.client?.name || t('Unknown Client')}
            </h3>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1 truncate">
              {request.client_email || request.client?.email || 'No Email'}
            </p>
          </div>
        </div>

        {/* Rejection Details Logic */}
        {isRejected && (
          <div className="mb-6 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">{t('Reason')}</p>
            <p className="text-xs font-bold text-red-600 italic">
               "{request.rejection_reason?.trim() || t('No reason specified')}"
            </p>
          </div>
        )}

        {/* Bundle Info */}
        <div className="mb-8">
          <p className="text-[9px] font-black text-zinc-300 uppercase tracking-widest mb-2">{t('Requested Bundle')}</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-xl group-hover:bg-black group-hover:text-white transition-all duration-300">
             <span className="text-xs font-black uppercase tracking-tighter">
                {request.bundle_name || request.bundle?.name || t('Standard Package')}
             </span>
          </div>
        </div>

        {/* --- Optimized Action Buttons --- */}
        <div className="mt-auto space-y-3">
          <Link
            to={`/bundle-request/${request.share_token}`}
            className="w-full bg-zinc-950 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all active:scale-95 shadow-xl"
          >
            <View size={16} />
            {t('Review Details')}
          </Link>

          <AnimatePresence>
            {['pending', 'submitted'].includes((request.status || '').toLowerCase()) && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 gap-3"
              >
                <button
                  onClick={() => reviewRequest(request.id, 'approve')}
                  disabled={loadingActions[request.id]}
                  className="bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg shadow-emerald-100"
                >
                  {loadingActions[request.id] === 'approve' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
                  {t('Approve')}
                </button>

                <button
                  onClick={() => openRejectRequestModal(request.id)}
                  disabled={loadingActions[request.id]}
                  className="bg-red-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-red-600 disabled:opacity-50 transition-all shadow-lg shadow-red-100"
                >
                  {loadingActions[request.id] === 'reject' ? <Loader2 size={14} className="animate-spin" /> : <X size={14} strokeWidth={3} />}
                  {t('Reject')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Brutalist Border Accent */}
      <div className="absolute inset-0 border-2 border-black rounded-[2.5rem] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300" />
    </motion.div>
  );
};
const ClientModal = ({ newClient, setNewClient, onSubmit, onClose, isEdit, isLoading, t }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md">
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <h2 className="text-xl font-bold text-black">
          {isEdit ? t('Edit Client') : t('Create New Client')}
        </h2>
        <button onClick={onClose} className="p-1 sm:p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2 text-black">{t('Name')}</label>
          <input
            type="text"
            value={newClient.name || ''}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
            className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2 text-black">{t('Email')}</label>
          <input
            type="email"
            value={newClient.email || ''}
            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
            className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-black text-white py-3 sm:py-4 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
              <span>{isEdit ? t('Saving...') : t('Creating...')}</span>
            </div>
          ) : (
            isEdit ? t('Save Changes') : t('Create Client')
          )}
        </button>
      </form>
    </div>
  </div>
);

const DeleteModal = ({ title, message, onConfirm, onClose, isLoading, t }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md">
      <h2 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">{title}</h2>
      <p className="text-gray-700 mb-6 sm:mb-8">{message}</p>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 sm:px-6 sm:py-3 border border-gray-300 text-black rounded-xl hover:bg-gray-50 transition-all w-full sm:w-auto"
        >
          {t('No')}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="px-4 py-2 sm:px-6 sm:py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          {isLoading && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />}
          <span>{t('Delete')}</span>
        </button>
      </div>
    </div>
  </div>
);


const BundleModal = ({
  newBundle,
  setNewBundle,
  fields,
  setFields,
  addField,
  updateField,
  removeField,
  onSubmit,
  onClose,
  editingBundle,
  isLoading,
  t
}) => {


  const [expandedFields, setExpandedFields] = useState({});

  
  const fieldsContainerRef = useRef(null);

  useEffect(() => {
    
    setExpandedFields(prev => {
      const next = { ...prev };
      
      if (fields.length > 0) {
        next[fields.length - 1] = true;
      }
      return next;
    });

    
    if (fieldsContainerRef.current) {
      
      setTimeout(() => {
        const container = fieldsContainerRef.current;
        const lastField = container.lastElementChild;

        if (lastField) {
          
          lastField.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });

          
          
          container.scrollTop += 180;

          
          
        }
      }, 150); 
    }
  }, [fields.length]);
  const toggleField = (index) => {
    setExpandedFields(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-5xl">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <h2 className="text-xl font-bold text-black">
            {editingBundle ? t('Edit Bundle') : t('Create New Bundle')}
          </h2>
          <button onClick={onClose} className="p-1 sm:p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-sm sm:text-lg font-semibold mb-2 sm:mb-3 text-black">{t('Bundle Name')} *</label>
              <input
                type="text"
                value={newBundle.name || ''}
                onChange={(e) => setNewBundle({ ...newBundle, name: e.target.value })}
                className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300"
                required
              />
            </div>
            <div>
              <label className="block text-sm sm:text-lg font-semibold mb-2 sm:mb-3 text-black">{t('Description')}</label>
              <input
                type="text"
                value={newBundle.description || ''}
                onChange={(e) => setNewBundle({ ...newBundle, description: e.target.value })}
                className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
              <label className="text-lg sm:text-xl font-bold text-black">{t('Documents')} ({fields.length})</label>
              <button
                type="button"
                onClick={addField}
                className="bg-black text-white px-7 py-3.5 rounded-xl font-medium hover:bg-gray-900 transition shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{t('Add Documents')}</span>
              </button>
            </div>

            {/* Scrollable container with ref for auto-scroll */}
            <div
              ref={fieldsContainerRef}
              className="space-y-4 max-h-80 sm:max-h-96 overflow-y-auto pr-2"
            >
              {fields.map((field, index) => (
                <div key={index} className="bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-200">
                  <div
                    className="flex justify-between items-center mb-3 sm:mb-4 cursor-pointer"
                    onClick={() => toggleField(index)}
                  >
                    <h4 className="text-lg sm:text-xl font-bold text-black">{t('Document')} {index + 1}</h4>
                    <div className="flex items-center">
                      {expandedFields[index] ? (
                        <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeField(index);
                        }}
                        className="ml-3 sm:ml-4 text-red-600 hover:text-red-800 text-xl sm:text-2xl font-bold"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {expandedFields[index] && (
                    <>
                      <div className="mb-3 sm:mb-4">
                        <label className="block text-sm font-semibold mb-1 sm:mb-2 text-black">{t('Field Name')} *</label>
                        <input
                          value={field.name || ''}
                          onChange={(e) => updateField(index, { ...field, name: e.target.value })}
                          className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                          required
                        />
                      </div>

                      {/* Removed Type selection completely */}

                      <div className="flex items-center mb-3 sm:mb-4">
                        <input
                        id={`required-${index}`}
                          type="checkbox"
                          checked={field.required ?? true}
                          onChange={(e) => updateField(index, { ...field, required: e.target.checked })}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-black border-gray-300 rounded focus:ring-gray-400"
                        />
                        <label htmlFor={`required-${index}`} className="ml-2 text-sm sm:text-lg font-medium text-black">{t('Required')}</label>
                      </div>

                      
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!newBundle.name?.trim() || fields.filter((f) => f.name?.trim()).length === 0 || isLoading}
            className="bg-black text-white px-7 py-3.5 rounded-xl font-medium mx-auto hover:bg-gray-900 transition shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                <span>{editingBundle ? t('Updating...') : t('Creating...')} ({fields.filter((f) => f.name?.trim()).length} fields)</span>
              </div>
            ) : (
              `${editingBundle ? t('Update Bundle') : t('Create Bundle')} (${fields.filter((f) => f.name?.trim()).length} Documents)`
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
const SendRequestsTab = ({
  bundles,
  clients,
  selectedBundleForSend,
  setSelectedBundleForSend,
  selectedClientsForSend,
  setSelectedClientsForSend,
  sendRequestModal,
  setSendRequestModal,
  sendBundleToMultipleClients,
  isSending,
  isManager,
}) => (
  <div className="bg-white p-10 rounded-2xl shadow-lg space-y-4 sm:space-y-6 border border-gray-200">
    <h3 className="text-lg sm:text-xl font-bold text-black">Send Bundle Requests</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      <div>
        <label className="block text-sm sm:text-lg font-semibold mb-2 sm:mb-3 text-black">Select Bundle</label>
        <select
          value={selectedBundleForSend?.id || ''}
          onChange={(e) => {
            const bundle = bundles.find((b) => b.id === e.target.value);
            setSelectedBundleForSend(bundle);
          }}
          className="w-full p-3 sm:p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          <option value="">Choose a bundle...</option>
          {bundles.map((bundle) => (
            <option key={bundle.id} value={bundle.id}>
              {bundle.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  </div>
);

const SendRequestModal = ({
  bundle,
  clients,
  selectedClients,
  setSelectedClients,
  onSend,
  onClose,
  isLoading,
}) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
    <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-2xl">
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <h2 className="text-xl font-bold text-black">{t('Send')} "{bundle?.name}" {t('to Clients')}</h2>
        <button onClick={onClose} className="p-1 sm:p-2 hover:bg-gray-100 rounded-xl">
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8 max-h-80 sm:max-h-96 overflow-y-auto">
        {clients.map((client) => (
          <label
            key={client.id}
            className="flex items-center p-3 sm:p-4 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedClients.includes(client.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedClients((prev) => [...prev, client.id]);
                } else {
                  setSelectedClients((prev) => prev.filter((id) => id !== client.id));
                }
              }}
              className="mr-2 sm:mr-3 w-4 h-4 sm:w-5 sm:h-5 text-black focus:ring-gray-400"
            />
            <div>
              <div className="font-semibold text-black text-sm sm:text-base">{client.name}</div>
              <div className="text-xs sm:text-sm text-gray-600">{client.email}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-3 sm:pt-4 border-t">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 sm:px-6 sm:py-3 border border-gray-300 text-black rounded-xl hover:bg-gray-50 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={onSend}
          disabled={selectedClients.length === 0 || isLoading}
          className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 font-bold flex items-center justify-center gap-1 sm:gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />}
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          {isLoading ? 'Sending...' : `Send to ${selectedClients.length} Client${selectedClients.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  </div>
);

export default AdminDashboard;
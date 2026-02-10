import React from 'react'
import { User } from 'lucide-react'
import ClientCard from './ClientCard'

const Clients = ({
  clients,
  setShowClientModal,
  setEditingClient,
  setShowEditClientModal,
  setDeletingClientId,
  setShowDeleteClientModal,
  handleRoleChange,
  t
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl border-2 border-gray-100 shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('Manage Clients')}
          </h1>

          <button
            onClick={() => setShowClientModal(true)}
            className="bg-blue-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
          >
            <User className="w-5 h-5" />
            <span>{t('Add Client')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {clients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onEdit={() => {
                setEditingClient(client)
                setShowEditClientModal(true)
              }}
              onDelete={() => {
                setDeletingClientId(client.id)
                setShowDeleteClientModal(true)
              }}
              onRoleChange={handleRoleChange}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Clients

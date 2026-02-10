import { Link, useLocation } from 'react-router-dom';
import { User, Package, Send } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

const Navigation = ({ isDesktop }) => {
  const location = useLocation();
  const { t } = useLanguage();

  const getActiveTab = () => {
    if (location.pathname.includes('clients')) return 'clients';
    if (location.pathname.includes('bundles')) return 'bundles';
    if (location.pathname.includes('requests')) return 'requests';
    return 'clients';
  };

  const activeTab = getActiveTab();

  if (isDesktop) {
    return (
      <div className="w-full border border-white/20 bg-black/20 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
        <nav className="space-y-2">
          <NavItem to="/dashboard/clients" active={activeTab === 'clients'} icon={User} label={t('clients')} />
          <NavItem to="/dashboard/bundles" active={activeTab === 'bundles'} icon={Package} label={t('bundles')} />
          <NavItem to="/dashboard/requests" active={activeTab === 'requests'} icon={Send} label={t('requests')} green />
        </nav>
      </div>
    );
  }

  return (
    <nav className="flex flex-col border border-white/20 bg-black/10 backdrop-blur-sm rounded-xl p-3 shadow-lg">
      <NavItem to="/dashboard/clients" active={activeTab === 'clients'} label={t('clients')} />
      <NavItem to="/dashboard/bundles" active={activeTab === 'bundles'} label={t('bundles')} />
      <NavItem to="/dashboard/requests" active={activeTab === 'requests'} label={t('requests')} green />
    </nav>
  );
};

const NavItem = ({ to, active, icon: Icon, label, green }) => (
  <Link
    to={to}
    className={`flex items-center px-4 py-3 font-semibold rounded-xl transition-all duration-200 group whitespace-nowrap shadow-lg ${
      active
        ? green 
          ? 'bg-emerald-500 text-white shadow-emerald-500/25 hover:shadow-emerald-500/50' 
          : 'bg-white text-black shadow-white/50 hover:shadow-white'
        : 'bg-white/10 text-white/80 border border-white/20 hover:bg-white/20 hover:text-white hover:border-white/40 hover:shadow-xl backdrop-blur-sm'
    } ${Icon ? 'pl-3 pr-4' : 'px-4'}`}
  >
    {Icon && (
      <Icon className={`w-5 h-5 mr-3  shrink-0 transition-all duration-200 ${
        active ? 'text-current' : 'text-white/60 group-hover:text-white'
      }`} />
    )}
    <span className="font-medium">{label}</span>
  </Link>
);

export default Navigation;

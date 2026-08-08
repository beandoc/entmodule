'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  Users,
  ShieldCheck,
  Stethoscope,
  Ear,
  UserRound,
  CheckCircle2,
  Building2,
  Sparkles,
  Phone,
  Mail,
  Search,
  Lock,
} from 'lucide-react';
import { useAppData } from '@/lib/app-data-context';

export function UserManagementSettings() {
  const { locale, registeredUsers, handleRegisterUser } = useAppData();
  const hi = locale === 'hi';

  const [activeTab, setActiveTab] = useState<string>('all');
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    role: 'patient' as 'ent_specialist' | 'audiologist' | 'patient' | 'caregiver',
    mrnOrHprId: '',
    email: '',
    phone: '',
    hospitalOrDept: '',
    age: '',
    gender: 'Male',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSubmitting(true);
    setFormMsg(null);
    try {
      const res = await handleRegisterUser({
        name: formData.name,
        role: formData.role,
        mrnOrHprId: formData.mrnOrHprId,
        email: formData.email,
        phone: formData.phone,
        hospitalOrDept: formData.hospitalOrDept,
        age: formData.age ? Number(formData.age) : undefined,
        gender: formData.gender,
      });

      if (res.success) {
        setFormMsg({
          type: 'success',
          text: hi
            ? `नया उपयोगकर्ता "${formData.name}" सफलतापूर्व पंजीकृत हो गया है!`
            : `User "${formData.name}" successfully registered into the system!`,
        });
        setFormData({
          name: '',
          role: 'patient',
          mrnOrHprId: '',
          email: '',
          phone: '',
          hospitalOrDept: '',
          age: '',
          gender: 'Male',
        });
        setTimeout(() => {
          setShowRegisterModal(false);
          setFormMsg(null);
        }, 2000);
      } else {
        setFormMsg({ type: 'error', text: res.error || 'Failed to register user.' });
      }
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = (registeredUsers || []).filter((u: any) => {
    const matchesTab = activeTab === 'all' || u.role === activeTab;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesTab;

    const matchesQuery =
      u.name.toLowerCase().includes(q) ||
      u.mrnOrHprId.toLowerCase().includes(q) ||
      (u.hospitalOrDept && u.hospitalOrDept.toLowerCase().includes(q));

    return matchesTab && matchesQuery;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ent_specialist':
        return <Stethoscope className="w-4 h-4 text-emerald-500" />;
      case 'audiologist':
        return <Ear className="w-4 h-4 text-indigo-500" />;
      case 'patient':
        return <UserRound className="w-4 h-4 text-cyan-500" />;
      default:
        return <Users className="w-4 h-4 text-purple-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ent_specialist':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
      case 'audiologist':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
      case 'patient':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800';
      default:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-800';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Settings Header & Quick Action */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              ENT USER REGISTRATION & CONTROL
            </span>
            <span className="text-xs font-mono text-slate-400">ABDM HPR / MRN Sync</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {hi ? 'उपयोगकर्ता पंजीकरण और खाता प्रबंधन' : 'User Registration & Account Management'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Default system accounts: <strong>Dr. Vishal Gaurav</strong> (ENT Specialist), <strong>Mr Lokanath Sahoo</strong> (Audiologist), and <strong>Sachin Srivastava</strong> (Patient). Register new clinicians, audiologists, or patients below.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>{hi ? '+ नया उपयोगकर्ता जोड़ें' : '+ Register New User'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={hi ? 'नाम, MRN या HPR ID से खोजें...' : 'Search by name, MRN, HPR ID...'}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: hi ? 'सभी (All)' : 'All Users' },
            { id: 'ent_specialist', label: hi ? 'ईएनटी डॉक्टर (Doctors)' : 'ENT Specialists' },
            { id: 'audiologist', label: hi ? 'ऑडियोलॉजिस्ट (Audiologists)' : 'Audiologists' },
            { id: 'patient', label: hi ? 'रोगी (Patients)' : 'Patients' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredUsers.map((user: any) => (
          <div
            key={user.id}
            className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border ${
              user.isDefault
                ? 'border-blue-300 dark:border-blue-800/60 shadow-sm'
                : 'border-slate-200 dark:border-slate-800'
            } flex flex-col justify-between space-y-4`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getRoleBadge(
                    user.role
                  )}`}
                >
                  {getRoleIcon(user.role)}
                  <span className="capitalize">{user.role.replace('_', ' ')}</span>
                </span>

                {user.isDefault && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                    ★ System Primary
                  </span>
                )}
              </div>

              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {user.name}
              </h3>
              <p className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                {user.mrnOrHprId}
              </p>

              {user.hospitalOrDept && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-start gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{user.hospitalOrDept}</span>
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Registered: {new Date(user.registeredAt).toLocaleDateString()}</span>
              {user.role === 'patient' && user.age && (
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  {user.age}y / {user.gender || 'M'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Registration Modal Popup */}
      {showRegisterModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="register-user-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-300" />
                <h3 id="register-user-title" className="font-bold text-base">
                  {hi ? 'नया उपयोगकर्ता पंजीकृत करें' : 'Register New ENT System User'}
                </h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                aria-label="Close modal"
                className="text-slate-300 hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700 dark:text-slate-200">
              {formMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    formMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-200'
                  }`}
                >
                  {formMsg.text}
                </div>
              )}

              <div>
                <label className="font-bold block mb-1">
                  {hi ? 'भूमिका (User Role)' : 'User System Role'} *
                </label>
                <select
                  value={formData.role}
                  onChange={(e: any) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                >
                  <option value="patient">Patient (रोगी)</option>
                  <option value="audiologist">Audiologist (ऑडियोलॉजिस्ट)</option>
                  <option value="ent_specialist">ENT Specialist / Surgeon (ईएनटी डॉक्टर)</option>
                  <option value="caregiver">Caregiver (देखभालकर्ता)</option>
                </select>
              </div>

              <div>
                <label className="font-bold block mb-1">
                  {hi ? 'पूरा नाम (Full Name)' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dr. Ritu Sharma or Major Amit Kumar"
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">
                    {hi ? 'MRN / HPR ID' : 'MRN or HPR ID'}
                  </label>
                  <input
                    type="text"
                    value={formData.mrnOrHprId}
                    onChange={(e) => setFormData({ ...formData, mrnOrHprId: e.target.value })}
                    placeholder={formData.role === 'patient' ? 'MRN: 99120' : 'HPR-IN-88912'}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">
                    {hi ? 'अस्पताल / विभाग' : 'Hospital / Department'}
                  </label>
                  <input
                    type="text"
                    value={formData.hospitalOrDept}
                    onChange={(e) => setFormData({ ...formData, hospitalOrDept: e.target.value })}
                    placeholder="e.g. Command Hospital (SC) Pune"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Email / ABHA ID</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@abdm.in"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>

              {formData.role === 'patient' && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-bold block mb-1">Patient Age</label>
                    <input
                      type="number"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="e.g. 35"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold block mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register User at Backend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

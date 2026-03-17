'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import api from '@/lib/api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    status: 'active'
  });

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    } else if (user) {
      loadUsers();
    }
  }, [user, router]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (userToEdit = null) => {
    setError('');
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        password: '', // Blank for edit unless changing
        role: userToEdit.role,
        status: userToEdit.status
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        status: 'active'
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, formData);
      } else {
        await api.createUser(formData);
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await api.deleteUser(id);
        loadUsers();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const toggleStatus = async (userToToggle) => {
    try {
      const newStatus = userToToggle.status === 'active' ? 'inactive' : 'active';
      await api.updateUser(userToToggle.id, {
        name: userToToggle.name,
        email: userToToggle.email,
        role: userToToggle.role,
        status: newStatus
      });
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!user || user.role !== 'admin') {
    return null; // or a loading spinner
  }

  return (
    <div className="fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">User Management</h1>
          <p className="text-[var(--text-muted)]">Manage administrators and system users</p>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          + Add User
        </button>
      </div>

      {error && !showModal && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--text-muted)]">Loading users...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium text-white">{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge" style={{ 
                        background: u.role === 'admin' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                        color: u.role === 'admin' ? '#818cf8' : '#e5e7eb'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ 
                        background: u.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: u.status === 'active' ? '#34d399' : '#f87171'
                      }}>
                        {u.status}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => toggleStatus(u)}
                          className="text-sm"
                          style={{ color: u.status === 'active' ? '#f59e0b' : '#10b981' }}
                          disabled={u.id === user.id}
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleOpenModal(u)}
                          className="text-sm text-blue-400 hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="text-sm text-red-400 hover:text-red-300"
                          disabled={u.id === user.id}
                          style={{ opacity: u.id === user.id ? 0.5 : 1 }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-[var(--text-muted)]">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal component */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '20px' }}>
            <h2 className="text-xl font-bold mb-4 gradient-text">{editingUser ? 'Edit User' : 'Add New User'}</h2>
            
            {error && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded mb-4 text-sm border border-red-500/20">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email" 
                  className="form-input" 
                  required 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {editingUser ? 'Password (leave blank to keep current)' : 'Password'}
                </label>
                <input 
                  type="password" 
                  className="form-input" 
                  required={!editingUser} 
                  minLength={6}
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div className="flex gap-4">
                <div className="form-group flex-1">
                  <label className="form-label">Role</label>
                  <select 
                    className="form-input" 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-input" 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

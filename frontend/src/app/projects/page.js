'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [runningId, setRunningId] = useState(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredProjects(projects);
    } else {
      const query = search.toLowerCase();
      setFilteredProjects(
        projects.filter(
          (p) =>
            p.project_name.toLowerCase().includes(query) ||
            p.first_name.toLowerCase().includes(query) ||
            p.last_name.toLowerCase().includes(query) ||
            p.email.toLowerCase().includes(query)
        )
      );
    }
  }, [search, projects]);

  const loadProjects = async () => {
    try {
      const data = await api.getProjects();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    setDeleteId(id);
    try {
      await api.deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteId(null);
    }
  };

  const handleDownload = async (id) => {
    setDownloadingId(id);
    try {
      await api.downloadReport(id);
    } catch (err) {
      setError('Failed to download PDF. Ensure the backend is running.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRun = async (id) => {
    setRunningId(id);
    setError('');
    try {
      const data = await api.runProjectAutomation(id);
      alert('Automation completed successfully. You can now download the updated PDF report.');
      console.log('Automation results:', data.results);
      loadProjects(); // Refresh to get final status and maybe some other data
    } catch (err) {
      setError('Automation failed: ' + err.message);
      loadProjects();
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link href="/projects/add" className="btn-primary">
          <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Project
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search projects by name or contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        {filteredProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            {projects.length === 0 ? (
              <>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>No projects yet</p>
                <p style={{ fontSize: '13px', marginBottom: '16px' }}>Add your first project to get started</p>
                <Link href="/projects/add" className="btn-primary">Add Project</Link>
              </>
            ) : (
              <p style={{ fontSize: '14px' }}>No projects match your search</p>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Project Name</th>
                  <th>Contact Person</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project, idx) => (
                  <tr key={project.id} className="animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{project.project_name}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{project.first_name} {project.last_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{project.email}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${project.status}`}>{project.status}</span>
                    </td>
                    <td style={{ fontSize: '13px' }}>{new Date(project.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link
                          href={`/projects/${project.id}`}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          View
                        </Link>
                          <button
                            onClick={() => handleRun(project.id)}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#10b981', color: 'white', border: 'none' }}
                            disabled={runningId === project.id || project.status === 'testing'}
                          >
                            {runningId === project.id || project.status === 'testing' ? 'Running...' : 'Run'}
                          </button>
                          <button
                            onClick={() => handleDownload(project.id)}
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#3b82f6', border: 'none' }}
                            disabled={downloadingId === project.id}
                          >
                            {downloadingId === project.id ? 'Generating...' : 'Download PDF'}
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="btn-danger"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            disabled={deleteId === project.id}
                          >
                            {deleteId === project.id ? '...' : 'Delete'}
                          </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

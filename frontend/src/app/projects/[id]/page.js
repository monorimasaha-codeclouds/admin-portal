'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function ProjectDetailPage({ params }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProject();
  }, []);

  const loadProject = async () => {
    try {
      const data = await api.getProject(resolvedParams.id);
      setProject(data.project);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await api.deleteProject(resolvedParams.id);
      router.push('/projects');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div className="alert alert-error" style={{ maxWidth: '400px', margin: '0 auto' }}>{error}</div>
        <Link href="/projects" className="btn-secondary" style={{ marginTop: '16px' }}>Back to Projects</Link>
      </div>
    );
  }

  if (!project) return null;

  const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <Link href="/projects" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '14px' }}>← Back</Link>
          </div>
          <h1 className="page-title">{project.project_name}</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className={`badge badge-${project.status}`}>{project.status}</span>
          <button onClick={handleDelete} className="btn-danger">Delete Project</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Project Information & Links */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '16px' }}>
            Project Information & URLs
          </h2>
          <InfoRow label="Project Name" value={project.project_name} />
          <InfoRow label="Status" value={project.status} />
          <InfoRow label="Created" value={new Date(project.created_at).toLocaleString()} />
          
          <div style={{ marginTop: '20px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>Pages</p>
            {project.links && project.links.map((link, idx) => (
              <div key={idx} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{link.link_type}</div>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--accent-primary)', textDecoration: 'none' }}>{link.url}</a>
                </div>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 14, height: 14, color: 'var(--text-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </div>
            ))}
          </div>
        </div>

        {/* Personal Info */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '16px' }}>
            Personal Information
          </h2>
          <InfoRow label="First Name" value={project.first_name} />
          <InfoRow label="Last Name" value={project.last_name} />
          <InfoRow label="Email" value={project.email} />
          <InfoRow label="Phone" value={project.phone} />
        </div>

        {/* Address */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '16px' }}>
            Address
          </h2>
          <InfoRow label="Address" value={project.address} />
          <InfoRow label="City" value={project.city} />
          <InfoRow label="Zip/Postal" value={project.zip} />
          <InfoRow label="State" value={project.state} />
        </div>

        {/* Card Info Array */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '16px' }}>
            Test Payment Cards
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {project.cards && project.cards.map((card, idx) => (
              <div key={idx} style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{card.card_type} — {card.category}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>CVV: •••</span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '2px', color: '#fff', marginBottom: '12px' }}>
                  •••• •••• •••• {card.card_number.slice(-4)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Expires</div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{card.card_month}/{card.card_year}</div>
                  </div>
                  {card.card_type === 'VISA' ? (
                    <div style={{ fontSize: '16px', fontWeight: 800, fontStyle: 'italic', color: 'rgba(255,255,255,0.2)' }}>VISA</div>
                  ) : (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(235, 0, 27, 0.4)' }}></div>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255, 159, 0, 0.4)', marginLeft: '-6px' }}></div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reports Section (Future) */}
      <div className="glass-card" style={{ padding: '24px', marginTop: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '16px' }}>
          Test Reports
        </h2>
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '14px', marginBottom: '4px' }}>No reports generated yet</p>
          <p style={{ fontSize: '12px' }}>Automated testing and report generation coming soon</p>
        </div>
      </div>
    </div>
  );
}

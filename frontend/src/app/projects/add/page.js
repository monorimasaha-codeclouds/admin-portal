'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming',
];

const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const YEARS = Array.from({ length: 12 }, (_, i) => (2024 + i).toString());
const LINK_TYPES = ['Landing Page', 'Checkout Page', 'Thank You Page', 'Other'];
const CATEGORIES = ['Decline', 'Prepaid', 'Regular'];
const CARD_TYPES = ['VISA', 'MasterCard', 'Amex', 'Discover'];

const PREDEFINED_CARDS = [
  { id: 'c1', label: '1444444444444441 — Decline | VISA | Exp: 12/2028 | CVV: 242', card_number: '1444444444444441', card_type: 'VISA', category: 'Decline', card_month: '12', card_year: '2028', cvv: '242' },
  { id: 'c2', label: '1444444444444445 — Decline | MasterCard | Exp: 12/2028 | CVV: 242', card_number: '1444444444444445', card_type: 'MasterCard', category: 'Decline', card_month: '12', card_year: '2028', cvv: '242' },
  { id: 'c3', label: '1444444444444442 — Prepaid | VISA | Exp: 12/2028 | CVV: 242', card_number: '1444444444444442', card_type: 'VISA', category: 'Prepaid', card_month: '12', card_year: '2028', cvv: '242' },
  { id: 'c4', label: '1444444444444446 — Prepaid | MasterCard | Exp: 12/2028 | CVV: 242', card_number: '1444444444444446', card_type: 'MasterCard', category: 'Prepaid', card_month: '12', card_year: '2028', cvv: '242' },
  { id: 'c5', label: '4147090000000001 — Regular | VISA BSB | Exp: 12/2028 | CVV: 242', card_number: '4147090000000001', card_type: 'VISA', category: 'Regular', card_month: '12', card_year: '2028', cvv: '242' },
  { id: 'c6', label: '5156760000000001 — Regular | Master BSB | Exp: 12/2028 | CVV: 242', card_number: '5156760000000001', card_type: 'MasterCard', category: 'Regular', card_month: '12', card_year: '2028', cvv: '242' },
];

const FIRST_NAMES = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas'];
const CITIES = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'];
const STREETS = ['Main St', 'Park Ave', 'Oak St', 'Pine St', 'Cedar Ln', 'Maple Dr', 'Washington Blvd', 'Lakeview Terrace', 'Broad St', 'Highland Ave'];

const initialFormState = {
  project_name: '',
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  zip: '',
  state: '',
};

export default function AddProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialFormState);
  
  // Dynamic links state
  const [links, setLinks] = useState([{ link_type: 'Landing Page', url: '' }]);
  
  // Cards state
  const [selectedCards, setSelectedCards] = useState([]); // array of IDs from PREDEFINED_CARDS
  const [customCards, setCustomCards] = useState([]);
  const [showCustomCardForm, setShowCustomCardForm] = useState(false);
  const [customCardForm, setCustomCardForm] = useState({
    card_number: '', card_type: 'VISA', category: 'Regular', card_month: '', card_year: '', cvv: ''
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Handlers for Basic Project Info ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // --- Auto Generate Handlers ---
  const generatePersonalInfo = () => {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digit random
    const domains = ['example.com', 'testmail.com', 'gmail.com', 'outlook.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    setForm(prev => ({
      ...prev,
      first_name: firstName,
      last_name: lastName,
      email: `test${Math.floor(Math.random() * 20) + 1}@codeclouds.com`,
      phone: `+1 (${Math.floor(200 + Math.random() * 700)}) ${Math.floor(100 + Math.random() * 800)}-${Math.floor(1000 + Math.random() * 9000)}`
    }));
    
    // Clear related errors
    setErrors(prev => ({ ...prev, first_name: '', last_name: '', email: '', phone: '' }));
  };

  const generateAddressInfo = () => {
    const streetNum = Math.floor(100 + Math.random() * 9000);
    const street = STREETS[Math.floor(Math.random() * STREETS.length)];
    const city = CITIES[Math.floor(Math.random() * CITIES.length)];
    const state = US_STATES[Math.floor(Math.random() * US_STATES.length)];
    const zip = Math.floor(10000 + Math.random() * 89999);

    setForm(prev => ({
      ...prev,
      address: `${streetNum} ${street}`,
      city: city,
      state: state,
      zip: zip.toString()
    }));

    // Clear related errors
    setErrors(prev => ({ ...prev, address: '', city: '', state: '', zip: '' }));
  };

  // --- Handlers for Links ---
  const handleLinkChange = (index, field, value) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };
  const addLink = () => {
    setLinks([...links, { link_type: 'Checkout Page', url: '' }]);
  };
  const removeLink = (index) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  // --- Handlers for Cards ---
  const togglePredefinedCard = (id) => {
    if (selectedCards.includes(id)) {
      setSelectedCards(selectedCards.filter(cId => cId !== id));
    } else {
      setSelectedCards([...selectedCards, id]);
    }
  };

  const handleCustomCardChange = (e) => {
    const { name, value } = e.target;
    setCustomCardForm(prev => ({ ...prev, [name]: value }));
  };

  const addCustomCard = () => {
    // Basic validation for custom card
    if (!customCardForm.card_number || !customCardForm.cvv || !customCardForm.card_month || !customCardForm.card_year) {
      alert("Please fill in all custom card fields before adding.");
      return;
    }
    setCustomCards([...customCards, { ...customCardForm, id: `custom_${Date.now()}` }]);
    setShowCustomCardForm(false);
    setCustomCardForm({ card_number: '', card_type: 'VISA', category: 'Regular', card_month: '', card_year: '', cvv: '' });
  };
  
  const removeCustomCard = (id) => {
    setCustomCards(customCards.filter(c => c.id !== id));
  };

  // --- Submit & Validation ---
  const validate = () => {
    const newErrors = {};
    Object.keys(initialFormState).forEach(field => {
      if (!form[field] || form[field].toString().trim() === '') {
        newErrors[field] = 'This field is required';
      }
    });
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (form.phone && !/^[\d\s\-\+\(\)]{7,}$/.test(form.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    // Validate links array
    const validLinks = links.filter(l => l.link_type && l.url.trim() !== '');
    if (validLinks.length === 0) {
      newErrors.links = 'Please provide at least one valid project link (starting with http:// or https://)';
    } else {
      for (const l of validLinks) {
        if (!/^https?:\/\/.+/.test(l.url)) {
          newErrors.links = 'All URLs must be valid and start with http:// or https://';
          break;
        }
      }
    }

    // Validate cards array
    if (selectedCards.length === 0 && customCards.length === 0) {
      newErrors.cards = 'Please select or add at least one test card.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSuccess('');

    if (!validate()) return;

    setLoading(true);

    try {
      const finalLinks = links.filter(l => l.url && l.link_type);
      
      const predefinedCardsData = selectedCards
        .map(id => PREDEFINED_CARDS.find(pc => pc.id === id))
        .map(({ card_number, card_type, category, card_month, card_year, cvv }) => ({ card_number, card_type, category, card_month, card_year, cvv }));
      
      const customCardsData = customCards.map(({ card_number, card_type, category, card_month, card_year, cvv }) => ({ card_number, card_type, category, card_month, card_year, cvv }));
      
      const payload = {
        ...form,
        links: finalLinks,
        cards: [...predefinedCardsData, ...customCardsData]
      };

      await api.createProject(payload);
      setSuccess('Project created successfully! Redirecting...');
      setTimeout(() => router.push('/projects'), 1500);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, name, type = 'text', placeholder, ...props }) => (
    <div>
      <label className="form-label" htmlFor={`field-${name}`}>{label} *</label>
      <input
        id={`field-${name}`}
        type={type}
        name={name}
        className="form-input"
        placeholder={placeholder}
        value={form[name]}
        onChange={handleChange}
        style={errors[name] ? { borderColor: 'var(--error)' } : {}}
        {...props}
      />
      {errors[name] && <div className="form-error">{errors[name]}</div>}
    </div>
  );

  const SelectField = ({ label, name, options, placeholder, ...props }) => (
    <div>
      <label className="form-label" htmlFor={`field-${name}`}>{label} *</label>
      <select
        id={`field-${name}`}
        name={name}
        className="form-input"
        value={form[name]}
        onChange={handleChange}
        style={errors[name] ? { borderColor: 'var(--error)' } : {}}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {errors[name] && <div className="form-error">{errors[name]}</div>}
    </div>
  );

  const AutoGenerateBtn = ({ onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="btn-secondary"
      style={{ 
        padding: '6px 12px', 
        fontSize: '11px', 
        height: 'fit-content',
        borderColor: 'var(--accent-primary)',
        color: 'var(--accent-primary)',
        background: 'rgba(99, 102, 241, 0.05)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}
    >
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
      Auto Generate
    </button>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Add New Project</h1>
        <p className="page-subtitle">Configure your project details, URLs, and payment test cards.</p>
      </div>

      {submitError && <div className="alert alert-error">{submitError}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        
        {/* Basic Project Info */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
            Project Detail
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            <InputField label="Project Name" name="project_name" placeholder="My Website" />
          </div>
        </div>

        {/* Project Links (Multiple) */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Project URLs
          </h2>
          {errors.links && <div className="form-error" style={{ marginBottom: '16px' }}>{errors.links}</div>}
          
          <div className="space-y-4">
            {links.map((link, index) => (
              <div key={index} className="flex gap-4 items-start bg-[rgba(255,255,255,0.02)] p-4 rounded-lg border border-[rgba(255,255,255,0.05)]">
                <div className="w-1/3">
                  <label className="form-label" style={{ fontSize: '12px' }}>Link Type</label>
                  <select 
                    className="form-input" 
                    value={link.link_type} 
                    onChange={(e) => handleLinkChange(index, 'link_type', e.target.value)}
                  >
                    {LINK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="form-label" style={{ fontSize: '12px' }}>URL</label>
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="https://example.com" 
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                    required
                  />
                </div>
                {links.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeLink(index)}
                    className="mt-6 p-2 text-red-400 hover:bg-red-900/20 rounded transition-colors"
                    title="Remove link"
                  >
                    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button 
            type="button" 
            onClick={addLink}
            className="mt-4 text-sm text-[var(--accent-primary)] hover:text-indigo-300 flex items-center gap-1 font-medium"
          >
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Add Another Link
          </button>
        </div>

        {/* Personal Information */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Personal Information
            </h2>
            <AutoGenerateBtn onClick={generatePersonalInfo} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <InputField label="First Name" name="first_name" placeholder="John" />
            <InputField label="Last Name" name="last_name" placeholder="Doe" />
            <InputField label="Email Address" name="email" type="email" placeholder="john@example.com" />
            <InputField label="Phone Number" name="phone" type="tel" placeholder="+1 (555) 123-4567" />
          </div>
        </div>

        {/* Address */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              Address
            </h2>
            <AutoGenerateBtn onClick={generateAddressInfo} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <InputField label="Your Address" name="address" placeholder="123 Main St" />
            </div>
            <InputField label="Your City" name="city" placeholder="New York" />
            <InputField label="Zip/Postal Code" name="zip" placeholder="10001" />
            <SelectField label="Select State" name="state" options={US_STATES} placeholder="Select a state..." />
          </div>
        </div>

        {/* Payment Cards (Multiple Select + Custom) */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
            Test Payment Cards
          </h2>
          
          {errors.cards && <div className="form-error" style={{ marginBottom: '16px' }}>{errors.cards}</div>}

          {/* Predefined Cards Toggle List */}
          <div className="mb-6">
            <p className="text-sm text-[var(--text-muted)] mb-3">Select predefined test cards to assign to this project:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PREDEFINED_CARDS.map(card => {
                const isSelected = selectedCards.includes(card.id);
                return (
                  <div 
                    key={card.id} 
                    onClick={() => togglePredefinedCard(card.id)}
                    className="p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3"
                    style={{ 
                      borderColor: isSelected ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0,0,0,0.2)'
                    }}
                  >
                    <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded text-indigo-500 focus:ring-indigo-500 bg-gray-700 border-gray-600" />
                    <span className="text-sm font-medium text-gray-200">{card.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Cards Display */}
          {customCards.length > 0 && (
            <div className="mb-6">
              <p className="text-sm text-[var(--accent-primary)] mb-3 font-semibold">Custom Cards Added:</p>
              <div className="space-y-2">
                {customCards.map(card => (
                  <div key={card.id} className="flex justify-between items-center p-3 rounded-lg border border-[rgba(255,255,255,0.1)] bg-black/20">
                    <div className="text-sm text-gray-200">
                      {card.card_number} — {card.category} | {card.card_type} | Exp: {card.card_month}/{card.card_year} | CVV: {card.cvv}
                    </div>
                    <button type="button" onClick={() => removeCustomCard(card.id)} className="text-red-400 text-xs hover:underline">Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Card Inline Form */}
          {showCustomCardForm ? (
            <div className="p-4 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
              <h3 className="text-sm font-semibold mb-3 text-white">Add Custom Card</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Card Number</label>
                  <input type="text" className="form-input" name="card_number" value={customCardForm.card_number} onChange={handleCustomCardChange} placeholder="4111 1111 1111 1111" />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Type</label>
                  <select className="form-input" name="card_type" value={customCardForm.card_type} onChange={handleCustomCardChange}>
                    {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '12px' }}>Category</label>
                  <select className="form-input" name="category" value={customCardForm.category} onChange={handleCustomCardChange}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="form-label" style={{ fontSize: '12px' }}>Month</label>
                    <select className="form-input" name="card_month" value={customCardForm.card_month} onChange={handleCustomCardChange}>
                      <option value="">MM</option>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="form-label" style={{ fontSize: '12px' }}>Year</label>
                    <select className="form-input" name="card_year" value={customCardForm.card_year} onChange={handleCustomCardChange}>
                      <option value="">YYYY</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="form-label" style={{ fontSize: '12px' }}>CVV</label>
                    <input type="text" className="form-input" name="cvv" maxLength={4} value={customCardForm.cvv} onChange={handleCustomCardChange} placeholder="123" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="text-sm text-[var(--text-muted)] hover:text-white px-3" onClick={() => setShowCustomCardForm(false)}>Cancel</button>
                <button type="button" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded" onClick={addCustomCard}>Confirm Add</button>
              </div>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={() => setShowCustomCardForm(true)}
              className="text-sm text-[var(--accent-primary)] hover:text-indigo-300 flex items-center gap-1 font-medium mt-2"
            >
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Add Custom Card
            </button>
          )}

        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ padding: '14px 32px' }}
          >
            {loading ? (
              <>
                <div className="spinner" />
                Creating...
              </>
            ) : (
              <>
                <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create Project
              </>
            )}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push('/projects')}
            style={{ padding: '14px 32px' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

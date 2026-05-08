import React, { useState } from 'react';
import './EXT-Dashboard.css';

const EXTDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Form State
  const [formData, setFormData] = useState({
    fName: '',
    lName: '',
    amount: '0.00',
    posLimit: '9000.00',
    atmLimit: '5000.00'
  });

  // Generated Data State
  const [generatedId, setGeneratedId] = useState('');
  const [generatedPan, setGeneratedPan] = useState('');

  const generateNewCardData = () => {
    setGeneratedId(`CRD-${Math.floor(100000 + Math.random() * 900000)}`);
    setGeneratedPan(`4532-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // Generate new data when switching to create tab
  React.useEffect(() => {
    if (activeTab === 'create') {
      generateNewCardData();
    }
  }, [activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegisterCard = async () => {
    const payload = {
      id_Card: generatedId,
      PAN: generatedPan,
      F_Name: formData.fName,
      L_Name: formData.lName,
      Amount: formData.amount,
      POS_limit: formData.posLimit,
      ATM_limit: formData.atmLimit,
      Status: 'Active',
      Source: 'Externel_System',
      Operation: 'Create'
    };

    try {
      const response = await fetch('http://localhost:5001/api/external/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.status === 'success') {
        alert(`✅ Success: Card ${generatedId} registered successfully!`);
        // Reset or redirect
        window.location.reload(); 
      } else {
        alert(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      alert('❌ Failed to connect to API');
    }
  };

  return (
    <div className="ext-app-layout">
      {/* Sidebar / Toggle Bar */}
      <aside className="ext-sidebar">
        <div className="ext-sidebar-logo">
          <div className="logo-container">
            {/* House/Graph SVG based on the user image */}
            <svg width="40" height="40" viewBox="0 0 100 100" className="ext-main-logo">
              <rect x="25" y="55" width="12" height="25" fill="#a3e635" rx="2" />
              <rect x="42" y="40" width="12" height="40" fill="#4ade80" rx="2" />
              <rect x="59" y="25" width="12" height="55" fill="#22c55e" rx="2" />
              <path d="M20 50 L50 20 L80 50 V85 H20 Z" fill="none" stroke="#166534" strokeWidth="4" />
              <path d="M75 30 L85 20 M85 20 H75 M85 20 V30" fill="none" stroke="#166534" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <span className="logo-text">EXTERNAL SYSTEM</span>
          </div>
        </div>

        <nav className="ext-nav">
          <div 
            className={`ext-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Dashboard</span>
          </div>
          <div 
            className={`ext-nav-item ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            <span>Create Card</span>
          </div>
          <div 
            className={`ext-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span>Settings</span>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="ext-main">
        {activeTab === 'dashboard' && (
          <div className="ext-dashboard-container">
            <h1 className="hero-title">External System Dashboard</h1>
            <p className="hero-subtitle">Terminal Management & Integration Interface</p>
          </div>
        )}

        {activeTab === 'create' && (
          <div className="ext-provisioning-container animate-fade-in">
            <header className="provisioning-header">
              <h2>New Card Provisioning</h2>
            </header>

            <div className="provisioning-grid">
              {/* Column 1: Identification */}
              <div className="provisioning-card accent-cyan">
                <div className="card-tag">IDENTIFICATION</div>
                <div className="input-group">
                  <label>Card ID (System Generated)</label>
                  <input type="text" value={generatedId} disabled className="locked-input" />
                </div>
                <div className="input-group">
                  <label>PAN Number (Securely Generated)</label>
                  <input type="text" value={generatedPan} disabled className="locked-input" />
                </div>
              </div>

              {/* Column 2: Client Details */}
              <div className="provisioning-card accent-blue">
                <div className="card-tag">CLIENT DETAILS</div>
                <div className="input-group">
                  <label>First Name</label>
                  <input 
                    type="text" 
                    name="fName"
                    value={formData.fName}
                    onChange={handleInputChange}
                    placeholder="John" 
                  />
                </div>
                <div className="input-group">
                  <label>Last Name</label>
                  <input 
                    type="text" 
                    name="lName"
                    value={formData.lName}
                    onChange={handleInputChange}
                    placeholder="Doe" 
                  />
                </div>
                <div className="input-group">
                  <label>Initial Balance (€)</label>
                  <input 
                    type="text" 
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00" 
                  />
                </div>
              </div>

              {/* Column 3: Transaction Limits */}
              <div className="provisioning-card accent-purple">
                <div className="card-tag">TRANSACTION LIMITS</div>
                <div className="input-group">
                  <label>Daily POS Limit (Max 9000)</label>
                  <input 
                    type="text" 
                    name="posLimit"
                    value={formData.posLimit}
                    onChange={handleInputChange}
                    placeholder="9000.00" 
                  />
                </div>
                <div className="input-group">
                  <label>Daily ATM Limit (Max 5000)</label>
                  <input 
                    type="text" 
                    name="atmLimit"
                    value={formData.atmLimit}
                    onChange={handleInputChange}
                    placeholder="5000.00" 
                  />
                </div>
              </div>
            </div>

            <div className="provisioning-footer">
              <button className="ext-primary-btn" onClick={handleRegisterCard}>REGISTER NEW CARD</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EXTDashboard;

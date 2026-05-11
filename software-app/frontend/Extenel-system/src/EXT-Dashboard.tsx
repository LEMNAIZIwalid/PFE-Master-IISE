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

  // Table State
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');

  const generateNewCardData = () => {
    setGeneratedId(`CRD-${Math.floor(100000 + Math.random() * 900000)}`);
    setGeneratedPan(`4532-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const fetchCards = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/external/cards');
      const data = await response.json();
      setCards(data);
    } catch (error) {
      console.error('Error fetching cards:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate new data when switching to create tab
  React.useEffect(() => {
    if (activeTab === 'create') {
      generateNewCardData();
    }
    if (activeTab === 'dashboard') {
      fetchCards();
    }
  }, [activeTab]);

  const handleCardClick = (card: any) => {
    setSelectedCard(card);
    setIsModalOpen(true);
  };

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
          <div className="ext-dashboard-container animate-fade-in">
            <header className="dashboard-header">
              <div>
                <h1 className="hero-title">Terminal Management</h1>
                <p className="hero-subtitle">External System Integration Interface</p>
              </div>
              <div className="stats-row">
                <div className="mini-stat">
                  <span className="stat-value">{cards.length}</span>
                  <span className="stat-label">Total Cards</span>
                </div>
                <div className="mini-stat">
                  <span className="stat-value">{cards.filter(c => c.STATUS === 'Active').length}</span>
                  <span className="stat-label">Active</span>
                </div>
              </div>
            </header>

            <div className="table-card">
              <div className="table-wrapper">
                <table className="ext-data-table">
                  <thead>
                    <tr>
                      <th>ID CARD</th>
                      <th>PAN NUMBER</th>
                      <th>CLIENT NAME</th>
                      <th>AMOUNT</th>
                      <th>LIMITS (POS/ATM)</th>
                      <th>STATUS</th>
                      <th>LAST OP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="loading-cell">Loading system records...</td></tr>
                    ) : cards.length === 0 ? (
                      <tr><td colSpan={7} className="empty-cell">No records found in External System</td></tr>
                    ) : (
                      cards.map((card, idx) => (
                        <tr key={idx} onClick={() => handleCardClick(card)} className="clickable-row" style={{ animationDelay: `${idx * 0.05}s`, opacity: 0 }}>
                          <td className="bold">{card.ID_CARD}</td>
                          <td className="mono">{card.PAN}</td>
                          <td>{card.F_NAME} {card.L_NAME}</td>
                          <td className="amount">{parseFloat(card.AMOUNT).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                          <td className="limits">
                            <span className="limit-tag pos">{card.POS_LIMIT}</span>
                            <span className="limit-divider">/</span>
                            <span className="limit-tag atm">{card.ATM_LIMIT}</span>
                          </td>
                          <td>
                            <span className={`status-pill ${card.STATUS?.toLowerCase()}`}>
                              {card.STATUS}
                            </span>
                          </td>
                          <td className="date-cell">
                            {card.TIMESTMP ? new Date(card.TIMESTMP).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {isModalOpen && selectedCard && (
          <div className="ext-modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="ext-modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
              <header className="modal-header">
                <div className="modal-title-group">
                  <h2>System Metadata View</h2>
                  <span className="modal-subtitle">ID: {selectedCard.ID_CARD}</span>
                </div>
                <div className="view-mode-selector">
                  <button
                    className={`mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                  >
                    Table View
                  </button>
                  <button
                    className={`mode-btn ${viewMode === 'json' ? 'active' : ''}`}
                    onClick={() => setViewMode('json')}
                  >
                    JSON Source
                  </button>
                </div>
                <button className="ext-close-icon" onClick={() => setIsModalOpen(false)}>&times;</button>
              </header>

              <div className="modal-body">
                {viewMode === 'table' ? (
                  <div className="details-table-container">
                    <table className="black-border-table">
                      <thead>
                        <tr>
                          <th>Property Key</th>
                          <th>Recorded Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedCard).map(([key, value]) => (
                          <tr key={key}>
                            <td className="attr-key">{key}</td>
                            <td className="attr-val">{String(value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="modal-actions-bar">
                      <button className="action-btn-styled modify">
                        <span className="btn-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </span>
                        <div className="btn-divider"></div>
                        <span className="btn-text">MODIFY CARD</span>
                      </button>

                      <button className="action-btn-styled delete">
                        <span className="btn-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </span>
                        <div className="btn-divider"></div>
                        <span className="btn-text">DELETE RECORD</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="json-container">
                    <pre>
                      {'{'}
                      {Object.entries(selectedCard).map(([key, value], index, array) => (
                        <div key={key} className="json-line">
                          &nbsp;&nbsp;<span className="json-key">"{key}"</span>: <span className={`json-value ${typeof value === 'number' ? 'json-num' : 'json-str'}`}>
                            {typeof value === 'string' ? `"${value}"` : String(value)}
                          </span>
                          {index < array.length - 1 ? ',' : ''}
                        </div>
                      ))}
                      {'}'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
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

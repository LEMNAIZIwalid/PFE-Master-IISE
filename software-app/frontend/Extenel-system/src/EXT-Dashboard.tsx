import React, { useState } from 'react';
import './EXT-Dashboard.css';

const EXTDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsExpanded, setSettingsExpanded] = useState(false);

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
  const [operationFilter, setOperationFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [externalEvents, setExternalEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [supervisorSearchTerm, setSupervisorSearchTerm] = useState('');
  const [supervisorFilter, setSupervisorFilter] = useState('All');

  // Modal State
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<any>({});

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

  const fetchExternalEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await fetch('http://localhost:5001/api/external/events');
      const data = await response.json();
      setExternalEvents(data);
    } catch (error) {
      console.error('Error fetching external events:', error);
    } finally {
      setLoadingEvents(false);
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
    if (activeTab === 'supervisor') {
      fetchExternalEvents();
    }
  }, [activeTab]);

  const handleCardClick = (card: any) => {
    setSelectedCard(card);
    setEditData({
      F_NAME: card.F_NAME ?? '',
      L_NAME: card.L_NAME ?? '',
      AMOUNT: card.AMOUNT ?? '0.00',
      STATUS: card.STATUS ?? 'Active',
      POS_LIMIT: card.POS_LIMIT ?? '',
      ATM_LIMIT: card.ATM_LIMIT ?? ''
    });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!selectedCard) return;
    const payload = {
      id_Card: selectedCard.ID_CARD,
      F_Name: editData.F_NAME,
      L_Name: editData.L_NAME,
      Amount: editData.AMOUNT,
      Status: editData.STATUS,
      POS_limit: editData.POS_LIMIT,
      ATM_limit: editData.ATM_LIMIT,
      Operation: 'Update'
    };
    try {
      const response = await fetch('http://localhost:5001/api/external/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.status === 'success') {
        alert(`✅ Card ${selectedCard.ID_CARD} updated successfully!`);
        handleCloseModal();
        fetchCards();
      } else {
        alert(`❌ Error: ${result.message}`);
      }
    } catch {
      alert('❌ Failed to connect to API');
    }
  };

  const handleDeleteCard = async () => {
    if (!selectedCard) return;
    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete card ${selectedCard.ID_CARD} (${selectedCard.F_NAME} ${selectedCard.L_NAME})?\n\nThis action will mark the card as Blocked and log a Delete event.`
    );
    if (!confirmed) return;

    try {
      const response = await fetch('http://localhost:5001/api/external/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_Card: selectedCard.ID_CARD })
      });
      const result = await response.json();
      if (result.status === 'success') {
        alert(`🗑️ Card ${selectedCard.ID_CARD} has been deleted successfully.`);
        handleCloseModal();
        fetchCards();
      } else {
        alert(`❌ Error: ${result.message}`);
      }
    } catch {
      alert('❌ Failed to connect to API');
    }
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
            className={`ext-nav-item ${activeTab === 'supervisor' ? 'active' : ''}`}
            onClick={() => setActiveTab('supervisor')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
            <span>Payment Supervisor</span>
          </div>
          <div className="ext-nav-group">
            <div
              className={`ext-nav-item ${activeTab.includes('settings') ? 'active' : ''}`}
              onClick={() => setSettingsExpanded(!settingsExpanded)}
            >
              <div className="ext-nav-item-content">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                <span>Settings</span>
              </div>
              <svg
                className={`chevron-icon ${settingsExpanded ? 'expanded' : ''}`}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            <div className={`ext-nav-submenu ${settingsExpanded ? 'show' : ''}`}>
              <div
                className={`ext-submenu-item ${activeTab === 'settings-profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings-profile')}
              >
                <div className="dot"></div>
                <span>Profile</span>
              </div>
              <div
                className={`ext-submenu-item ${activeTab === 'settings-theme' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings-theme')}
              >
                <div className="dot"></div>
                <span>Theme</span>
              </div>
              <div
                className={`ext-submenu-item ${activeTab === 'settings-monitoring' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings-monitoring')}
              >
                <div className="dot"></div>
                <span>Monitoring</span>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="ext-main">
        {activeTab === 'dashboard' && (
          <div className="ext-dashboard-container animate-fade-in">
            <header className="dashboard-header-modern">
              <div className="header-branding">
                <h1 className="brand-title">External<span>-System</span></h1>
                <p className="brand-subtitle">--EXTERNAL MANAGEMENT SYSTEM</p>
              </div>

              <div className="header-actions">
                <div className="search-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input
                    type="text"
                    placeholder="Search by ID or PAN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button className="refresh-btn" onClick={fetchCards} disabled={loading}>
                  <svg className={loading ? 'animate-spin' : ''} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                  <span>Refresh</span>
                </button>
              </div>
            </header>

            <div className="stats-filter-grid">
              {[
                {
                  id: 'All',
                  label: 'Total Cards',
                  count: cards.length,
                  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
                  color: 'blue'
                },
                {
                  id: 'Create',
                  label: 'Created Cards',
                  count: cards.filter(c => c.OPERATION === 'Create').length,
                  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"></path></svg>,
                  color: 'green'
                },
                {
                  id: 'Update',
                  label: 'Updated Cards',
                  count: cards.filter(c => c.OPERATION === 'Update').length,
                  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon></svg>,
                  color: 'amber'
                },
                {
                  id: 'DELETE',
                  label: 'Deleted Records',
                  count: cards.filter(c => c.OPERATION === 'DELETE').length,
                  icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
                  color: 'rose'
                }
              ].map(op => (
                <div
                  key={op.id}
                  className={`stat-filter-card card-${op.color} ${operationFilter === op.id ? 'active' : ''}`}
                  onClick={() => setOperationFilter(op.id)}
                >
                  <div className="card-icon-side">
                    {op.icon}
                  </div>
                  <div className="card-info-side">
                    <span className="card-count">{op.count}</span>
                    <span className="card-label">{op.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="table-card">
              <div className="table-wrapper">
                <table className="ext-data-table">
                  <thead>
                    <tr>
                      <th>ID CARD</th>
                      <th>PAN NUMBER</th>
                      <th>CLIENT NAME</th>
                      <th>OPERATION</th>
                      <th>AMOUNT</th>
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
                      cards
                        .filter(card => operationFilter === 'All' || card.OPERATION === operationFilter)
                        .filter(card =>
                          card.ID_CARD.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          card.PAN.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((card, idx) => (
                          <tr key={idx} onClick={() => handleCardClick(card)} className="clickable-row" style={{ animationDelay: `${idx * 0.05}s`, opacity: 0 }}>
                            <td className="bold">{card.ID_CARD}</td>
                            <td className="mono">{card.PAN}</td>
                            <td>{card.F_NAME} {card.L_NAME}</td>
                            <td>
                              <span className={`op-badge op-${(card.OPERATION ?? '').toLowerCase()}`}>
                                {card.OPERATION ?? 'N/A'}
                              </span>
                            </td>
                            <td className="amount">{parseFloat(card.AMOUNT).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
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
          <div className="ext-modal-overlay" onClick={handleCloseModal}>
            <div className="ext-modal-content animate-slide-up" onClick={e => e.stopPropagation()}>

              {/* ── Top Bar ── */}
              <div className={`modal-top-bar ${isEditMode ? 'edit-mode-bar' : ''}`}>
                <div className="modal-top-left">
                  <div className="modal-avatar">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="modal-client-name">
                      {isEditMode ? `${editData.F_NAME} ${editData.L_NAME}` : `${selectedCard.F_NAME} ${selectedCard.L_NAME}`}
                    </h2>
                    <span className="modal-card-id-tag">
                      {isEditMode ? '✏️ Edit Mode — ' : ''}{selectedCard.ID_CARD}
                    </span>
                  </div>
                </div>
                <div className="modal-top-right">
                  <span className={`status-pill ${(isEditMode ? editData.STATUS : selectedCard.STATUS)?.toLowerCase()}`}>
                    {isEditMode ? editData.STATUS : selectedCard.STATUS}
                  </span>
                  <button className="modal-close-x" onClick={handleCloseModal}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>

              {/* ══════════ VIEW MODE ══════════ */}
              {!isEditMode && (
                <>
                  <div className="modal-info-grid">
                    {/* Identification */}
                    <div className="modal-info-card">
                      <div className="modal-section-tag">IDENTIFICATION</div>
                      <div className="modal-info-row">
                        <span className="modal-info-key">Card ID</span>
                        <span className="modal-info-val mono">{selectedCard.ID_CARD}</span>
                      </div>
                      <div className="modal-info-row">
                        <span className="modal-info-key">PAN Number</span>
                        <span className="modal-info-val mono">{selectedCard.PAN}</span>
                      </div>
                      <div className="modal-info-row">
                        <span className="modal-info-key">Source</span>
                        <span className="modal-info-val">{selectedCard.SOURCE ?? 'External System'}</span>
                      </div>
                    </div>

                    {/* Client */}
                    <div className="modal-info-card">
                      <div className="modal-section-tag">CLIENT</div>
                      <div className="modal-info-row">
                        <span className="modal-info-key">First Name</span>
                        <span className="modal-info-val">{selectedCard.F_NAME}</span>
                      </div>
                      <div className="modal-info-row">
                        <span className="modal-info-key">Last Name</span>
                        <span className="modal-info-val">{selectedCard.L_NAME}</span>
                      </div>
                      <div className="modal-info-row">
                        <span className="modal-info-key">Balance</span>
                        <span className="modal-info-val amount">
                          {parseFloat(selectedCard.AMOUNT).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </span>
                      </div>
                    </div>

                    {/* System */}
                    <div className="modal-info-card">
                      <div className="modal-section-tag">SYSTEM</div>
                      <div className="modal-info-row">
                        <span className="modal-info-key">Operation</span>
                        <span className={`op-badge op-${(selectedCard.OPERATION ?? '').toLowerCase()}`}>
                          {String(selectedCard.OPERATION ?? 'N/A').toLowerCase() === 'create' ? 'Create' :
                            String(selectedCard.OPERATION ?? 'N/A').toLowerCase() === 'update' ? 'Update' :
                              String(selectedCard.OPERATION ?? 'N/A').toLowerCase() === 'delete' ? 'Delete' :
                                selectedCard.OPERATION ?? 'N/A'}
                        </span>
                      </div>
                      <div className="modal-info-row">
                        <span className="modal-info-key">POS Limit</span>
                        <span className="modal-info-val limit-val-pos">{selectedCard.POS_LIMIT ?? 'N/A'}</span>
                      </div>
                      <div className="modal-info-row">
                        <span className="modal-info-key">ATM Limit</span>
                        <span className="modal-info-val limit-val-atm">{selectedCard.ATM_LIMIT ?? 'N/A'}</span>
                      </div>
                      <div className="modal-info-row">
                        <span className="modal-info-key">Date</span>
                        <span className="modal-info-val">
                          {selectedCard.TIMESTMP ? new Date(selectedCard.TIMESTMP).toLocaleDateString('fr-FR') : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* View Actions */}
                  <div className="modal-footer-actions">
                    <button className="modal-action-btn modal-modify-btn" onClick={() => setIsEditMode(true)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Modify Card
                    </button>
                    <button className="modal-action-btn modal-delete-btn" onClick={handleDeleteCard}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                      Delete Record
                    </button>
                  </div>
                </>
              )}

              {/* ══════════ EDIT MODE ══════════ */}
              {isEditMode && (
                <>
                  <div className="modal-edit-grid">

                    {/* Client Info */}
                    <div className="modal-edit-section">
                      <div className="modal-section-tag">CLIENT INFORMATION</div>
                      <div className="edit-fields-row">
                        <div className="edit-field-group">
                          <label className="edit-label">First Name</label>
                          <input
                            className="edit-input"
                            type="text"
                            name="F_NAME"
                            value={editData.F_NAME}
                            onChange={handleEditChange}
                            placeholder="First name"
                          />
                        </div>
                        <div className="edit-field-group">
                          <label className="edit-label">Last Name</label>
                          <input
                            className="edit-input"
                            type="text"
                            name="L_NAME"
                            value={editData.L_NAME}
                            onChange={handleEditChange}
                            placeholder="Last name"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial */}
                    <div className="modal-edit-section">
                      <div className="modal-section-tag">FINANCIAL</div>
                      <div className="edit-fields-row">
                        <div className="edit-field-group">
                          <label className="edit-label">Balance (€)</label>
                          <input
                            className="edit-input edit-input-amount"
                            type="number"
                            name="AMOUNT"
                            value={editData.AMOUNT}
                            onChange={handleEditChange}
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div className="edit-field-group">
                          <label className="edit-label">POS Limit</label>
                          <input
                            className="edit-input edit-input-pos"
                            type="number"
                            name="POS_LIMIT"
                            value={editData.POS_LIMIT}
                            onChange={handleEditChange}
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <div className="edit-field-group">
                          <label className="edit-label">ATM Limit</label>
                          <input
                            className="edit-input edit-input-atm"
                            type="number"
                            name="ATM_LIMIT"
                            value={editData.ATM_LIMIT}
                            onChange={handleEditChange}
                            step="0.01"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="modal-edit-section">
                      <div className="modal-section-tag">CARD STATUS</div>
                      <div className="edit-status-row">
                        {[
                          { id: 'Active', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> },
                          { id: 'suspended', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> },
                          { id: 'blocked', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg> }
                        ].map(s => (
                          <button
                            key={s.id}
                            type="button"
                            className={`edit-status-btn ${editData.STATUS === s.id ? `status-selected-${s.id.toLowerCase()}` : ''}`}
                            onClick={() => setEditData((prev: any) => ({ ...prev, STATUS: s.id }))}
                          >
                            <span className="status-dot"></span>
                            {s.icon}
                            {s.id.charAt(0).toUpperCase() + s.id.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Edit Actions */}
                  <div className="modal-footer-actions">
                    <button className="modal-action-btn modal-cancel-btn" onClick={() => setIsEditMode(false)}>
                      Cancel
                    </button>
                    <button className="modal-action-btn modal-save-btn" onClick={handleSaveEdit}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Save Changes
                    </button>
                  </div>
                </>
              )}

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

        {activeTab === 'supervisor' && (
          <div className="ext-supervisor-container animate-fade-in">
            <header className="dashboard-header-modern">
              <div className="header-branding">
                <h1 className="brand-title">Payment<span>-Supervisor</span></h1>
                <p className="brand-subtitle">--AUDIT LOGS & TRANSACTION MONITORING</p>
              </div>
              <div className="header-actions">
                <div className="search-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <input
                    type="text"
                    placeholder="Search logs by ID, PAN, name..."
                    value={supervisorSearchTerm}
                    onChange={(e) => setSupervisorSearchTerm(e.target.value)}
                  />
                </div>
                <button className="refresh-btn" onClick={fetchExternalEvents} disabled={loadingEvents}>
                  <svg className={loadingEvents ? 'animate-spin' : ''} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                  <span>Refresh Logs</span>
                </button>
              </div>
            </header>

            <div className="audit-feed-container animate-fade-in">
              <div className="feed-header">
                <h3>Modification Activity Feed</h3>
                <div className="source-filter-pills">
                  {['All', 'Externel_System', 'PWC_System'].map(f => (
                    <button
                      key={f}
                      className={`filter-pill ${supervisorFilter === f ? 'active' : ''}`}
                      onClick={() => setSupervisorFilter(f)}
                    >
                      {f === 'All' ? 'All Sources' : f.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <span className="feed-count">{externalEvents.length} Logs</span>
              </div>

              {loadingEvents ? (
                <div className="loading-cell">Fetching system logs...</div>
              ) : externalEvents.length === 0 ? (
                <div className="empty-cell">No recent modifications from the system.</div>
              ) : (
                <div className="audit-feed">
                  {externalEvents
                    .filter(event => supervisorFilter === 'All' || event.SOURCE === supervisorFilter)
                    .filter(event =>
                      event.ID_CARD?.toLowerCase().includes(supervisorSearchTerm.toLowerCase()) ||
                      event.F_NAME?.toLowerCase().includes(supervisorSearchTerm.toLowerCase()) ||
                      event.L_NAME?.toLowerCase().includes(supervisorSearchTerm.toLowerCase()) ||
                      event.PAN?.toLowerCase().includes(supervisorSearchTerm.toLowerCase())
                    )
                    .map((event, idx) => (
                      <div key={idx} className="audit-log-card animate-slide-up" style={{ animationDelay: `${idx * 0.08}s` }}>
                        <div className="log-indicator-side">
                          <div
                            className={`log-dot ${event.OPERATION?.toLowerCase().includes('delete')
                              ? 'op-deleted'
                              : event.OPERATION?.toLowerCase().includes('update')
                                ? 'op-updated'
                                : 'op-created'
                              }`}
                          ></div>
                          <div className="log-line"></div>
                        </div>

                        <div className="log-body">
                          <div className="log-message">
                            {event.SOURCE === 'PWC_System' ? (
                              <>
                                The administrator <span className="pwc-tag">PWC Admin</span>
                                <span
                                  className={`action-word ${event.OPERATION?.toLowerCase().includes('delete') ? 'deleted' : event.OPERATION?.toLowerCase().includes('update') ? 'updated' : 'created'}`}
                                >
                                  <span> </span>
                                  {event.OPERATION?.toLowerCase().includes('delete') ? 'Deleted' : 'Updated'}
                                </span>
                                <span> </span> the card: <span className="card-ref bold-black">#{event.ID_CARD}</span>

                                <span className="change-details">
                                  via <span className="pwc-tag">PWC System</span>
                                  [Limits: {event.POS_LIMIT}€ / {event.ATM_LIMIT}€ | Status: {event.STATUS}]
                                </span>
                              </>
                            ) : (
                              <>
                                The <span className="ext-tag">External</span> system
                                <span
                                  className={`action-word ${event.OPERATION?.toLowerCase().includes('delete') ? 'deleted' : event.OPERATION?.toLowerCase().includes('update') ? 'updated' : 'created'}`}
                                >
                                  <span> </span>
                                  {event.OPERATION?.toLowerCase().includes('delete') ? 'Deleted' : event.OPERATION === 'Create' ? 'Created' : 'Updated'}
                                </span>
                                <span> </span> the card: <span className="card-ref bold-black">#{event.ID_CARD}</span>

                                <span className="change-details">
                                  [Source: {event.SOURCE}]
                                </span>
                              </>
                            )}
                          </div>

                          <div className="log-meta">
                            <span className="meta-item timestamp">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                              {new Date(event.TIMETMP).toLocaleString('en-US', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="meta-item ref-id">Audit Reference: #{event.ID_EVENT}</span>
                            <span className={`meta-item status-badge ${event.STATUS?.toLowerCase()}`}>{event.STATUS}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings-profile' && (
          <div className="ext-settings-container animate-fade-in">
            <header className="settings-header">
              <h2>User Profile Settings</h2>
              <p>Manage your account information and preferences</p>
            </header>

            <div className="settings-grid">
              <div className="settings-card profile-card">
                <div className="profile-header">
                  <div className="profile-avatar-large">ES</div>
                  <div className="profile-info">
                    <h3>External System Admin</h3>
                    <p>admin.external@gmail.com</p>
                    <span className="role-badge">Super Admin</span>
                  </div>
                </div>
                <div className="profile-details">
                  <div className="detail-item">
                    <label>Employee ID</label>
                    <span>HPS-99283</span>
                  </div>
                  <div className="detail-item">
                    <label>Department</label>
                    <span>Audit & Compliance</span>
                  </div>
                  <div className="detail-item">
                    <label>Last Login</label>
                    <span>Today, 09:42 AM</span>
                  </div>
                </div>
              </div>

              <div className="settings-card">
                <div className="card-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  <h3>Security & Password</h3>
                </div>
                <div className="settings-form">
                  <div className="input-group">
                    <label>Current Password</label>
                    <input type="password" placeholder="••••••••" />
                  </div>
                  <div className="input-group">
                    <label>New Password</label>
                    <input type="password" placeholder="Enter new password" />
                  </div>
                  <button className="ext-save-btn">Update Password</button>
                </div>
              </div>

              <div className="settings-card full-width">
                <div className="card-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  <h3>Notifications Preferences</h3>
                </div>
                <div className="toggle-list">
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <label>Email Alerts</label>
                      <p>Receive email for critical system overrides</p>
                    </div>
                    <div className="toggle-switch active"></div>
                  </div>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <label>Audit Log Exports</label>
                      <p>Weekly automated PDF audit reports</p>
                    </div>
                    <div className="toggle-switch active"></div>
                  </div>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <label>Desktop Notifications</label>
                      <p>Real-time popups for transaction monitoring</p>
                    </div>
                    <div className="toggle-switch"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings-theme' && (
          <div className="ext-settings-container animate-fade-in">
            <header className="settings-header">
              <h2>Interface & Theme</h2>
              <p>Customize how the External System dashboard looks and feels</p>
            </header>

            <div className="settings-grid">
              <div className="settings-card">
                <div className="card-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
                  <h3>Color Palette</h3>
                </div>
                <div className="color-grid">
                  <div className="color-option active" style={{ background: '#6366f1' }}><span>Indigo</span></div>
                  <div className="color-option" style={{ background: '#10b981' }}><span>Emerald</span></div>
                  <div className="color-option" style={{ background: '#f59e0b' }}><span>Amber</span></div>
                  <div className="color-option" style={{ background: '#f43f5e' }}><span>Rose</span></div>
                  <div className="color-option" style={{ background: '#0ea5e9' }}><span>Sky</span></div>
                  <div className="color-option" style={{ background: '#64748b' }}><span>Slate</span></div>
                </div>
              </div>

              <div className="settings-card">
                <div className="card-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v20"></path><path d="M12 12l8-8"></path></svg>
                  <h3>Dashboard Layout</h3>
                </div>
                <div className="layout-options">
                  <div className="layout-opt active">
                    <div className="layout-mock compact"></div>
                    <span>Compact Mode</span>
                  </div>
                  <div className="layout-opt">
                    <div className="layout-mock comfortable"></div>
                    <span>Comfortable</span>
                  </div>
                </div>
              </div>

              <div className="settings-card full-width">
                <div className="card-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                  <h3>Appearance Mode</h3>
                </div>
                <div className="theme-toggle-row">
                  <div className="theme-btn active">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    Light Mode
                  </div>
                  <div className="theme-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    Dark Mode
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings-monitoring' && (
          <div className="ext-settings-container animate-fade-in">
            <header className="settings-header">
              <h2>System Health & Monitoring</h2>
              <p>Real-time status of external API and database connections</p>
            </header>

            <div className="settings-grid">
              <div className="settings-card full-width status-grid-card">
                <div className="status-item">
                  <div className="status-label">API SERVER</div>
                  <div className="status-indicator online">ONLINE</div>
                  <div className="status-value">Latency: 12ms</div>
                </div>
                <div className="status-item">
                  <div className="status-label">DATABASE</div>
                  <div className="status-indicator online">STABLE</div>
                  <div className="status-value">Connections: 8/50</div>
                </div>
                <div className="status-item">
                  <div className="status-label">MQTT BRIDGE</div>
                  <div className="status-indicator online">ACTIVE</div>
                  <div className="status-value">Queue: 0 msgs</div>
                </div>
                <div className="status-item">
                  <div className="status-label">KAFKA CLUSTER</div>
                  <div className="status-indicator warning">BUSY</div>
                  <div className="status-value">Load: 84%</div>
                </div>
              </div>

              <div className="settings-card monitoring-chart-card">
                <div className="card-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  <h3>Transaction Throughput</h3>
                </div>
                <div className="mock-chart">
                  {/* Visualizing a small line chart with CSS/SVG */}
                  <svg width="100%" height="150" viewBox="0 0 400 150">
                    <path d="M0 120 L50 110 L100 130 L150 70 L200 90 L250 40 L300 60 L350 20 L400 30" fill="none" stroke="#6366f1" strokeWidth="3" />
                    <rect x="0" y="0" width="400" height="150" fill="url(#chart-grad)" opacity="0.1" />
                    <defs>
                      <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              <div className="settings-card">
                <div className="card-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  <h3>Active Admin Sessions</h3>
                </div>
                <div className="session-list">
                  <div className="session-item">
                    <div className="session-info">
                      <p className="session-user">ext_admin_1 (You)</p>
                      <p className="session-ip">192.168.1.45</p>
                    </div>
                    <span className="session-tag current">Active</span>
                  </div>
                  <div className="session-item">
                    <div className="session-info">
                      <p className="session-user">hps_support</p>
                      <p className="session-ip">10.0.4.122</p>
                    </div>
                    <span className="session-tag">Idle</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default EXTDashboard;
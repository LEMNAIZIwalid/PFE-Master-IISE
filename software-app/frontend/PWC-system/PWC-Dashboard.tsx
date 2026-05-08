import { useState, useEffect } from 'react'
import './PWC-Dashboard.css'

function PWCDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // État pour le formulaire "Create Card"
  const [formData, setFormData] = useState({
    id_Card: '',
    PAN: '',
    F_Name: '',
    L_Name: '',
    Amount: '',
    POS_limit: '9000.00',
    ATM_limit: '5000.00',
    Status: 'Active',
    Source: 'PWC_System',
    Operation: 'Create'
  })

  // État pour les données du tableau
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewingCard, setViewingCard] = useState<any>(null)
  const [modalViewMode, setModalViewMode] = useState<'table' | 'json'>('table')




  // Fonction pour générer les IDs auto
  const generateIDs = () => {
    const newIdCard = `CRD-${Math.floor(Math.random() * 900000 + 100000)}`
    const newPAN = `4532-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`
    setFormData(prev => ({
      ...prev,
      id_Card: newIdCard,
      PAN: newPAN
    }))
  }

  // Générer au chargement ou au changement d'onglet
  useEffect(() => {
    if (activeTab === 'create') {
      generateIDs()
    }
  }, [activeTab])

  // Charger les données quand on est sur le dashboard
  useEffect(() => {
    if (activeTab === 'dashboard' && isLoggedIn) {
      fetchCards()
    }
  }, [activeTab, isLoggedIn])

  const fetchCards = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:5001/api/cards')
      const data = await response.json()
      if (response.ok) {
        setCards(data)
      }
    } catch (err) {
      console.error('Error fetching cards:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calcul des statistiques pour les cartes de filtrage
  const stats = {
    all: cards.length,
    create: cards.filter(c => c.OPERATION?.toLowerCase() === 'create').length,
    update: cards.filter(c => c.OPERATION?.toLowerCase() === 'update').length,
    delete: cards.filter(c => c.OPERATION?.toLowerCase() === 'delete').length,
  }

  const maskPAN = (pan: string) => {

    if (!pan) return ''
    // Le format est 4532-1234-5678-9012
    // On garde les 8 premiers chiffres (incluant le tiret) et on masque les 8 derniers
    // Utilisateur demande xxxx xxxx dans les 8 derniers chiffres
    const parts = pan.split('-')
    if (parts.length === 4) {
      return `${parts[0]}-${parts[1]}-xxxx-xxxx`
    }
    return pan.substring(0, 9) + 'xxxx-xxxx'
  }

  const handleViewCard = (card: any) => {
    setViewingCard(card)
    setIsViewModalOpen(true)
    setModalViewMode('table')
  }



  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (username === 'admin' && password === 'admin.123') {
      setIsLoggedIn(true)
      setError('')
    } else {
      setError('Invalid credentials. Please try again.')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmitCard = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('http://localhost:5001/api/create-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        alert(`✅ Success: ${result.message}`)
        generateIDs() // Regénérer pour la suivante
        setFormData(prev => ({
          ...prev,
          F_Name: '', L_Name: '', Amount: '',
          POS_limit: '', ATM_limit: ''
        }))
      } else {
        alert(`❌ Error: ${result.message}`)
      }
    } catch (err) {
      console.error('API Error:', err)
      alert('❌ Fatal Error: Could not connect to the Backend API.')
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-card">
          <img src="/HPS_logo.jpg" alt="HPS Logo" className="login-logo" />
          <h2>Authentication</h2>
          <p className="login-desc">Access the PowerCard System</p>

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button type="submit" className="login-btn">
              Login
            </button>
          </form>

          <div className="login-footer">
            <p>© 2026 PowerCard System. All rights reserved.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-layout">
      {/* Sidebar Toggle Button */}
      <button
        className={`sidebar-toggle ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
        <div className="sidebar-header">
          <img src="/HPS_logo.jpg" alt="HPS Logo" className="sidebar-logo" />
        </div>

        <nav className="sidebar-nav">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>🏠 Dashboard</div>
          <div className={`nav-item ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>💳 Create Card</div>
          <div className={`nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>📊 Checking Events</div>
          <div className={`nav-item ${activeTab === 'search' ? 'active' : ''}`} onClick={() => setActiveTab('search')}>🔍 Recherche Card</div>
          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>⚙️ Settings</div>
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item" onClick={() => setIsLoggedIn(false)}>
            🚪 Logout
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarOpen ? '' : 'expanded'}`}>
        {activeTab === 'dashboard' && (
          <div className="dashboard-content">
            <header className="dashboard-header">
              <div className="header-left">
                <div className="title-stack">
                  <h1 className="system-title">powercard-System</h1>
                  <p className="system-subtitle">PowerCard Management System</p>
                </div>
              </div>
            </header>


            <div className="stats-grid">
              <div 
                className={`stat-card all ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                <div className="stat-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="8" y1="9" x2="16" y2="9"></line>
                    <line x1="8" y1="13" x2="16" y2="13"></line>
                    <line x1="8" y1="17" x2="16" y2="17"></line>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Total Cards</span>
                  <span className="stat-value">{stats.all}</span>
                </div>
              </div>

              <div 
                className={`stat-card create ${activeFilter === 'create' ? 'active' : ''}`}
                onClick={() => setActiveFilter('create')}
              >
                <div className="stat-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Create Op</span>
                  <span className="stat-value">{stats.create}</span>
                </div>
              </div>

              <div 
                className={`stat-card update ${activeFilter === 'update' ? 'active' : ''}`}
                onClick={() => setActiveFilter('update')}
              >
                <div className="stat-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Update Op</span>
                  <span className="stat-value">{stats.update}</span>
                </div>
              </div>

              <div 
                className={`stat-card delete ${activeFilter === 'delete' ? 'active' : ''}`}
                onClick={() => setActiveFilter('delete')}
              >
                <div className="stat-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Delete Op</span>
                  <span className="stat-value">{stats.delete}</span>
                </div>
              </div>
            </div>


            <div className="table-section">
              <div className="table-header-row">
                <h3>Card Management Data</h3>
                <span className="results-count">Showing {cards.filter(c => activeFilter === 'all' || c.OPERATION?.toLowerCase() === activeFilter).length} results</span>
              </div>
              <div className="table-container">

              {loading ? (
                <div className="loader-container">
                  <div className="loader"></div>
                  <p>Loading System Data...</p>
                </div>
              ) : (
                <table className="pwc-table">
                  <thead>
                    <tr>
                      <th>Card ID</th>
                      <th>PAN Number</th>
                      <th>Full Name</th>
                      <th>Operation</th>

                      <th>Amounts</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.filter(c => activeFilter === 'all' || c.OPERATION?.toLowerCase() === activeFilter).length > 0 ? (
                      cards
                        .filter(c => activeFilter === 'all' || c.OPERATION?.toLowerCase() === activeFilter)
                        .map((card, index) => (

                        <tr key={index}>
                          <td className="id-cell">{card.ID_CARD}</td>
                          <td className="pan-cell">{maskPAN(card.PAN)}</td>
                          <td className="name-cell">{card.F_NAME} {card.L_NAME}</td>
                          <td>

                            <span className={`op-badge ${card.OPERATION?.toLowerCase()}`}>
                              {card.OPERATION}
                            </span>
                          </td>
                          <td className="amount-cell">{parseFloat(card.AMOUNT).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                          <td>
                            <span className={`status-badge ${card.STATUS?.toLowerCase()}`}>
                              {card.STATUS}
                            </span>
                          </td>
                          <td className="actions-cell">
                            <button className="action-icon view" title="View" onClick={() => handleViewCard(card)}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button className="action-icon edit" title="Edit">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button className="action-icon delete" title="Delete">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          </td>

                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="no-data">No card records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}





        {activeTab === 'create' && (
          <div className="form-card">
            <div className="form-header">
              <h2>New Card Provisioning</h2>
            </div>

            <form onSubmit={handleSubmitCard} className="card-form">
              <div className="form-columns-container">
                {/* Colonne GAUCHE - Identification */}
                <div className="form-col col-id">
                  <h3 className="col-title">Identification</h3>
                  <div className="input-group readonly">
                    <label>Card ID (System Generated)</label>
                    <input name="id_Card" value={formData.id_Card} disabled className="locked-input fade-input" />
                  </div>
                  <div className="input-group readonly">
                    <label>PAN Number (Securely Generated)</label>
                    <input name="PAN" value={formData.PAN} disabled className="locked-input fade-input" />
                  </div>
                </div>

                {/* Colonne MILIEU - Client Details */}
                <div className="form-col col-client">
                  <h3 className="col-title">Client Details</h3>
                  <div className="input-group">
                    <label>First Name</label>
                    <input name="F_Name" value={formData.F_Name} onChange={handleInputChange} placeholder="John" required />
                  </div>
                  <div className="input-group">
                    <label>Last Name</label>
                    <input name="L_Name" value={formData.L_Name} onChange={handleInputChange} placeholder="Doe" required />
                  </div>
                  <div className="input-group">
                    <label>Initial Balance (€)</label>
                    <input type="number" name="Amount" value={formData.Amount} onChange={handleInputChange} placeholder="0.00" />
                  </div>
                </div>

                {/* Colonne DROITE - Limits */}
                <div className="form-col col-limits">
                  <h3 className="col-title">Transaction Limits</h3>
                  <div className="input-group readonly">
                    <label>Daily POS Limit (Fixed)</label>
                    <input name="POS_limit" value={formData.POS_limit} disabled className="locked-input fade-input" />
                  </div>
                  <div className="input-group readonly">
                    <label>Daily ATM Limit (Fixed)</label>
                    <input name="ATM_limit" value={formData.ATM_limit} disabled className="locked-input fade-input" />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">Register New Card</button>
              </div>
            </form>
          </div>
        )}

        {(activeTab === 'events' || activeTab === 'search' || activeTab === 'settings') && (
          <div className="glass-card">
            <h2>{activeTab.toUpperCase()} Section</h2>
            <p>Work in progress...</p>
          </div>
        )}
      </main>

      {/* Modal View Card */}
      {isViewModalOpen && viewingCard && (
        <div className="modal-overlay" onClick={() => setIsViewModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <div className="modal-title-group">
                <h2>Card Details</h2>
                <p>{viewingCard.ID_CARD} • {viewingCard.F_NAME} {viewingCard.L_NAME}</p>
              </div>
              <button className="close-modal" onClick={() => setIsViewModalOpen(false)}>✕</button>
            </header>

            <div className="modal-tabs">
              <button 
                className={`modal-tab ${modalViewMode === 'table' ? 'active' : ''}`}
                onClick={() => setModalViewMode('table')}
              >
                📋 Table View
              </button>
              <button 
                className={`modal-tab ${modalViewMode === 'json' ? 'active' : ''}`}
                onClick={() => setModalViewMode('json')}
              >
                { "{ }" } JSON View
              </button>

            </div>

            <div className="modal-body">
              {modalViewMode === 'table' ? (
                <div className="modal-table-view">
                  {Object.entries(viewingCard).map(([key, value]: [string, any]) => {
                    let displayKey = key.replace(/_/g, ' ');
                    let displayValue = String(value);

                    // Special formatting for specific keys
                    if (key === 'TIMESTMP') displayKey = 'DATE';
                    if (key === 'AMOUNT') displayValue = `${parseFloat(value).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`;
                    
                    return (
                      <div className="modal-data-row" key={key}>
                        <span className="data-key">{displayKey}</span>
                        <span className="data-value">{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="modal-json-view">
                  <pre>{JSON.stringify(viewingCard, null, 2)}</pre>
                </div>
              )}
            </div>

            <footer className="modal-footer">
              <button className="primary-btn" onClick={() => setIsViewModalOpen(false)}>Done</button>
            </footer>
          </div>
        </div>
      )}
    </div>

  )
}

export default PWCDashboard

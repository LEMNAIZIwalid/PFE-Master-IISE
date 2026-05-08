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
  const [searchTerm, setSearchTerm] = useState('')
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [viewingCard, setViewingCard] = useState<any>(null)
  const [modalViewMode, setModalViewMode] = useState<'table' | 'json'>('table')

  // État pour Checking Events
  const [events, setEvents] = useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [activeEventFilter, setActiveEventFilter] = useState('all')
  const [showSettingsPassword, setShowSettingsPassword] = useState(false)
  const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'theme' | 'monitoring'>('profile')
  const [eventSearchTerm, setEventSearchTerm] = useState('')

  // État pour le formulaire d'édition
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editFormData, setEditFormData] = useState({
    id_Card: '',
    PAN: '',
    F_Name: '',
    L_Name: '',
    Amount: '',
    POS_limit: '',
    ATM_limit: '',
    Status: '',
    Source: 'PWC_System',
    Operation: 'Update'
  })




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
    if (activeTab === 'events' && isLoggedIn) {
      fetchEvents()
    }
  }, [activeTab, isLoggedIn])

  const fetchEvents = async () => {
    setLoadingEvents(true)
    try {
      const response = await fetch('http://localhost:5001/api/events')
      const data = await response.json()
      if (response.ok) {
        setEvents(data)
      }
    } catch (err) {
      console.error('Error fetching events:', err)
    } finally {
      setLoadingEvents(false)
    }
  }

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
  const handleEditCard = (card: any) => {
    // Vérifier si n'importe quelle ligne de cette carte est marquée comme DELETE
    const isDeleted = cards.some(c => c.ID_CARD === card.ID_CARD && c.OPERATION === 'DELETE');

    if (isDeleted) {
      alert(`Authorization Denied: The card ${card.ID_CARD} has been deleted in a previous operation and cannot be modified anymore.`);
      return;
    }
    setEditFormData({
      id_Card: card.ID_CARD,
      PAN: card.PAN,
      F_Name: card.F_NAME,
      L_Name: card.L_NAME,
      Amount: card.AMOUNT,
      POS_limit: card.POS_LIMIT || '9000.00',
      ATM_limit: card.ATM_LIMIT || '5000.00',
      Status: card.STATUS || 'Active',
      Source: 'PWC_System',
      Operation: 'Update'
    })
    setIsEditModalOpen(true)
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setEditFormData({ ...editFormData, [name]: value })
  }
  const handleUpdateCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (parseFloat(editFormData.POS_limit) > 9000) {
      alert('❌ Error: POS Limit cannot exceed 9000.00');
      return;
    }
    if (parseFloat(editFormData.ATM_limit) > 5000) {
      alert('❌ Error: ATM Limit cannot exceed 5000.00');
      return;
    }
    try {
      const response = await fetch('http://localhost:5001/api/update-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      })

      const result = await response.json()

      if (response.ok) {
        alert(`✅ Update Success: ${result.message}`)
        setIsEditModalOpen(false)
        fetchCards() // Rafraîchir la liste
      } else {
        alert(`❌ Error: ${result.message}`)
      }
    } catch (err) {
      console.error('API Error:', err)
      alert('❌ Fatal Error: Could not connect to the Backend API.')
    }
  }



  const handleDeleteCard = async (card: any) => {
    // Vérifier si n'importe quelle ligne de cette carte est déjà marquée comme DELETE
    const isAlreadyDeleted = cards.some(c => c.ID_CARD === card.ID_CARD && c.OPERATION === 'DELETE');

    if (isAlreadyDeleted) {
      alert(`Information: The card ${card.ID_CARD} is already marked as DELETED in the system history.`);
      return;
    }
    const confirmDelete = window.confirm(`Are you sure you want to delete the card ${card.ID_CARD} (${card.F_NAME} ${card.L_NAME})? This action will block the card and log it as DELETED.`);

    if (confirmDelete) {
      try {
        const response = await fetch('http://localhost:5001/api/delete-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_Card: card.ID_CARD,
            PAN: card.PAN,
            F_Name: card.F_NAME,
            L_Name: card.L_NAME,
            Amount: card.AMOUNT,
            POS_limit: card.POS_LIMIT,
            ATM_limit: card.ATM_LIMIT,
            Source: 'PWC_System'
          })
        })

        const result = await response.json()

        if (response.ok) {
          alert(`✅ Delete Success: ${result.message}`)
          fetchCards() // Rafraîchir la liste
        } else {
          alert(`❌ Error: ${result.message}`)
        }
      } catch (err) {
        console.error('API Error:', err)
        alert('❌ Fatal Error: Could not connect to the Backend API.')
      }
    }
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
    if (parseFloat(formData.POS_limit) > 9000) {
      alert('❌ Error: POS Limit cannot exceed 9000.00');
      return;
    }
    if (parseFloat(formData.ATM_limit) > 5000) {
      return;
    }

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
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
            <span>Dashboard</span>
          </div>

          <div className={`nav-item ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
            <span>Create Card</span>
          </div>

          <div className={`nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>Checking Events</span>
          </div>

          <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            <div className="nav-item-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>Settings</span>
            </div>
            <svg
              className={`chevron-icon ${activeTab === 'settings' ? 'rotated' : ''}`}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>

          {activeTab === 'settings' && (
            <div className="sub-menu">
              <div 
                className={`sub-nav-item ${settingsSubTab === 'profile' ? 'active' : ''}`} 
                onClick={() => setSettingsSubTab('profile')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span>Profile</span>
              </div>
              <div 
                className={`sub-nav-item ${settingsSubTab === 'theme' ? 'active' : ''}`} 
                onClick={() => setSettingsSubTab('theme')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
                <span>Theme</span>
              </div>
              <div 
                className={`sub-nav-item ${settingsSubTab === 'monitoring' ? 'active' : ''}`} 
                onClick={() => setSettingsSubTab('monitoring')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                <span>Monitoring</span>
              </div>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item logout-btn" onClick={() => setIsLoggedIn(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span>Logout</span>
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

              <div className="header-right">
                <div className="search-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by ID or PAN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-bar"
                  />
                </div>
                <div className="header-actions">
                  <button className="primary-btn" onClick={fetchCards}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                      <path d="M21 2v6h-6"></path>
                      <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                      <path d="M3 22v-6h6"></path>
                      <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                    </svg>
                    Refresh
                  </button>
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
                      {(() => {
                        // Logic de filtrage combinée (Status + Recherche)
                        const filteredCards = cards.filter(card => {
                          // Filtrage par Onglet (Status)
                          const matchesTab = activeFilter === 'all' || card.OPERATION?.toLowerCase() === activeFilter;

                          // Filtrage par Recherche (ID ou PAN)
                          const matchesSearch =
                            card.ID_CARD?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            card.PAN?.toLowerCase().includes(searchTerm.toLowerCase());

                          return matchesTab && matchesSearch;
                        });

                        return filteredCards.length > 0 ? (
                          filteredCards.map((card, index) => (

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
                                <button className="action-icon edit" title="Edit" onClick={() => handleEditCard(card)}>
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button className="action-icon delete" title="Delete" onClick={() => handleDeleteCard(card)}>
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
                        )
                      })()}
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
                  <div className="input-group">
                    <label>Daily POS Limit (Max 9000)</label>
                    <input type="number" name="POS_limit" value={formData.POS_limit} onChange={handleInputChange} max="9000" />
                  </div>
                  <div className="input-group">
                    <label>Daily ATM Limit (Max 5000)</label>
                    <input type="number" name="ATM_limit" value={formData.ATM_limit} onChange={handleInputChange} max="5000" />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-btn">Register New Card</button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="dashboard-content">
            <header className="dashboard-header">
              <div className="title-stack">
                <h1 className="system-title">checking-Events</h1>
                <p className="system-subtitle">System Audit Log & Event Tracking</p>
              </div>
              <div className="header-right">
                <div className="search-wrapper">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input 
                    type="text" 
                    placeholder="Search by Card ID or Client..." 
                    value={eventSearchTerm}
                    onChange={(e) => setEventSearchTerm(e.target.value)}
                    className="search-bar"
                  />
                </div>
                <button className="primary-btn" onClick={fetchEvents}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <path d="M21 2v6h-6"></path>
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                    <path d="M3 22v-6h6"></path>
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                  </svg>
                  Refresh Audit
                </button>
              </div>
            </header>

            <div className="stats-grid events-audit-grid">
              <div className={`stat-card all ${activeEventFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveEventFilter('all')}>
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <path d="M7 8h10M7 12h10M7 16h10"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">All Events</span>
                  <span className="stat-value">{events.length}</span>
                </div>
              </div>

              <div className={`stat-card create ${activeEventFilter === 'create' ? 'active' : ''}`} onClick={() => setActiveEventFilter('create')}>
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Create</span>
                  <span className="stat-value">{events.filter(e => e.OPERATION?.toLowerCase() === 'create').length}</span>
                </div>
              </div>

              <div className={`stat-card update ${activeEventFilter === 'update' ? 'active' : ''}`} onClick={() => setActiveEventFilter('update')}>
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Update</span>
                  <span className="stat-value">{events.filter(e => e.OPERATION?.toLowerCase() === 'update').length}</span>
                </div>
              </div>

              <div className={`stat-card delete ${activeEventFilter === 'delete' ? 'active' : ''}`} onClick={() => setActiveEventFilter('delete')}>
                <div className="stat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-label">Delete</span>
                  <span className="stat-value">{events.filter(e => e.OPERATION?.toLowerCase() === 'delete').length}</span>
                </div>
              </div>
            </div>

            <div className="table-section">
              <div className="table-header-row">
                <h3>System Transaction Audit</h3>
                <span className="results-count">Total Records: {events.length}</span>
              </div>
              <div className="table-container">
                {loadingEvents ? (
                  <div className="loader-container">
                    <div className="loader"></div>
                    <p>Fetching Audit Data...</p>
                  </div>
                ) : (
                  <table className="pwc-table">
                    <thead>
                      <tr>
                        <th>Event ID</th>
                        <th>Card ID</th>
                        <th>Client</th>
                        <th>Operation</th>
                        <th>Source</th>
                        <th>Status</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filteredEvents = events.filter(e => {
                          const matchesFilter = activeEventFilter === 'all' || e.OPERATION?.toLowerCase() === activeEventFilter;
                          const matchesSearch = e.ID_CARD?.toLowerCase().includes(eventSearchTerm.toLowerCase()) || 
                                              e.F_NAME?.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
                                              e.L_NAME?.toLowerCase().includes(eventSearchTerm.toLowerCase());
                          return matchesFilter && matchesSearch;
                        });
                          
                        return filteredEvents.length > 0 ? (
                          filteredEvents.map((event, idx) => (
                            <tr key={idx}>
                              <td className="id-cell">#{event.ID_EVENT}</td>
                              <td className="pan-cell">{event.ID_CARD}</td>
                              <td className="name-cell">{event.F_NAME} {event.L_NAME}</td>
                              <td>
                                <span className={`op-badge ${event.OPERATION?.toLowerCase()}`}>
                                  {event.OPERATION}
                                </span>
                              </td>
                              <td>
                                <span className={`source-badge ${event.SOURCE?.toLowerCase()}`}>
                                  {event.SOURCE}
                                </span>
                              </td>
                              <td>
                                <span className={`status-badge ${event.STATUS?.toLowerCase()}`}>
                                  {event.STATUS}
                                </span>
                              </td>
                              <td className="date-cell">
                                {new Date(event.TIMETMP).toLocaleString('fr-FR')}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="no-data">No events found for this filter.</td>
                          </tr>
                        );
                      })()}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="dashboard-content">
            <header className="dashboard-header">
              <div className="title-stack">
                <h1 className="system-title">
                  {settingsSubTab === 'profile' && 'admin-Profile'}
                  {settingsSubTab === 'theme' && 'ui-Customization'}
                  {settingsSubTab === 'monitoring' && 'system-Monitoring'}
                </h1>
                <p className="system-subtitle">
                  {settingsSubTab === 'profile' && 'Manage your administrative identity and security'}
                  {settingsSubTab === 'theme' && 'Personalize the dashboard appearance and behavior'}
                  {settingsSubTab === 'monitoring' && 'Track system health, performance and database metrics'}
                </p>
              </div>
            </header>

            {/* Profile Sub-Tab */}
            {settingsSubTab === 'profile' && (
              <div className="settings-container animate-fade-in">
                <div className="glass-card settings-card profile-card">
                  <div className="card-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <h3>Administrator Identity</h3>
                  </div>
                  <div className="settings-body">
                    <div className="profile-top">
                      <div className="avatar-placeholder">AD</div>
                      <div className="profile-info">
                        <h4>System Administrator</h4>
                        <p>Role: Super-User • Level 5 Access</p>
                      </div>
                    </div>
                    <div className="setting-item">
                      <label>Username</label>
                      <input type="text" value="admin" disabled className="locked-input" />
                    </div>
                    <div className="password-update-form">
                      <div className="setting-item password-field-group">
                        <label>Current Password</label>
                        <div className="password-input-wrapper">
                          <input 
                            type={showSettingsPassword ? "text" : "password"} 
                            placeholder="Current Password" 
                            className="password-input"
                          />
                          <button type="button" className="eye-toggle" onClick={() => setShowSettingsPassword(!showSettingsPassword)}>
                            {showSettingsPassword ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                            ) : (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <button className="primary-btn">Update Security Profile</button>
                  </div>
                </div>
              </div>
            )}

            {/* Theme Sub-Tab */}
            {settingsSubTab === 'theme' && (
              <div className="settings-container animate-fade-in">
                <div className="glass-card settings-card">
                  <div className="card-header">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
                    <h3>Visual Customization</h3>
                  </div>
                  <div className="settings-body">
                    <div className="theme-selector">
                      <p>Select Primary Dashboard Theme</p>
                      <div className="theme-options">
                        <div className="theme-box dark active" title="Dark Mode"></div>
                        <div className="theme-box light" title="Light Mode"></div>
                        <div className="theme-box violet" title="Cyber Violet"></div>
                      </div>
                    </div>
                    <div className="toggle-item">
                      <span>Enable Glassmorphism Effects</span>
                      <input type="checkbox" defaultChecked />
                    </div>
                    <div className="toggle-item">
                      <span>Compact Table View</span>
                      <input type="checkbox" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Monitoring Sub-Tab */}
            {settingsSubTab === 'monitoring' && (
              <div className="settings-container animate-fade-in">
                <div className="monitoring-layout">
                  <div className="glass-card settings-card">
                    <div className="card-header">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                      <h3>System Health</h3>
                    </div>
                    <div className="settings-body">
                      <div className="health-stat">
                        <span>Database Connection (Oracle)</span>
                        <span className="status-badge active">CONNECTED</span>
                      </div>
                      <div className="health-stat">
                        <span>Kafka Broker Status</span>
                        <span className="status-badge active">STABLE</span>
                      </div>
                      <div className="health-stat">
                        <span>API Server Latency</span>
                        <span className="status-badge active">12ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card settings-card">
                    <div className="card-header">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      <h3>Audit Retention</h3>
                    </div>
                    <div className="settings-body">
                      <div className="toggle-item audit-retention">
                        <div className="item-info">
                          <span>Data Retention Period</span>
                        </div>
                        <select className="premium-select" defaultValue="30">
                          <option value="30">30 Days</option>
                          <option value="90">90 Days</option>
                          <option value="365">1 Year</option>
                        </select>
                      </div>
                      <button className="secondary-btn">Purge Old Records</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                {"{ }"} JSON View
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

      {/* Modal Edit Card */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <div className="modal-title-group">
                <h2>Edit Card</h2>
                <p>Modifying details for {editFormData.id_Card}</p>
              </div>
              <button className="close-modal" onClick={() => setIsEditModalOpen(false)}>✕</button>
            </header>

            <form onSubmit={handleUpdateCard}>
              <div className="modal-body">
                <div className="form-columns-container">
                  {/* Colonne GAUCHE - Identification */}
                  <div className="form-col col-id">
                    <h3 className="col-title">Identification</h3>
                    <div className="input-group readonly">
                      <label>Card ID</label>
                      <input name="id_Card" value={editFormData.id_Card} disabled className="locked-input" />
                    </div>
                    <div className="input-group readonly">
                      <label>PAN Number</label>
                      <input name="PAN" value={editFormData.PAN} disabled className="locked-input" />
                    </div>
                  </div>

                  {/* Colonne MILIEU - Client Details */}
                  <div className="form-col col-client">
                    <h3 className="col-title">Client Details</h3>
                    <div className="input-group">
                      <label>First Name</label>
                      <input name="F_Name" value={editFormData.F_Name} onChange={handleEditInputChange} required />
                    </div>
                    <div className="input-group">
                      <label>Last Name</label>
                      <input name="L_Name" value={editFormData.L_Name} onChange={handleEditInputChange} required />
                    </div>
                    <div className="input-group">
                      <label>Amount (€)</label>
                      <input type="number" name="Amount" value={editFormData.Amount} onChange={handleEditInputChange} />
                    </div>
                  </div>

                  {/* Colonne DROITE - Config & Status */}
                  <div className="form-col col-limits">
                    <h3 className="col-title">Limits & Status</h3>
                    <div className="input-group">
                      <label>Daily POS Limit (Max 9000)</label>
                      <input type="number" name="POS_limit" value={editFormData.POS_limit} onChange={handleEditInputChange} max="9000" />
                    </div>
                    <div className="input-group">
                      <label>Daily ATM Limit (Max 5000)</label>
                      <input type="number" name="ATM_limit" value={editFormData.ATM_limit} onChange={handleEditInputChange} max="5000" />
                    </div>
                    <div className="input-group">
                      <label>Account Status</label>
                      <select name="Status" value={editFormData.Status} onChange={handleEditInputChange} className="status-select">
                        <option value="Active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="blocked">Blocked</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <footer className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Changes</button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>

  )
}

export default PWCDashboard

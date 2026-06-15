import React from 'react'
import './PWC-Dashboard.css'

const renderCardGraph = (history: number[], strokeColor: string, gradId: string) => {
  const w = 240
  const h = 55
  if (history.length === 0) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="card-graph-svg" preserveAspectRatio="none">
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3,3" opacity="0.4" />
      </svg>
    )
  }

  const maxVal = Math.max(...history, 30) // Minimum scale y of 30ms to prevent huge swings for tiny spikes
  const points = history.map((val, idx) => {
    const x = (idx / (history.length - 1 || 1)) * w
    const y = h - (val / maxVal) * (h - 12) - 6
    return { x, y }
  })

  const linePointsStr = points.map(p => `${p.x},${p.y}`).join(' ')
  const fillPointsStr = `0,${h} ` + points.map(p => `${p.x},${p.y}`).join(' ') + ` ${w},${h}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="card-graph-svg" preserveAspectRatio="none">
      <polygon points={fillPointsStr} fill={`url(#${gradId})`} />
      <polyline points={linePointsStr} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PWCDashboard() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false)
  const [sidebarOpen, setSidebarOpen] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState('dashboard')
  const [username, setUsername] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')

  // État pour le formulaire "Create Card"
  const [formData, setFormData] = React.useState({
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
  const [cards, setCards] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [activeFilter, setActiveFilter] = React.useState('all')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [isViewModalOpen, setIsViewModalOpen] = React.useState(false)
  const [viewingCard, setViewingCard] = React.useState<any>(null)
  const [modalViewMode, setModalViewMode] = React.useState<'table' | 'json'>('table')

  // État pour Checking Events
  const [events, setEvents] = React.useState<any[]>([])
  const [loadingEvents, setLoadingEvents] = React.useState(false)
  const [activeEventFilter, setActiveEventFilter] = React.useState('all')
  const [activeSourceFilter, setActiveSourceFilter] = React.useState('all')
  const [showSettingsPassword, setShowSettingsPassword] = React.useState(false)
  const [settingsSubTab, setSettingsSubTab] = React.useState<'profile' | 'theme' | 'monitoring'>('profile')
  const [eventSearchTerm, setEventSearchTerm] = React.useState('')
  const [selectedEvent, setSelectedEvent] = React.useState<any>(null)
  const [isEventModalOpen, setIsEventModalOpen] = React.useState(false)
  const [eventModalTab, setEventModalTab] = React.useState<'overview' | 'json'>('overview')

  // État pour Transactions Checking
  const [transactions, setTransactions] = React.useState<any[]>([])
  const [loadingTransactions, setLoadingTransactions] = React.useState(false)
  const [selectedTrx, setSelectedTrx] = React.useState<any>(null)
  const [isTrxModalOpen, setIsTrxModalOpen] = React.useState(false)
  const [transactionFilter, setTransactionFilter] = React.useState<'all' | 'transfer' | 'paiement'>('all')

  // État pour le formulaire d'édition
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [editFormData, setEditFormData] = React.useState({
    id_Card: '',
    PAN: '',
    F_Name: '',
    L_Name: '',
    Amount: '',
    POS_limit: '',
    ATM_limit: '',
    Status: '',
    Source: 'PWC_System',
    Operation: 'Update',
    event_id: ''
  })

  // État pour le monitoring dynamique
  const [healthStatus, setHealthStatus] = React.useState<any>({
    apiStatus: 'CHECKING',
    apiLatency: 'CHECKING',
    database: {
      status: 'CHECKING',
      active_cards: 0,
      total_events: 0,
      total_transactions: 0,
      latency_ms: 0
    },
    kafka: {
      status: 'CHECKING',
      topic: 'HPOS',
      partitions: 0,
      latency_ms: 0
    },
    mqtt: {
      status: 'CHECKING',
      latency_ms: 0
    },
    mqtt_bridge: {
      status: 'CHECKING',
      latency_ms: 0
    }
  })

  // Historique des latences pour les graphiques (les 15 derniers points)
  const [apiLatencyHistory, setApiLatencyHistory] = React.useState<number[]>([])
  const [dbLatencyHistory, setDbLatencyHistory] = React.useState<number[]>([])
  const [kafkaLatencyHistory, setKafkaLatencyHistory] = React.useState<number[]>([])
  const [mqttLatencyHistory, setMqttLatencyHistory] = React.useState<number[]>([])
  const [proxyLatencyHistory, setProxyLatencyHistory] = React.useState<number[]>([])

  const fetchHealth = async () => {
    const start = Date.now()
    try {
      const response = await fetch('http://localhost:5001/api/health')
      const latency = Date.now() - start
      if (response.ok) {
        const data = await response.json()
        setHealthStatus({
          apiStatus: data.api_status || 'UP',
          apiLatency: `${latency}ms`,
          database: data.database || { status: 'DISCONNECTED', active_cards: 0, total_events: 0, total_transactions: 0, latency_ms: 0 },
          kafka: data.kafka || { status: 'UNAVAILABLE', topic: 'HPOS', partitions: 0, latency_ms: 0 },
          mqtt: data.mqtt || { status: 'DISCONNECTED', latency_ms: 0 },
          mqtt_bridge: data.mqtt_bridge || { status: 'INACTIVE', latency_ms: 0 }
        })

        const apiLat = latency
        const dbLat = data.database?.latency_ms || 0
        const kafkaLat = data.kafka?.latency_ms || 0
        const mqttLat = data.mqtt?.latency_ms || 0
        const proxyLat = data.mqtt_bridge?.latency_ms || 0

        setApiLatencyHistory(prev => [...prev, apiLat].slice(-15))
        setDbLatencyHistory(prev => [...prev, dbLat].slice(-15))
        setKafkaLatencyHistory(prev => [...prev, kafkaLat].slice(-15))
        setMqttLatencyHistory(prev => [...prev, mqttLat].slice(-15))
        setProxyLatencyHistory(prev => [...prev, proxyLat].slice(-15))
      } else {
        setHealthStatus((prev: any) => ({
          ...prev,
          apiStatus: 'ERROR',
          apiLatency: `${latency}ms`,
          database: { ...prev.database, status: 'DISCONNECTED', latency_ms: 0 },
          kafka: { ...prev.kafka, status: 'UNAVAILABLE', latency_ms: 0 },
          mqtt: { status: 'DISCONNECTED', latency_ms: 0 },
          mqtt_bridge: { status: 'INACTIVE', latency_ms: 0 }
        }))

        setApiLatencyHistory(prev => [...prev, latency].slice(-15))
        setDbLatencyHistory(prev => [...prev, 0].slice(-15))
        setKafkaLatencyHistory(prev => [...prev, 0].slice(-15))
        setMqttLatencyHistory(prev => [...prev, 0].slice(-15))
        setProxyLatencyHistory(prev => [...prev, 0].slice(-15))
      }
    } catch (err) {
      setHealthStatus((prev: any) => ({
        ...prev,
        apiStatus: 'ERROR',
        apiLatency: 'TIMEOUT',
        database: { ...prev.database, status: 'DISCONNECTED', latency_ms: 0 },
        kafka: { ...prev.kafka, status: 'UNAVAILABLE', latency_ms: 0 },
        mqtt: { status: 'DISCONNECTED', latency_ms: 0 },
        mqtt_bridge: { status: 'INACTIVE', latency_ms: 0 }
      }))

      setApiLatencyHistory(prev => [...prev, 1000].slice(-15))
      setDbLatencyHistory(prev => [...prev, 0].slice(-15))
      setKafkaLatencyHistory(prev => [...prev, 0].slice(-15))
      setMqttLatencyHistory(prev => [...prev, 0].slice(-15))
      setProxyLatencyHistory(prev => [...prev, 0].slice(-15))
    }
  }

  React.useEffect(() => {
    if (settingsSubTab === 'monitoring' && isLoggedIn) {
      fetchHealth()
      const interval = setInterval(fetchHealth, 5000)
      return () => clearInterval(interval)
    }
  }, [settingsSubTab, isLoggedIn])

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
  React.useEffect(() => {
    if (activeTab === 'create') {
      generateIDs()
    }
  }, [activeTab])

  // Charger les données quand on est sur le dashboard
  React.useEffect(() => {
    if (activeTab === 'dashboard' && isLoggedIn) {
      fetchCards()
    }
    if (activeTab === 'events' && isLoggedIn) {
      fetchEvents()
    }
    if (activeTab === 'transactions' && isLoggedIn) {
      fetchTransactions()
    }
  }, [activeTab, isLoggedIn])

  const fetchTransactions = async () => {
    setLoadingTransactions(true)
    try {
      const response = await fetch('http://localhost:5001/api/transactions')
      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
      } else {
        setTransactions([])
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setTransactions([])
    } finally {
      setLoadingTransactions(false)
    }
  }

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

  const handleEventClick = (event: any) => {
    setSelectedEvent(event)
    setEventModalTab('overview')
    setIsEventModalOpen(true)
  }
  const handleEditCard = (card: any, eventId?: string) => {
    // Vérifier si n'importe quelle ligne de cette carte est marquée comme DELETE
    const isDeleted = cards.some(c => c.ID_CARD === card.ID_CARD && c.OPERATION === 'DELETE');
    if (isDeleted) {
      alert("Cette carte est marquée pour suppression et ne peut pas être modifiée.");
      return;
    }

    // Vérifier si la carte a déjà été supprimée par le système externe
    const isExtDeleted = events.some(e => e.ID_CARD === card.ID_CARD && e.SOURCE === 'Externel_System' && e.OPERATION === 'DELETE');
    if (isExtDeleted) {
      alert("Cette carte a déjà été supprimée par le système externe. Vous n'êtes pas autorisé à effectuer des actions sur elle.");
      return;
    }

    setEditFormData({
      id_Card: card.ID_CARD,
      PAN: card.PAN,
      F_Name: card.F_NAME,
      L_Name: card.L_NAME,
      Amount: card.AMOUNT !== undefined ? card.AMOUNT : card.AMOUNTS, // Handle both card and event objects
      POS_limit: card.POS_LIMIT,
      ATM_limit: card.ATM_LIMIT,
      Status: card.STATUS,
      Source: card.SOURCE || 'PWC_System',
      Operation: 'Update',
      event_id: eventId || ''
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
        fetchEvents() // Rafraîchir les événements
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

    // Vérifier si la carte a déjà été supprimée par le système externe
    const isExtDeleted = events.some(e => e.ID_CARD === card.ID_CARD && e.SOURCE === 'Externel_System' && e.OPERATION === 'DELETE');
    if (isExtDeleted) {
      alert("Cette carte a déjà été supprimée par le système externe. Vous n'êtes pas autorisé à effectuer des actions sur elle.");
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
            Amount: card.AMOUNT !== undefined ? card.AMOUNT : card.AMOUNTS,
            POS_limit: card.POS_LIMIT,
            ATM_limit: card.ATM_LIMIT,
            Source: card.SOURCE || 'PWC_System'
          })
        })

        const result = await response.json()

        if (response.ok) {
          alert(`✅ Delete Success: ${result.message}`)
          fetchCards() // Rafraîchir la liste
          fetchEvents() // Rafraîchir les événements
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

          <div className={`nav-item ${activeTab === 'transactions' ? 'active' : ''}`} onClick={() => setActiveTab('transactions')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            <span>Transactions Checking</span>
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

            <div className="events-dashboard-layout">
              {/* Graphique Circulaire à Gauche (Remplace les filtres Opérations) */}
              <div className="events-chart-container glass-card">
                <h3>Operations Overview</h3>
                <div className="chart-wrapper">
                  <svg viewBox="0 0 36 36" className="circular-chart">
                    {/* Background Circle */}
                    <path className="circle-bg"
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Delete Slice (Red) */}
                    <path className="circle-delete"
                      strokeDasharray={`${(events.filter(e => e.OPERATION?.toLowerCase().includes('delete')).length / (events.length || 1)) * 100} 100`}
                      strokeDashoffset={0}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Update Slice (Orange) */}
                    <path className="circle-update"
                      strokeDasharray={`${(events.filter(e => e.OPERATION?.toLowerCase().includes('update')).length / (events.length || 1)) * 100} 100`}
                      strokeDashoffset={-((events.filter(e => e.OPERATION?.toLowerCase().includes('delete')).length / (events.length || 1)) * 100)}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Create Slice (Green) */}
                    <path className="circle-create"
                      strokeDasharray={`${(events.filter(e => e.OPERATION?.toLowerCase() === 'create').length / (events.length || 1)) * 100} 100`}
                      strokeDashoffset={-((events.filter(e => e.OPERATION?.toLowerCase().includes('delete')).length / (events.length || 1)) * 100) - ((events.filter(e => e.OPERATION?.toLowerCase().includes('update')).length / (events.length || 1)) * 100)}
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="20.35" className="chart-total">{events.length}</text>
                  </svg>
                  
                  <div className="chart-legend">
                    <div className={`legend-item ${activeEventFilter === 'all' && activeSourceFilter === 'all' ? 'active' : ''}`} onClick={() => { setActiveEventFilter('all'); setActiveSourceFilter('all'); }}>
                      <span className="legend-color legend-all"></span> All ({events.length})
                    </div>
                    <div className={`legend-item ${activeEventFilter === 'create' ? 'active' : ''}`} onClick={() => setActiveEventFilter('create')}>
                      <span className="legend-color legend-create"></span> Create ({events.filter(e => e.OPERATION?.toLowerCase() === 'create').length})
                    </div>
                    <div className={`legend-item ${activeEventFilter === 'update' ? 'active' : ''}`} onClick={() => setActiveEventFilter('update')}>
                      <span className="legend-color legend-update"></span> Update ({events.filter(e => e.OPERATION?.toLowerCase().includes('update')).length})
                    </div>
                    <div className={`legend-item ${activeEventFilter === 'delete' ? 'active' : ''}`} onClick={() => setActiveEventFilter('delete')}>
                      <span className="legend-color legend-delete"></span> Delete ({events.filter(e => e.OPERATION?.toLowerCase().includes('delete')).length})
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtres de Sources à Droite */}
              <div className="source-filters-container">
                <div className={`stat-card source-pwc ${activeSourceFilter === 'PWC_System' ? 'active' : ''}`} onClick={() => setActiveSourceFilter(activeSourceFilter === 'PWC_System' ? 'all' : 'PWC_System')}>
                  <div className="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                      <rect x="9" y="9" width="6" height="6"></rect>
                      <line x1="9" y1="1" x2="9" y2="4"></line>
                      <line x1="15" y1="1" x2="15" y2="4"></line>
                      <line x1="9" y1="20" x2="9" y2="23"></line>
                      <line x1="15" y1="20" x2="15" y2="23"></line>
                      <line x1="20" y1="9" x2="23" y2="9"></line>
                      <line x1="20" y1="14" x2="23" y2="14"></line>
                      <line x1="1" y1="9" x2="4" y2="9"></line>
                      <line x1="1" y1="14" x2="4" y2="14"></line>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">PWC System</span>
                    <span className="stat-value">{events.filter(e => e.SOURCE === 'PWC_System').length}</span>
                  </div>
                </div>

                <div className={`stat-card source-ext ${activeSourceFilter === 'Externel_System' ? 'active' : ''}`} onClick={() => setActiveSourceFilter(activeSourceFilter === 'Externel_System' ? 'all' : 'Externel_System')}>
                  <div className="stat-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">External System</span>
                    <span className="stat-value">{events.filter(e => e.SOURCE === 'Externel_System').length}</span>
                  </div>
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
                          const matchesFilter = activeEventFilter === 'all' || e.OPERATION?.toLowerCase().includes(activeEventFilter);
                          const matchesSource = activeSourceFilter === 'all' || e.SOURCE === activeSourceFilter;
                          const matchesSearch = e.ID_CARD?.toLowerCase().includes(eventSearchTerm.toLowerCase()) || 
                                              e.F_NAME?.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
                                              e.L_NAME?.toLowerCase().includes(eventSearchTerm.toLowerCase());
                          return matchesFilter && matchesSource && matchesSearch;
                        });
                          
                          return filteredEvents.length > 0 ? (
                            filteredEvents.map((event, idx) => (
                              <tr key={idx} onClick={() => handleEventClick(event)} className="clickable-row">
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

        {activeTab === 'transactions' && (
          <div className="dashboard-content">
            <header className="dashboard-header">
              <div className="title-stack">
                <h1 className="system-title">Transactions-Checking</h1>
                <p className="system-subtitle">Executed Transactions Logs</p>
              </div>
              <div className="header-right">
                <button className="primary-btn" onClick={fetchTransactions} disabled={loadingTransactions}>
                  <svg className={loadingTransactions ? 'animate-spin' : ''} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                    <path d="M21 2v6h-6"></path>
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                    <path d="M3 22v-6h6"></path>
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                  </svg>
                  Refresh Transactions
                </button>
              </div>
            </header>

            <div className="table-section">
              <div className="table-header-row">
                <h3>System Transaction Audit</h3>
                <span className="results-count">
                  Showing {(() => {
                    const filtered = transactions.filter(trx => {
                      if (transactionFilter === 'all') return true;
                      if (transactionFilter === 'transfer') {
                        return trx.operation?.toLowerCase() === 'transfer' || trx.operation?.toLowerCase() === 'virement';
                      }
                      if (transactionFilter === 'paiement') {
                        return trx.operation?.toLowerCase() === 'paiement' || trx.operation?.toLowerCase() === 'payment';
                      }
                      return true;
                    });
                    return filtered.length;
                  })()} of {transactions.length} records
                </span>
              </div>

              {/* Transaction Filters */}
              <div className="transaction-filters">
                <button
                  className={`filter-pill ${transactionFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTransactionFilter('all')}
                >
                  All Operations ({transactions.length})
                </button>
                <button
                  className={`filter-pill transfer ${transactionFilter === 'transfer' ? 'active' : ''}`}
                  onClick={() => setTransactionFilter('transfer')}
                >
                  Transfers ({transactions.filter(t => t.operation?.toLowerCase() === 'transfer' || t.operation?.toLowerCase() === 'virement').length})
                </button>
                <button
                  className={`filter-pill payment ${transactionFilter === 'paiement' ? 'active' : ''}`}
                  onClick={() => setTransactionFilter('paiement')}
                >
                  Payments ({transactions.filter(t => t.operation?.toLowerCase() === 'paiement' || t.operation?.toLowerCase() === 'payment').length})
                </button>
              </div>

              <div className="table-container">
                {loadingTransactions ? (
                  <div className="loader-container">
                    <div className="loader"></div>
                    <p>Fetching Transactions Data...</p>
                  </div>
                ) : (
                  <table className="pwc-table">
                    <thead>
                      <tr>
                        <th>Card ID</th>
                        <th>Client Name</th>
                        <th>Amount</th>
                        <th>Operation</th>
                        <th>Source</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = transactions.filter(trx => {
                          if (transactionFilter === 'all') return true;
                          if (transactionFilter === 'transfer') {
                            return trx.operation?.toLowerCase() === 'transfer' || trx.operation?.toLowerCase() === 'virement';
                          }
                          if (transactionFilter === 'paiement') {
                            return trx.operation?.toLowerCase() === 'paiement' || trx.operation?.toLowerCase() === 'payment';
                          }
                          return true;
                        });

                        return filtered.length > 0 ? (
                          filtered.map((trx, idx) => (
                            <tr key={idx} className="clickable-row" onClick={() => { setSelectedTrx(trx); setIsTrxModalOpen(true); }}>
                              <td className="id-cell">#{trx.sender_card_id || 'N/A'}</td>
                              <td>{trx.sender_name || 'N/A'}</td>
                              <td className="amount-cell">{parseFloat(trx.transfer_amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
                              <td>
                                <span className={`op-badge ${(trx.operation || 'Virement').toLowerCase()}`}>
                                  {trx.operation || 'Virement'}
                                </span>
                              </td>
                              <td>
                                <span className={`source-badge ${(trx.sender_source || 'Mobile_App').toLowerCase()}`}>
                                  {trx.sender_source || 'Mobile_App'}
                                </span>
                              </td>
                              <td className="date-cell">
                                {trx.timestamp ? new Date(trx.timestamp).toLocaleString('fr-FR') : 'N/A'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="no-data">No transactions found for this filter.</td>
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
              <div className="monitoring-container animate-fade-in">
                <div className="monitoring-wrapper">
                  
                  {/* Defs for gradients used in latency area charts */}
                  <svg style={{ width: 0, height: 0, position: 'absolute' }}>
                    <defs>
                      <linearGradient id="api-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="db-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="kafka-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="mqtt-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="proxy-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d946ef" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#d946ef" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Part 1: Grid of Services (API, DB, Kafka, MQTT, Proxy) */}
                  <div className="monitoring-services-grid">
                    
                    {/* API Server status card */}
                    <div className="service-status-card api-service">
                      <div className="service-card-top">
                        <div className="service-icon-badge api">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                        </div>
                        <span className={`status-badge ${healthStatus.apiStatus === 'UP' ? 'active' : 'blocked'}`}>
                          {healthStatus.apiStatus}
                        </span>
                      </div>
                      <div className="service-card-body">
                        <span className="service-title">API Backend</span>
                        <span className="service-host">localhost:5001</span>
                        <span className="service-value">{healthStatus.apiLatency}</span>
                      </div>
                      <div className="service-card-sparkline">
                        {renderCardGraph(apiLatencyHistory, '#6366f1', 'api-grad')}
                      </div>
                    </div>

                    {/* Database status card */}
                    <div className="service-status-card db-service">
                      <div className="service-card-top">
                        <div className="service-icon-badge db">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-2.239 10-5V5c0-2.761-4.477-5-10-5S2 2.239 2 5v12c0 2.761 4.477 5 10 5z"></path><path d="M22 5c0 2.761-4.477 5-10 5S2 7.761 2 5"></path><path d="M2 11c0 2.761 4.477 5 10 5s10-2.239 10-5"></path></svg>
                        </div>
                        <span className={`status-badge ${healthStatus.database.status === 'CONNECTED' ? 'active' : healthStatus.database.status === 'CHECKING' ? 'suspended' : 'blocked'}`}>
                          {healthStatus.database.status}
                        </span>
                      </div>
                      <div className="service-card-body">
                        <span className="service-title">Oracle DB</span>
                        <span className="service-host">172.22.32.1</span>
                        <span className="service-value">
                          {healthStatus.database.status === 'CONNECTED' ? `${healthStatus.database.latency_ms}ms` : 'OFFLINE'}
                        </span>
                      </div>
                      <div className="service-card-sparkline">
                        {renderCardGraph(dbLatencyHistory, '#10b981', 'db-grad')}
                      </div>
                    </div>

                    {/* Kafka status card */}
                    <div className="service-status-card kafka-service">
                      <div className="service-card-top">
                        <div className="service-icon-badge kafka">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                        </div>
                        <span className={`status-badge ${healthStatus.kafka.status === 'STABLE' ? 'active' : healthStatus.kafka.status === 'CHECKING' ? 'suspended' : 'blocked'}`}>
                          {healthStatus.kafka.status}
                        </span>
                      </div>
                      <div className="service-card-body">
                        <span className="service-title">Kafka Broker</span>
                        <span className="service-host">localhost:9092</span>
                        <span className="service-value">
                          {healthStatus.kafka.status === 'STABLE' ? `${healthStatus.kafka.latency_ms}ms` : 'OFFLINE'}
                        </span>
                      </div>
                      <div className="service-card-sparkline">
                        {renderCardGraph(kafkaLatencyHistory, '#f59e0b', 'kafka-grad')}
                      </div>
                    </div>

                    {/* MQTT status card */}
                    <div className="service-status-card mqtt-service">
                      <div className="service-card-top">
                        <div className="service-icon-badge mqtt">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </div>
                        <span className={`status-badge ${healthStatus.mqtt.status === 'ACTIVE' ? 'active' : healthStatus.mqtt.status === 'CHECKING' ? 'suspended' : 'blocked'}`}>
                          {healthStatus.mqtt.status}
                        </span>
                      </div>
                      <div className="service-card-body">
                        <span className="service-title">MQTT Broker</span>
                        <span className="service-host">localhost:1883</span>
                        <span className="service-value">
                          {healthStatus.mqtt.status === 'ACTIVE' ? `${healthStatus.mqtt.latency_ms}ms` : 'OFFLINE'}
                        </span>
                      </div>
                      <div className="service-card-sparkline">
                        {renderCardGraph(mqttLatencyHistory, '#06b6d4', 'mqtt-grad')}
                      </div>
                    </div>

                    {/* Proxy Bridge status card */}
                    <div className="service-status-card proxy-service">
                      <div className="service-card-top">
                        <div className="service-icon-badge proxy">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                        </div>
                        <span className={`status-badge ${healthStatus.mqtt_bridge.status === 'ACTIVE' ? 'active' : healthStatus.mqtt_bridge.status === 'CHECKING' ? 'suspended' : 'blocked'}`}>
                          {healthStatus.mqtt_bridge.status}
                        </span>
                      </div>
                      <div className="service-card-body">
                        <span className="service-title">Proxy Bridge</span>
                        <span className="service-host">mqtt_kafka_proxy</span>
                        <span className="service-value">
                          {healthStatus.mqtt_bridge.status === 'ACTIVE' ? `${healthStatus.mqtt_bridge.latency_ms}ms` : 'OFFLINE'}
                        </span>
                      </div>
                      <div className="service-card-sparkline">
                        {renderCardGraph(proxyLatencyHistory, '#d946ef', 'proxy-grad')}
                      </div>
                    </div>

                  </div>

                  {/* Part 2: Detailed Live Metrics (Oracle DB stats on Left, Kafka partitions on Right) */}
                  <div className="monitoring-details-grid">
                    
                    {/* Oracle Database Analytics Card */}
                    <div className="monitoring-detail-card db-panel">
                      <div className="panel-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <h3 className="panel-title">Oracle DB Live Statistics</h3>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div className="db-metric-row">
                          <div className="metric-text-group">
                            <span className="metric-label">Active Cards (PWC_System)</span>
                            <span className="metric-value-container">
                              {healthStatus.database.active_cards}
                              <span className="metric-value-suffix">Provisioned Cards</span>
                            </span>
                          </div>
                          <div className="metric-icon-box" style={{ background: '#ecfdf5', color: '#10b981' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                          </div>
                        </div>

                        <div className="db-metric-row">
                          <div className="metric-text-group">
                            <span className="metric-label">Total Ingested Events (Audit Log)</span>
                            <span className="metric-value-container">
                              {healthStatus.database.total_events}
                              <span className="metric-value-suffix">Operations</span>
                            </span>
                          </div>
                          <div className="metric-icon-box" style={{ background: '#e0e7ff', color: '#6366f1' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                          </div>
                        </div>

                        <div className="db-metric-row">
                          <div className="metric-text-group">
                            <span className="metric-label">Total Checked Transactions</span>
                            <span className="metric-value-container">
                              {healthStatus.database.total_transactions}
                              <span className="metric-value-suffix">Virements / Payments</span>
                            </span>
                          </div>
                          <div className="metric-icon-box" style={{ background: '#fef2f2', color: '#ef4444' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Kafka Stream Analytics (Topic details and glowing Partition visualizer) */}
                    <div className="monitoring-detail-card kafka-panel">
                      <div className="panel-header">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
                        <h3 className="panel-title">Kafka Event Streaming Metrics</h3>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div className="kafka-subcards-grid">
                          <div className="kafka-subcard">
                            <div className="kafka-subcard-label">Target Topic</div>
                            <span className="kafka-pill-value topic">
                              {healthStatus.kafka.topic}
                            </span>
                          </div>
                          
                          <div className="kafka-subcard">
                            <div className="kafka-subcard-label">Partition Count</div>
                            <span className="kafka-pill-value partitions">
                              {healthStatus.kafka.partitions} Partitions
                            </span>
                          </div>
                        </div>

                        {/* Visualizer: Glowing Partitions */}
                        <div className="partition-visualizer-container">
                          <span className="partition-visualizer-title">Partition Load Balancer Visualizer</span>
                          
                          <div className="partition-boxes-row">
                            {[0, 1, 2].map((idx) => {
                              const active = healthStatus.kafka.partitions >= idx + 1;
                              return (
                                <div 
                                  key={idx} 
                                  className={`partition-server-box ${active ? 'active' : 'offline'}`}
                                >
                                  <span className="partition-box-label">PART {idx}</span>
                                  <div className={`glowing-led ${active ? 'green' : 'red'}`}></div>
                                  <span className={`partition-status-text ${active ? 'green' : 'red'}`}>
                                    {active ? 'ACTIVE' : 'OFFLINE'}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
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
                    {editFormData.event_id && (
                      <div className="input-group readonly">
                        <label>Reference Event ID</label>
                        <input name="event_id" value={editFormData.event_id} disabled className="locked-input" />
                      </div>
                    )}
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

      {/* Modal View Event Details */}
      {isEventModalOpen && selectedEvent && (
        <div className="modal-overlay" onClick={() => setIsEventModalOpen(false)}>
          <div className="modal-content event-details-modal premium-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header event-modal-header">
              <div className="modal-title-group">
                <div className="event-badge-wrapper">
                  <span className={`op-badge ${selectedEvent.OPERATION?.toLowerCase()}`}>
                    {selectedEvent.OPERATION}
                  </span>
                  <span className="event-id-label">Audit Entry #{selectedEvent.ID_EVENT}</span>
                </div>
                <h2>Audit Log Explorer</h2>
              </div>
              <button className="close-modal" onClick={() => setIsEventModalOpen(false)}>✕</button>
            </header>

            <div className="modal-tabs">
              <button 
                className={`modal-tab ${eventModalTab === 'overview' ? 'active' : ''}`}
                onClick={() => setEventModalTab('overview')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Overview
              </button>
              <button 
                className={`modal-tab ${eventModalTab === 'json' ? 'active' : ''}`}
                onClick={() => setEventModalTab('json')}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                Raw JSON
              </button>
            </div>

            <div className="modal-body">
              {eventModalTab === 'overview' ? (
                <div className="event-details-grid">
                  {/* Section 1: Transaction Context */}
                  <div className="detail-section glass-effect">
                    <h3 className="section-subtitle">Transaction Context</h3>
                    <div className="detail-row">
                      <span className="detail-label">Event Reference</span>
                      <span className="detail-value">#{selectedEvent.ID_EVENT}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Target Card</span>
                      <span className="detail-value mono highlight-pwc">{selectedEvent.ID_CARD}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Execution Date</span>
                      <span className="detail-value">{new Date(selectedEvent.TIMETMP).toLocaleString('fr-FR')}</span>
                    </div>
                  </div>

                  {/* Section 2: Administrative Info */}
                  <div className="detail-section glass-effect">
                    <h3 className="section-subtitle">Client Information</h3>
                    <div className="detail-row">
                      <span className="detail-label">Account Holder</span>
                      <span className="detail-value">{selectedEvent.F_NAME} {selectedEvent.L_NAME}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Account Status</span>
                      <span className={`status-badge ${selectedEvent.STATUS?.toLowerCase()}`}>
                        {selectedEvent.STATUS}
                      </span>
                    </div>
                  </div>

                  {/* Section 3: Technical Metadata */}
                  <div className="detail-section glass-effect full-width">
                    <h3 className="section-subtitle">Technical Metadata</h3>
                    <div className="metadata-flex">
                      <div className="metadata-item">
                        <span className="detail-label">Origin System</span>
                        <span className={`source-badge ${selectedEvent.SOURCE?.toLowerCase()}`}>
                          {selectedEvent.SOURCE}
                        </span>
                      </div>
                      <div className="metadata-item">
                        <span className="detail-label">Operation ID</span>
                        <span className={`op-badge ${selectedEvent.OPERATION?.toLowerCase()}`}>
                          {selectedEvent.OPERATION}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="event-raw-data-premium animate-fade-in">
                  <div className="json-header">
                    <span>System Record Dump</span>
                    <button className="copy-btn" onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2))}>Copy JSON</button>
                  </div>
                  <div className="raw-json-container-premium">
                    <pre>{JSON.stringify(selectedEvent, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            <footer className="modal-footer premium-footer">
              <div className="footer-left">
                <button className="action-btn-pwc modify" onClick={() => {
                  if (selectedEvent.SOURCE === 'Externel_System' && selectedEvent.OPERATION === 'DELETE') {
                    alert("Cette carte a déjà été supprimée par le système externe. Vous n'êtes pas autorisé à effectuer des actions sur elle.");
                    return;
                  }
                  // Find the latest state of this card in the event history
                  const latestCardState = events.find(e => e.ID_CARD === selectedEvent.ID_CARD) || selectedEvent;
                  setIsEventModalOpen(false);
                  handleEditCard(latestCardState, selectedEvent.ID_EVENT);
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  Modify Card
                </button>
                <button className="action-btn-pwc delete" onClick={() => {
                  if (selectedEvent.SOURCE === 'Externel_System' && selectedEvent.OPERATION === 'DELETE') {
                    alert("Cette carte a déjà été supprimée par le système externe. Vous n'êtes pas autorisé à effectuer des actions sur elle.");
                    return;
                  }
                  // Find the latest state of this card in the event history
                  const latestCardState = events.find(e => e.ID_CARD === selectedEvent.ID_CARD) || selectedEvent;
                  setIsEventModalOpen(false);
                  handleDeleteCard(latestCardState);
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  Delete Card
                </button>
              </div>
              <div className="footer-right">
                <button className="secondary-btn" onClick={() => setIsEventModalOpen(false)}>Close</button>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Modal View Transaction Details */}
      {isTrxModalOpen && selectedTrx && (
        <div className="modal-overlay" onClick={() => setIsTrxModalOpen(false)}>
          <div className="modal-content event-details-modal premium-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header event-modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div className="modal-title-group">
                <div className="event-badge-wrapper">
                  <span className={`op-badge ${(selectedTrx.operation || 'Virement').toLowerCase()}`}>
                    {selectedTrx.operation || 'Virement'}
                  </span>
                  <span className="event-id-label" style={{ marginLeft: '10px' }}>Transaction Receipt</span>
                </div>
                <h2 style={{ marginTop: '0.5rem', fontFamily: "'Outfit', sans-serif", fontWeight: 800 }}>
                  {selectedTrx.operation === 'Paiement' ? 'Payment Details' : 'Transfer Details'}
                </h2>
              </div>
              <button className="close-modal" onClick={() => setIsTrxModalOpen(false)}>✕</button>
            </header>

            <div className="modal-body" style={{ padding: '2rem 1.5rem' }}>
              {/* Prominent Amount Display */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', fontWeight: 600 }}>
                  {selectedTrx.operation === 'Paiement' ? 'Amount Paid' : 'Amount Transferred'}
                </span>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#ef4444', margin: '0.5rem 0', fontFamily: "'Outfit', sans-serif" }}>
                  - {parseFloat(selectedTrx.transfer_amount || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </h1>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {selectedTrx.timestamp ? new Date(selectedTrx.timestamp).toLocaleString('fr-FR') : 'N/A'}
                </div>
              </div>

              {/* Two-Column Sender & Recipient Comparison */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
                
                {/* Sender Card */}
                <div className="detail-section glass-effect" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <h3 className="section-subtitle" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#4f46e5', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#4f46e5' }}></span>
                    Sender (Debited)
                  </h3>
                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.85rem' }}>Client Name</span>
                    <span className="detail-value" style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{selectedTrx.sender_name || 'N/A'}</span>
                  </div>
                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.85rem' }}>Card ID</span>
                    <span className="detail-value mono" style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{selectedTrx.sender_card_id || 'N/A'}</span>
                  </div>
                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.85rem' }}>PAN Number</span>
                    <span className="detail-value mono" style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{maskPAN(selectedTrx.sender_pan)}</span>
                  </div>
                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.85rem' }}>New Balance</span>
                    <span className="detail-value" style={{ fontWeight: 600, color: '#10b981', fontSize: '0.85rem' }}>{parseFloat(selectedTrx.sender_new_balance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                  </div>
                </div>

                {/* Recipient Card */}
                <div className="detail-section glass-effect" style={{ padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <h3 className="section-subtitle" style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#10b981', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                    {selectedTrx.operation === 'Paiement' ? 'Merchant / POS Terminal' : 'Recipient (Credited)'}
                  </h3>
                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.85rem' }}>Client Name</span>
                    <span className="detail-value" style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{selectedTrx.recipient_name || 'N/A'}</span>
                  </div>
                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.85rem' }}>Card ID</span>
                    <span className="detail-value mono" style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{selectedTrx.recipient_card_id || 'N/A'}</span>
                  </div>
                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.85rem' }}>PAN Number</span>
                    <span className="detail-value mono" style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{maskPAN(selectedTrx.recipient_pan)}</span>
                  </div>
                  <div className="detail-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0' }}>
                    <span className="detail-label" style={{ color: '#64748b', fontSize: '0.85rem' }}>New Balance</span>
                    <span className="detail-value" style={{ fontWeight: 600, color: '#10b981', fontSize: '0.85rem' }}>{parseFloat(selectedTrx.recipient_new_balance || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
                  </div>
                </div>

              </div>

              {/* Technical / Metadata Row */}
              <div style={{ marginTop: '2rem', padding: '1rem 1.5rem', background: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Recipient Source</span>
                  <span className={`source-badge ${String(selectedTrx.recipient_source || '').toLowerCase()}`} style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {selectedTrx.recipient_source || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Sender Source</span>
                  <span className="source-badge mobile_app" style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {selectedTrx.sender_source || 'Mobile_App'}
                  </span>
                </div>
              </div>
            </div>

            <footer className="modal-footer premium-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '1.2rem 2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="primary-btn" onClick={() => setIsTrxModalOpen(false)} style={{ padding: '0.6rem 2rem', borderRadius: '8px' }}>Close</button>
            </footer>
          </div>
        </div>
      )}
    </div>

  )
}

export default PWCDashboard









// import React from 'react'
// import './PWC-Dashboard.css'

// function PWCDashboard() {
//   const [isLoggedIn, setIsLoggedIn] = React.useState(false)
//   const [sidebarOpen, setSidebarOpen] = React.useState(true)
//   const [activeTab, setActiveTab] = React.useState('dashboard')
//   const [username, setUsername] = React.useState('')
//   const [password, setPassword] = React.useState('')
//   const [error, setError] = React.useState('')

//   // État pour le formulaire "Create Card"
//   const [formData, setFormData] = React.useState({
//     id_Card: '',
//     PAN: '',
//     F_Name: '',
//     L_Name: '',
//     Amount: '',
//     POS_limit: '9000.00',
//     ATM_limit: '5000.00',
//     Status: 'Active',
//     Source: 'PWC_System',
//     Operation: 'Create'
//   })

//   // État pour les données du tableau
//   const [cards, setCards] = React.useState<any[]>([])
//   const [loading, setLoading] = React.useState(false)
//   const [activeFilter, setActiveFilter] = React.useState('all')
//   const [searchTerm, setSearchTerm] = React.useState('')
//   const [isViewModalOpen, setIsViewModalOpen] = React.useState(false)
//   const [viewingCard, setViewingCard] = React.useState<any>(null)
//   const [modalViewMode, setModalViewMode] = React.useState<'table' | 'json'>('table')

//   // État pour Checking Events
//   const [events, setEvents] = React.useState<any[]>([])
//   const [loadingEvents, setLoadingEvents] = React.useState(false)
//   const [activeEventFilter, setActiveEventFilter] = React.useState('all')
//   const [activeSourceFilter, setActiveSourceFilter] = React.useState('all')
//   const [showSettingsPassword, setShowSettingsPassword] = React.useState(false)
//   const [settingsSubTab, setSettingsSubTab] = React.useState<'profile' | 'theme' | 'monitoring'>('profile')
//   const [eventSearchTerm, setEventSearchTerm] = React.useState('')
//   const [selectedEvent, setSelectedEvent] = React.useState<any>(null)
//   const [isEventModalOpen, setIsEventModalOpen] = React.useState(false)
//   const [eventModalTab, setEventModalTab] = React.useState<'overview' | 'json'>('overview')

//   // État pour le formulaire d'édition
//   const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
//   const [editFormData, setEditFormData] = React.useState({
//     id_Card: '',
//     PAN: '',
//     F_Name: '',
//     L_Name: '',
//     Amount: '',
//     POS_limit: '',
//     ATM_limit: '',
//     Status: '',
//     Source: 'PWC_System',
//     Operation: 'Update',
//     event_id: ''
//   })




//   // Fonction pour générer les IDs auto
//   const generateIDs = () => {
//     const newIdCard = `CRD-${Math.floor(Math.random() * 900000 + 100000)}`
//     const newPAN = `4532-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`
//     setFormData(prev => ({
//       ...prev,
//       id_Card: newIdCard,
//       PAN: newPAN
//     }))
//   }

//   // Générer au chargement ou au changement d'onglet
//   React.useEffect(() => {
//     if (activeTab === 'create') {
//       generateIDs()
//     }
//   }, [activeTab])

//   // Charger les données quand on est sur le dashboard
//   React.useEffect(() => {
//     if (activeTab === 'dashboard' && isLoggedIn) {
//       fetchCards()
//     }
//     if (activeTab === 'events' && isLoggedIn) {
//       fetchEvents()
//     }
//   }, [activeTab, isLoggedIn])

//   const fetchEvents = async () => {
//     setLoadingEvents(true)
//     try {
//       const response = await fetch('http://localhost:5001/api/events')
//       const data = await response.json()
//       if (response.ok) {
//         setEvents(data)
//       }
//     } catch (err) {
//       console.error('Error fetching events:', err)
//     } finally {
//       setLoadingEvents(false)
//     }
//   }

//   const fetchCards = async () => {
//     setLoading(true)
//     try {
//       const response = await fetch('http://localhost:5001/api/cards')
//       const data = await response.json()
//       if (response.ok) {
//         setCards(data)
//       }
//     } catch (err) {
//       console.error('Error fetching cards:', err)
//     } finally {
//       setLoading(false)
//     }
//   }

//   // Calcul des statistiques pour les cartes de filtrage
//   const stats = {
//     all: cards.length,
//     create: cards.filter(c => c.OPERATION?.toLowerCase() === 'create').length,
//     update: cards.filter(c => c.OPERATION?.toLowerCase() === 'update').length,
//     delete: cards.filter(c => c.OPERATION?.toLowerCase() === 'delete').length,
//   }

//   const maskPAN = (pan: string) => {

//     if (!pan) return ''
//     // Le format est 4532-1234-5678-9012
//     // On garde les 8 premiers chiffres (incluant le tiret) et on masque les 8 derniers
//     // Utilisateur demande xxxx xxxx dans les 8 derniers chiffres
//     const parts = pan.split('-')
//     if (parts.length === 4) {
//       return `${parts[0]}-${parts[1]}-xxxx-xxxx`
//     }
//     return pan.substring(0, 9) + 'xxxx-xxxx'
//   }

//   const handleViewCard = (card: any) => {
//     setViewingCard(card)
//     setIsViewModalOpen(true)
//     setModalViewMode('table')
//   }

//   const handleEventClick = (event: any) => {
//     setSelectedEvent(event)
//     setEventModalTab('overview')
//     setIsEventModalOpen(true)
//   }
//   const handleEditCard = (card: any, eventId?: string) => {
//     // Vérifier si n'importe quelle ligne de cette carte est marquée comme DELETE
//     const isDeleted = cards.some(c => c.ID_CARD === card.ID_CARD && c.OPERATION === 'DELETE');
//     if (isDeleted) {
//       alert("Cette carte est marquée pour suppression et ne peut pas être modifiée.");
//       return;
//     }

//     // Vérifier si la carte a déjà été supprimée par le système externe
//     const isExtDeleted = events.some(e => e.ID_CARD === card.ID_CARD && e.SOURCE === 'Externel_System' && e.OPERATION === 'DELETE');
//     if (isExtDeleted) {
//       alert("Cette carte a déjà été supprimée par le système externe. Vous n'êtes pas autorisé à effectuer des actions sur elle.");
//       return;
//     }

//     setEditFormData({
//       id_Card: card.ID_CARD,
//       PAN: card.PAN,
//       F_Name: card.F_NAME,
//       L_Name: card.L_NAME,
//       Amount: card.AMOUNT !== undefined ? card.AMOUNT : card.AMOUNTS, // Handle both card and event objects
//       POS_limit: card.POS_LIMIT,
//       ATM_limit: card.ATM_LIMIT,
//       Status: card.STATUS,
//       Source: card.SOURCE || 'PWC_System',
//       Operation: 'Update',
//       event_id: eventId || ''
//     })
//     setIsEditModalOpen(true)
//   }

//   const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     const { name, value } = e.target
//     setEditFormData({ ...editFormData, [name]: value })
//   }
//   const handleUpdateCard = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (parseFloat(editFormData.POS_limit) > 9000) {
//       alert('❌ Error: POS Limit cannot exceed 9000.00');
//       return;
//     }
//     if (parseFloat(editFormData.ATM_limit) > 5000) {
//       alert('❌ Error: ATM Limit cannot exceed 5000.00');
//       return;
//     }
//     try {
//       const response = await fetch('http://localhost:5001/api/update-card', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(editFormData)
//       })

//       const result = await response.json()

//       if (response.ok) {
//         alert(`✅ Update Success: ${result.message}`)
//         setIsEditModalOpen(false)
//         fetchCards() // Rafraîchir la liste
//       } else {
//         alert(`❌ Error: ${result.message}`)
//       }
//     } catch (err) {
//       console.error('API Error:', err)
//       alert('❌ Fatal Error: Could not connect to the Backend API.')
//     }
//   }



//   const handleDeleteCard = async (card: any) => {
//     // Vérifier si n'importe quelle ligne de cette carte est déjà marquée comme DELETE
//     const isAlreadyDeleted = cards.some(c => c.ID_CARD === card.ID_CARD && c.OPERATION === 'DELETE');

//     if (isAlreadyDeleted) {
//       alert(`Information: The card ${card.ID_CARD} is already marked as DELETED in the system history.`);
//       return;
//     }

//     // Vérifier si la carte a déjà été supprimée par le système externe
//     const isExtDeleted = events.some(e => e.ID_CARD === card.ID_CARD && e.SOURCE === 'Externel_System' && e.OPERATION === 'DELETE');
//     if (isExtDeleted) {
//       alert("Cette carte a déjà été supprimée par le système externe. Vous n'êtes pas autorisé à effectuer des actions sur elle.");
//       return;
//     }
//     const confirmDelete = window.confirm(`Are you sure you want to delete the card ${card.ID_CARD} (${card.F_NAME} ${card.L_NAME})? This action will block the card and log it as DELETED.`);

//     if (confirmDelete) {
//       try {
//         const response = await fetch('http://localhost:5001/api/delete-card', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             id_Card: card.ID_CARD,
//             PAN: card.PAN,
//             F_Name: card.F_NAME,
//             L_Name: card.L_NAME,
//             Amount: card.AMOUNT !== undefined ? card.AMOUNT : card.AMOUNTS,
//             POS_limit: card.POS_LIMIT,
//             ATM_limit: card.ATM_LIMIT,
//             Source: card.SOURCE || 'PWC_System'
//           })
//         })

//         const result = await response.json()

//         if (response.ok) {
//           alert(`✅ Delete Success: ${result.message}`)
//           fetchCards() // Rafraîchir la liste
//         } else {
//           alert(`❌ Error: ${result.message}`)
//         }
//       } catch (err) {
//         console.error('API Error:', err)
//         alert('❌ Fatal Error: Could not connect to the Backend API.')
//       }
//     }
//   }

//   const handleLogin = (e: React.FormEvent) => {
//     e.preventDefault()
//     if (username === 'admin' && password === 'admin.123') {
//       setIsLoggedIn(true)
//       setError('')
//     } else {
//       setError('Invalid credentials. Please try again.')
//     }
//   }

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     const { name, value } = e.target
//     setFormData({ ...formData, [name]: value })
//   }

//   const handleSubmitCard = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (parseFloat(formData.POS_limit) > 9000) {
//       alert('❌ Error: POS Limit cannot exceed 9000.00');
//       return;
//     }
//     if (parseFloat(formData.ATM_limit) > 5000) {
//       return;
//     }

//     try {
//       const response = await fetch('http://localhost:5001/api/create-card', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(formData)
//       })

//       const result = await response.json()

//       if (response.ok) {
//         alert(`✅ Success: ${result.message}`)
//         generateIDs() // Regénérer pour la suivante
//         setFormData(prev => ({
//           ...prev,
//           F_Name: '', L_Name: '', Amount: '',
//           POS_limit: '', ATM_limit: ''
//         }))
//       } else {
//         alert(`❌ Error: ${result.message}`)
//       }
//     } catch (err) {
//       console.error('API Error:', err)
//       alert('❌ Fatal Error: Could not connect to the Backend API.')
//     }
//   }

//   if (!isLoggedIn) {
//     return (
//       <div className="login-container">
//         <div className="login-card">
//           <img src="/HPS_logo.jpg" alt="HPS Logo" className="login-logo" />
//           <h2>Authentication</h2>
//           <p className="login-desc">Access the PowerCard System</p>

//           <form onSubmit={handleLogin}>
//             <div className="input-group">
//               <label>Username</label>
//               <input
//                 type="text"
//                 value={username}
//                 onChange={(e) => setUsername(e.target.value)}
//                 placeholder="Enter your username"
//                 required
//               />
//             </div>

//             <div className="input-group">
//               <label>Password</label>
//               <input
//                 type="password"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 placeholder="••••••••"
//                 required
//               />
//             </div>

//             {error && <p className="error-message">{error}</p>}

//             <button type="submit" className="login-btn">
//               Login
//             </button>
//           </form>

//           <div className="login-footer">
//             <p>© 2026 PowerCard System. All rights reserved.</p>
//           </div>
//         </div>
//       </div>
//     )
//   }

//   return (
//     <div className="app-layout">
//       {/* Sidebar Toggle Button */}
//       <button
//         className={`sidebar-toggle ${sidebarOpen ? 'active' : ''}`}
//         onClick={() => setSidebarOpen(!sidebarOpen)}
//       >
//         {sidebarOpen ? '✕' : '☰'}
//       </button>

//       {/* Sidebar */}
//       <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
//         <div className="sidebar-header">
//           <img src="/HPS_logo.jpg" alt="HPS Logo" className="sidebar-logo" />
//         </div>

//         <nav className="sidebar-nav">
//           <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
//             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
//             <span>Dashboard</span>
//           </div>

//           <div className={`nav-item ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
//             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
//             <span>Create Card</span>
//           </div>

//           <div className={`nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
//             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
//             <span>Checking Events</span>
//           </div>

//           <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
//             <div className="nav-item-content">
//               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
//               <span>Settings</span>
//             </div>
//             <svg
//               className={`chevron-icon ${activeTab === 'settings' ? 'rotated' : ''}`}
//               width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
//             >
//               <polyline points="9 18 15 12 9 6"></polyline>
//             </svg>
//           </div>

//           {activeTab === 'settings' && (
//             <div className="sub-menu">
//               <div 
//                 className={`sub-nav-item ${settingsSubTab === 'profile' ? 'active' : ''}`} 
//                 onClick={() => setSettingsSubTab('profile')}
//               >
//                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
//                 <span>Profile</span>
//               </div>
//               <div 
//                 className={`sub-nav-item ${settingsSubTab === 'theme' ? 'active' : ''}`} 
//                 onClick={() => setSettingsSubTab('theme')}
//               >
//                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
//                 <span>Theme</span>
//               </div>
//               <div 
//                 className={`sub-nav-item ${settingsSubTab === 'monitoring' ? 'active' : ''}`} 
//                 onClick={() => setSettingsSubTab('monitoring')}
//               >
//                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
//                 <span>Monitoring</span>
//               </div>
//             </div>
//           )}
//         </nav>

//         <div className="sidebar-footer">
//           <div className="nav-item logout-btn" onClick={() => setIsLoggedIn(false)}>
//             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
//             <span>Logout</span>
//           </div>
//         </div>
//       </aside>

//       {/* Main Content */}
//       <main className={`main-content ${sidebarOpen ? '' : 'expanded'}`}>
//         {activeTab === 'dashboard' && (
//           <div className="dashboard-content">
//             <header className="dashboard-header">
//               <div className="header-left">
//                 <div className="title-stack">
//                   <h1 className="system-title">powercard-System</h1>
//                   <p className="system-subtitle">PowerCard Management System</p>
//                 </div>
//               </div>

//               <div className="header-right">
//                 <div className="search-wrapper">
//                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
//                     <circle cx="11" cy="11" r="8"></circle>
//                     <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
//                   </svg>
//                   <input
//                     type="text"
//                     placeholder="Search by ID or PAN..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="search-bar"
//                   />
//                 </div>
//                 <div className="header-actions">
//                   <button className="primary-btn" onClick={fetchCards}>
//                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
//                       <path d="M21 2v6h-6"></path>
//                       <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
//                       <path d="M3 22v-6h6"></path>
//                       <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
//                     </svg>
//                     Refresh
//                   </button>
//                 </div>
//               </div>
//             </header>


//             <div className="stats-grid">
//               <div
//                 className={`stat-card all ${activeFilter === 'all' ? 'active' : ''}`}
//                 onClick={() => setActiveFilter('all')}
//               >
//                 <div className="stat-icon">
//                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//                     <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
//                     <line x1="8" y1="9" x2="16" y2="9"></line>
//                     <line x1="8" y1="13" x2="16" y2="13"></line>
//                     <line x1="8" y1="17" x2="16" y2="17"></line>
//                   </svg>
//                 </div>
//                 <div className="stat-info">
//                   <span className="stat-label">Total Cards</span>
//                   <span className="stat-value">{stats.all}</span>
//                 </div>
//               </div>

//               <div
//                 className={`stat-card create ${activeFilter === 'create' ? 'active' : ''}`}
//                 onClick={() => setActiveFilter('create')}
//               >
//                 <div className="stat-icon">
//                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//                     <line x1="12" y1="5" x2="12" y2="19"></line>
//                     <line x1="5" y1="12" x2="19" y2="12"></line>
//                   </svg>
//                 </div>
//                 <div className="stat-info">
//                   <span className="stat-label">Create Op</span>
//                   <span className="stat-value">{stats.create}</span>
//                 </div>
//               </div>

//               <div
//                 className={`stat-card update ${activeFilter === 'update' ? 'active' : ''}`}
//                 onClick={() => setActiveFilter('update')}
//               >
//                 <div className="stat-icon">
//                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//                     <polyline points="23 4 23 10 17 10"></polyline>
//                     <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
//                   </svg>
//                 </div>
//                 <div className="stat-info">
//                   <span className="stat-label">Update Op</span>
//                   <span className="stat-value">{stats.update}</span>
//                 </div>
//               </div>

//               <div
//                 className={`stat-card delete ${activeFilter === 'delete' ? 'active' : ''}`}
//                 onClick={() => setActiveFilter('delete')}
//               >
//                 <div className="stat-icon">
//                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//                     <polyline points="3 6 5 6 21 6"></polyline>
//                     <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
//                   </svg>
//                 </div>
//                 <div className="stat-info">
//                   <span className="stat-label">Delete Op</span>
//                   <span className="stat-value">{stats.delete}</span>
//                 </div>
//               </div>
//             </div>


//             <div className="table-section">
//               <div className="table-header-row">
//                 <h3>Card Management Data</h3>
//                 <span className="results-count">Showing {cards.filter(c => activeFilter === 'all' || c.OPERATION?.toLowerCase() === activeFilter).length} results</span>
//               </div>
//               <div className="table-container">

//                 {loading ? (
//                   <div className="loader-container">
//                     <div className="loader"></div>
//                     <p>Loading System Data...</p>
//                   </div>
//                 ) : (
//                   <table className="pwc-table">
//                     <thead>
//                       <tr>
//                         <th>Card ID</th>
//                         <th>PAN Number</th>
//                         <th>Full Name</th>
//                         <th>Operation</th>

//                         <th>Amounts</th>
//                         <th>Status</th>
//                         <th>Action</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {(() => {
//                         // Logic de filtrage combinée (Status + Recherche)
//                         const filteredCards = cards.filter(card => {
//                           // Filtrage par Onglet (Status)
//                           const matchesTab = activeFilter === 'all' || card.OPERATION?.toLowerCase() === activeFilter;

//                           // Filtrage par Recherche (ID ou PAN)
//                           const matchesSearch =
//                             card.ID_CARD?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//                             card.PAN?.toLowerCase().includes(searchTerm.toLowerCase());

//                           return matchesTab && matchesSearch;
//                         });

//                         return filteredCards.length > 0 ? (
//                           filteredCards.map((card, index) => (

//                             <tr key={index}>
//                               <td className="id-cell">{card.ID_CARD}</td>
//                               <td className="pan-cell">{maskPAN(card.PAN)}</td>
//                               <td className="name-cell">{card.F_NAME} {card.L_NAME}</td>
//                               <td>

//                                 <span className={`op-badge ${card.OPERATION?.toLowerCase()}`}>
//                                   {card.OPERATION}
//                                 </span>
//                               </td>
//                               <td className="amount-cell">{parseFloat(card.AMOUNT).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
//                               <td>
//                                 <span className={`status-badge ${card.STATUS?.toLowerCase()}`}>
//                                   {card.STATUS}
//                                 </span>
//                               </td>
//                               <td className="actions-cell">
//                                 <button className="action-icon view" title="View" onClick={() => handleViewCard(card)}>
//                                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

//                                     <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
//                                     <circle cx="12" cy="12" r="3"></circle>
//                                   </svg>
//                                 </button>
//                                 <button className="action-icon edit" title="Edit" onClick={() => handleEditCard(card)}>
//                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                                     <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
//                                     <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
//                                   </svg>
//                                 </button>
//                                 <button className="action-icon delete" title="Delete" onClick={() => handleDeleteCard(card)}>
//                                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                                     <polyline points="3 6 5 6 21 6"></polyline>
//                                     <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
//                                     <line x1="10" y1="11" x2="10" y2="17"></line>
//                                     <line x1="14" y1="11" x2="14" y2="17"></line>
//                                   </svg>
//                                 </button>
//                               </td>

//                             </tr>
//                           ))
//                         ) : (
//                           <tr>
//                             <td colSpan={6} className="no-data">No card records found.</td>
//                           </tr>
//                         )
//                       })()}
//                     </tbody>
//                   </table>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}





//         {activeTab === 'create' && (
//           <div className="form-card">
//             <div className="form-header">
//               <h2>New Card Provisioning</h2>
//             </div>

//             <form onSubmit={handleSubmitCard} className="card-form">
//               <div className="form-columns-container">
//                 {/* Colonne GAUCHE - Identification */}
//                 <div className="form-col col-id">
//                   <h3 className="col-title">Identification</h3>
//                   <div className="input-group readonly">
//                     <label>Card ID (System Generated)</label>
//                     <input name="id_Card" value={formData.id_Card} disabled className="locked-input fade-input" />
//                   </div>
//                   <div className="input-group readonly">
//                     <label>PAN Number (Securely Generated)</label>
//                     <input name="PAN" value={formData.PAN} disabled className="locked-input fade-input" />
//                   </div>
//                 </div>

//                 {/* Colonne MILIEU - Client Details */}
//                 <div className="form-col col-client">
//                   <h3 className="col-title">Client Details</h3>
//                   <div className="input-group">
//                     <label>First Name</label>
//                     <input name="F_Name" value={formData.F_Name} onChange={handleInputChange} placeholder="John" required />
//                   </div>
//                   <div className="input-group">
//                     <label>Last Name</label>
//                     <input name="L_Name" value={formData.L_Name} onChange={handleInputChange} placeholder="Doe" required />
//                   </div>
//                   <div className="input-group">
//                     <label>Initial Balance (€)</label>
//                     <input type="number" name="Amount" value={formData.Amount} onChange={handleInputChange} placeholder="0.00" />
//                   </div>
//                 </div>

//                 {/* Colonne DROITE - Limits */}
//                 <div className="form-col col-limits">
//                   <h3 className="col-title">Transaction Limits</h3>
//                   <div className="input-group">
//                     <label>Daily POS Limit (Max 9000)</label>
//                     <input type="number" name="POS_limit" value={formData.POS_limit} onChange={handleInputChange} max="9000" />
//                   </div>
//                   <div className="input-group">
//                     <label>Daily ATM Limit (Max 5000)</label>
//                     <input type="number" name="ATM_limit" value={formData.ATM_limit} onChange={handleInputChange} max="5000" />
//                   </div>
//                 </div>
//               </div>

//               <div className="form-actions">
//                 <button type="submit" className="submit-btn">Register New Card</button>
//               </div>
//             </form>
//           </div>
//         )}

//         {activeTab === 'events' && (
//           <div className="dashboard-content">
//             <header className="dashboard-header">
//               <div className="title-stack">
//                 <h1 className="system-title">checking-Events</h1>
//                 <p className="system-subtitle">System Audit Log & Event Tracking</p>
//               </div>
//               <div className="header-right">
//                 <div className="search-wrapper">
//                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
//                     <circle cx="11" cy="11" r="8"></circle>
//                     <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
//                   </svg>
//                   <input 
//                     type="text" 
//                     placeholder="Search by Card ID or Client..." 
//                     value={eventSearchTerm}
//                     onChange={(e) => setEventSearchTerm(e.target.value)}
//                     className="search-bar"
//                   />
//                 </div>
//                 <button className="primary-btn" onClick={fetchEvents}>
//                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
//                     <path d="M21 2v6h-6"></path>
//                     <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
//                     <path d="M3 22v-6h6"></path>
//                     <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
//                   </svg>
//                   Refresh Audit
//                 </button>
//               </div>
//             </header>

//             <div className="events-dashboard-layout">
//               {/* Graphique Circulaire à Gauche (Remplace les filtres Opérations) */}
//               <div className="events-chart-container glass-card">
//                 <h3>Operations Overview</h3>
//                 <div className="chart-wrapper">
//                   <svg viewBox="0 0 36 36" className="circular-chart">
//                     {/* Background Circle */}
//                     <path className="circle-bg"
//                       d="M18 2.0845
//                         a 15.9155 15.9155 0 0 1 0 31.831
//                         a 15.9155 15.9155 0 0 1 0 -31.831"
//                     />
//                     {/* Delete Slice (Red) */}
//                     <path className="circle-delete"
//                       strokeDasharray={`${(events.filter(e => e.OPERATION?.toLowerCase().includes('delete')).length / (events.length || 1)) * 100} 100`}
//                       strokeDashoffset={0}
//                       d="M18 2.0845
//                         a 15.9155 15.9155 0 0 1 0 31.831
//                         a 15.9155 15.9155 0 0 1 0 -31.831"
//                     />
//                     {/* Update Slice (Orange) */}
//                     <path className="circle-update"
//                       strokeDasharray={`${(events.filter(e => e.OPERATION?.toLowerCase().includes('update')).length / (events.length || 1)) * 100} 100`}
//                       strokeDashoffset={-((events.filter(e => e.OPERATION?.toLowerCase().includes('delete')).length / (events.length || 1)) * 100)}
//                       d="M18 2.0845
//                         a 15.9155 15.9155 0 0 1 0 31.831
//                         a 15.9155 15.9155 0 0 1 0 -31.831"
//                     />
//                     {/* Create Slice (Green) */}
//                     <path className="circle-create"
//                       strokeDasharray={`${(events.filter(e => e.OPERATION?.toLowerCase() === 'create').length / (events.length || 1)) * 100} 100`}
//                       strokeDashoffset={-((events.filter(e => e.OPERATION?.toLowerCase().includes('delete')).length / (events.length || 1)) * 100) - ((events.filter(e => e.OPERATION?.toLowerCase().includes('update')).length / (events.length || 1)) * 100)}
//                       d="M18 2.0845
//                         a 15.9155 15.9155 0 0 1 0 31.831
//                         a 15.9155 15.9155 0 0 1 0 -31.831"
//                     />
//                     <text x="18" y="20.35" className="chart-total">{events.length}</text>
//                   </svg>
                  
//                   <div className="chart-legend">
//                     <div className={`legend-item ${activeEventFilter === 'all' && activeSourceFilter === 'all' ? 'active' : ''}`} onClick={() => { setActiveEventFilter('all'); setActiveSourceFilter('all'); }}>
//                       <span className="legend-color legend-all"></span> All ({events.length})
//                     </div>
//                     <div className={`legend-item ${activeEventFilter === 'create' ? 'active' : ''}`} onClick={() => setActiveEventFilter('create')}>
//                       <span className="legend-color legend-create"></span> Create ({events.filter(e => e.OPERATION?.toLowerCase() === 'create').length})
//                     </div>
//                     <div className={`legend-item ${activeEventFilter === 'update' ? 'active' : ''}`} onClick={() => setActiveEventFilter('update')}>
//                       <span className="legend-color legend-update"></span> Update ({events.filter(e => e.OPERATION?.toLowerCase().includes('update')).length})
//                     </div>
//                     <div className={`legend-item ${activeEventFilter === 'delete' ? 'active' : ''}`} onClick={() => setActiveEventFilter('delete')}>
//                       <span className="legend-color legend-delete"></span> Delete ({events.filter(e => e.OPERATION?.toLowerCase().includes('delete')).length})
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Filtres de Sources à Droite */}
//               <div className="source-filters-container">
//                 <div className={`stat-card source-pwc ${activeSourceFilter === 'PWC_System' ? 'active' : ''}`} onClick={() => setActiveSourceFilter(activeSourceFilter === 'PWC_System' ? 'all' : 'PWC_System')}>
//                   <div className="stat-icon">
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//                       <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
//                       <rect x="9" y="9" width="6" height="6"></rect>
//                       <line x1="9" y1="1" x2="9" y2="4"></line>
//                       <line x1="15" y1="1" x2="15" y2="4"></line>
//                       <line x1="9" y1="20" x2="9" y2="23"></line>
//                       <line x1="15" y1="20" x2="15" y2="23"></line>
//                       <line x1="20" y1="9" x2="23" y2="9"></line>
//                       <line x1="20" y1="14" x2="23" y2="14"></line>
//                       <line x1="1" y1="9" x2="4" y2="9"></line>
//                       <line x1="1" y1="14" x2="4" y2="14"></line>
//                     </svg>
//                   </div>
//                   <div className="stat-info">
//                     <span className="stat-label">PWC System</span>
//                     <span className="stat-value">{events.filter(e => e.SOURCE === 'PWC_System').length}</span>
//                   </div>
//                 </div>

//                 <div className={`stat-card source-ext ${activeSourceFilter === 'Externel_System' ? 'active' : ''}`} onClick={() => setActiveSourceFilter(activeSourceFilter === 'Externel_System' ? 'all' : 'Externel_System')}>
//                   <div className="stat-icon">
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
//                       <circle cx="12" cy="12" r="10"></circle>
//                       <line x1="2" y1="12" x2="22" y2="12"></line>
//                       <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
//                     </svg>
//                   </div>
//                   <div className="stat-info">
//                     <span className="stat-label">External System</span>
//                     <span className="stat-value">{events.filter(e => e.SOURCE === 'Externel_System').length}</span>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             <div className="table-section">
//               <div className="table-header-row">
//                 <h3>System Transaction Audit</h3>
//                 <span className="results-count">Total Records: {events.length}</span>
//               </div>
//               <div className="table-container">
//                 {loadingEvents ? (
//                   <div className="loader-container">
//                     <div className="loader"></div>
//                     <p>Fetching Audit Data...</p>
//                   </div>
//                 ) : (
//                   <table className="pwc-table">
//                     <thead>
//                       <tr>
//                         <th>Event ID</th>
//                         <th>Card ID</th>
//                         <th>Client</th>
//                         <th>Operation</th>
//                         <th>Source</th>
//                         <th>Status</th>
//                         <th>Timestamp</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {(() => {
//                         const filteredEvents = events.filter(e => {
//                           const matchesFilter = activeEventFilter === 'all' || e.OPERATION?.toLowerCase().includes(activeEventFilter);
//                           const matchesSource = activeSourceFilter === 'all' || e.SOURCE === activeSourceFilter;
//                           const matchesSearch = e.ID_CARD?.toLowerCase().includes(eventSearchTerm.toLowerCase()) || 
//                                               e.F_NAME?.toLowerCase().includes(eventSearchTerm.toLowerCase()) ||
//                                               e.L_NAME?.toLowerCase().includes(eventSearchTerm.toLowerCase());
//                           return matchesFilter && matchesSource && matchesSearch;
//                         });
                          
//                           return filteredEvents.length > 0 ? (
//                             filteredEvents.map((event, idx) => (
//                               <tr key={idx} onClick={() => handleEventClick(event)} className="clickable-row">
//                               <td className="id-cell">#{event.ID_EVENT}</td>
//                               <td className="pan-cell">{event.ID_CARD}</td>
//                               <td className="name-cell">{event.F_NAME} {event.L_NAME}</td>
//                               <td>
//                                 <span className={`op-badge ${event.OPERATION?.toLowerCase()}`}>
//                                   {event.OPERATION}
//                                 </span>
//                               </td>
//                               <td>
//                                 <span className={`source-badge ${event.SOURCE?.toLowerCase()}`}>
//                                   {event.SOURCE}
//                                 </span>
//                               </td>
//                               <td>
//                                 <span className={`status-badge ${event.STATUS?.toLowerCase()}`}>
//                                   {event.STATUS}
//                                 </span>
//                               </td>
//                               <td className="date-cell">
//                                 {new Date(event.TIMETMP).toLocaleString('fr-FR')}
//                               </td>
//                             </tr>
//                           ))
//                         ) : (
//                           <tr>
//                             <td colSpan={7} className="no-data">No events found for this filter.</td>
//                           </tr>
//                         );
//                       })()}
//                     </tbody>
//                   </table>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//         {activeTab === 'settings' && (
//           <div className="dashboard-content">
//             <header className="dashboard-header">
//               <div className="title-stack">
//                 <h1 className="system-title">
//                   {settingsSubTab === 'profile' && 'admin-Profile'}
//                   {settingsSubTab === 'theme' && 'ui-Customization'}
//                   {settingsSubTab === 'monitoring' && 'system-Monitoring'}
//                 </h1>
//                 <p className="system-subtitle">
//                   {settingsSubTab === 'profile' && 'Manage your administrative identity and security'}
//                   {settingsSubTab === 'theme' && 'Personalize the dashboard appearance and behavior'}
//                   {settingsSubTab === 'monitoring' && 'Track system health, performance and database metrics'}
//                 </p>
//               </div>
//             </header>

//             {/* Profile Sub-Tab */}
//             {settingsSubTab === 'profile' && (
//               <div className="settings-container animate-fade-in">
//                 <div className="glass-card settings-card profile-card">
//                   <div className="card-header">
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
//                     <h3>Administrator Identity</h3>
//                   </div>
//                   <div className="settings-body">
//                     <div className="profile-top">
//                       <div className="avatar-placeholder">AD</div>
//                       <div className="profile-info">
//                         <h4>System Administrator</h4>
//                         <p>Role: Super-User • Level 5 Access</p>
//                       </div>
//                     </div>
//                     <div className="setting-item">
//                       <label>Username</label>
//                       <input type="text" value="admin" disabled className="locked-input" />
//                     </div>
//                     <div className="password-update-form">
//                       <div className="setting-item password-field-group">
//                         <label>Current Password</label>
//                         <div className="password-input-wrapper">
//                           <input 
//                             type={showSettingsPassword ? "text" : "password"} 
//                             placeholder="Current Password" 
//                             className="password-input"
//                           />
//                           <button type="button" className="eye-toggle" onClick={() => setShowSettingsPassword(!showSettingsPassword)}>
//                             {showSettingsPassword ? (
//                               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
//                             ) : (
//                               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
//                             )}
//                           </button>
//                         </div>
//                       </div>
//                     </div>
//                     <button className="primary-btn">Update Security Profile</button>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Theme Sub-Tab */}
//             {settingsSubTab === 'theme' && (
//               <div className="settings-container animate-fade-in">
//                 <div className="glass-card settings-card">
//                   <div className="card-header">
//                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>
//                     <h3>Visual Customization</h3>
//                   </div>
//                   <div className="settings-body">
//                     <div className="theme-selector">
//                       <p>Select Primary Dashboard Theme</p>
//                       <div className="theme-options">
//                         <div className="theme-box dark active" title="Dark Mode"></div>
//                         <div className="theme-box light" title="Light Mode"></div>
//                         <div className="theme-box violet" title="Cyber Violet"></div>
//                       </div>
//                     </div>
//                     <div className="toggle-item">
//                       <span>Enable Glassmorphism Effects</span>
//                       <input type="checkbox" defaultChecked />
//                     </div>
//                     <div className="toggle-item">
//                       <span>Compact Table View</span>
//                       <input type="checkbox" />
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Monitoring Sub-Tab */}
//             {settingsSubTab === 'monitoring' && (
//               <div className="settings-container animate-fade-in">
//                 <div className="monitoring-layout">
//                   <div className="glass-card settings-card">
//                     <div className="card-header">
//                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
//                       <h3>System Health</h3>
//                     </div>
//                     <div className="settings-body">
//                       <div className="health-stat">
//                         <span>Database Connection (Oracle)</span>
//                         <span className="status-badge active">CONNECTED</span>
//                       </div>
//                       <div className="health-stat">
//                         <span>Kafka Broker Status</span>
//                         <span className="status-badge active">STABLE</span>
//                       </div>
//                       <div className="health-stat">
//                         <span>API Server Latency</span>
//                         <span className="status-badge active">12ms</span>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="glass-card settings-card">
//                     <div className="card-header">
//                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
//                       <h3>Audit Retention</h3>
//                     </div>
//                     <div className="settings-body">
//                       <div className="toggle-item audit-retention">
//                         <div className="item-info">
//                           <span>Data Retention Period</span>
//                         </div>
//                         <select className="premium-select" defaultValue="30">
//                           <option value="30">30 Days</option>
//                           <option value="90">90 Days</option>
//                           <option value="365">1 Year</option>
//                         </select>
//                       </div>
//                       <button className="secondary-btn">Purge Old Records</button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
//       </main>

//       {/* Modal View Card */}
//       {isViewModalOpen && viewingCard && (
//         <div className="modal-overlay" onClick={() => setIsViewModalOpen(false)}>
//           <div className="modal-content" onClick={(e) => e.stopPropagation()}>
//             <header className="modal-header">
//               <div className="modal-title-group">
//                 <h2>Card Details</h2>
//                 <p>{viewingCard.ID_CARD} • {viewingCard.F_NAME} {viewingCard.L_NAME}</p>
//               </div>
//               <button className="close-modal" onClick={() => setIsViewModalOpen(false)}>✕</button>
//             </header>

//             <div className="modal-tabs">
//               <button
//                 className={`modal-tab ${modalViewMode === 'table' ? 'active' : ''}`}
//                 onClick={() => setModalViewMode('table')}
//               >
//                 📋 Table View
//               </button>
//               <button
//                 className={`modal-tab ${modalViewMode === 'json' ? 'active' : ''}`}
//                 onClick={() => setModalViewMode('json')}
//               >
//                 {"{ }"} JSON View
//               </button>

//             </div>

//             <div className="modal-body">
//               {modalViewMode === 'table' ? (
//                 <div className="modal-table-view">
//                   {Object.entries(viewingCard).map(([key, value]: [string, any]) => {
//                     let displayKey = key.replace(/_/g, ' ');
//                     let displayValue = String(value);

//                     // Special formatting for specific keys
//                     if (key === 'TIMESTMP') displayKey = 'DATE';
//                     if (key === 'AMOUNT') displayValue = `${parseFloat(value).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`;

//                     return (
//                       <div className="modal-data-row" key={key}>
//                         <span className="data-key">{displayKey}</span>
//                         <span className="data-value">{displayValue}</span>
//                       </div>
//                     );
//                   })}
//                 </div>
//               ) : (
//                 <div className="modal-json-view">
//                   <pre>{JSON.stringify(viewingCard, null, 2)}</pre>
//                 </div>
//               )}
//             </div>

//             <footer className="modal-footer">
//               <button className="primary-btn" onClick={() => setIsViewModalOpen(false)}>Done</button>
//             </footer>
//           </div>
//         </div>
//       )}

//       {/* Modal Edit Card */}
//       {isEditModalOpen && (
//         <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
//           <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
//             <header className="modal-header">
//               <div className="modal-title-group">
//                 <h2>Edit Card</h2>
//                 <p>Modifying details for {editFormData.id_Card}</p>
//               </div>
//               <button className="close-modal" onClick={() => setIsEditModalOpen(false)}>✕</button>
//             </header>

//             <form onSubmit={handleUpdateCard}>
//               <div className="modal-body">
//                 <div className="form-columns-container">
//                   {/* Colonne GAUCHE - Identification */}
//                   <div className="form-col col-id">
//                     <h3 className="col-title">Identification</h3>
//                     <div className="input-group readonly">
//                       <label>Card ID</label>
//                       <input name="id_Card" value={editFormData.id_Card} disabled className="locked-input" />
//                     </div>
//                     <div className="input-group readonly">
//                       <label>PAN Number</label>
//                       <input name="PAN" value={editFormData.PAN} disabled className="locked-input" />
//                     </div>
//                     {editFormData.event_id && (
//                       <div className="input-group readonly">
//                         <label>Reference Event ID</label>
//                         <input name="event_id" value={editFormData.event_id} disabled className="locked-input" />
//                       </div>
//                     )}
//                   </div>

//                   {/* Colonne MILIEU - Client Details */}
//                   <div className="form-col col-client">
//                     <h3 className="col-title">Client Details</h3>
//                     <div className="input-group">
//                       <label>First Name</label>
//                       <input name="F_Name" value={editFormData.F_Name} onChange={handleEditInputChange} required />
//                     </div>
//                     <div className="input-group">
//                       <label>Last Name</label>
//                       <input name="L_Name" value={editFormData.L_Name} onChange={handleEditInputChange} required />
//                     </div>
//                     <div className="input-group">
//                       <label>Amount (€)</label>
//                       <input type="number" name="Amount" value={editFormData.Amount} onChange={handleEditInputChange} />
//                     </div>
//                   </div>

//                   {/* Colonne DROITE - Config & Status */}
//                   <div className="form-col col-limits">
//                     <h3 className="col-title">Limits & Status</h3>
//                     <div className="input-group">
//                       <label>Daily POS Limit (Max 9000)</label>
//                       <input type="number" name="POS_limit" value={editFormData.POS_limit} onChange={handleEditInputChange} max="9000" />
//                     </div>
//                     <div className="input-group">
//                       <label>Daily ATM Limit (Max 5000)</label>
//                       <input type="number" name="ATM_limit" value={editFormData.ATM_limit} onChange={handleEditInputChange} max="5000" />
//                     </div>
//                     <div className="input-group">
//                       <label>Account Status</label>
//                       <select name="Status" value={editFormData.Status} onChange={handleEditInputChange} className="status-select">
//                         <option value="Active">Active</option>
//                         <option value="suspended">Suspended</option>
//                         <option value="blocked">Blocked</option>
//                       </select>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <footer className="modal-footer">
//                 <button type="button" className="secondary-btn" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
//                 <button type="submit" className="primary-btn">Save Changes</button>
//               </footer>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* Modal View Event Details */}
//       {isEventModalOpen && selectedEvent && (
//         <div className="modal-overlay" onClick={() => setIsEventModalOpen(false)}>
//           <div className="modal-content event-details-modal premium-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
//             <header className="modal-header event-modal-header">
//               <div className="modal-title-group">
//                 <div className="event-badge-wrapper">
//                   <span className={`op-badge ${selectedEvent.OPERATION?.toLowerCase()}`}>
//                     {selectedEvent.OPERATION}
//                   </span>
//                   <span className="event-id-label">Audit Entry #{selectedEvent.ID_EVENT}</span>
//                 </div>
//                 <h2>Audit Log Explorer</h2>
//               </div>
//               <button className="close-modal" onClick={() => setIsEventModalOpen(false)}>✕</button>
//             </header>

//             <div className="modal-tabs">
//               <button 
//                 className={`modal-tab ${eventModalTab === 'overview' ? 'active' : ''}`}
//                 onClick={() => setEventModalTab('overview')}
//               >
//                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
//                 Overview
//               </button>
//               <button 
//                 className={`modal-tab ${eventModalTab === 'json' ? 'active' : ''}`}
//                 onClick={() => setEventModalTab('json')}
//               >
//                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
//                 Raw JSON
//               </button>
//             </div>

//             <div className="modal-body">
//               {eventModalTab === 'overview' ? (
//                 <div className="event-details-grid">
//                   {/* Section 1: Transaction Context */}
//                   <div className="detail-section glass-effect">
//                     <h3 className="section-subtitle">Transaction Context</h3>
//                     <div className="detail-row">
//                       <span className="detail-label">Event Reference</span>
//                       <span className="detail-value">#{selectedEvent.ID_EVENT}</span>
//                     </div>
//                     <div className="detail-row">
//                       <span className="detail-label">Target Card</span>
//                       <span className="detail-value mono highlight-pwc">{selectedEvent.ID_CARD}</span>
//                     </div>
//                     <div className="detail-row">
//                       <span className="detail-label">Execution Date</span>
//                       <span className="detail-value">{new Date(selectedEvent.TIMETMP).toLocaleString('fr-FR')}</span>
//                     </div>
//                   </div>

//                   {/* Section 2: Administrative Info */}
//                   <div className="detail-section glass-effect">
//                     <h3 className="section-subtitle">Client Information</h3>
//                     <div className="detail-row">
//                       <span className="detail-label">Account Holder</span>
//                       <span className="detail-value">{selectedEvent.F_NAME} {selectedEvent.L_NAME}</span>
//                     </div>
//                     <div className="detail-row">
//                       <span className="detail-label">Account Status</span>
//                       <span className={`status-badge ${selectedEvent.STATUS?.toLowerCase()}`}>
//                         {selectedEvent.STATUS}
//                       </span>
//                     </div>
//                   </div>

//                   {/* Section 3: Technical Metadata */}
//                   <div className="detail-section glass-effect full-width">
//                     <h3 className="section-subtitle">Technical Metadata</h3>
//                     <div className="metadata-flex">
//                       <div className="metadata-item">
//                         <span className="detail-label">Origin System</span>
//                         <span className={`source-badge ${selectedEvent.SOURCE?.toLowerCase()}`}>
//                           {selectedEvent.SOURCE}
//                         </span>
//                       </div>
//                       <div className="metadata-item">
//                         <span className="detail-label">Operation ID</span>
//                         <span className={`op-badge ${selectedEvent.OPERATION?.toLowerCase()}`}>
//                           {selectedEvent.OPERATION}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ) : (
//                 <div className="event-raw-data-premium animate-fade-in">
//                   <div className="json-header">
//                     <span>System Record Dump</span>
//                     <button className="copy-btn" onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2))}>Copy JSON</button>
//                   </div>
//                   <div className="raw-json-container-premium">
//                     <pre>{JSON.stringify(selectedEvent, null, 2)}</pre>
//                   </div>
//                 </div>
//               )}
//             </div>

//             <footer className="modal-footer premium-footer">
//               <div className="footer-left">
//                 <button className="action-btn-pwc modify" onClick={() => {
//                   if (selectedEvent.SOURCE === 'Externel_System' && selectedEvent.OPERATION === 'DELETE') {
//                     alert("Cette carte a déjà été supprimée par le système externe. Vous n'êtes pas autorisé à effectuer des actions sur elle.");
//                     return;
//                   }
//                   const cardInView = cards.find(c => c.ID_CARD === selectedEvent.ID_CARD);
//                   setIsEventModalOpen(false);
//                   // Use card in view if found, otherwise use selectedEvent data
//                   handleEditCard(cardInView || selectedEvent, selectedEvent.ID_EVENT);
//                 }}>
//                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
//                   Modify Card
//                 </button>
//                 <button className="action-btn-pwc delete" onClick={() => {
//                   if (selectedEvent.SOURCE === 'Externel_System' && selectedEvent.OPERATION === 'DELETE') {
//                     alert("Cette carte a déjà été supprimée par le système externe. Vous n'êtes pas autorisé à effectuer des actions sur elle.");
//                     return;
//                   }
//                   const cardInView = cards.find(c => c.ID_CARD === selectedEvent.ID_CARD);
//                   setIsEventModalOpen(false);
//                   // Use card in view if found, otherwise use selectedEvent data
//                   handleDeleteCard(cardInView || selectedEvent);
//                 }}>
//                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
//                   Delete Card
//                 </button>
//               </div>
//               <div className="footer-right">
//                 <button className="secondary-btn" onClick={() => setIsEventModalOpen(false)}>Close</button>
//               </div>
//             </footer>
//           </div>
//         </div>
//       )}
//     </div>

//   )
// }

// export default PWCDashboard

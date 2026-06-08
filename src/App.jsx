import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, Calendar, Users, Lock, ExternalLink, Clock, Home, RotateCcw, ChevronRight, X, Crosshair, Ticket } from 'lucide-react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import {
  activities,
  days,
  couples,
  nzCenter,
  accommodations,
  getActivityStatus,
  getDayStatus,
  getAccommodationForDay,
  groupDaysByAccommodation,
} from './data/schedule';

// Zoom level used when recentering on Queenstown (town fills ~half the view)
const QUEENSTOWN_ZOOM = 13;

// Human-readable labels + badges for each activity status
const STATUS_META = {
  'in-progress': { label: 'Now', badge: 'Happening now' },
  soon: { label: 'Soon', badge: 'About to start' },
  upcoming: { label: 'Upcoming', badge: 'Upcoming' },
  ended: { label: 'Ended', badge: 'Ended' },
};

// Format a Date for an <input type="datetime-local">
function toLocalInputValue(date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

// Navigation helpers — both apps search by ADDRESS (not raw coordinates),
// so the destination shows its real name/place card.
function openGoogleMaps(query) {
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`,
    '_blank'
  );
}
function openWaze(query) {
  window.open(`https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`, '_blank');
}
// Best address string to navigate to for an activity.
function activityNavQuery(activity) {
  return activity.navAddress || `${activity.location}, New Zealand`;
}

// Correct hash for 'nz2026'
const PASSWORD_HASH = '61de05f2bb7e07182bdb1eec2c90fcabdfe9921223b46f3683f45afb4262529d';

async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function AuthOverlay({ onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('nz_trip_auth') === 'true') {
      onAuthenticated();
    }
  }, [onAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const hash = await hashPassword(password);
    if (hash === PASSWORD_HASH) {
      localStorage.setItem('nz_trip_auth', 'true');
      onAuthenticated();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="auth-overlay"
    >
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel auth-card"
      >
        <Lock size={48} color="var(--accent)" />
        <div>
          <h2>Private Trip Itinerary</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Enter the secret code to view the schedule.</p>
        </div>
        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            style={{ borderColor: error ? 'var(--danger)' : '' }}
          />
          <button type="submit" className="auth-btn" style={{ marginTop: '1rem' }}>
            Unlock App
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

// Detail "page" for a place we're staying, with navigation options.
function AccommodationModal({ accommodation, onClose }) {
  if (!accommodation) return null;
  const nights = differenceInCalendarDays(
    parseISO(accommodation.endDate),
    parseISO(accommodation.startDate)
  );
  const navQuery = accommodation.address || accommodation.name;

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="glass-panel accommodation-modal"
        initial={{ y: 30, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="accommodation-modal-header">
          <div className="accommodation-modal-icon">
            <Home size={22} />
          </div>
          <div>
            <span className="accommodation-modal-eyebrow">Where we're staying</span>
            <h2>{accommodation.name}</h2>
          </div>
        </div>

        <div className="accommodation-detail-row">
          <MapPin size={16} />
          <span>{accommodation.address}</span>
        </div>
        <div className="accommodation-detail-row">
          <Calendar size={16} />
          <span>
            {format(parseISO(accommodation.startDate), 'EEE, MMM d')} –{' '}
            {format(parseISO(accommodation.endDate), 'EEE, MMM d')}
            <span className="accommodation-nights"> · {nights} nights</span>
          </span>
        </div>

        <div className="accommodation-actions">
          <button className="nav-btn nav-gmaps" onClick={() => openGoogleMaps(navQuery)}>
            <Navigation size={16} /> Google Maps
          </button>
          <button className="nav-btn nav-waze" onClick={() => openWaze(navQuery)}>
            <Navigation size={16} /> Waze
          </button>
        </div>

        {accommodation.url && (
          <a
            href={accommodation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="accommodation-booking-link"
          >
            <ExternalLink size={15} /> View booking details
          </a>
        )}
      </motion.div>
    </motion.div>
  );
}

// Detail "page" for a single event, with navigation options.
function ActivityModal({ activity, status, onClose }) {
  if (!activity) return null;
  const [visibleImages, setVisibleImages] = useState({});
  const toggleImage = (number) =>
    setVisibleImages((prev) => ({ ...prev, [number]: !prev[number] }));
  const statusMeta = STATUS_META[status];
  const navQuery = activityNavQuery(activity);

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="glass-panel accommodation-modal"
        initial={{ y: 30, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="accommodation-modal-header">
          <div className="accommodation-modal-icon" style={{ background: activity.color }}>
            <MapPin size={22} />
          </div>
          <div>
            <span className="accommodation-modal-eyebrow">
              {format(parseISO(activity.date), 'EEE, MMM d')}
            </span>
            <h2>{activity.title}</h2>
          </div>
        </div>

        <span className={`activity-status status-${status} modal-status`}>
          {status === 'in-progress' && <span className="status-pulse" />}
          {statusMeta.badge}
        </span>

        <div className="accommodation-detail-row">
          <Clock size={16} />
          <span>{activity.startTime} – {activity.endTime}</span>
        </div>
        <div className="accommodation-detail-row">
          <MapPin size={16} />
          <span>{activity.location}</span>
        </div>
        <div className="accommodation-detail-row">
          <Users size={16} />
          <span>{activity.participants.join(' · ')}</span>
        </div>
        {activity.description && (
          <div className="activity-modal-desc">{activity.description}</div>
        )}

        {activity.reservations && (
          <div className="reservation-block">
            <span className="reservation-label">
              <Ticket size={14} /> Rental reservation
            </span>
            {activity.reservations.map((r) => (
              <div key={r.number}>
                <div className="reservation-row">
                  <span className="reservation-who">{r.label}</span>
                  <span className="reservation-number">{r.number}</span>
                  {r.image && (
                    <button
                      className="show-image-btn"
                      onClick={() => toggleImage(r.number)}
                    >
                      {visibleImages[r.number] ? 'Hide' : 'View order'}
                    </button>
                  )}
                </div>
                {r.image && visibleImages[r.number] && (
                  <a href={r.image} target="_blank" rel="noopener noreferrer">
                    <img
                      src={r.image}
                      alt={`${r.label} rental order`}
                      className="reservation-image"
                    />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="accommodation-actions">
          <button className="nav-btn nav-gmaps" onClick={() => openGoogleMaps(navQuery)}>
            <Navigation size={16} /> Google Maps
          </button>
          <button className="nav-btn nav-waze" onClick={() => openWaze(navQuery)}>
            <Navigation size={16} /> Waze
          </button>
        </div>

        {activity.link && (
          <a
            href={activity.link}
            target="_blank"
            rel="noopener noreferrer"
            className="accommodation-booking-link"
          >
            <ExternalLink size={15} /> View details
          </a>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedDay, setSelectedDay] = useState(days[0]); // Can be a specific day or 'All'
  const [selectedCouple, setSelectedCouple] = useState('All');
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [mapCenter, setMapCenter] = useState(nzCenter);
  const [mapZoom, setMapZoom] = useState(10);
  const mapRef = useRef(null);

  // Fly the map somewhere AND keep React state in sync. Commanding the map
  // instance directly means it always moves — even if the target equals the
  // current state (e.g. recentering twice, or after a manual pan).
  const focusMap = (center, zoom) => {
    setMapCenter(center);
    setMapZoom(zoom);
    mapRef.current?.flyTo(center, zoom, { duration: 1.2 });
  };

  // ── Time awareness ──
  // liveNow ticks with the real clock; simulatedTime (when set) overrides it
  // so you can "time-travel" to preview any moment of the trip.
  const [liveNow, setLiveNow] = useState(() => new Date());
  const [simulatedTime, setSimulatedTime] = useState(null);
  const [showTimeControl, setShowTimeControl] = useState(false);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  // Tracks which activity pin is highlighted on the map (set on card click,
  // independent of the modal so the highlight persists while modal is closed).
  const [highlightedId, setHighlightedId] = useState(null);
  const now = simulatedTime || liveNow;

  useEffect(() => {
    if (simulatedTime) return; // freeze ticking while simulating
    const id = setInterval(() => setLiveNow(new Date()), 30000);
    return () => clearInterval(id);
  }, [simulatedTime]);

  const dayGroups = useMemo(() => groupDaysByAccommodation(days), []);
  const todayStr = format(now, 'yyyy-MM-dd');
  const currentAccommodation = getAccommodationForDay(todayStr);

  const filteredActivities = useMemo(() => {
    return activities
      .filter(a => selectedDay === 'All' || a.date === selectedDay)
      .filter(a => selectedCouple === 'All' || a.participants.includes(selectedCouple))
      .sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return a.startTime.localeCompare(b.startTime);
      });
  }, [selectedDay, selectedCouple]);

  // Grouped trajectories (separate polylines per day)
  const polylines = useMemo(() => {
    const grouped = {};
    filteredActivities.forEach(a => {
      if (!grouped[a.date]) grouped[a.date] = [];
      grouped[a.date].push(a.coordinates);
    });
    return Object.entries(grouped).map(([date, coords]) => ({
      date,
      coords,
      color: activities.find(a => a.date === date)?.color || '#3b82f6'
    })).filter(p => p.coords.length > 1);
  }, [filteredActivities]);

  // Adjust map bounds when activities change
  useEffect(() => {
    if (filteredActivities.length > 0) {
      const lats = filteredActivities.map(a => a.coordinates[0]);
      const lngs = filteredActivities.map(a => a.coordinates[1]);
      const centerLat = (Math.max(...lats) + Math.min(...lats)) / 2;
      const centerLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
      setMapCenter([centerLat, centerLng]);
      setMapZoom(selectedDay === 'All' ? 8 : (filteredActivities.length === 1 ? 13 : 10));
    } else {
      setMapCenter(nzCenter);
      setMapZoom(6);
    }
  }, [filteredActivities, selectedDay]);

  const createMarkerIcon = (color, sequence, status, isSelected) => {
    if (isSelected) {
      return L.divIcon({
        className: 'custom-marker-wrapper',
        html: `<div class="custom-marker selected-marker" style="background:${color}; border-color:${color}; color:#fff;">
                ${sequence}
               </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
    }
    return L.divIcon({
      className: 'custom-marker-wrapper',
      html: `<div class="custom-marker status-${status}" style="border-color: ${color}; color: ${color};">
              ${sequence}
             </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  if (!isAuthenticated) {
    return (
      <AnimatePresence>
        <AuthOverlay onAuthenticated={() => setIsAuthenticated(true)} />
      </AnimatePresence>
    );
  }

  return (
    <div className="app-container">
      <AnimatePresence>
        {selectedAccommodation && (
          <AccommodationModal
            accommodation={selectedAccommodation}
            onClose={() => setSelectedAccommodation(null)}
          />
        )}
        {selectedActivity && (
          <ActivityModal
            activity={selectedActivity}
            status={getActivityStatus(selectedActivity, now)}
            onClose={() => setSelectedActivity(null)}
          />
        )}
      </AnimatePresence>

      {/* Map Background */}
      <div className="map-container">
        <MapContainer ref={mapRef} center={mapCenter} zoom={mapZoom} zoomControl={false} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            keepBuffer={8}
            updateWhenZooming={false}
            updateWhenIdle={true}
          />
          <MapUpdater center={mapCenter} zoom={mapZoom} />
          
          {filteredActivities.map((activity) => (
            <Marker
              key={activity.id}
              position={activity.coordinates}
              zIndexOffset={highlightedId === activity.id ? 1000 : 0}
              icon={createMarkerIcon(activity.color, activity.sequence, getActivityStatus(activity, now), highlightedId === activity.id)}
              eventHandlers={{
                click: () => {
                  focusMap(activity.coordinates, 14);
                  setHighlightedId(activity.id);
                }
              }}
            >
              <Popup>
                <div style={{ padding: '0.5rem', minWidth: '150px' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--bg-dark)' }}>{activity.title}</h3>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem' }}>
                    {format(parseISO(activity.date), 'MMM d')} • {activity.startTime}–{activity.endTime} • {activity.location}
                  </p>
                  <button
                    onClick={() => setSelectedActivity(activity)}
                    style={{
                      background: 'var(--accent)', color: '#fff', border: 'none',
                      padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center'
                    }}
                  >
                    <Navigation size={16} /> View & Navigate
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
          
          {polylines.map(line => (
            <Polyline 
              key={line.date} 
              positions={line.coords} 
              color={line.color} 
              weight={3} 
              dashArray="5, 10" 
            />
          ))}
        </MapContainer>
      </div>

      {/* UI Overlay */}
      <div className="overlay-ui">
        
        {/* Header */}
        <motion.header 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-panel header"
        >
          <h1>新西兰，新希望</h1>
          <div className="header-actions">
            <div className="time-control">
              <button
                className={`time-control-btn ${simulatedTime ? 'simulating' : ''}`}
                onClick={() => setShowTimeControl((v) => !v)}
                title="Adjust the current time"
              >
                <Clock size={16} />
                <span>{format(now, 'MMM d, HH:mm')}</span>
                {simulatedTime && <span className="sim-dot" />}
              </button>
              <AnimatePresence>
                {showTimeControl && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="time-popover glass-panel"
                  >
                    <label className="time-popover-label">Current time</label>
                    <input
                      type="datetime-local"
                      className="time-input"
                      value={toLocalInputValue(now)}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSimulatedTime(v ? new Date(v) : null);
                      }}
                    />
                    <div className="time-popover-actions">
                      <button
                        className="time-preset"
                        onClick={() => setSimulatedTime(new Date(`${days[0]}T10:00`))}
                      >
                        Jump to trip
                      </button>
                      <button
                        className="time-reset"
                        onClick={() => setSimulatedTime(null)}
                        disabled={!simulatedTime}
                      >
                        <RotateCcw size={14} /> Now
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Lock size={20} color="var(--text-secondary)" />
          </div>
        </motion.header>

        {/* Filters */}
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="filters-group"
        >
          <button 
            className={`filter-btn ${selectedCouple === 'All' ? 'active' : ''}`}
            onClick={() => setSelectedCouple('All')}
          >
            <Users size={16} /> All
          </button>
          {couples.map(couple => (
            <button 
              key={couple}
              className={`filter-btn ${selectedCouple === couple ? 'active' : ''}`}
              onClick={() => setSelectedCouple(couple)}
            >
              {couple}
            </button>
          ))}
        </motion.div>

        {/* Recenter map on Queenstown */}
        <button
          className="recenter-btn"
          onClick={() => focusMap(nzCenter, QUEENSTOWN_ZOOM)}
          title="Recenter on Queenstown"
        >
          <Crosshair size={20} />
        </button>

        {/* Timeline Bottom Sheet */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass-panel timeline-container"
        >
          <div className="timeline-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} color="var(--accent)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                {selectedDay === 'All' ? 'Full Itinerary' : 'Daily Itinerary'}
              </h2>
            </div>
            {currentAccommodation ? (
              <button
                className="stay-banner is-active clickable"
                onClick={() => setSelectedAccommodation(currentAccommodation)}
              >
                <Home size={15} />
                <span>Staying at <strong>{currentAccommodation.name}</strong></span>
                <ChevronRight size={15} />
              </button>
            ) : (
              <div className="stay-banner">
                <Home size={15} />
                {todayStr < days[0] ? (
                  <span>Trip starts {format(parseISO(days[0]), 'MMM d')}</span>
                ) : (
                  <span>Trip has ended</span>
                )}
              </div>
            )}
          </div>

          <div className="days-scroll">
            <div className="day-group">
              <span className="day-group-label">Overview</span>
              <div className="day-group-chips">
                <button
                  className={`day-chip ${selectedDay === 'All' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDay('All');
                  }}
                >
                  All Days
                </button>
              </div>
            </div>

            {dayGroups.map((group) => {
              const groupIsCurrent =
                currentAccommodation && group.accommodation?.name === currentAccommodation.name;
              const groupIsPast = group.days.every((d) => getDayStatus(d, now) === 'past');
              return (
                <div
                  key={group.key}
                  className={`day-group ${groupIsCurrent ? 'is-current' : ''} ${groupIsPast ? 'is-past' : ''}`}
                >
                  {group.accommodation ? (
                    <button
                      className="day-group-label clickable"
                      onClick={() => setSelectedAccommodation(group.accommodation)}
                      title={`View ${group.accommodation.name}`}
                    >
                      {groupIsCurrent ? <span className="stay-pulse" /> : <Home size={12} />}
                      <span className="day-group-name">{group.accommodation.name}</span>
                      <ChevronRight size={12} />
                    </button>
                  ) : (
                    <span className="day-group-label">Itinerary</span>
                  )}
                  <div className="day-group-chips">
                    {group.days.map((day) => {
                      const dayStatus = getDayStatus(day, now);
                      return (
                        <button
                          key={day}
                          className={`day-chip status-${dayStatus} ${selectedDay === day ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDay(day);
                          }}
                        >
                          {dayStatus === 'today' && <span className="today-dot" />}
                          {format(parseISO(day), 'MMM d')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="activities-list" style={{ marginTop: '1rem' }}>
            <AnimatePresence mode="popLayout">
              {filteredActivities.length === 0 ? (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem', width: '100%' }}
                >
                  No activities scheduled for this selection.
                </motion.p>
              ) : (
                filteredActivities.map((activity, index) => {
                  const status = getActivityStatus(activity, now);
                  const statusMeta = STATUS_META[status];
                  return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`activity-card status-${status}`}
                    style={{ '--card-accent': activity.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      focusMap(activity.coordinates, 14);
                      setHighlightedId(activity.id);
                    }}
                  >
                    <div className="activity-color-bar" style={{ backgroundColor: activity.color }}></div>
                    <div className="activity-timeline-node">
                      <span className="timeline-node-left">
                        <span className="timeline-dot" style={{ backgroundColor: activity.color, boxShadow: `0 0 8px ${activity.color}` }}></span>
                        <span className="timeline-time">
                          {selectedDay === 'All' ? `${format(parseISO(activity.date), 'MMM d')} • ` : ''}
                          {activity.startTime}–{activity.endTime}
                        </span>
                      </span>
                      <span className={`activity-status status-${status}`}>
                        {status === 'in-progress' && <span className="status-pulse" />}
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="activity-title">{activity.title}</div>
                    {activity.description && (
                      <div className="activity-desc">{activity.description.split('\n')[0]}</div>
                    )}
                    <div className="activity-meta">
                      <div className="activity-location">
                        <MapPin size={14} /> {activity.location}
                      </div>
                      <button
                        className="card-details-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedActivity(activity);
                        }}
                      >
                        Details <ChevronRight size={14} />
                      </button>
                    </div>
                  </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

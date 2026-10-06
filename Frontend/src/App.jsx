import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:5000/api';

// --- Land Details Popup Component ---
const LandDetailsPopup = ({ land, isOpen, onClose, payments = [] }) => {
  const mapContainerId = "land-details-map";
  const mapInstanceRef = React.useRef(null);
  
  useEffect(() => {
    if (!isOpen || !land) return;
    
    // Cleanup existing map before initializing new one
    const cleanupMap = () => {
      const mapDiv = document.getElementById(mapContainerId);
      if (mapDiv) {
        // Remove any existing leaflet containers
        mapDiv.innerHTML = '';
        // Also try to remove any map instances associated with this container
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {
            // Ignore errors during cleanup
          }
          mapInstanceRef.current = null;
        }
      }
    };
    
    const initMap = () => {
      const mapDiv = document.getElementById(mapContainerId);
      if (!mapDiv) {
        // Container not ready, try again after a short delay
        setTimeout(initMap, 200);
        return;
      }
      
      const lat = land.location?.latitude;
      const lng = land.location?.longitude;
      
      if (lat && lng) {
        try {
          // Cleanup first
          cleanupMap();
          
          // Small delay to ensure container is clean
          setTimeout(() => {
            const map = window.L.map(mapContainerId, { 
              preferCanvas: true,
              zoomControl: false
            }).setView([lat, lng], 16);
            
            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap'
            }).addTo(map);
            
            window.L.marker([lat, lng]).addTo(map)
              .bindPopup(land.location?.address || 'Land Location')
              .openPopup();
            
            mapInstanceRef.current = map;
          }, 50);
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      }
    };
    
    // Initial cleanup
    cleanupMap();
    
    // Delay to ensure DOM is ready
    const timer = setTimeout(initMap, 150);
    
    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          // Ignore
        }
        mapInstanceRef.current = null;
      }
      // Also cleanup the container
      const mapDiv = document.getElementById(mapContainerId);
      if (mapDiv) {
        mapDiv.innerHTML = '';
      }
    };
  }, [isOpen, land, mapContainerId]);
  
  if (!isOpen || !land) return null;
  
  // Calculate payment stats
  const landPayments = payments.filter(p => {
    const paymentLandId = p.landId?._id || p.landId;
    return String(paymentLandId) === String(land._id) && p.status === 'paid';
  });
  const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
  const remaining = Math.max(0, totalAmount - totalPaid);
  const paidPercentage = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '0',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header with close button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 25px',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px 16px 0 0'
        }}>
          <h3 style={{ margin: 0, color: 'white', fontSize: '20px' }}>🏠 Land Details</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div style={{ padding: '25px' }}>
          {/* Image */}
          <div style={{ marginBottom: '20px' }}>
            {land.image ? (
              <img 
                src={`http://localhost:5000${land.image}`} 
                alt="Land" 
                style={{ 
                  width: '100%', 
                  height: '200px', 
                  objectFit: 'cover', 
                  borderRadius: '12px',
                  border: '3px solid #e5e7eb'
                }} 
              />
            ) : (
              <div style={{ 
                width: '100%', 
                height: '200px', 
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '3px dashed #9ca3af'
              }}>
                <span style={{ fontSize: '48px' }}>🏠</span>
              </div>
            )}
          </div>
          
          {/* Map */}
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#374151', fontSize: '16px' }}>📍 Location</h4>
            {land.location?.latitude && land.location?.longitude ? (
              <div 
                id={mapContainerId}
                style={{ 
                  height: '180px', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  border: '2px solid #e5e7eb'
                }}
              />
            ) : (
              <div style={{ 
                height: '180px', 
                background: '#f3f4f6', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
              }}>
                📍 No location set
              </div>
            )}
            {land.location?.address && (
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                {land.location.address}
              </p>
            )}
          </div>
          
          {/* Details Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Land ID</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>{land.landId || land._id?.slice(-6)}</div>
            </div>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Size</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>{land.size}</div>
            </div>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Owner</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>{land.owner}</div>
            </div>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Sold Date</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>{land.soldDate ? new Date(land.soldDate).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Price/Month</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#10b981' }}>₹{land.pricePerMonth?.toLocaleString()}</div>
            </div>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Installments</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>{land.installmentTotal} months</div>
            </div>
            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Details</div>
              <div style={{ fontSize: '14px', color: '#1f2937' }}>{land.details || 'No description'}</div>
            </div>
          </div>
          
          {/* Payment Summary */}
          <div style={{ 
            padding: '20px', 
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
            borderRadius: '12px',
            border: '2px solid #22c55e'
          }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#166534', fontSize: '16px' }}>💰 Payment Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Amount</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>₹{totalAmount.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Paid</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>₹{totalPaid.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Remaining</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: remaining > 0 ? '#dc2626' : '#10b981' }}>₹{remaining.toLocaleString()}</div>
              </div>
            </div>
            <div style={{ marginTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280', marginBottom: '5px' }}>
                <span>Progress</span>
                <span>{paidPercentage}%</span>
              </div>
              <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  background: paidPercentage >= 100 ? '#10b981' : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)', 
                  width: `${paidPercentage}%`,
                  borderRadius: '4px'
                }} />
              </div>
            </div>
          </div>
          
          {/* Coordinates */}
          {land.location?.latitude && land.location?.longitude && (
            <div style={{ marginTop: '15px', padding: '10px', background: '#f8fafc', borderRadius: '8px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
              📍 Coordinates: {land.location.latitude}, {land.location.longitude}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          padding: '15px 25px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <button 
            onClick={onClose}
            style={{
              padding: '10px 30px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Toast Notification Component ---
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '15px 25px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      zIndex: 9999,
      animation: 'slideIn 0.3s ease-out',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'
    }}>
      {message}
    </div>
  );
};

// --- Map Components ---
const LandMap = ({ latitude, longitude, address, height = '200px', onLocationSelect, interactive = false }) => {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markerRef = React.useRef(null);

  useEffect(() => {
    if (!latitude || !longitude) return;
    
    // Wait for DOM to be ready
    const initMap = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
      
      const mapDiv = document.getElementById(`map-${Math.random().toString(36).substr(2, 9)}`);
      if (!mapDiv) return;
      
      try {
        const map = window.L.map(mapDiv.id).setView([latitude, longitude], 15);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);
        
        const marker = window.L.marker([latitude, longitude]).addTo(map);
        if (address) {
          marker.bindPopup(address);
        }
        
        if (interactive && onLocationSelect) {
          map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            if (markerRef.current) {
              markerRef.current.setLatLng([lat, lng]);
            } else {
              markerRef.current = window.L.marker([lat, lng]).addTo(map);
            }
            onLocationSelect(lat, lng);
          });
        }
        
        mapInstanceRef.current = map;
        markerRef.current = marker;
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };
    
    // Delay to ensure Leaflet is loaded
    setTimeout(initMap, 100);
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, [latitude, longitude]);

  if (!latitude || !longitude) {
    return (
      <div style={{ 
        height, 
        background: '#f3f4f6', 
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280'
      }}>
        📍 No location set
      </div>
    );
  }

  return (
    <div 
      id={`map-${Math.random().toString(36).substr(2, 9)}`}
      ref={mapRef}
      style={{ height, borderRadius: '8px', overflow: 'hidden' }}
    />
  );
};

const MapPickerModal = ({ isOpen, onClose, initialLat, initialLng, initialAddress, onSave }) => {
  const [latitude, setLatitude] = useState(initialLat || '');
  const [longitude, setLongitude] = useState(initialLng || '');
  const [address, setAddress] = useState(initialAddress || '');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Update state when initial values change (e.g., when reopening modal for editing)
  useEffect(() => {
    if (isOpen) {
      setLatitude(initialLat || '');
      setLongitude(initialLng || '');
      setAddress(initialAddress || '');
    }
  }, [isOpen, initialLat, initialLng, initialAddress]);

  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [mapType, setMapType] = useState('street'); // street, satellite
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [showSearchBtn, setShowSearchBtn] = useState(false);
  const searchTimeoutRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markerRef = React.useRef(null);

  // Initialize map when modal opens or when coordinates change
  useEffect(() => {
    if (!isOpen) return;
    
    const initMap = () => {
      const mapDiv = document.getElementById('map-picker-container');
      if (!mapDiv) return;
      
      // Clean up existing map instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      
      const currentLat = latitude || initialLat || 20.5937;
      const currentLng = longitude || initialLng || 78.9629;
      
      // Select tile layer based on map type
      const tileUrl = mapType === 'satellite' 
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      
      const tileAttribution = mapType === 'satellite'
        ? 'Tiles &copy; Esri'
        : '&copy; OpenStreetMap';
      
      try {
        const map = window.L.map('map-picker-container').setView([currentLat, currentLng], mapType === 'satellite' ? 13 : 15);
        window.L.tileLayer(tileUrl, {
          attribution: tileAttribution,
          maxZoom: 19
        }).addTo(map);
        
        // Add zoom control
        map.zoomControl.setPosition('bottomright');
        
        // Use the actual coordinates (from state or props)
        const lat = latitude || initialLat;
        const lng = longitude || initialLng;
        
        if (lat && lng) {
          markerRef.current = window.L.marker([lat, lng], { draggable: true }).addTo(map);
          
          // Add drag event listener
          markerRef.current.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            setLatitude(pos.lat);
            setLongitude(pos.lng);
            
            // Reverse geocode using backend proxy
            fetch(`${API_URL}/geocode/reverse?lat=${pos.lat}&lon=${pos.lng}`)
            .then(res => res.json())
            .then(data => {
              let addressStr = '';
              if (data.address) {
                const parts = [];
                const addr = data.address;
                if (addr.road || addr.neighbourhood || addr.suburb) {
                  if (addr.neighbourhood) parts.push(addr.neighbourhood);
                  if (addr.suburb) parts.push(addr.suburb);
                  if (addr.road) parts.push(addr.road);
                }
                if (addr.city || addr.town || addr.village) {
                  parts.push(addr.city || addr.town || addr.village);
                }
                if (addr.district) parts.push(addr.district);
                if (addr.state) parts.push(addr.state);
                addressStr = parts.join(', ');
              }
              
              if (!addressStr && data.display_name) {
                addressStr = data.display_name;
              }
              
              setAddress(addressStr || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
              setSearchQuery(addressStr || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
            })
            .catch(err => {
              console.error('Reverse geocoding error:', err);
              const coordStr = pos.lat.toFixed(4) + ', ' + pos.lng.toFixed(4);
              setAddress(coordStr);
              setSearchQuery(coordStr);
            });
          });
        }
        
        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          setLatitude(lat);
          setLongitude(lng);
          
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = window.L.marker([lat, lng], { draggable: true }).addTo(map);
            
            // Add drag event listener for new marker
            markerRef.current.on('dragend', (e) => {
              const pos = e.target.getLatLng();
              setLatitude(pos.lat);
              setLongitude(pos.lng);
              
              // Reverse geocode using backend proxy
              fetch(`${API_URL}/geocode/reverse?lat=${pos.lat}&lon=${pos.lng}`)
              .then(res => res.json())
              .then(data => {
                let addressStr = '';
                if (data.address) {
                  const parts = [];
                  const addr = data.address;
                  if (addr.road || addr.neighbourhood || addr.suburb) {
                    if (addr.neighbourhood) parts.push(addr.neighbourhood);
                    if (addr.suburb) parts.push(addr.suburb);
                    if (addr.road) parts.push(addr.road);
                  }
                  if (addr.city || addr.town || addr.village) {
                    parts.push(addr.city || addr.town || addr.village);
                  }
                  if (addr.district) parts.push(addr.district);
                  if (addr.state) parts.push(addr.state);
                  addressStr = parts.join(', ');
                }
                
                if (!addressStr && data.display_name) {
                  addressStr = data.display_name;
                }
                
                setAddress(addressStr || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
                setSearchQuery(addressStr || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
              })
              .catch(err => {
                console.error('Reverse geocoding error:', err);
                const coordStr = pos.lat.toFixed(4) + ', ' + pos.lng.toFixed(4);
                setAddress(coordStr);
                setSearchQuery(coordStr);
              });
            });
          }
          
          // Reverse geocode using backend proxy on click
          fetch(`${API_URL}/geocode/reverse?lat=${lat}&lon=${lng}`)
          .then(res => res.json())
          .then(data => {
            let addressStr = '';
            if (data.address) {
              const parts = [];
              const addr = data.address;
              if (addr.road || addr.neighbourhood || addr.suburb) {
                if (addr.neighbourhood) parts.push(addr.neighbourhood);
                if (addr.suburb) parts.push(addr.suburb);
                if (addr.road) parts.push(addr.road);
              }
              if (addr.city || addr.town || addr.village) {
                parts.push(addr.city || addr.town || addr.village);
              }
              if (addr.district) parts.push(addr.district);
              if (addr.state) parts.push(addr.state);
              addressStr = parts.join(', ');
            }
            
            if (!addressStr && data.display_name) {
              addressStr = data.display_name;
            }
            
            setAddress(addressStr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setSearchQuery(addressStr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          })
          .catch(err => {
            console.error('Reverse geocoding error:', err);
            const coordStr = lat.toFixed(4) + ', ' + lng.toFixed(4);
            setAddress(coordStr);
            setSearchQuery(coordStr);
          });
        });
        
        mapInstanceRef.current = map;
      } catch (error) {
        console.error('Error initializing map picker:', error);
      }
    };
    
    setTimeout(initMap, 100);
    
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, mapType, initialLat, initialLng]);

  // Also update map when coordinates change
  useEffect(() => {
    if (!isOpen || !mapInstanceRef.current || !latitude || !longitude) return;
    
    mapInstanceRef.current.setView([latitude, longitude], 15);
    
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      markerRef.current = window.L.marker([latitude, longitude], { draggable: true }).addTo(mapInstanceRef.current);
    }
  }, [isOpen, latitude, longitude]);

  // Search for location using backend proxy
  const searchLocation = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      // Use backend proxy instead of calling Nominatim directly
      const response = await fetch(`${API_URL}/geocode/search?q=${encodeURIComponent(query)}`);
      
      if (response.ok) {
        const allResults = await response.json();
        
        // Process results to show more readable local names
        const processedResults = allResults.map(item => {
          // Build a cleaner display name with local area first
          let displayParts = [];
          const addr = item.address || {};
          
          // Add business/company name if available (from name field or as primary)
          if (item.name && item.name !== item.display_name) {
            displayParts.push(item.name);
          }
          
          // Add local area names in order of specificity
          if (addr.neighbourhood) displayParts.push(addr.neighbourhood);
          if (addr.suburb) displayParts.push(addr.suburb);
          if (addr.locality) displayParts.push(addr.locality);
          if (addr.town) displayParts.push(addr.town);
          if (addr.city) displayParts.push(addr.city);
          if (addr.district) displayParts.push(addr.district);
          if (addr.village) displayParts.push(addr.village);
          if (addr.state) displayParts.push(addr.state);
          
          return {
            ...item,
            display_name: displayParts.length > 0 ? 
              displayParts.join(', ') + ', India' : 
              item.display_name
          };
        });
        
        setSearchResults(processedResults.slice(0, 15));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
    setSearching(false);
  };

  // Handle Enter key press in search - prevent form submission
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (searchQuery.length >= 2) {
        searchLocation(searchQuery);
      }
    }
  };

  // Handle input change with debounce for autocomplete
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search - wait 300ms after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      searchLocation(query);
    }, 300);
  };

  // Select a search result
  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setLatitude(lat);
    setLongitude(lon);
    setAddress(result.display_name);
    setSearchResults([]);
    setSearchQuery(result.display_name);
    
    // Update map view
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([lat, lon], 15);
      
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      } else {
        markerRef.current = window.L.marker([lat, lon], { draggable: true }).addTo(mapInstanceRef.current);
        
        // Add drag event listener for new marker
        markerRef.current.on('dragend', async (e) => {
          const pos = e.target.getLatLng();
          setLatitude(pos.lat);
          setLongitude(pos.lng);
          
          // Reverse geocode using backend proxy
          try {
            const res = await fetch(`${API_URL}/geocode/reverse?lat=${pos.lat}&lon=${pos.lng}`);
            const geodata = await res.json();
            
            // Build address string from response
            let addressStr = '';
            if (geodata.address) {
              const parts = [];
              const addr = geodata.address;
              if (addr.road || addr.neighbourhood || addr.suburb) {
                if (addr.neighbourhood) parts.push(addr.neighbourhood);
                if (addr.suburb) parts.push(addr.suburb);
                if (addr.road) parts.push(addr.road);
              }
              if (addr.city || addr.town || addr.village) {
                parts.push(addr.city || addr.town || addr.village);
              }
              if (addr.district) parts.push(addr.district);
              if (addr.state) parts.push(addr.state);
              if (addr.country) parts.push(addr.country);
              addressStr = parts.join(', ');
            }
            
            // Fallback to display_name
            if (!addressStr && geodata.display_name) {
              addressStr = geodata.display_name;
            }
            
            setAddress(addressStr || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
            setSearchQuery(addressStr || `${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)}`);
          } catch (err) {
            console.error('Reverse geocoding error:', err);
            const coordStr = pos.lat.toFixed(4) + ', ' + pos.lng.toFixed(4);
            setAddress(coordStr);
            setSearchQuery(coordStr);
          }
        });
      }
    }
  };

  // Get current location using GPS and fetch address
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    setSearching(true);
    
    // Request location
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Update coordinates
        setLatitude(lat);
        setLongitude(lon);
        
        try {
          // Use backend proxy to avoid CORS issues
          const response = await fetch(`${API_URL}/geocode/reverse?lat=${lat}&lon=${lon}`, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error('Geocoding failed');
          }
          
          const data = await response.json();
          
          // Build address string
          let addressStr = '';
          
          if (data.address) {
            const parts = [];
            if (data.address.road || data.address.neighbourhood || data.address.suburb) {
              if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
              if (data.address.suburb) parts.push(data.address.suburb);
              if (data.address.road) parts.push(data.address.road);
            }
            if (data.address.city || data.address.town || data.address.village) {
              parts.push(data.address.city || data.address.town || data.address.village);
            }
            if (data.address.district) parts.push(data.address.district);
            if (data.address.state) parts.push(data.address.state);
            if (data.address.country) parts.push(data.address.country);
            
            addressStr = parts.join(', ');
          }
          
          // Fallback to display_name if needed
          if (!addressStr && data.display_name) {
            addressStr = data.display_name;
          }
          
          // Final fallback
          if (!addressStr) {
            addressStr = lat.toFixed(4) + ', ' + lon.toFixed(4);
          }
          
          // Update React state
          setAddress(addressStr);
          setSearchQuery(addressStr);
          
        } catch (error) {
          console.log('Error getting address:', error);
          const coordStr = lat.toFixed(4) + ', ' + lon.toFixed(4);
          setAddress(coordStr);
          setSearchQuery(coordStr);
          alert('Location: ' + coordStr + ' (Address lookup failed)');
        }
        
        // Update map marker
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lon], 16);
          
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lon]);
          } else {
            markerRef.current = window.L.marker([lat, lon], {draggable: true}).addTo(mapInstanceRef.current);
          }
        }
        
        setSearching(false);
      },
      (error) => {
        alert('Could not get location. Please check browser permissions.');
        setSearching(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Also update map when coordinates change
  useEffect(() => {
    if (!isOpen || !mapInstanceRef.current || !latitude || !longitude) return;
    
    mapInstanceRef.current.setView([latitude, longitude], 15);
    
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      markerRef.current = window.L.marker([latitude, longitude], { draggable: true }).addTo(mapInstanceRef.current);
    }
  }, [isOpen, latitude, longitude]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h3 style={{ marginTop: 0 }}>📍 Select Land Location</h3>
        <p style={{ color: '#6b7280', marginBottom: '15px', fontSize: '14px' }}>
          🔍 Search or click map to select location
        </p>
        
        {/* Search Row - Now more visible */}
        <div style={{ marginBottom: '12px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '2px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input 
              type="text" 
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyPress}
              placeholder="Search location..."
              style={{ 
                flex: 1,
                padding: '14px 16px', 
                border: '2px solid #667eea', 
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
                fontWeight: '500'
              }}
            />
            <button 
              type="button"
              onClick={() => {
                if (searchQuery.length >= 2) {
                  searchLocation(searchQuery);
                }
              }}
              disabled={searching || searchQuery.length < 2}
              style={{ 
                width: '50px',
                height: '50px',
                background: searching || searchQuery.length < 2 ? '#9ca3af' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: searching || searchQuery.length < 2 ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Search"
            >
              🔍
            </button>
          </div>
          {searching && (
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>🔍 Searching...</span>
            </div>
          )}
          {/* Autocomplete Results - Now more visible */}
          {searchResults.length > 0 && (
            <div style={{ 
              background: 'white', 
              border: '2px solid #667eea',
              borderRadius: '8px',
              marginTop: '8px',
              maxHeight: '200px',
              overflow: 'auto',
              boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
              zIndex: 2000,
              position: 'relative'
            }}>
              {searchResults.map((result, index) => (
                <div 
                  key={index}
                  onClick={() => selectSearchResult(result)}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: index < searchResults.length - 1 ? '2px solid #f3f4f6' : 'none',
                    fontSize: '14px',
                    color: '#374151',
                    background: index % 2 === 0 ? 'white' : '#f8fafc'
                  }}
                  onMouseOver={(e) => { e.target.style.background = '#667eea'; e.target.style.color = 'white'; }}
                  onMouseOut={(e) => { e.target.style.background = index % 2 === 0 ? 'white' : '#f8fafc'; e.target.style.color = '#374151'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>📍</span>
                    <div>
                      {result.name && result.name !== result.display_name && (
                        <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '2px' }}>{result.name}</div>
                      )}
                      <div style={{ color: result.name ? '#6b7280' : '#374151' }}>{result.display_name}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {searching && searchResults.length === 0 && (
            <div style={{ marginTop: '8px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', textAlign: 'center', color: '#667eea', fontWeight: '500' }}>
              🔍 Searching for locations...
            </div>
          )}
        </div>
        
        <div id="map-picker-container" style={{ height: isFullscreen ? '80vh' : '300px', borderRadius: '8px', marginBottom: '15px', position: 'relative', border: '2px solid #667eea' }}>
          {/* Map Controls Overlay - Icon only for modern look */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Map Type Toggle */}
            <button 
              type="button"
              onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')}
              style={{
                width: '44px',
                height: '44px',
                background: '#667eea',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}
              title="Toggle Map Type"
            >
              {mapType === 'street' ? '🛰️' : '🗺️'}
            </button>
            
            {/* Fullscreen Toggle */}
            <button 
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                width: '44px',
                height: '44px',
                background: '#667eea',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                color: 'white'
              }}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? '⛶' : '⛶'}
            </button>
            
            {/* Current Location - Icon only */}
            <button 
              type="button"
              onClick={getCurrentLocation}
              disabled={searching}
              style={{
                width: '22px',
                height: '43px',
                background: searching ? '#9ca3af' : '#10b981',
                border: 'none',
                borderRadius: '25px',
                cursor: searching ? 'not-allowed' : 'pointer',
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
                color: 'white'
              }}
              title="Go to My Location"
            >
              📍
            </button>
          </div>
          
          {/* Location hint overlay */}
          {!latitude && !longitude && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              background: 'rgba(255,255,255,0.98)',
              padding: '25px 35px',
              borderRadius: '16px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              pointerEvents: 'none',
              textAlign: 'center',
              border: '2px solid #e5e7eb'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>📍</div>
              <div style={{ fontSize: '15px', color: '#1f2937', fontWeight: '600', marginBottom: '4px' }}>Click on the map to select location</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Or search above for your company/area</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>💡 Tip: Search with city or district name</div>
            </div>
          )}
          
          {/* Selected Location Info */}
          {latitude && longitude && (
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              zIndex: 1000,
              background: 'rgba(255,255,255,0.98)',
              padding: '10px 15px',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
              maxWidth: '250px',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: '600', color: '#10b981', marginBottom: '3px' }}>✓ Location Selected</div>
              <div style={{ color: '#6b7280' }}>{address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}</div>
              <div style={{ color: '#9ca3af', fontSize: '10px', marginTop: '3px' }}>📍 Drag marker to adjust</div>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Latitude</label>
            <input 
              type="number" 
              step="any"
              value={latitude} 
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="e.g., 20.5937"
              style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Longitude</label>
            <input 
              type="number" 
              step="any"
              value={longitude} 
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="e.g., 78.9629"
              style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
            />
          </div>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Address</label>
          <input 
            type="text" 
            value={address} 
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address or landmark"
            style={{ width: '100%', padding: '10px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{ padding: '10px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={() => onSave({ latitude, longitude, address })}
            disabled={!latitude || !longitude}
            style={{ padding: '10px 20px', background: latitude && longitude ? '#10b981' : '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', cursor: latitude && longitude ? 'pointer' : 'not-allowed' }}
          >
            Save Location
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Auth Components ---
const AuthPage = ({ onLogin, showToast }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [emailInput, setEmailInput] = useState(''); // For user input without domain
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-add domain based on role
  const getDomainForRole = (r) => {
    switch (r) {
      case 'admin': return '@landmail.com';
      case 'employee': return '@empmail.com';
      case 'customer': return '@custmail.com';
      default: return '@gmail.com';
    }
  };

  // Get allowed domains for each role
  const getAllowedDomains = (r) => {
    switch (r) {
      case 'admin': return ['landmail.com'];
      case 'employee': return ['empmail.com'];
      case 'customer': return ['custmail.com'];
      default: return ['gmail.com', 'landmail.com', 'empmail.com', 'custmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com', 'icloud.com', 'mail.com', 'protonmail.com'];
    }
  };

  // Handle email input change - strip any domain and add correct one
  const handleEmailInputChange = (e) => {
    let value = e.target.value;
    // If user enters @ symbol, strip everything after it
    if (value.includes('@')) {
      value = value.split('@')[0];
    }
    // Remove any dots or spaces that might be accidentally added
    value = value.replace(/[@.]/g, '');
    
    setEmailInput(value);
    const domain = getDomainForRole(role);
    setEmail(value + domain);
  };

  // Prevent typing @ and . in email input
  const handleEmailKeyDown = (e) => {
    if (e.key === '@' || e.key === '.') {
      e.preventDefault();
    }
  };

  // Update email when role changes
  useEffect(() => {
    if (role) {
      const domain = getDomainForRole(role);
      // Strip any existing domain from emailInput and add correct one
      const cleanInput = emailInput.split('@')[0];
      setEmail(cleanInput + domain);
    }
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate email - only allowed domain based on role
    const validateEmail = (email, role) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return { valid: false, message: 'Please enter a valid email address' };
      
      const domain = email.split('@')[1]?.toLowerCase();
      const allowedDomains = getAllowedDomains(role);
      
      // For role-based login, only allow specific domain
      if (role === 'admin' && domain !== 'landmail.com') {
        return { valid: false, message: 'Admin must use @landmail.com email' };
      }
      if (role === 'employee' && domain !== 'empmail.com') {
        return { valid: false, message: 'Employee must use @empmail.com email' };
      }
      if (role === 'customer' && domain !== 'custmail.com') {
        return { valid: false, message: 'Customer must use @custmail.com email' };
      }
      
      return { valid: true, message: 'Valid email' };
    };
    
    // Validate password strength
    const validatePassword = (password) => {
      if (!password || password.length < 8) return { valid: false, message: 'Password must be at least 8 characters' };
      if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter' };
      if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain at least one lowercase letter' };
      if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one number' };
      if (!/[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>\/?]/.test(password)) return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*...)' };
      return { valid: true, message: 'Password is strong' };
    };
    
    // Validate email
    const emailValidation = validateEmail(email, role);
    if (!emailValidation.valid) {
      showToast(emailValidation.message, 'error');
      setLoading(false);
      return;
    }
    
    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      showToast(passwordValidation.message, 'error');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        onLogin(data);
      } else {
        showToast(data.message || 'Invalid credentials', 'error');
      }
    } catch (error) {
      showToast('Server error. Make sure backend is running.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'url("https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1920") center/cover no-repeat',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.85) 0%, rgba(22, 33, 62, 0.75) 50%, rgba(15, 52, 96, 0.85) 100%)',
        backdropFilter: 'blur(3px)'
      }} />
      
      {/* Decorative floating elements */}
      <div style={{
        position: 'absolute',
        top: '8%',
        left: '8%',
        width: '180px',
        height: '180px',
        border: '2px solid rgba(102, 126, 234, 0.25)',
        borderRadius: '50%',
        animation: 'float 6s ease-in-out infinite',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '12%',
        right: '8%',
        width: '120px',
        height: '120px',
        border: '2px solid rgba(118, 75, 162, 0.25)',
        borderRadius: '30px',
        transform: 'rotate(45deg)',
        animation: 'float 8s ease-in-out infinite reverse',
        zIndex: 0
      }} />

        {/* Main Card with glass effect - Updated styling */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          boxShadow: '0 20px 60px -10px rgba(0, 0, 0, 0.3), 0 0 30px rgba(102, 126, 234, 0.2)',
          padding: '40px 35px',
          width: '100%',
          maxWidth: '420px',
          position: 'relative',
          zIndex: 1,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          borderTop: '1px solid rgba(255, 255, 255, 0.9)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.9)'
        }}>
        {/* Logo Section */}
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 22px',
            fontSize: '38px',
            boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)'
          }}>
            🏠
          </div>
          <h1 style={{ 
            margin: '0 0 6px 0', 
            color: '#1a1a2e',
            fontSize: '28px',
            fontWeight: '800',
            letterSpacing: '-0.5px'
          }}>
            Land Management
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
            Welcome back! Please sign in below
          </p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Role Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              👤 Select Role
            </label>
            <select 
              value={role} 
              onChange={(e) => setRole(e.target.value)} 
              required
              style={{
                padding: '15px 18px',
                border: '2px solid #e5e7eb',
                borderRadius: '14px',
                fontSize: '15px',
                transition: 'all 0.3s ease',
                background: '#fff',
                color: '#1a1a2e',
                width: '100%',
                cursor: 'pointer',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">Choose your role</option>
              <option value="admin">👑 Admin - Land Management</option>
              <option value="employee">🏢 Employee - Collect Payments</option>
              <option value="customer">👤 Customer - View & Pay</option>
            </select>
          </div>
          
          {/* Email Field */}
          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              📧 Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={emailInput}
                onChange={handleEmailInputChange}
                onKeyDown={handleEmailKeyDown}
                required
                placeholder={role ? "Enter username" : "Select role first"}
                disabled={!role}
                style={{
                  padding: '15px 18px',
                  paddingRight: role ? '130px' : '18px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '14px',
                  fontSize: '15px',
                  transition: 'all 0.3s ease',
                  background: '#fff',
                  color: '#1a1a2e',
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box',
                  opacity: role ? 1 : 0.5
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {role && (
                <div style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#667eea',
                  fontWeight: '700',
                  fontSize: '14px',
                  pointerEvents: 'none'
                }}>
                  {getDomainForRole(role)}
                </div>
              )}
            </div>
            {/* Instruction Box */}
            <div style={{ 
              marginTop: '12px', 
              padding: '12px 16px', 
              background: role ? '#f0fdf4' : '#f3f4f6',
              borderRadius: '10px',
              border: '1px solid ' + (role ? '#bbf7d0' : '#e5e7eb')
            }}>
              <span style={{ fontSize: '13px', color: role ? '#166534' : '#6b7280', fontWeight: '500' }}>
                {role 
                  ? `💡 Just enter username - ${getDomainForRole(role)} added automatically`
                  : '💡 Select your role to see email format'
                }
              </span>
            </div>
          </div>
          
          {/* Password Field */}
          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#374151', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              🔑 Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              style={{
                padding: '15px 18px',
                border: '2px solid #e5e7eb',
                borderRadius: '14px',
                fontSize: '15px',
                transition: 'all 0.3s ease',
                background: '#fff',
                color: '#1a1a2e',
                width: '100%',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          {/* Submit Button */}
          <button type="submit" className="btn" style={{ 
            width: '100%', 
            marginTop: '8px', 
            padding: '18px', 
            fontSize: '16px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            borderRadius: '14px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
            color: 'white',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.5)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
          }}
          disabled={loading}>
            {loading ? '⏳ Signing in...' : '🚀 Sign In'}
          </button>
        </form>
        
        {/* Footer */}
        <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '22px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, fontWeight: '500' }}>
            🔒 Secure Login • Land Management System v2.0
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
};

// --- Admin Dashboard ---
const AdminDashboard = ({ user, onLogout, currentPage, showToast }) => {
  const [lands, setLands] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ totalLands: 0, totalEmployees: 0, totalCustomers: 0, totalRevenue: 0 });
  const [paymentSummary, setPaymentSummary] = useState({ cash: { total: 0, count: 0 }, online: { total: 0, count: 0 } });
  
  // Land details popup state
  const [showLandDetails, setShowLandDetails] = useState(false);
  const [selectedLandDetails, setSelectedLandDetails] = useState(null);

  const [showLandForm, setShowLandForm] = useState(false);
  const [newLand, setNewLand] = useState({ size: '', owner: '', soldDate: '', pricePerMonth: '', installmentTotal: '', details: '', assignedEmployee: null, selectedCustomer: '', location: { latitude: '', longitude: '', address: '' } });
  const [landImage, setLandImage] = useState(null);
  const [editingLand, setEditingLand] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerLand, setMapPickerLand] = useState(null);

  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', password: '' });
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', email: '', password: '' });
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [showAdminForm, setShowAdminForm] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });

  // Payment editing state
  const [editingPayment, setEditingPayment] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPayment, setNewPayment] = useState({ landId: '', customerId: '', employeeId: '', date: '', amount: '', mode: 'cash', status: 'paid' });
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [addPaymentType, setAddPaymentType] = useState('single');
  const [addSelectedMonths, setAddSelectedMonths] = useState(1);
  const [auditLogs, setAuditLogs] = useState([]);

  // Auto-fill amount when status is 'due'
  useEffect(() => {
    if (newPayment.status === 'due' && newPayment.landId && lands.length > 0) {
      const land = lands.find(l => l._id === newPayment.landId);
      if (land) {
        let calculatedAmount = 0;
        if (addPaymentType === 'single') {
          calculatedAmount = parseInt(land.pricePerMonth) || 0;
        } else if (addPaymentType === 'months') {
          calculatedAmount = (parseInt(land.pricePerMonth) || 0) * addSelectedMonths;
        } else if (addPaymentType === 'full') {
          const landPayments = payments.filter(p => {
            const paymentLandId = p.landId?._id || p.landId;
            return String(paymentLandId) === String(land._id) && p.status === 'paid';
          });
          const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          const totalAmount = (parseInt(land.pricePerMonth) || 0) * (parseInt(land.installmentTotal) || 0);
          calculatedAmount = Math.max(0, totalAmount - totalPaid);
        }
        setNewPayment(prev => ({ ...prev, amount: calculatedAmount }));
      }
    }
  }, [newPayment.status, newPayment.landId, addPaymentType, addSelectedMonths, lands, payments]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [landsRes, employeesRes, customersRes, adminsRes, paymentsRes, statsRes, summaryRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/lands`),
        fetch(`${API_URL}/employees`),
        fetch(`${API_URL}/customers`),
        fetch(`${API_URL}/admins`),
        fetch(`${API_URL}/payments`),
        fetch(`${API_URL}/stats/admin`),
        fetch(`${API_URL}/reports/payments`),
        fetch(`${API_URL}/auditlogs`)
      ]);

      const landsData = await landsRes.json();
      const employeesData = await employeesRes.json();
      const customersData = await customersRes.json();
      const adminsData = await adminsRes.json();
      const paymentsData = await paymentsRes.json();
      const statsData = await statsRes.json();
      const summaryData = await summaryRes.json();
      const logsData = await logsRes.json();

      setLands(landsData);
      setEmployees(employeesData);
      setCustomers(customersData);
      setAdmins(adminsData);
      setPayments(paymentsData);
      setStats(statsData);
      setPaymentSummary(summaryData);
      setAuditLogs(logsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddLand = async (e) => {
    e.preventDefault();
    
    // Validate location is required - check for valid numbers, not empty strings
    const lat = newLand.location?.latitude;
    const lng = newLand.location?.longitude;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (!lat || !lng || isNaN(latNum) || isNaN(lngNum) || latNum === 0 || lngNum === 0) {
      showToast('Please set the land location on the map', 'error');
      return;
    }
    
    // Validate image is required for new land (not editing)
    if (!editingLand && !landImage) {
      showToast('Please upload a land image', 'error');
      return;
    }
    
    // Validate employee is required for new land (not editing)
    if (!editingLand && !newLand.assignedEmployee) {
      showToast('Please assign an employee to this land', 'error');
      return;
    }
    
    try {
      // Get selected customer details
      const selectedCustomer = customers.find(c => c._id === newLand.selectedCustomer);
      const ownerName = selectedCustomer ? selectedCustomer.name : newLand.owner;
      
      const formData = new FormData();
      formData.append('size', newLand.size);
      formData.append('owner', ownerName);
      formData.append('ownerId', newLand.selectedCustomer || '');
      formData.append('soldDate', newLand.soldDate);
      formData.append('pricePerMonth', newLand.pricePerMonth);
      formData.append('installmentTotal', newLand.installmentTotal);
      formData.append('details', newLand.details);
      formData.append('assignedEmployee', newLand.assignedEmployee || '');
      if (newLand.location) {
        formData.append('location', JSON.stringify(newLand.location));
      }
      if (landImage) {
        formData.append('image', landImage);
      }

      const response = await fetch(`${API_URL}/lands`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const land = await response.json();
        setLands([...lands, land]);
        setNewLand({ size: '', owner: '', soldDate: '', pricePerMonth: '', installmentTotal: '', details: '', assignedEmployee: null, selectedCustomer: '', location: { latitude: '', longitude: '', address: '' } });
        setLandImage(null);
        setShowLandForm(false);
        fetchData();
        showToast('Land added successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Error adding land', 'error');
      }
    } catch (error) {
      console.error('Error adding land:', error);
      showToast('Error adding land', 'error');
    }
  };

  const handleEditLand = (land) => {
    setEditingLand(land);
    setNewLand({
      size: land.size,
      owner: land.owner,
      soldDate: land.soldDate ? new Date(land.soldDate).toISOString().split('T')[0] : '',
      pricePerMonth: land.pricePerMonth,
      installmentTotal: land.installmentTotal,
      details: land.details,
      assignedEmployee: land.assignedEmployee?._id || land.assignedEmployee || null,
      selectedCustomer: land.ownerId?._id || land.ownerId || '',
      location: land.location || { latitude: '', longitude: '', address: '' }
    });
    setLandImage(null);
    setShowLandForm(true);
    setShowMapPicker(false); // Don't auto-open map picker, location is pre-filled
  };

  const handleUpdateLand = async (e) => {
    e.preventDefault();
    
    // Validate location is required - check for valid numbers, not empty strings
    const lat = newLand.location?.latitude;
    const lng = newLand.location?.longitude;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (!lat || !lng || isNaN(latNum) || isNaN(lngNum) || latNum === 0 || lngNum === 0) {
      showToast('Please set the land location on the map', 'error');
      return;
    }
    
    try {
      // Get selected customer details
      const selectedCustomer = customers.find(c => c._id === newLand.selectedCustomer);
      const ownerName = selectedCustomer ? selectedCustomer.name : newLand.owner;
      
      // If there's a new image, use FormData
      if (landImage) {
        const formData = new FormData();
        formData.append('size', newLand.size);
        formData.append('owner', ownerName);
        formData.append('ownerId', newLand.selectedCustomer || '');
        formData.append('soldDate', newLand.soldDate);
        formData.append('pricePerMonth', newLand.pricePerMonth);
        formData.append('installmentTotal', newLand.installmentTotal);
        formData.append('details', newLand.details);
        formData.append('assignedEmployee', newLand.assignedEmployee || '');
        if (newLand.location) {
          formData.append('location', JSON.stringify(newLand.location));
        }
        formData.append('image', landImage);

        const response = await fetch(`${API_URL}/lands/${editingLand._id}`, {
          method: 'PUT',
          body: formData
        });

        if (response.ok) {
          const updatedLand = await response.json();
          setLands(lands.map(l => l._id === editingLand._id ? updatedLand : l));
          setNewLand({ size: '', owner: '', soldDate: '', pricePerMonth: '', installmentTotal: '', details: '', assignedEmployee: null, selectedCustomer: '', location: { latitude: '', longitude: '', address: '' } });
          setLandImage(null);
          setShowLandForm(false);
          setEditingLand(null);
          fetchData();
        }
      } else {
        // No new image, use JSON
        const response = await fetch(`${API_URL}/lands/${editingLand._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...newLand,
            owner: ownerName,
            ownerId: newLand.selectedCustomer || ''
          })
        });

        if (response.ok) {
          const updatedLand = await response.json();
          setLands(lands.map(l => l._id === editingLand._id ? updatedLand : l));
          setNewLand({ size: '', owner: '', soldDate: '', pricePerMonth: '', installmentTotal: '', details: '', assignedEmployee: null, selectedCustomer: '', location: { latitude: '', longitude: '', address: '' } });
          setLandImage(null);
          setShowLandForm(false);
          setEditingLand(null);
          fetchData();
        }
      }
    } catch (error) {
      console.error('Error updating land:', error);
    }
  };

  const handleDeleteLand = async (landId) => {
    if (!window.confirm('Are you sure you want to delete this land?')) return;
    try {
      const response = await fetch(`${API_URL}/lands/${landId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setLands(lands.filter(l => l._id !== landId));
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting land:', error);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    // Validate email - only @empmail.com allowed
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmployee.email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    const domain = newEmployee.email.split('@')[1]?.toLowerCase();
    if (domain !== 'empmail.com') {
      showToast('Employee email must use @empmail.com domain', 'error');
      return;
    }
    
    // Validate password strength
    if (!newEmployee.password || newEmployee.password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    if (!/[A-Z]/.test(newEmployee.password)) {
      showToast('Password must contain at least one uppercase letter', 'error');
      return;
    }
    if (!/[a-z]/.test(newEmployee.password)) {
      showToast('Password must contain at least one lowercase letter', 'error');
      return;
    }
    if (!/[0-9]/.test(newEmployee.password)) {
      showToast('Password must contain at least one number', 'error');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>\/?]/.test(newEmployee.password)) {
      showToast('Password must contain at least one special character (!@#$%^&*...)', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      });

      if (response.ok) {
        const employee = await response.json();
        setEmployees([...employees, employee]);
        setNewEmployee({ name: '', email: '', password: '' });
        setShowEmployeeForm(false);
        fetchData();
        showToast('Employee added successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Error adding employee', 'error');
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      showToast('Error adding employee', 'error');
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setNewEmployee({
      name: employee.name,
      email: employee.email,
      password: ''
    });
    setShowEmployeeForm(true);
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/employees/${editingEmployee._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      });

      if (response.ok) {
        const updatedEmployee = await response.json();
        setEmployees(employees.map(e => e._id === editingEmployee._id ? updatedEmployee : e));
        setNewEmployee({ name: '', email: '', password: '' });
        setShowEmployeeForm(false);
        setEditingEmployee(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating employee:', error);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      const response = await fetch(`${API_URL}/employees/${employeeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setEmployees(employees.filter(e => e._id !== employeeId));
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    
    // Validate email - only @custmail.com allowed
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newCustomer.email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    const domain = newCustomer.email.split('@')[1]?.toLowerCase();
    if (domain !== 'custmail.com') {
      showToast('Customer email must use @custmail.com domain', 'error');
      return;
    }
    
    // Validate password strength
    if (!newCustomer.password || newCustomer.password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    if (!/[A-Z]/.test(newCustomer.password)) {
      showToast('Password must contain at least one uppercase letter', 'error');
      return;
    }
    if (!/[a-z]/.test(newCustomer.password)) {
      showToast('Password must contain at least one lowercase letter', 'error');
      return;
    }
    if (!/[0-9]/.test(newCustomer.password)) {
      showToast('Password must contain at least one number', 'error');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>\/?]/.test(newCustomer.password)) {
      showToast('Password must contain at least one special character (!@#$%^&*...)', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });

      if (response.ok) {
        const customer = await response.json();
        setCustomers([...customers, customer]);
        setNewCustomer({ name: '', email: '', password: '' });
        setShowCustomerForm(false);
        fetchData();
        showToast('Customer added successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Error adding customer', 'error');
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      showToast('Error adding customer', 'error');
    }
  };

  const handleEditCustomer = (customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      email: customer.email,
      password: ''
    });
    setShowCustomerForm(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/customers/${editingCustomer._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });

      if (response.ok) {
        const updatedCustomer = await response.json();
        setCustomers(customers.map(c => c._id === editingCustomer._id ? updatedCustomer : c));
        setNewCustomer({ name: '', email: '', password: '' });
        setShowCustomerForm(false);
        setEditingCustomer(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      const response = await fetch(`${API_URL}/customers/${customerId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setCustomers(customers.filter(c => c._id !== customerId));
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    
    // Validate email - only @landmail.com allowed
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAdmin.email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }
    const domain = newAdmin.email.split('@')[1]?.toLowerCase();
    if (domain !== 'landmail.com') {
      showToast('Admin email must use @landmail.com domain', 'error');
      return;
    }
    
    // Validate password strength
    if (!newAdmin.password || newAdmin.password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }
    if (!/[A-Z]/.test(newAdmin.password)) {
      showToast('Password must contain at least one uppercase letter', 'error');
      return;
    }
    if (!/[a-z]/.test(newAdmin.password)) {
      showToast('Password must contain at least one lowercase letter', 'error');
      return;
    }
    if (!/[0-9]/.test(newAdmin.password)) {
      showToast('Password must contain at least one number', 'error');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};:"\\|,.<>\/?]/.test(newAdmin.password)) {
      showToast('Password must contain at least one special character (!@#$%^&*...)', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin)
      });

      if (response.ok) {
        const admin = await response.json();
        setAdmins([...admins, admin]);
        setNewAdmin({ name: '', email: '', password: '' });
        setShowAdminForm(false);
        fetchData();
        showToast('Admin added successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Error adding admin', 'error');
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      showToast('Error adding admin', 'error');
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    try {
      const response = await fetch(`${API_URL}/admins/${adminId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAdmins(admins.filter(a => a._id !== adminId));
        fetchData();
        showToast('Admin deleted successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Error deleting admin', 'error');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      showToast('Error deleting admin', 'error');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;
    try {
      const response = await fetch(`${API_URL}/payments/${paymentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPayments(payments.filter(p => p._id !== paymentId));
        fetchData();
        
        // Log to audit
        await fetch(`${API_URL}/auditlogs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'payment_deleted',
            description: `Payment deleted`,
            userId: user._id,
            userName: user.name,
            userRole: 'admin',
            entityType: 'payment',
            entityId: paymentId
          })
        });
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  const handleRefundPayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to refund this payment?')) return;
    try {
      const response = await fetch(`${API_URL}/payments/${paymentId}/refund`, {
        method: 'POST'
      });

      if (response.ok) {
        // Log to audit FIRST
        await fetch(`${API_URL}/auditlogs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'payment_refund',
            description: `Payment refunded`,
            userId: user._id,
            userName: user.name,
            userRole: 'admin',
            entityType: 'payment',
            entityId: paymentId
          })
        });
        
        // THEN fetch data
        fetchData();
        showToast('Payment refunded successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Error refunding payment', 'error');
      }
    } catch (error) {
      console.error('Error refunding payment:', error);
    }
  };

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundData, setRefundData] = useState({ landId: '', paymentId: '', amount: '', mode: 'cash', date: new Date().toISOString().split('T')[0] });

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    if (!refundData.paymentId) {
      showToast('Please select a payment to refund', 'error');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/payments/${refundData.paymentId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: refundData.amount,
          mode: refundData.mode,
          date: refundData.date
        })
      });

      if (response.ok) {
        // Log to audit FIRST
        await fetch(`${API_URL}/auditlogs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'payment_refund',
            description: `Payment of ₹${refundData.amount} refunded for land`,
            userId: user._id,
            userName: user.name,
            userRole: 'admin',
            entityType: 'payment',
            entityId: refundData.paymentId,
            details: { amount: refundData.amount, mode: refundData.mode, date: refundData.date }
          })
        });
        
        // THEN fetch data
        fetchData();
        showToast('Payment refunded successfully!', 'success');
        setShowRefundForm(false);
        setRefundData({ landId: '', paymentId: '', amount: '', mode: 'cash', date: new Date().toISOString().split('T')[0] });
      } else {
        const error = await response.json();
        showToast(error.message || 'Error refunding payment', 'error');
      }
    } catch (error) {
      console.error('Error refunding payment:', error);
    }
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setNewPayment({
      landId: payment.landId?._id || payment.landId || '',
      customerId: payment.customerId?._id || payment.customerId || '',
      employeeId: payment.employeeId?._id || payment.employeeId || '',
      date: payment.date ? new Date(payment.date).toISOString().split('T')[0] : '',
      amount: payment.amount || '',
      mode: payment.mode || 'cash',
      status: payment.status || 'paid'
    });
    setShowPaymentForm(true);
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/payments/${editingPayment._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment)
      });

      if (response.ok) {
        const updatedPayment = await response.json();
        setPayments(payments.map(p => p._id === editingPayment._id ? updatedPayment : p));
        setNewPayment({ landId: '', customerId: '', employeeId: '', date: '', amount: '', mode: 'cash', status: 'paid' });
        setShowPaymentForm(false);
        setEditingPayment(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const handleAddNewPayment = async (e) => {
    e.preventDefault();
    
    // Calculate payment amount based on payment type
    let amount = parseInt(newPayment.amount) || 0;
    
    if (addPaymentType === 'full' && newPayment.landId) {
      const land = lands.find(l => l._id === newPayment.landId);
      if (land) {
        try {
          const response = await fetch(`${API_URL}/payments`);
          const allPayments = await response.json();
          const landPayments = allPayments.filter(p => {
            const paymentLandId = p.landId?._id || p.landId;
            return String(paymentLandId) === String(land._id) && p.status === 'paid';
          });
          const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
          amount = Math.max(0, totalAmount - totalPaid);
        } catch (error) {
          console.error('Error calculating full payment:', error);
          amount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
        }
      }
    } else if (addPaymentType === 'months' && newPayment.landId) {
      const land = lands.find(l => l._id === newPayment.landId);
      if (land) {
        amount = (land.pricePerMonth || 0) * addSelectedMonths;
      }
    }
    
    if (amount <= 0) {
      showToast('No remaining balance to pay!', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPayment,
          amount: amount
        })
      });

      if (response.ok) {
        const payment = await response.json();
        setPayments([...payments, payment]);
        setNewPayment({ landId: '', customerId: '', employeeId: '', date: '', amount: '', mode: 'cash', status: 'paid' });
        setShowAddPaymentForm(false);
        setAddPaymentType('single');
        setAddSelectedMonths(1);
        
        // Log to audit FIRST
        const land = lands.find(l => l._id === newPayment.landId);
        await fetch(`${API_URL}/auditlogs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'payment_added',
            description: `Payment of ₹${amount.toLocaleString()} added for land ${land?.size || 'N/A'} (${newPayment.status})`,
            userId: user._id,
            userName: user.name,
            userRole: 'admin',
            entityType: 'payment',
            entityId: payment._id,
            details: { amount, status: newPayment.status, mode: newPayment.mode, landId: newPayment.landId }
          })
        });
        
        // THEN fetch data to get the new audit log
        fetchData();
        showToast('Payment added successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Error adding payment', 'error');
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      showToast('Error adding payment', 'error');
    }
  };

  const handleAssignEmployee = async (landId, employeeId) => {
    const isUnassigning = !employeeId;
    try {
      const response = await fetch(`${API_URL}/lands/${landId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedEmployee: employeeId || null })
      });

      if (response.ok) {
        const updatedLand = await response.json();
        setLands(lands.map(land => land._id === landId ? updatedLand : land));
        showToast(isUnassigning ? 'Employee unassigned successfully!' : 'Employee assigned successfully!', 'success');
      }
    } catch (error) {
      console.error('Error assigning employee:', error);
    }
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">🏠</div>
                <div className="stat-content">
                  <h3>Total Lands</h3>
                  <div className="number">{stats.totalLands}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">👥</div>
                <div className="stat-content">
                  <h3>Employees</h3>
                  <div className="number">{stats.totalEmployees}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">👤</div>
                <div className="stat-content">
                  <h3>Customers</h3>
                  <div className="number">{stats.totalCustomers}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">💰</div>
                <div className="stat-content">
                  <h3>Total Revenue</h3>
                  <div className="number">₹{stats.totalRevenue?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
          </>
        );
      case 'lands':
        return (
          <div className="section">
            <h2>Land Management</h2>
            <button className="btn" onClick={() => setShowLandForm(!showLandForm)}>
              {showLandForm ? 'Cancel' : 'Add New Land'}
            </button>
            {showLandForm && (
              <form onSubmit={editingLand ? handleUpdateLand : handleAddLand} className="auth-form" encType="multipart/form-data">
                <input type="text" placeholder="Land Size" value={newLand.size} onChange={(e) => setNewLand({...newLand, size: e.target.value})} required />
                <select value={newLand.selectedCustomer || ''} onChange={(e) => {
                  const cust = customers.find(c => c._id === e.target.value);
                  setNewLand({...newLand, selectedCustomer: e.target.value, owner: cust ? cust.name : ''});
                }} required>
                  <option value="">Select Existing Customer</option>
                  {customers.map(cust => (
                    <option key={cust._id} value={cust._id}>{cust.name} ({cust.email})</option>
                  ))}
                </select>
                <input 
                  type="date" 
                  placeholder="Sold Date" 
                  value={newLand.soldDate} 
                  onChange={(e) => setNewLand({...newLand, soldDate: e.target.value})} 
                  onClick={(e) => e.target.showPicker?.()}
                  required 
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px', 
                    border: '2px solid #e2e8f0', 
                    borderRadius: '12px', 
                    fontSize: '1rem', 
                    background: '#fff', 
                    color: '#2d3748',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                />
                <input type="number" placeholder="Price per Month (₹)" value={newLand.pricePerMonth} onChange={(e) => setNewLand({...newLand, pricePerMonth: e.target.value})} required />
                <input type="number" placeholder="Installment Total" value={newLand.installmentTotal} onChange={(e) => setNewLand({...newLand, installmentTotal: e.target.value})} required />
                <textarea placeholder="Land Details" value={newLand.details} onChange={(e) => setNewLand({...newLand, details: e.target.value})} required />
                <select value={newLand.assignedEmployee || ''} onChange={(e) => setNewLand({...newLand, assignedEmployee: e.target.value || null})} required>
                  <option value="">Select Employee *</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: editingLand && landImage ? '#166534' : '#dc2626' }}>📷 Land Image {editingLand ? '(leave empty to keep existing)' : '*'}</label>
                  {editingLand && editingLand?.image && !landImage && (
                    <div style={{ marginBottom: '10px', padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #22c55e' }}>
                      <div style={{ fontSize: '12px', color: '#166534', marginBottom: '5px' }}>Current Image:</div>
                      <img src={`http://localhost:5000${editingLand.image}`} alt="Current Land" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={(e) => setLandImage(e.target.files[0])} style={{ width: '100%' }} />
                  {editingLand && !landImage && editingLand?.image && (
                    <div style={{ marginTop: '5px', fontSize: '12px', color: '#6b7280' }}>
                      ✓ Current image will be kept
                    </div>
                  )}
                </div>
                
                {/* Location Section */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, color: '#dc2626' }}>📍 Land Location *</label>
                  {(() => {
                    const loc = newLand.location || {};
                    const hasLat = loc.latitude && parseFloat(loc.latitude) !== 0;
                    const hasLng = loc.longitude && parseFloat(loc.longitude) !== 0;
                    const hasLocation = hasLat && hasLng;
                    return (
                      <>
                        <button 
                          type="button" 
                          onClick={() => setShowMapPicker(true)}
                          style={{ 
                            width: '100%', 
                            padding: '12px', 
                            background: hasLocation ? '#f0fdf4' : '#fef3c7', 
                            border: `2px solid ${hasLocation ? '#22c55e' : '#dc2626'}`, 
                            borderRadius: '8px', 
                            cursor: 'pointer',
                            color: '#166534',
                            fontWeight: '600'
                          }}
                        >
                          {hasLocation ? '✓ Location Set - Click to Edit' : '🗺️ Set Location on Map (Required)'}
                        </button>
                        {hasLocation ? (
                          <div style={{ marginTop: '10px', fontSize: '12px', color: '#166534' }}>
                            ✓ Lat: {loc.latitude}, Lng: {loc.longitude}
                            {loc.address && ` - ${loc.address}`}
                          </div>
                        ) : (
                          <div style={{ marginTop: '10px', fontSize: '12px', color: '#dc2626' }}>
                            ⚠️ Please set the land location on the map
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                
                <MapPickerModal 
                  isOpen={showMapPicker}
                  onClose={() => setShowMapPicker(false)}
                  initialLat={parseFloat(newLand.location?.latitude) || newLand.location?.latitude || ''}
                  initialLng={parseFloat(newLand.location?.longitude) || newLand.location?.longitude || ''}
                  initialAddress={newLand.location?.address || ''}
                  onSave={(location) => {
                    setNewLand({...newLand, location});
                    setShowMapPicker(false);
                  }}
                />
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn">{editingLand ? 'Update Land' : 'Save Land'}</button>
                  {editingLand && <button type="button" className="btn" style={{ background: '#dc2626' }} onClick={() => { setShowLandForm(false); setEditingLand(null); setNewLand({ size: '', owner: '', soldDate: '', pricePerMonth: '', installmentTotal: '', details: '', assignedEmployee: null, selectedCustomer: '', location: { latitude: '', longitude: '', address: '' } }); setLandImage(null); }}>Cancel</button>}
                </div>
              </form>
            )}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Land ID</th>
                    <th>Size</th>
                    <th>Owner</th>
                    <th>Sold Date</th>
                    <th>Price/Month</th>
                    <th>Installments</th>
                    <th>Details</th>
                    <th>Assigned Employee</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lands.map(land => (
                    <tr key={land._id}>
                      <td>
                        {land.image && land.image.length > 0 ? (
                          <img src={`http://localhost:5000${land.image}`} alt="Land" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px' }} onError={(e) => {e.target.style.display = 'none'}} />
                        ) : (
                          <div style={{ width: '50px', height: '50px', background: '#ddd', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏠</div>
                        )}
                      </td>
                      <td>{land.landId || land._id.slice(-6)}</td>
                      <td>{land.size}</td>
                      <td>{land.owner}</td>
                      <td>{new Date(land.soldDate).toLocaleDateString()}</td>
                      <td>₹{land.pricePerMonth}</td>
                      <td>{land.installmentTotal}</td>
                      <td>{land.details}</td>
                      <td>
                        {land.assignedEmployee ? land.assignedEmployee.name : 'Unassigned'}
                      </td>
                      <td>
                        <select 
                          value={land.assignedEmployee?._id || ''}
                          onChange={(e) => handleAssignEmployee(land._id, e.target.value)}
                        >
                          <option value="">Assign Employee</option>
                          {employees.map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#8b5cf6' }} onClick={() => { setSelectedLandDetails(land); setShowLandDetails(true); }}>👁️ View</button>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#3b82f6' }} onClick={() => handleEditLand(land)}>Edit</button>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#dc2626' }} onClick={() => handleDeleteLand(land._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'employees':
        return (
          <div className="section">
            <h2>Employee Credentials</h2>
            <button className="btn" onClick={() => setShowEmployeeForm(!showEmployeeForm)}>
              {showEmployeeForm ? 'Cancel' : 'Add New Employee'}
            </button>
            {showEmployeeForm && (
              <form onSubmit={editingEmployee ? handleUpdateEmployee : handleAddEmployee} className="auth-form">
                <input type="text" placeholder="Employee Name" value={newEmployee.name} onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})} required />
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Username (email will auto-add @empmail.com)" 
                    value={newEmployee.email.replace('@empmail.com', '')} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[@.]/g, '');
                      setNewEmployee({...newEmployee, email: val + '@empmail.com'});
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '@' || e.key === '.') {
                        e.preventDefault();
                      }
                    }}
                    required 
                    style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#667eea', fontWeight: '600', fontSize: '12px' }}>@empmail.com</div>
                </div>
                <input type="password" placeholder={editingEmployee ? "New Password (leave blank to keep current)" : "Password"} value={newEmployee.password} onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})} required={!editingEmployee} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn">{editingEmployee ? 'Update Employee' : 'Save Employee'}</button>
                  {editingEmployee && <button type="button" className="btn" style={{ background: '#dc2626' }} onClick={() => { setShowEmployeeForm(false); setEditingEmployee(null); setNewEmployee({ name: '', email: '', password: '' }); }}>Cancel</button>}
                </div>
              </form>
            )}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Emp ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Password</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp._id}>
                      <td>{emp.userId || emp._id.slice(-6)}</td>
                      <td>{emp.name}</td>
                      <td>{emp.email}</td>
                      <td>••••••••</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#3b82f6' }} onClick={() => handleEditEmployee(emp)}>Edit</button>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#dc2626' }} onClick={() => handleDeleteEmployee(emp._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'customers':
        return (
          <div className="section">
            <h2>Customer Credentials</h2>
            <button className="btn" onClick={() => { setShowCustomerForm(!showCustomerForm); if (!showCustomerForm) { setEditingCustomer(null); setNewCustomer({ name: '', email: '', password: '' }); } }}>
              {showCustomerForm ? 'Cancel' : 'Add New Customer'}
            </button>
            {showCustomerForm && (
              <form onSubmit={editingCustomer ? handleUpdateCustomer : handleAddCustomer} className="auth-form">
                <input type="text" placeholder="Customer Name" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} required />
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Username (email will auto-add @custmail.com)" 
                    value={newCustomer.email.replace('@custmail.com', '')} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[@.]/g, '');
                      setNewCustomer({...newCustomer, email: val + '@custmail.com'});
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '@' || e.key === '.') {
                        e.preventDefault();
                      }
                    }}
                    required 
                    style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#667eea', fontWeight: '600', fontSize: '12px' }}>@custmail.com</div>
                </div>
                <input type="password" placeholder={editingCustomer ? "New Password (leave blank to keep current)" : "Password"} value={newCustomer.password} onChange={(e) => setNewCustomer({...newCustomer, password: e.target.value})} required={!editingCustomer} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn">{editingCustomer ? 'Update Customer' : 'Save Customer'}</button>
                  {editingCustomer && <button type="button" className="btn" style={{ background: '#dc2626' }} onClick={() => { setShowCustomerForm(false); setEditingCustomer(null); setNewCustomer({ name: '', email: '', password: '' }); }}>Cancel</button>}
                </div>
              </form>
            )}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Cust ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Password</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(cust => (
                    <tr key={cust._id}>
                      <td>{cust.userId || cust._id.slice(-6)}</td>
                      <td>{cust.name}</td>
                      <td>{cust.email}</td>
                      <td>••••••••</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#3b82f6' }} onClick={() => handleEditCustomer(cust)}>Edit</button>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#dc2626' }} onClick={() => handleDeleteCustomer(cust._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'admins':
        return (
          <div className="section">
            <h2>Admin Management</h2>
            <button className="btn" onClick={() => setShowAdminForm(!showAdminForm)}>
              {showAdminForm ? 'Cancel' : 'Add New Admin'}
            </button>
            {showAdminForm && (
              <form onSubmit={handleAddAdmin} className="auth-form">
                <input type="text" placeholder="Admin Name" value={newAdmin.name} onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})} required />
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Username (email will auto-add @landmail.com)" 
                    value={newAdmin.email.replace('@landmail.com', '')} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/[@.]/g, '');
                      setNewAdmin({...newAdmin, email: val + '@landmail.com'});
                    }}
                    onKeyDown={(e) => {
                      if (e.key === '@' || e.key === '.') {
                        e.preventDefault();
                      }
                    }}
                    required 
                    style={{ width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#667eea', fontWeight: '600', fontSize: '12px' }}>@landmail.com</div>
                </div>
                <input type="password" placeholder="Password (min 8 chars, uppercase, lowercase, number, special)" value={newAdmin.password} onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})} required />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn">Save Admin</button>
                  <button type="button" className="btn" style={{ background: '#dc2626' }} onClick={() => { setShowAdminForm(false); setNewAdmin({ name: '', email: '', password: '' }); }}>Cancel</button>
                </div>
              </form>
            )}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Admin ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Password</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map(admin => (
                    <tr key={admin._id}>
                      <td>{admin.userId || admin._id.slice(-6)}</td>
                      <td>{admin.name}</td>
                      <td>{admin.email}</td>
                      <td>••••••••</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#dc2626' }} onClick={() => handleDeleteAdmin(admin._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'payments':
        return (
          <div className="section">
            <h2>Payment Management</h2>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button className="btn" onClick={() => { setShowAddPaymentForm(!showAddPaymentForm); setShowPaymentForm(false); setEditingPayment(null); setShowRefundForm(false); setNewPayment({ landId: '', customerId: '', employeeId: '', date: '', amount: '', mode: 'cash', status: 'paid' }); setAddPaymentType('single'); setAddSelectedMonths(1); }}>
                {showAddPaymentForm ? 'Cancel' : '➕ Add New Payment'}
              </button>
              <button className="btn" style={{ background: '#f59e0b' }} onClick={() => { setShowRefundForm(!showRefundForm); setShowAddPaymentForm(false); setShowPaymentForm(false); setEditingPayment(null); setRefundData({ landId: '', paymentId: '', amount: '', mode: 'cash', date: new Date().toISOString().split('T')[0] }); }}>
                {showRefundForm ? 'Cancel' : '💰 Process Refund'}
              </button>
            </div>
            
            {/* Refund Form */}
            {showRefundForm && (
              <form onSubmit={handleRefundSubmit} className="auth-form" style={{ marginBottom: '20px', padding: '20px', background: '#fffbeb', borderRadius: '12px', border: '2px solid #f59e0b' }}>
                <h4 style={{ marginBottom: '15px', color: '#b45309' }}>💰 Process Refund</h4>
                <select value={refundData.landId || ''} onChange={(e) => {
                  setRefundData({ 
                    ...refundData, 
                    landId: e.target.value, 
                    paymentId: '',
                    amount: '' 
                  });
                }} required>
                  <option value="">Select Land</option>
                  {lands.map(land => {
                    const landPayments = payments.filter(p => {
                      const paymentLandId = p.landId?._id || p.landId;
                      return String(paymentLandId) === String(land._id) && p.status === 'paid';
                    });
                    const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
                    const remaining = Math.max(0, totalAmount - totalPaid);
                    return (
                      <option key={land._id} value={land._id}>
                        {land.size} - {land.owner} (Paid: ₹{totalPaid.toLocaleString()} | Remaining: ₹{remaining.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
                
                <select value={refundData.paymentId || ''} onChange={(e) => {
                  const payment = payments.find(p => p._id === e.target.value);
                  setRefundData({ 
                    ...refundData, 
                    paymentId: e.target.value,
                    amount: payment?.amount || '' 
                  });
                }} required>
                  <option value="">Select Payment to Refund</option>
                  {payments.filter(p => {
                    const paymentLandId = p.landId?._id || p.landId;
                    return String(paymentLandId) === String(refundData.landId) && p.status === 'paid';
                  }).map(payment => (
                    <option key={payment._id} value={payment._id}>
                      Payment ₹{payment.amount?.toLocaleString()} - {new Date(payment.date).toLocaleDateString()} ({payment.mode})
                    </option>
                  ))}
                </select>
                
                <input 
                  type="number" 
                  placeholder="Refund Amount" 
                  value={refundData.amount} 
                  onChange={(e) => setRefundData({...refundData, amount: e.target.value})}
                  required
                />
                
                <select value={refundData.mode || 'cash'} onChange={(e) => setRefundData({...refundData, mode: e.target.value})}>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
                
                <input 
                  type="date" 
                  value={refundData.date} 
                  onChange={(e) => setRefundData({...refundData, date: e.target.value})}
                  onClick={(e) => e.target.showPicker?.()}
                  required 
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px', 
                    border: '2px solid #e2e8f0', 
                    borderRadius: '12px', 
                    fontSize: '1rem', 
                    background: 'white', 
                    color: '#2d3748',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                />
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn" style={{ background: '#f59e0b' }}>Process Refund</button>
                  <button type="button" className="btn" style={{ background: '#dc2626' }} onClick={() => { setShowRefundForm(false); setRefundData({ landId: '', paymentId: '', amount: '', mode: 'cash', date: new Date().toISOString().split('T')[0] }); }}>Cancel</button>
                </div>
              </form>
            )}
            {showAddPaymentForm && (
              <form onSubmit={handleAddNewPayment} className="auth-form" style={{ marginBottom: '20px', padding: '20px', background: '#f7fafc', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '15px' }}>Add New Payment</h4>
                <select value={newPayment.landId || ''} onChange={(e) => {
                  const land = lands.find(l => l._id === e.target.value);
                  const monthlyPrice = land?.pricePerMonth || '';
                  setNewPayment({...newPayment, landId: e.target.value, customerId: land?.ownerId?._id || land?.ownerId || '', amount: addPaymentType === 'single' ? monthlyPrice : '' });
                }} required>
                  <option value="">Select Land</option>
                  {lands.map(land => {
                    const landPayments = payments.filter(p => {
                      const paymentLandId = p.landId?._id || p.landId;
                      return String(paymentLandId) === String(land._id) && p.status === 'paid';
                    });
                    const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
                    const remaining = Math.max(0, totalAmount - totalPaid);
                    return (
                      <option key={land._id} value={land._id}>
                        {land.size} - {land.owner} (Monthly: ₹{land.pricePerMonth} | Remaining: ₹{remaining.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
                <select value={newPayment.customerId || ''} onChange={(e) => setNewPayment({...newPayment, customerId: e.target.value})} required>
                  <option value="">Select Customer</option>
                  {customers.map(cust => (
                    <option key={cust._id} value={cust._id}>{cust.name}</option>
                  ))}
                </select>
                <select value={newPayment.employeeId || ''} onChange={(e) => setNewPayment({...newPayment, employeeId: e.target.value})}>
                  <option value="">Select Employee (optional)</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
                <input 
                  type="date" 
                  value={newPayment.date} 
                  onChange={(e) => setNewPayment({...newPayment, date: e.target.value})} 
                  onClick={(e) => e.target.showPicker?.()}
                  required 
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px', 
                    border: '2px solid #e2e8f0', 
                    borderRadius: '12px', 
                    fontSize: '1rem', 
                    background: 'white', 
                    color: '#2d3748',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                />
                
                {/* Payment Type Selection */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="addPaymentType" 
                      value="single" 
                      checked={addPaymentType === 'single'}
                      onChange={(e) => {
                        setAddPaymentType(e.target.value);
                        if (newPayment.landId) {
                          const land = lands.find(l => l._id === newPayment.landId);
                          setNewPayment({...newPayment, amount: land?.pricePerMonth || '' });
                        }
                      }}
                    />
                    Single Month
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="addPaymentType" 
                      value="months" 
                      checked={addPaymentType === 'months'}
                      onChange={(e) => setAddPaymentType(e.target.value)}
                    />
                    Multiple Months
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="addPaymentType" 
                      value="full" 
                      checked={addPaymentType === 'full'}
                      onChange={(e) => setAddPaymentType(e.target.value)}
                    />
                    Full Payment
                  </label>
                </div>
                
                {addPaymentType === 'single' && (
                  <input 
                    type="number" 
                    placeholder={`Amount (default: ₹${newPayment.landId ? lands.find(l => l._id === newPayment.landId)?.pricePerMonth || 0 : 0})`}
                    value={newPayment.amount} 
                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                    required
                  />
                )}
                
                {addPaymentType === 'months' && (
                  <select 
                    value={addSelectedMonths} 
                    onChange={(e) => {
                      const months = parseInt(e.target.value);
                      setAddSelectedMonths(months);
                      if (newPayment.landId) {
                        const land = lands.find(l => l._id === newPayment.landId);
                        setNewPayment({...newPayment, amount: (land?.pricePerMonth || 0) * months });
                      }
                    }}
                  >
                    {(() => {
                      const land = lands.find(l => l._id === newPayment.landId);
                      if (!land) return null;
                      const landPayments = payments.filter(p => {
                        const paymentLandId = p.landId?._id || p.landId;
                        return String(paymentLandId) === String(land._id) && p.status === 'paid';
                      });
                      const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                      const paidMonths = Math.floor(totalPaid / (land.pricePerMonth || 1));
                      const remainingMonths = Math.max(1, (land.installmentTotal || 12) - paidMonths);
                      return Array.from({ length: Math.min(remainingMonths, land.installmentTotal || 12) }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''} - ₹{(land.pricePerMonth || 0) * m}</option>
                      ));
                    })()}
                  </select>
                )}
                
                {addPaymentType === 'full' && (
                  <div style={{ padding: '12px', background: '#c6f6d5', borderRadius: '8px', color: '#22543d', fontWeight: '600' }}>
                    💰 Full Remaining Balance will be paid
                  </div>
                )}
                
                <select value={newPayment.mode || 'cash'} onChange={(e) => setNewPayment({...newPayment, mode: e.target.value})}>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
                <select value={newPayment.status || 'paid'} onChange={(e) => setNewPayment({...newPayment, status: e.target.value})}>
                  <option value="paid">Paid</option>
                  <option value="due">Due</option>
                </select>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn">Add Payment</button>
                  <button type="button" className="btn" style={{ background: '#dc2626' }} onClick={() => { setShowAddPaymentForm(false); setNewPayment({ landId: '', customerId: '', employeeId: '', date: '', amount: '', mode: 'cash', status: 'paid' }); setAddPaymentType('single'); setAddSelectedMonths(1); }}>Cancel</button>
                </div>
              </form>
            )}
            {showPaymentForm && (
              <form onSubmit={handleUpdatePayment} className="auth-form" style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '10px' }}>Edit Payment</h4>
                <select value={newPayment.landId || ''} onChange={(e) => setNewPayment({...newPayment, landId: e.target.value})} required>
                  <option value="">Select Land</option>
                  {lands.map(land => (
                    <option key={land._id} value={land._id}>{land.size} - {land.owner}</option>
                  ))}
                </select>
                <select value={newPayment.customerId || ''} onChange={(e) => setNewPayment({...newPayment, customerId: e.target.value})} required>
                  <option value="">Select Customer</option>
                  {customers.map(cust => (
                    <option key={cust._id} value={cust._id}>{cust.name}</option>
                  ))}
                </select>
                <select value={newPayment.employeeId || ''} onChange={(e) => setNewPayment({...newPayment, employeeId: e.target.value})}>
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.name}</option>
                  ))}
                </select>
                <input 
                  type="date" 
                  value={newPayment.date} 
                  onChange={(e) => setNewPayment({...newPayment, date: e.target.value})} 
                  onClick={(e) => e.target.showPicker?.()}
                  required 
                  style={{ 
                    width: '100%', 
                    padding: '14px 16px', 
                    border: '2px solid #e2e8f0', 
                    borderRadius: '12px', 
                    fontSize: '1rem', 
                    background: 'white', 
                    color: '#2d3748',
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                />
                <input type="number" placeholder="Amount" value={newPayment.amount} onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})} required />
                <select value={newPayment.mode || 'cash'} onChange={(e) => setNewPayment({...newPayment, mode: e.target.value})}>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
                <select value={newPayment.status || 'paid'} onChange={(e) => {
                  const newStatus = e.target.value;
                  let autoAmount = newPayment.amount;
                  // Auto-fill amount when status is 'due' based on land price
                  if (newStatus === 'due' && newPayment.landId) {
                    const land = lands.find(l => l._id === newPayment.landId);
                    if (land) {
                      autoAmount = land.pricePerMonth || 0;
                    }
                  }
                  setNewPayment({...newPayment, status: newStatus, amount: autoAmount });
                }}>
                  <option value="paid">Paid</option>
                  <option value="due">Due</option>
                </select>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn">Update Payment</button>
                  <button type="button" className="btn" style={{ background: '#dc2626' }} onClick={() => { setShowPaymentForm(false); setEditingPayment(null); setNewPayment({ landId: '', customerId: '', employeeId: '', date: '', amount: '', mode: 'cash', status: 'paid' }); }}>Cancel</button>
                </div>
              </form>
            )}
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Land</th>
                    <th>Customer</th>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Status</th>
                    <th>Balance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(payment => (
                    <tr key={payment._id}>
                      <td>{payment.paymentId || payment._id.slice(-6)}</td>
                      <td>{payment.landId?.size || 'N/A'}</td>
                      <td>{payment.customerId?.name || 'N/A'}</td>
                      <td>{payment.employeeId?.name || 'N/A'}</td>
                      <td>{new Date(payment.date).toLocaleDateString()}</td>
                      <td>₹{payment.amount?.toLocaleString() || 0}</td>
                      <td>{payment.mode}</td>
                      <td><span className={`payment-status ${payment.status}`}>{payment.status}</span></td>
                      <td>₹{payment.balance?.toLocaleString() || 0}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#3b82f6' }} onClick={() => handleEditPayment(payment)}>Edit</button>
                          {payment.status === 'paid' && (
                            <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#f59e0b' }} onClick={() => handleRefundPayment(payment._id)}>Refund</button>
                          )}
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#dc2626' }} onClick={() => handleDeletePayment(payment._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="section">
            <h2>Reports & Analytics</h2>
            <button className="btn" onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8," 
                + "Mode,Total Amount,Count\n"
                + `Cash,₹${paymentSummary.cash?.total || 0},${paymentSummary.cash?.count || 0}\n`
                + `Online,₹${paymentSummary.online?.total || 0},${paymentSummary.online?.count || 0}`;
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", "payment_report.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }} style={{ marginBottom: '20px' }}>
              📥 Download Report
            </button>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">🏠</div>
                <div className="stat-content">
                  <h3>Total Lands</h3>
                  <div className="number">{stats.totalLands}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">👥</div>
                <div className="stat-content">
                  <h3>Total Employees</h3>
                  <div className="number">{stats.totalEmployees}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">👤</div>
                <div className="stat-content">
                  <h3>Total Customers</h3>
                  <div className="number">{stats.totalCustomers}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">💰</div>
                <div className="stat-content">
                  <h3>Total Revenue</h3>
                  <div className="number">₹{stats.totalRevenue?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
            <div className="table-container">
              <h3>Payment Summary</h3>
              <table>
                <thead>
                  <tr>
                    <th>Mode</th>
                    <th>Total Amount</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Cash</td>
                    <td>₹{paymentSummary.cash?.total?.toLocaleString() || 0}</td>
                    <td>{paymentSummary.cash?.count || 0}</td>
                  </tr>
                  <tr>
                    <td>Online</td>
                    <td>₹{paymentSummary.online?.total?.toLocaleString() || 0}</td>
                    <td>{paymentSummary.online?.count || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'audit_logs':
        return (
          <div className="section">
            <h2>Audit Log Entry</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Description</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Entity Type</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log._id}>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>{log.action}</td>
                      <td>{log.description}</td>
                      <td>{log.userName || 'System'}</td>
                      <td>{log.userRole || '-'}</td>
                      <td>{log.entityType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">🏠</div>
                <div className="stat-content">
                  <h3>Total Lands</h3>
                  <div className="number">{stats.totalLands}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">👥</div>
                <div className="stat-content">
                  <h3>Employees</h3>
                  <div className="number">{stats.totalEmployees}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">👤</div>
                <div className="stat-content">
                  <h3>Customers</h3>
                  <div className="number">{stats.totalCustomers}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">💰</div>
                <div className="stat-content">
                  <h3>Total Revenue</h3>
                  <div className="number">₹{stats.totalRevenue?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <>
      {showLandDetails && selectedLandDetails && (
        <LandDetailsPopup 
          land={selectedLandDetails} 
          isOpen={showLandDetails} 
          onClose={() => { setShowLandDetails(false); setSelectedLandDetails(null); }}
          payments={payments}
        />
      )}
      {renderPageContent()}
    </>
  );
};

// --- Customer Dashboard ---
const CustomerDashboard = ({ user, onLogout, currentPage, showToast }) => {
  const [lands, setLands] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ customerLands: 0, totalPaid: 0, duePayments: 0, remainingBalance: 0 });
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Land details popup state
  const [showLandDetails, setShowLandDetails] = useState(false);
  const [selectedLandDetails, setSelectedLandDetails] = useState(null);
  
  // Online payment state
  const [selectedLand, setSelectedLand] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [razorpayKey, setRazorpayKey] = useState('');
  const [loadingPayment, setLoadingPayment] = useState(false);
  
  // UPI payment state
  const [upiSelectedLand, setUpiSelectedLand] = useState('');
  const [upiAmount, setUpiAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [loadingUpiPayment, setLoadingUpiPayment] = useState(false);
  
  useEffect(() => {
    fetchData();
    fetchRazorpayKey();
  }, []);

  const fetchRazorpayKey = async () => {
    try {
      const res = await fetch(`${API_URL}/payments/key`);
      const data = await res.json();
      // Accept both demo mode and real configured mode
      if (data.configured) {
        setRazorpayKey(data.key || 'demo');
      } else {
        setRazorpayKey('');
      }
    } catch (error) {
      console.error('Error fetching Razorpay key:', error);
      setRazorpayKey('');
    }
  };

  const fetchData = async () => {
    try {
      const [landsRes, paymentsRes, statsRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/lands/customer/${user._id}`),
        fetch(`${API_URL}/payments/customer/${user._id}`),
        fetch(`${API_URL}/stats/customer/${user._id}`),
        fetch(`${API_URL}/auditlogs`)
      ]);

      const landsData = await landsRes.json();
      const paymentsData = await paymentsRes.json();
      const statsData = await statsRes.json();
      const logsData = await logsRes.json();

      setLands(landsData);
      setPayments(paymentsData);
      setStats(statsData);
      setAuditLogs(logsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleOnlinePayment = async (e) => {
    e.preventDefault();
    if (!selectedLand || !payAmount) {
      showToast('Please select a land and enter amount', 'error');
      return;
    }

    const amount = parseInt(payAmount);
    if (amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setLoadingPayment(true);

    try {
      // Create Razorpay order
      const orderRes = await fetch(`${API_URL}/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          landId: selectedLand,
          customerId: user._id
        })
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        showToast(orderData.message || 'Failed to create payment order', 'error');
        setLoadingPayment(false);
        return;
      }

      // Get land details for balance calculation
      const land = lands.find(l => l._id === selectedLand);
      const totalAmount = land ? land.pricePerMonth * land.installmentTotal : 0;
      const existingPayments = payments.filter(p => {
        const paymentLandId = p.landId?._id || p.landId;
        return String(paymentLandId) === String(selectedLand) && p.status === 'paid';
      });
      const totalPaid = existingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const newBalance = Math.max(0, totalAmount - (totalPaid + amount));

      // Check if demo mode
      if (orderData.demo) {
        // Demo mode - directly create payment without actual payment
        const verifyRes = await fetch(`${API_URL}/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderData.id,
            razorpay_payment_id: 'demo_payment_' + Date.now(),
            razorpay_signature: 'demo_signature',
            landId: selectedLand,
            customerId: user._id,
            date: new Date().toISOString().split('T')[0],
            amount: amount,
            balance: newBalance,
            demo: true
          })
        });

        const verifyData = await verifyRes.json();

        if (verifyRes.ok) {
          showToast('Payment successful! (Demo Mode)', 'success');
          
          // Log to audit FIRST
          await fetch(`${API_URL}/auditlogs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'online_payment',
              description: `Online payment of ₹${amount.toLocaleString()} made (Demo Mode)`,
              userId: user._id,
              userName: user.name,
              userRole: 'customer',
              entityType: 'payment',
              entityId: verifyData.payment?._id,
              details: { amount, mode: 'online', demo: true }
            })
          });
          
          // THEN fetch data to get the new audit log
          fetchData();
          setSelectedLand('');
          setPayAmount('');
        } else {
          showToast(verifyData.message || 'Payment failed', 'error');
        }
        setLoadingPayment(false);
        return;
      }

      // Open Razorpay checkout
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Land Management System',
        description: 'Payment for Land Installment',
        order_id: orderData.id,
        handler: async (response) => {
          // Verify payment
          try {
            const verifyRes = await fetch(`${API_URL}/payments/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                landId: selectedLand,
                customerId: user._id,
                date: new Date().toISOString().split('T')[0],
                amount: amount,
                balance: newBalance
              })
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok) {
              showToast('Payment successful!', 'success');
              
              // Log to audit FIRST
              await fetch(`${API_URL}/auditlogs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'online_payment',
                  description: `Online payment of ₹${amount.toLocaleString()} made via Razorpay`,
                  userId: user._id,
                  userName: user.name,
                  userRole: 'customer',
                  entityType: 'payment',
                  entityId: verifyData.payment?._id,
                  details: { amount, mode: 'online', razorpayPaymentId: response.razorpay_payment_id }
                })
              });
              
              // THEN fetch data to get the new audit log
              fetchData();
              setSelectedLand('');
              setPayAmount('');
            } else {
              showToast(verifyData.message || 'Payment verification failed', 'error');
            }
          } catch (error) {
            console.error('Error verifying payment:', error);
            showToast('Payment verification failed', 'error');
          }
          setLoadingPayment(false);
        },
        prefill: {
          name: user.name,
          email: user.email
        },
        theme: {
          color: '#667eea'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      rzp.on('payment.failed', (response) => {
        showToast('Payment failed: ' + response.error.description, 'error');
        setLoadingPayment(false);
      });

    } catch (error) {
      console.error('Error processing payment:', error);
      showToast('Payment processing failed', 'error');
      setLoadingPayment(false);
    }
  };

  // Handle UPI Payment Submission
  const handleUpiPayment = async (e) => {
    e.preventDefault();
    if (!upiSelectedLand || !upiAmount || !transactionId) {
      showToast('Please fill all fields', 'error');
      return;
    }

    const amount = parseInt(upiAmount);
    if (amount <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }

    setLoadingUpiPayment(true);

    try {
      // Get land details for balance calculation
      const land = lands.find(l => l._id === upiSelectedLand);
      const totalAmount = land ? land.pricePerMonth * land.installmentTotal : 0;
      const existingPayments = payments.filter(p => {
        const paymentLandId = p.landId?._id || p.landId;
        return String(paymentLandId) === String(upiSelectedLand) && p.status === 'paid';
      });
      const totalPaid = existingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const newBalance = Math.max(0, totalAmount - (totalPaid + amount));

      // Create payment directly
      const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landId: upiSelectedLand,
          customerId: user._id,
          employeeId: null,
          date: new Date().toISOString().split('T')[0],
          amount: amount,
          mode: 'upi',
          status: 'paid',
          transactionId: transactionId,
          upiId: upiId
        })
      });

      if (response.ok) {
        const payment = await response.json();
        showToast('UPI Payment submitted successfully! Your payment is under review.', 'success');
        
        // Log to audit FIRST
        await fetch(`${API_URL}/auditlogs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'upi_payment',
            description: `UPI payment of ₹${amount.toLocaleString()} submitted (Txn: ${transactionId})`,
            userId: user._id,
            userName: user.name,
            userRole: 'customer',
            entityType: 'payment',
            entityId: payment._id,
            details: { amount, mode: 'upi', transactionId, upiId }
          })
        });
        
        // THEN fetch data to get the new audit log
        fetchData();
        setUpiSelectedLand('');
        setUpiAmount('');
        setUpiId('');
        setTransactionId('');
        setShowUpiQr(false);
      } else {
        const error = await response.json();
        showToast(error.message || 'Payment submission failed', 'error');
      }
    } catch (error) {
      console.error('Error processing UPI payment:', error);
      showToast('Payment processing failed', 'error');
    }
    setLoadingUpiPayment(false);
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">🏠</div>
                <div className="stat-content">
                  <h3>My Lands</h3>
                  <div className="number">{stats.customerLands}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">💰</div>
                <div className="stat-content">
                  <h3>Total Paid</h3>
                  <div className="number">₹{stats.totalPaid?.toLocaleString() || 0}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">⚠️</div>
                <div className="stat-content">
                  <h3>Due Payments</h3>
                  <div className="number">{stats.duePayments}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">📊</div>
                <div className="stat-content">
                  <h3>Remaining Balance</h3>
                  <div className="number">₹{stats.remainingBalance?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
          </>
        );
      case 'my_lands':
        return (
          <div className="customer-section">
            <h3>My Lands</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Land ID</th>
                    <th>Size</th>
                    <th>Location</th>
                    <th>Price/Month</th>
                    <th>Total Installments</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lands.map(land => (
                    <tr key={land._id}>
                      <td>{land.landId || land._id.slice(-6)}</td>
                      <td>{land.size}</td>
                      <td>{land.details}</td>
                      <td>₹{land.pricePerMonth}</td>
                      <td>{land.installmentTotal}</td>
                      <td>
                        <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#8b5cf6' }} onClick={() => { setSelectedLandDetails(land); setShowLandDetails(true); }}>👁️ View Details</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'payments':
        return (
          <div className="customer-section">
            <h3>Payment History</h3>
            <div className="payment-history">
              {payments.map(payment => (
                <div key={payment._id} className="payment-item">
                  <div className="payment-info">
                    <div className="payment-date">{new Date(payment.date).toLocaleDateString()}</div>
                    <div className={`payment-mode ${payment.mode}`}>{payment.mode}</div>
                    <div className={`payment-status ${payment.status}`}>{payment.status}</div>
                  </div>
                  <div className="payment-amount">₹{payment.amount?.toLocaleString() || 0}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'pay_online':
        // Check if Razorpay is configured (including demo mode)
        if (!razorpayKey) {
          return (
            <div className="customer-section">
              <h3>💳 Pay Online</h3>
              <div style={{ 
                background: '#fffbeb', 
                padding: '40px', 
                borderRadius: '16px', 
                marginBottom: '25px',
                textAlign: 'center',
                border: '2px solid #fcd34d'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '15px' }}>⚠️</div>
                <h4 style={{ margin: '0 0 10px 0', color: '#92400e' }}>Payment Gateway Not Configured</h4>
                <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
                  Online payment is currently unavailable. Please use UPI Payment option instead.
                </p>
              </div>
            </div>
          );
        }
        
        return (
          <div className="customer-section">
            <h3>💳 Pay Online via Razorpay</h3>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              padding: '30px', 
              borderRadius: '16px', 
              marginBottom: '25px',
              color: 'white',
              textAlign: 'center',
              boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>💰</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>Secure Online Payment</h4>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Pay your land installments securely through Razorpay</p>
            </div>
            
            <form onSubmit={handleOnlinePayment} style={{ maxWidth: '550px', margin: '0 auto' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  🏠 Select Your Land
                </label>
                <select 
                  value={selectedLand} 
                  onChange={(e) => {
                    setSelectedLand(e.target.value);
                    const land = lands.find(l => l._id === e.target.value);
                    if (land) {
                      const landPayments = payments.filter(p => {
                        const paymentLandId = p.landId?._id || p.landId;
                        return String(paymentLandId) === String(land._id) && p.status === 'paid';
                      });
                      const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                      const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
                      const remaining = Math.max(0, totalAmount - totalPaid);
                      setPayAmount(remaining.toString());
                    }
                  }}
                  required
                  style={{ width: '100%', padding: '14px 16px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', background: '#f9fafb', boxSizing: 'border-box' }}
                >
                  <option value="">Choose a land to pay for</option>
                  {lands.map(land => {
                    const landPayments = payments.filter(p => {
                      const paymentLandId = p.landId?._id || p.landId;
                      return String(paymentLandId) === String(land._id) && p.status === 'paid';
                    });
                    const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
                    const remaining = Math.max(0, totalAmount - totalPaid);
                    return (
                      <option key={land._id} value={land._id} disabled={remaining <= 0}>
                        {land.size} - {land.details} (Balance: ₹{remaining.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  💵 Amount to Pay (₹)
                </label>
                <input 
                  type="number" 
                  placeholder="Enter payment amount" 
                  value={payAmount} 
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                  min="1"
                  style={{ width: '100%', padding: '14px 16px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '16px', boxSizing: 'border-box' }}
                />
              </div>
              
              <div style={{ padding: '16px', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: '12px', color: '#166534', fontSize: '18px', marginBottom: '25px', textAlign: 'center', fontWeight: '600', border: '2px solid #22c55e' }}>
                <span style={{ fontSize: '14px', fontWeight: '400', color: '#15803d' }}>Payment Amount: </span>
                ₹{parseInt(payAmount || 0).toLocaleString()}
              </div>
              
              <button 
                type="submit" 
                disabled={loadingPayment || !selectedLand || !payAmount}
                style={{
                  width: '100%',
                  background: loadingPayment ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: loadingPayment ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                {loadingPayment ? '⏳ Processing...' : `💳 Pay ₹${parseInt(payAmount || 0).toLocaleString()} with Razorpay`}
              </button>
            </form>
          </div>
        );
      case 'pay_upi':
        return (
          <div className="customer-section">
            <h3>📱 Pay via UPI / QR Code</h3>
            
            <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)', padding: '30px', borderRadius: '16px', marginBottom: '25px', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📲</div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>UPI / QR Payment</h4>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Scan QR Code or Pay via UPI App</p>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
              <button onClick={() => setShowUpiQr(true)} style={{ flex: 1, minWidth: '200px', padding: '20px', background: showUpiQr ? 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)' : 'white', color: showUpiQr ? 'white' : '#374151', border: '2px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}>
                📱 Scan QR Code
              </button>
              <button onClick={() => setShowUpiQr(false)} style={{ flex: 1, minWidth: '200px', padding: '20px', background: !showUpiQr ? 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)' : 'white', color: !showUpiQr ? 'white' : '#374151', border: '2px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: '600' }}>
                🔢 Enter UPI Details
              </button>
            </div>
            
            {showUpiQr && (
              <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', maxWidth: '550px', margin: '0 auto 25px', textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 20px 0', color: '#374151' }}>📱 Scan & Pay</h4>
                <div style={{ width: '200px', height: '200px', background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', margin: '0 auto 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px dashed #9ca3af' }}>
                  <div style={{ textAlign: 'center', color: '#6b7280' }}>
                    <div style={{ fontSize: '48px', marginBottom: '10px' }}>⬛</div>
                    <p style={{ margin: 0, fontSize: '12px' }}>QR Code</p>
                  </div>
                </div>
                <div style={{ padding: '15px', background: '#f0fdf4', borderRadius: '10px', marginBottom: '20px' }}>
                  <p style={{ margin: 0, color: '#166534', fontSize: '14px', fontWeight: '600' }}>📋 UPI ID: landpayment@upi</p>
                </div>
                <form onSubmit={handleUpiPayment}>
                  <input type="text" placeholder="Enter Transaction ID (from UPI app)" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} required style={{ width: '100%', padding: '14px 16px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', marginBottom: '15px', boxSizing: 'border-box' }} />
                  <button type="submit" disabled={loadingUpiPayment} style={{ width: '100%', padding: '16px', background: loadingUpiPayment ? '#9ca3af' : 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: loadingUpiPayment ? 'not-allowed' : 'pointer' }}>
                    {loadingUpiPayment ? '⏳ Submitting...' : '✅ Submit Payment'}
                  </button>
                </form>
              </div>
            )}
            
            {!showUpiQr && (
              <div style={{ background: 'white', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)', maxWidth: '550px', margin: '0 auto' }}>
                <h4 style={{ margin: '0 0 20px 0', color: '#374151' }}>🔢 UPI Payment Details</h4>
                <form onSubmit={handleUpiPayment}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>🏠 Select Your Land</label>
                    <select value={upiSelectedLand} onChange={(e) => { setUpiSelectedLand(e.target.value); const land = lands.find(l => l._id === e.target.value); if (land) { const landPayments = payments.filter(p => { const paymentLandId = p.landId?._id || p.landId; return String(paymentLandId) === String(land._id) && p.status === 'paid'; }); const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0); const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0); setUpiAmount(Math.max(0, totalAmount - totalPaid).toString()); }}} required style={{ width: '100%', padding: '14px 16px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', background: '#f9fafb', boxSizing: 'border-box' }}>
                      <option value="">Choose a land</option>
                      {lands.map(land => { const landPayments = payments.filter(p => { const paymentLandId = p.landId?._id || p.landId; return String(paymentLandId) === String(land._id) && p.status === 'paid'; }); const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0); const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0); const remaining = Math.max(0, totalAmount - totalPaid); return <option key={land._id} value={land._id} disabled={remaining <= 0}>{land.size} - {land.details} (₹{remaining.toLocaleString()})</option>; })}
                    </select>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>💵 Amount (₹)</label>
                    <input type="number" placeholder="Amount" value={upiAmount} onChange={(e) => setUpiAmount(e.target.value)} required min="1" style={{ width: '100%', padding: '14px 16px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>📱 Your UPI ID (optional)</label>
                    <input type="text" placeholder="e.g., yourname@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} style={{ width: '100%', padding: '14px 16px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>🔢 Transaction ID *</label>
                    <input type="text" placeholder="UPI transaction reference" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} required style={{ width: '100%', padding: '14px 16px', border: '2px solid #e5e7eb', borderRadius: '12px', fontSize: '15px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ padding: '16px', background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', borderRadius: '12px', color: '#166534', fontSize: '18px', marginBottom: '25px', textAlign: 'center', fontWeight: '600', border: '2px solid #22c55e' }}>₹{parseInt(upiAmount || 0).toLocaleString()}</div>
                  <button type="submit" disabled={loadingUpiPayment || !upiSelectedLand || !upiAmount || !transactionId} style={{ width: '100%', padding: '16px', background: loadingUpiPayment ? '#9ca3af' : 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '600', cursor: loadingUpiPayment ? 'not-allowed' : 'pointer' }}>
                    {loadingUpiPayment ? '⏳ Submitting...' : '✅ Submit UPI Payment'}
                  </button>
                </form>
              </div>
            )}
          </div>
        );
      case 'notifications':
        return (
          <div className="customer-section">
            <h3>Notifications</h3>
            <div className="notification-list">
              {payments.filter(p => p.status === 'due').length > 0 ? (
                payments.filter(p => p.status === 'due').map(payment => (
                  <div key={payment._id} className="notification-item">
                    <div className="notification-icon">🔔</div>
                    <div className="notification-content">
                      <div className="notification-title">Payment Due Reminder</div>
                      <div className="notification-text">Your payment of ₹{payment.due} is due. Please make the payment to avoid late fees.</div>
                      <div className="notification-time">Due: {new Date(payment.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="notification-item">
                  <div className="notification-icon">✅</div>
                  <div className="notification-content">
                    <div className="notification-title">All Payments Clear</div>
                    <div className="notification-text">You have no pending payments. Great job!</div>
                  </div>
                </div>
              )}
              {payments.filter(p => p.status === 'paid').length > 0 && (
                <div className="notification-item">
                  <div className="notification-icon">✅</div>
                  <div className="notification-content">
                    <div className="notification-title">Payment Received</div>
                    <div className="notification-text">Your recent payment has been processed successfully.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="customer-section">
            <h3>Profile Information</h3>
            <div className="profile-card">
              <div className="profile-avatar">👤</div>
              <div className="profile-details">
                <div className="profile-item">
                  <strong>Name:</strong> {user.name}
                </div>
                <div className="profile-item">
                  <strong>Email:</strong> {user.email}
                </div>
                <div className="profile-item">
                  <strong>Role:</strong> Customer
                </div>
                <div className="profile-item">
                  <strong>Member Since:</strong> January 2024
                </div>
                <div className="profile-item">
                  <strong>Lands Owned:</strong> {stats.customerLands}
                </div>
              </div>
            </div>
          </div>
        );
      case 'audit_logs':
        const customerAuditLogs = auditLogs.filter(log => {
          const logUserId = String(log.userId);
          const currentUserId = String(user._id);
          return logUserId === currentUserId || 
                 log.userRole === 'customer' || 
                 (log.entityType === 'payment' && log.customerId && String(log.customerId) === currentUserId) ||
                 (log.entityType === 'land' && log.landOwnerId && String(log.landOwnerId) === currentUserId);
        });
        return (
          <div className="customer-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>My Activity</h3>
              <button 
                className="btn" 
                onClick={() => {
                  fetchData();
                  showToast('Activity refreshed!', 'success');
                }}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                🔄 Refresh
              </button>
            </div>
            {customerAuditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📋</div>
                <p>No activity found. Your activities will appear here after making payments.</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>Description</th>
                      <th>Entity Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerAuditLogs.map(log => (
                      <tr key={log._id}>
                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                        <td>{log.action}</td>
                        <td>{log.description}</td>
                        <td>{log.entityType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      default:
        return (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">🏠</div>
                <div className="stat-content">
                  <h3>My Lands</h3>
                  <div className="number">{stats.customerLands}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">💰</div>
                <div className="stat-content">
                  <h3>Total Paid</h3>
                  <div className="number">₹{stats.totalPaid?.toLocaleString() || 0}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">⚠️</div>
                <div className="stat-content">
                  <h3>Due Payments</h3>
                  <div className="number">{stats.duePayments}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">📊</div>
                <div className="stat-content">
                  <h3>Remaining Balance</h3>
                  <div className="number">₹{stats.remainingBalance?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <>
      {showLandDetails && selectedLandDetails && (
        <LandDetailsPopup 
          land={selectedLandDetails} 
          isOpen={showLandDetails} 
          onClose={() => { setShowLandDetails(false); setSelectedLandDetails(null); }}
          payments={payments}
        />
      )}
      {renderPageContent()}
    </>
  );
};

// --- Employee Dashboard ---
const EmployeeDashboard = ({ user, onLogout, currentPage, showToast }) => {
  const [lands, setLands] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ assignedLands: 0, totalPayments: 0, duePayments: 0, completedLands: 0 });
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedLand, setSelectedLand] = useState(null);
  
  // Land details popup state
  const [showLandDetails, setShowLandDetails] = useState(false);
  const [selectedLandDetails, setSelectedLandDetails] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('paid');
  const [paymentType, setPaymentType] = useState('single'); // single, months, full
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [queryTitle, setQueryTitle] = useState('');
  const [queryDescription, setQueryDescription] = useState('');

  // Auto-fill amount when status is 'due' in Employee Dashboard
  useEffect(() => {
    if (status === 'due' && selectedLand && lands.length > 0) {
      const land = lands.find(l => l._id === selectedLand);
      if (land) {
        let calculatedAmount = 0;
        if (paymentType === 'single') {
          calculatedAmount = parseInt(land.pricePerMonth) || 0;
        } else if (paymentType === 'months') {
          calculatedAmount = (parseInt(land.pricePerMonth) || 0) * selectedMonths;
        } else if (paymentType === 'full') {
          const landPayments = payments.filter(p => {
            const paymentLandId = p.landId?._id || p.landId;
            return String(paymentLandId) === String(land._id) && p.status === 'paid';
          });
          const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          const totalAmount = (parseInt(land.pricePerMonth) || 0) * (parseInt(land.installmentTotal) || 0);
          calculatedAmount = Math.max(0, totalAmount - totalPaid);
        }
        setPaymentAmount(calculatedAmount.toString());
      }
    }
  }, [status, selectedLand, paymentType, selectedMonths, lands, payments]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [landsRes, paymentsRes, statsRes, logsRes] = await Promise.all([
        fetch(`${API_URL}/lands/employee/${user._id}`),
        fetch(`${API_URL}/payments/employee/${user._id}`),
        fetch(`${API_URL}/stats/employee/${user._id}`),
        fetch(`${API_URL}/auditlogs`)
      ]);

      const landsData = await landsRes.json();
      const paymentsData = await paymentsRes.json();
      const statsData = await statsRes.json();
      const logsData = await logsRes.json();

      setLands(landsData);
      setPayments(paymentsData);
      setStats(statsData);
      setAuditLogs(logsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!selectedLand) return;

    const land = lands.find(l => l._id === selectedLand);
    if (!land) return;

    // Calculate payment amount based on payment type
    let amount = 0;
    if (paymentType === 'full') {
      // For full payment, fetch all payments for this land from backend
      try {
        const response = await fetch(`${API_URL}/payments`);
        const allPayments = await response.json();
        const landPayments = allPayments.filter(p => {
          const paymentLandId = p.landId?._id || p.landId;
          return String(paymentLandId) === String(land._id) && p.status === 'paid';
        });
        const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
        amount = totalAmount - totalPaid;
      } catch (error) {
        console.error('Error calculating full payment:', error);
        amount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
      }
    } else if (paymentType === 'months') {
      amount = (land.pricePerMonth || 0) * selectedMonths;
    } else {
      amount = parseInt(paymentAmount) || land.pricePerMonth || 0;
    }

    if (amount <= 0) {
      showToast('No remaining balance to pay!', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landId: selectedLand,
          customerId: land.ownerId?._id || land.ownerId,
          employeeId: user._id,
          date: paymentDate,
          amount: amount,
          mode: paymentMode,
          status: status
        })
      });

      if (response.ok) {
        const payment = await response.json();
        setPayments([...payments, payment]);
        setPaymentAmount('');
        setPaymentMode('cash');
        setStatus('paid');
        setPaymentType('single');
        setSelectedMonths(1);
        setSelectedLand(null);
        
        // Log to audit FIRST
        const land = lands.find(l => l._id === selectedLand);
        await fetch(`${API_URL}/auditlogs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'payment_added',
            description: `Payment of ₹${amount.toLocaleString()} added for land ${land?.size || 'N/A'} (${status})`,
            userId: user._id,
            userName: user.name,
            userRole: 'employee',
            entityType: 'payment',
            entityId: payment._id,
            details: { amount, status, mode: paymentMode, landId: selectedLand }
          })
        });
        
        // THEN fetch data to get the new audit log
        fetchData();
        showToast(`Payment of ₹${amount.toLocaleString()} submitted successfully!`, 'success');
      }
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  const handleSubmitQuery = (e) => {
    e.preventDefault();
    showToast('Query submitted successfully! Support will contact you soon.', 'success');
    setQueryTitle('');
    setQueryDescription('');
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">🏠</div>
                <div className="stat-content">
                  <h3>Assigned Lands</h3>
                  <div className="number">{stats.assignedLands}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">💰</div>
                <div className="stat-content">
                  <h3>Total Payments</h3>
                  <div className="number">₹{stats.totalPayments?.toLocaleString() || 0}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">⚠️</div>
                <div className="stat-content">
                  <h3>Due Payments</h3>
                  <div className="number">{stats.duePayments}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">📊</div>
                <div className="stat-content">
                  <h3>Completed Lands</h3>
                  <div className="number">{stats.completedLands}</div>
                </div>
              </div>
            </div>
          </>
        );
      case 'assigned_lands':
        return (
          <div className="employee-section">
            <h3>Assigned Lands</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Land ID</th>
                    <th>Size</th>
                    <th>Owner</th>
                    <th>Price/Month</th>
                    <th>Total Installments</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lands.map(land => {
                    const landPayments = payments.filter(p => {
                      const paymentLandId = p.landId?._id || p.landId;
                      return String(paymentLandId) === String(land._id) && p.status === 'paid';
                    });
                    const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
                    const remainingAmount = Math.max(0, totalAmount - totalPaid);
                    const paidPercentage = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
                    const isCompleted = remainingAmount <= 0 || paidPercentage >= 100;
                    return (
                      <tr key={land._id}>
                        <td>{land.landId || land._id.slice(-6)}</td>
                        <td>{land.size}</td>
                        <td>{land.owner}</td>
                        <td>₹{land.pricePerMonth}</td>
                        <td>{land.installmentTotal}</td>
                        <td>
                          <span className={`status-badge ${isCompleted ? 'completed' : 'active'}`}>
                            {isCompleted ? 'Completed' : `₹${remainingAmount.toLocaleString()} remaining`}
                          </span>
                        </td>
                        <td>
                          <button className="btn" style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#8b5cf6' }} onClick={() => { setSelectedLandDetails(land); setShowLandDetails(true); }}>👁️ View</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'payment_entry':
        return (
          <div className="employee-section">
            <h3>Payment Entry</h3>
            <form onSubmit={handleAddPayment} className="payment-form">
              <div className="filter-section">
                <select 
                  value={selectedLand || ''} 
                  onChange={(e) => {
                    const landId = e.target.value;
                    setSelectedLand(landId);
                    // Auto-fill amount when land is selected for single payment type
                    if (landId && paymentType === 'single') {
                      const land = lands.find(l => l._id === landId);
                      if (land) {
                        setPaymentAmount(land.pricePerMonth?.toString() || '');
                      }
                    }
                  }}
                  required
                >
                  <option value="">Select Land</option>
                  {lands.map(land => {
                    const landPayments = payments.filter(p => {
                      const paymentLandId = p.landId?._id || p.landId;
                      return String(paymentLandId) === String(land._id) && p.status === 'paid';
                    });
                    const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    const totalAmount = (land.pricePerMonth || 0) * (land.installmentTotal || 0);
                    const remaining = Math.max(0, totalAmount - totalPaid);
                    return (
                      <option key={land._id} value={land._id}>
                        {land.landId || land._id?.slice(-6)} - {land.size} - {land.owner} (Remaining: ₹{remaining.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>
              
              {/* Payment Type Selection */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="paymentType" 
                    value="single" 
                    checked={paymentType === 'single'}
                    onChange={(e) => {
                      setPaymentType(e.target.value);
                      // Auto-fill amount when switching to single month
                      if (selectedLand) {
                        const land = lands.find(l => l._id === selectedLand);
                        if (land) {
                          setPaymentAmount(land.pricePerMonth?.toString() || '');
                        }
                      }
                    }}
                  />
                  Single Month
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="paymentType" 
                    value="months" 
                    checked={paymentType === 'months'}
                    onChange={(e) => setPaymentType(e.target.value)}
                  />
                  Multiple Months
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="paymentType" 
                    value="full" 
                    checked={paymentType === 'full'}
                    onChange={(e) => setPaymentType(e.target.value)}
                  />
                  Full Payment
                </label>
              </div>
              
              {paymentType === 'single' && (
                <input 
                  type="number" 
                  placeholder={`Amount (default: ₹${selectedLand ? lands.find(l => l._id === selectedLand)?.pricePerMonth || 0 : 0})`} 
                  value={paymentAmount} 
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              )}
              
              {paymentType === 'months' && (
                <select 
                  value={selectedMonths} 
                  onChange={(e) => setSelectedMonths(parseInt(e.target.value))}
                >
                  {(() => {
                    const land = lands.find(l => l._id === selectedLand);
                    if (!land) return null;
                    const landPayments = payments.filter(p => {
                      const paymentLandId = p.landId?._id || p.landId;
                      return String(paymentLandId) === String(land._id) && p.status === 'paid';
                    });
                    const totalPaid = landPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
                    const paidMonths = Math.floor(totalPaid / (land.pricePerMonth || 1));
                    const remainingMonths = Math.max(1, (land.installmentTotal || 12) - paidMonths);
                    return Array.from({ length: Math.min(remainingMonths, land.installmentTotal || 12) }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m} Month{m > 1 ? 's' : ''} - ₹{(land.pricePerMonth || 0) * m}</option>
                    ));
                  })()}
                </select>
              )}
              
              {paymentType === 'full' && (
                <div style={{ padding: '12px', background: '#c6f6d5', borderRadius: '8px', color: '#22543d', fontWeight: '600' }}>
                  💰 Full Remaining Balance will be paid
                </div>
              )}
              
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="online">Online</option>
              </select>
              <input 
                type="date" 
                value={paymentDate} 
                onChange={(e) => setPaymentDate(e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                required
                style={{ 
                  width: '100%', 
                  padding: '12px 16px', 
                  border: '2px solid #e2e8f0', 
                  borderRadius: '10px', 
                  fontSize: '0.95rem', 
                  background: 'white', 
                  color: '#1a202c',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
              />
              <select value={status} onChange={(e) => {
                setStatus(e.target.value);
              }}>
                <option value="paid">Paid</option>
                <option value="due">Due</option>
              </select>
              <button type="submit" className="btn">Submit Payment</button>
            </form>
          </div>
        );
      case 'query_support':
        return (
          <div className="employee-section">
            <h3>Contact Support</h3>
            <form onSubmit={handleSubmitQuery} className="query-form">
              <input 
                type="text" 
                placeholder="Query Title" 
                value={queryTitle} 
                onChange={(e) => setQueryTitle(e.target.value)}
                required
              />
              <textarea 
                placeholder="Description" 
                value={queryDescription} 
                onChange={(e) => setQueryDescription(e.target.value)}
                required
              />
              <button type="submit" className="btn">Submit Query</button>
            </form>
          </div>
        );
      case 'audit_logs':
        return (
          <div className="employee-section">
            <h3>My Activity Logs</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Description</th>
                    <th>Entity Type</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.filter(log => log.userId === user._id || log.userRole === 'employee').map(log => (
                    <tr key={log._id}>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>{log.action}</td>
                      <td>{log.description}</td>
                      <td>{log.entityType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">🏠</div>
                <div className="stat-content">
                  <h3>Assigned Lands</h3>
                  <div className="number">{stats.assignedLands}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">💰</div>
                <div className="stat-content">
                  <h3>Total Payments</h3>
                  <div className="number">₹{stats.totalPayments?.toLocaleString() || 0}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon orange">⚠️</div>
                <div className="stat-content">
                  <h3>Due Payments</h3>
                  <div className="number">{stats.duePayments}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon purple">📊</div>
                <div className="stat-content">
                  <h3>Completed Lands</h3>
                  <div className="number">{stats.completedLands}</div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <>
      {showLandDetails && selectedLandDetails && (
        <LandDetailsPopup 
          land={selectedLandDetails} 
          isOpen={showLandDetails} 
          onClose={() => { setShowLandDetails(false); setSelectedLandDetails(null); }}
          payments={payments}
        />
      )}
      {renderPageContent()}
    </>
  );
};

// --- Main App Component ---
// --- User Pages Manager ---
const UserPages = ({ user, role, onLogout, showToast }) => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  const userPages = {
    admin: {
      pages: ['dashboard', 'lands', 'employees', 'customers', 'admins', 'payments', 'reports', 'audit_logs'],
      names: {
        dashboard: 'Dashboard',
        lands: 'Lands',
        employees: 'Employees',
        customers: 'Customers',
        admins: 'Admin Mgmt',
        payments: 'Payments',
        reports: 'Reports',
        audit_logs: 'Audit Logs'
      },
      icons: {
        dashboard: '📊',
        lands: '🏠',
        employees: '👥',
        customers: '👤',
        admins: '👑',
        payments: '💰',
        reports: '📈',
        audit_logs: '📋'
      }
    },
    employee: {
      pages: ['dashboard', 'assigned_lands', 'payment_entry', 'query_support', 'audit_logs'],
      names: {
        dashboard: 'Dashboard',
        assigned_lands: 'Assigned Lands',
        payment_entry: 'Payment Entry',
        query_support: 'Query Support',
        audit_logs: 'Audit Logs'
      },
      icons: {
        dashboard: '📊',
        assigned_lands: '🏠',
        payment_entry: '💳',
        query_support: '📧',
        audit_logs: '📋'
      }
    },
    customer: {
      pages: ['dashboard', 'my_lands', 'payments', 'pay_online', 'notifications', 'profile', 'audit_logs'],
      names: {
        dashboard: 'Dashboard',
        my_lands: 'My Lands',
        payments: 'Payment History',
        pay_online: 'Pay Online',
        notifications: 'Notifications',
        profile: 'Profile',
        audit_logs: 'My Activity'
      },
      icons: {
        dashboard: '📊',
        my_lands: '🏠',
        payments: '💰',
        pay_online: '💳',
        notifications: '🔔',
        profile: '👤',
        audit_logs: '📋'
      }
    }
  };

  const renderPage = () => {
    if (role === 'admin') {
      return <AdminDashboard user={user} onLogout={onLogout} currentPage={currentPage} showToast={showToast} />;
    } else if (role === 'employee') {
      return <EmployeeDashboard user={user} onLogout={onLogout} currentPage={currentPage} showToast={showToast} />;
    } else if (role === 'customer') {
      return <CustomerDashboard user={user} onLogout={onLogout} currentPage={currentPage} showToast={showToast} />;
    }
    return null;
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h2>
          {role === 'admin' ? 'Admin Panel' : 
           role === 'employee' ? 'Employee Panel' : 'Customer Panel'}
        </h2>
        <nav>
          {userPages[role].pages.map(page => (
            <a
              key={page}
              href="#"
              className={currentPage === page ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage(page);
              }}
            >
              <span>{userPages[role].icons[page]}</span>
              {userPages[role].names[page]}
            </a>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <div className="dashboard-header">
          <h1>{userPages[role].names[currentPage]}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: '#4a5568', fontWeight: '500' }}>👤 Welcome, {user.name}</span>
            <button className="logout-btn" onClick={onLogout}>Logout</button>
          </div>
        </div>
        {renderPage()}
      </main>
    </div>
  );
};

// --- Main App Component ---
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const clearToast = () => {
    setToast(null);
  };

  useEffect(() => {
    // Check for stored user data on load
    const storedUser = localStorage.getItem('landUser');
    const storedRole = localStorage.getItem('landRole');
    if (storedUser && storedRole) {
      setCurrentUser(JSON.parse(storedUser));
      setCurrentRole(storedRole);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setCurrentRole(userData.role);
    setCurrentUser(userData);
    // Store in localStorage
    localStorage.setItem('landUser', JSON.stringify(userData));
    localStorage.setItem('landRole', userData.role);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRole(null);
    // Clear localStorage
    localStorage.removeItem('landUser');
    localStorage.removeItem('landRole');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
      {!currentUser ? (
        <AuthPage onLogin={handleLogin} showToast={showToast} />
      ) : (
        <UserPages user={currentUser} role={currentRole} onLogout={handleLogout} showToast={showToast} />
      )}
    </>
  );
}

export default App;

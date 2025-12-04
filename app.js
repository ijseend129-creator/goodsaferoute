// App state
let map, homeMap;
let currentLocation = null;
let homeLocations = [];
let dangerousPlaces = [];
let routeControl = null;
let dangerousMarkers = [];
let showDangerous = true;
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    initMap();
    initHomeMap();
    getCurrentLocation();
    displaySavedHomes();
    displayDangerousPlaces();

    // Loading scherm verbergen en direct naar de kaart gaan
    const loadingScreen = document.getElementById('loadingScreen');
    const mapScreen = document.getElementById('mapScreen');

    // Kleine vertraging voor een soepele overgang
    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        if (mapScreen && !mapScreen.classList.contains('active')) {
            mapScreen.classList.add('active');
        }
    }, 1200);
});

// Screen navigation
function showStartScreen() {
    // Terug-actie gaat nu altijd naar de kaart
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('mapScreen').classList.add('active');
    if (map) {
        setTimeout(() => map.invalidateSize(), 100);
    }
}

function showHomeSetup() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('homeSetupScreen').classList.add('active');
    if (homeMap) {
        setTimeout(() => homeMap.invalidateSize(), 100);
    }
}

function showDangerousPlaces() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('dangerousPlacesScreen').classList.add('active');
    displayDangerousPlacesList();
}

// Initialize main map
function initMap() {
    map = L.map('map').setView([52.3676, 4.9041], 13); // Amsterdam default
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Add current location marker when available
    if (currentLocation) {
        L.marker([currentLocation.lat, currentLocation.lng])
            .addTo(map)
            .bindPopup('Jouw locatie')
            .openPopup();
        map.setView([currentLocation.lat, currentLocation.lng], 15);
    }
    
    // Load dangerous places on map
    loadDangerousPlacesOnMap();
}

// Initialize home setup map
function initHomeMap() {
    homeMap = L.map('homeMap').setView([52.3676, 4.9041], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(homeMap);
    
    let marker = null;
    
    homeMap.on('click', function(e) {
        if (marker) {
            homeMap.removeLayer(marker);
        }
        marker = L.marker([e.latlng.lat, e.latlng.lng])
            .addTo(homeMap)
            .bindPopup('Geselecteerde locatie')
            .openPopup();
        
        // Reverse geocode
        reverseGeocode(e.latlng.lat, e.latlng.lng);
    });
}

// Get current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                if (map) {
                    L.marker([currentLocation.lat, currentLocation.lng])
                        .addTo(map)
                        .bindPopup('Jouw locatie')
                        .openPopup();
                    map.setView([currentLocation.lat, currentLocation.lng], 15);
                }
            },
            function(error) {
                console.log('Geolocatie fout:', error);
                alert('Kon je locatie niet bepalen. Controleer je browser instellingen.');
            }
        );
    }
}

// Geocode address
function geocodeAddress() {
    const address = document.getElementById('homeAddress').value;
    if (!address) {
        alert('Voer een adres in');
        return;
    }
    
    // Simple geocoding using Nominatim (OpenStreetMap)
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                
                if (homeMap) {
                    homeMap.setView([lat, lng], 15);
                    L.marker([lat, lng])
                        .addTo(homeMap)
                        .bindPopup('Gevonden locatie')
                        .openPopup();
                }
            } else {
                alert('Adres niet gevonden');
            }
        })
        .catch(error => {
            console.error('Geocoding fout:', error);
            alert('Kon adres niet vinden');
        });
}

// Reverse geocode
function reverseGeocode(lat, lng) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(response => response.json())
        .then(data => {
            if (data.display_name) {
                document.getElementById('homeAddress').value = data.display_name;
            }
        })
        .catch(error => console.error('Reverse geocoding fout:', error));
}

// Use current location for home
function useCurrentLocation() {
    if (!currentLocation) {
        getCurrentLocation();
        setTimeout(() => {
            if (currentLocation && homeMap) {
                homeMap.setView([currentLocation.lat, currentLocation.lng], 15);
                L.marker([currentLocation.lat, currentLocation.lng])
                    .addTo(homeMap)
                    .bindPopup('Jouw locatie')
                    .openPopup();
            }
        }, 1000);
    } else {
        if (homeMap) {
            homeMap.setView([currentLocation.lat, currentLocation.lng], 15);
            L.marker([currentLocation.lat, currentLocation.lng])
                .addTo(homeMap)
                .bindPopup('Jouw locatie')
                .openPopup();
        }
    }
}

// Save home location
function saveHomeLocation() {
    const name = document.getElementById('homeName').value || 'Thuis';
    const address = document.getElementById('homeAddress').value;
    
    if (!address && !currentLocation) {
        alert('Selecteer eerst een locatie op de kaart of gebruik je huidige locatie');
        return;
    }
    
    // Get location from map marker or current location
    let lat, lng;
    if (homeMap) {
        const markers = [];
        homeMap.eachLayer(layer => {
            if (layer instanceof L.Marker) {
                markers.push(layer);
            }
        });
        if (markers.length > 0) {
            lat = markers[0].getLatLng().lat;
            lng = markers[0].getLatLng().lng;
        } else if (currentLocation) {
            lat = currentLocation.lat;
            lng = currentLocation.lng;
        } else {
            alert('Selecteer eerst een locatie op de kaart');
            return;
        }
    } else if (currentLocation) {
        lat = currentLocation.lat;
        lng = currentLocation.lng;
    } else {
        alert('Selecteer eerst een locatie');
        return;
    }
    
    const home = {
        id: Date.now(),
        name: name,
        address: address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat: lat,
        lng: lng
    };
    
    homeLocations.push(home);
    saveData();
    displaySavedHomes();
    
    // Clear form
    document.getElementById('homeName').value = '';
    document.getElementById('homeAddress').value = '';
    homeMap.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            homeMap.removeLayer(layer);
        }
    });
    
    alert(`Thuislocatie "${name}" opgeslagen!`);
}

// Display saved homes
function displaySavedHomes() {
    const container = document.getElementById('savedHomes');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (homeLocations.length === 0) {
        container.innerHTML = '<p style="color: #64748b; text-align: center; margin-top: 1rem;">Nog geen thuislocaties opgeslagen</p>';
        return;
    }
    
    homeLocations.forEach(home => {
        const div = document.createElement('div');
        div.className = 'home-item';
        div.innerHTML = `
            <div>
                <strong>${home.name}</strong><br>
                <span style="color: #94a3b8; font-size: 0.9rem;">${home.address}</span>
            </div>
            <button onclick="deleteHome(${home.id})">Verwijder</button>
        `;
        container.appendChild(div);
    });
}

// Delete home
function deleteHome(id) {
    homeLocations = homeLocations.filter(h => h.id !== id);
    saveData();
    displaySavedHomes();
}

// Calculate route to home
function calculateRoute() {
    if (!currentLocation) {
        alert('Locatie niet beschikbaar. Wacht even...');
        getCurrentLocation();
        return;
    }
    
    if (homeLocations.length === 0) {
        alert('Stel eerst een thuislocatie in!');
        showHomeSetup();
        return;
    }
    
    // Use first home location (or let user choose)
    const home = homeLocations[0];
    
    // Remove existing route
    if (routeControl) {
        map.removeControl(routeControl);
    }
    
    // Calculate route using Leaflet Routing Machine
    routeControl = L.Routing.control({
        waypoints: [
            L.latLng(currentLocation.lat, currentLocation.lng),
            L.latLng(home.lat, home.lng)
        ],
        routeWhileDragging: false,
        language: 'nl',
        createMarker: function() { return null; } // Don't create default markers
    }).addTo(map);
    
    routeControl.on('routesfound', function(e) {
        const route = e.routes[0];
        const distance = (route.summary.totalDistance / 1000).toFixed(2);
        const time = Math.round(route.summary.totalTime / 60);
        
        const routeInfo = document.getElementById('routeInfo');
        routeInfo.innerHTML = `
            <strong>Route naar ${home.name}</strong><br>
            Afstand: ${distance} km | Tijd: ${time} minuten
        `;
        routeInfo.classList.add('active');
    });
}

// Report modal
function showReportModal() {
    document.getElementById('reportModal').classList.add('active');
    if (currentLocation) {
        document.getElementById('reportLocation').textContent = 
            `Lat: ${currentLocation.lat.toFixed(4)}, Lng: ${currentLocation.lng.toFixed(4)}`;
    }
}

function closeReportModal() {
    document.getElementById('reportModal').classList.remove('active');
}

function useCurrentLocationForReport() {
    if (!currentLocation) {
        getCurrentLocation();
        setTimeout(() => {
            if (currentLocation) {
                document.getElementById('reportLocation').textContent = 
                    `Lat: ${currentLocation.lat.toFixed(4)}, Lng: ${currentLocation.lng.toFixed(4)}`;
            }
        }, 1000);
    } else {
        document.getElementById('reportLocation').textContent = 
            `Lat: ${currentLocation.lat.toFixed(4)}, Lng: ${currentLocation.lng.toFixed(4)}`;
    }
}

function submitReport() {
    const type = document.getElementById('reportType').value;
    const description = document.getElementById('reportDescription').value;
    
    if (!description.trim()) {
        alert('Voer een beschrijving in');
        return;
    }

    if (!currentUser) {
        alert('Log eerst in voordat je een melding maakt.');
        openAuthModal();
        return;
    }
    
    let lat, lng;
    if (currentLocation) {
        lat = currentLocation.lat;
        lng = currentLocation.lng;
    } else {
        alert('Locatie niet beschikbaar');
        return;
    }
    
    const report = {
        id: Date.now(),
        type: type,
        description: description,
        lat: lat,
        lng: lng,
        date: new Date().toISOString(),
        userId: currentUser.id,
        username: currentUser.username
    };
    
    dangerousPlaces.push(report);
    saveData();
    loadDangerousPlacesOnMap();
    
    // Clear form
    document.getElementById('reportDescription').value = '';
    closeReportModal();
    
    alert('Melding verstuurd! Bedankt voor het helpen van anderen.');
}

// Load dangerous places on map
function loadDangerousPlacesOnMap() {
    // Remove existing markers
    dangerousMarkers.forEach(marker => map.removeLayer(marker));
    dangerousMarkers = [];
    
    if (!showDangerous) return;
    
    dangerousPlaces.forEach(place => {
        const marker = L.marker([place.lat, place.lng], {
            icon: L.divIcon({
                className: 'danger-marker',
                html: '',
                iconSize: [20, 20]
            })
        })
        .addTo(map)
        .bindPopup(`
            <div style="padding: 0.25rem 0;">
                <strong style="color: #f87171; font-size: 0.875rem;">${getTypeName(place.type)}</strong><br>
                <span style="color: #cbd5e1; font-size: 0.8125rem;">${place.description}</span><br>
                <small style="color: #64748b; font-size: 0.75rem;">${new Date(place.date).toLocaleDateString('nl-NL')}</small>
            </div>
        `);
        
        dangerousMarkers.push(marker);
    });
}

function toggleDangerousPlaces() {
    showDangerous = !showDangerous;
    const toggleText = document.getElementById('toggleText');
    toggleText.textContent = showDangerous ? 'Verberg gevaarlijke plekken' : 'Toon gevaarlijke plekken';
    loadDangerousPlacesOnMap();
}

function getTypeName(type) {
    const types = {
        'dark': 'Donkere plek',
        'people': 'Vreemde personen',
        'traffic': 'Onveilig verkeer',
        'other': 'Anders'
    };
    return types[type] || 'Onbekend';
}

// Display dangerous places list
function displayDangerousPlacesList() {
    const container = document.getElementById('dangerousPlacesList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (dangerousPlaces.length === 0) {
        container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 2rem;">Nog geen gevaarlijke plekken gemeld</p>';
        return;
    }
    
    dangerousPlaces.forEach(place => {
        const div = document.createElement('div');
        div.className = 'place-item';
        const canDelete = currentUser && place.userId === currentUser.id;
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem;">
                <div>
                    <h3>${getTypeName(place.type)}</h3>
                    <p>${place.description}</p>
                    <div class="location">
                        Locatie: ${place.lat.toFixed(4)}, ${place.lng.toFixed(4)}<br>
                        Datum: ${new Date(place.date).toLocaleDateString('nl-NL')}<br>
                        ${place.username ? `Door: ${place.username}` : ''}
                    </div>
                </div>
                ${canDelete ? `
                    <button class="btn btn-small" style="background:#ef4444; border:none; color:#fff; margin-top:0.25rem;" onclick="deleteReport(${place.id})">
                        Verwijder
                    </button>
                ` : ''}
            </div>
        `;
        container.appendChild(div);
    });
}

// Verwijder melding (alleen eigen)
function deleteReport(id) {
    if (!currentUser) {
        alert('Je kunt alleen meldingen verwijderen als je bent ingelogd.');
        return;
    }
    const report = dangerousPlaces.find(p => p.id === id);
    if (!report) return;
    if (report.userId !== currentUser.id) {
        alert('Je kunt alleen je eigen meldingen verwijderen.');
        return;
    }
    if (!confirm('Weet je zeker dat je deze melding wilt verwijderen?')) return;

    dangerousPlaces = dangerousPlaces.filter(p => p.id !== id);
    saveData();
    loadDangerousPlacesOnMap();
    displayDangerousPlacesList();
}

// Verwijder alle meldingen
function clearAllReports() {
    if (!currentUser) {
        alert('Je kunt alleen alle meldingen verwijderen als je bent ingelogd.');
        return;
    }
    if (dangerousPlaces.length === 0) {
        alert('Er zijn geen meldingen om te verwijderen.');
        return;
    }
    if (!confirm('Weet je zeker dat je ALLE meldingen wilt verwijderen?')) return;

    dangerousPlaces = [];
    saveData();
    loadDangerousPlacesOnMap();
    displayDangerousPlacesList();
}

// Auth helpers
function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.add('active');
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.classList.remove('active');
}

function login() {
    const input = document.getElementById('usernameInput');
    const username = (input.value || '').trim();
    if (!username) {
        alert('Vul een gebruikersnaam in.');
        return;
    }
    currentUser = {
        id: `user_${username.toLowerCase()}`,
        username
    };
    localStorage.setItem('safeRoute_user', JSON.stringify(currentUser));
    updateUserLabel();
    closeAuthModal();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('safeRoute_user');
    updateUserLabel();
}

function updateUserLabel() {
    const label = document.getElementById('currentUserLabel');
    if (!label) return;
    if (currentUser) {
        label.textContent = `Ingelogd als: ${currentUser.username}`;
    } else {
        label.textContent = 'Niet ingelogd';
    }
}

// Data persistence
function saveData() {
    localStorage.setItem('safeRoute_homes', JSON.stringify(homeLocations));
    localStorage.setItem('safeRoute_dangerous', JSON.stringify(dangerousPlaces));
}

function loadData() {
    const savedHomes = localStorage.getItem('safeRoute_homes');
    const savedDangerous = localStorage.getItem('safeRoute_dangerous');
    const savedUser = localStorage.getItem('safeRoute_user');
    
    if (savedHomes) {
        homeLocations = JSON.parse(savedHomes);
    }
    
    if (savedDangerous) {
        dangerousPlaces = JSON.parse(savedDangerous);
    }

    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
        } catch (e) {
            currentUser = null;
        }
    }
    updateUserLabel();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('reportModal');
    if (event.target == modal) {
        closeReportModal();
    }
}


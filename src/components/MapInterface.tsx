import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Navigation, MapPin, Route, Compass, Wifi, WifiOff, Car, Bike, Footprints, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type RouteType = {
  id: string;
  name: string;
  description: string;
  coordinates: [number, number][];
  ratings: number[];
};

type TravelMode = 'car' | 'bike' | 'foot';

const travelModeIcons: Record<TravelMode, JSX.Element> = {
  car: <Car className="inline h-4 w-4 mr-1" />,
  bike: <Bike className="inline h-4 w-4 mr-1" />,
  foot: <Footprints className="inline h-4 w-4 mr-1" />,
};

const travelModeLabels: Record<TravelMode, string> = {
  car: 'Car',
  bike: 'Bike',
  foot: 'Walk',
};

const MapInterface: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [endPoint, setEndPoint] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [locationLoading, setLocationLoading] = useState(true);
  const [userMarker, setUserMarker] = useState<L.Marker | null>(null);
  const [routeLayer, setRouteLayer] = useState<L.Polyline | null>(null);

  // Autocomplete
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  // Community routes
  const [communityRoutes, setCommunityRoutes] = useState<RouteType[]>(() => {
    const saved = localStorage.getItem('communityRoutes');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCommunity, setShowCommunity] = useState(false);
  const [creatingRoute, setCreatingRoute] = useState(false);
  const [newRouteCoords, setNewRouteCoords] = useState<[number, number][]>([]);
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteDesc, setNewRouteDesc] = useState('');
  const [selectedCommunityRoute, setSelectedCommunityRoute] = useState<RouteType | null>(null);
  const [ratingInput, setRatingInput] = useState(0);

  // Travel times
  const [travelTimes, setTravelTimes] = useState<{ [mode in TravelMode]?: number }>({});
  const [selectedMode, setSelectedMode] = useState<TravelMode>('foot');

  // Save community routes to localStorage
  useEffect(() => {
    localStorage.setItem('communityRoutes', JSON.stringify(communityRoutes));
  }, [communityRoutes]);

  // Get user location immediately on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
          setUserLocation(coords);
          setLocationLoading(false);

          // Try to get address using free Nominatim service (OpenStreetMap)
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords[1]}&lon=${coords[0]}&zoom=18&addressdetails=1`
            );
            const data = await response.json();
            if (data && data.display_name) {
              setCurrentAddress(data.display_name);
            } else {
              setCurrentAddress(`${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`);
            }
          } catch (error) {
            setCurrentAddress(`${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`);
          }
        },
        (error) => {
          setLocationLoading(false);
          toast({
            title: "Location Access",
            description: "Unable to access your location. Please enable location services.",
            variant: "destructive",
          });
        }
      );
    } else {
      setLocationLoading(false);
    }
  }, []);

  // Initialize map when we have user location
  useEffect(() => {
    if (!mapContainer.current || !userLocation) return;

    map.current = L.map(mapContainer.current).setView([userLocation[1], userLocation[0]], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    const marker = L.marker([userLocation[1], userLocation[0]], {
      title: 'Your Location'
    }).addTo(map.current);

    marker.bindPopup('📍 You are here').openPopup();
    setUserMarker(marker);

    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [userLocation]);

  // Autocomplete for destination
  const fetchSuggestions = async (query: string) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    setSuggestionLoading(true);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5`;
    const res = await fetch(url);
    const data = await res.json();
    setSuggestions(data);
    setSuggestionLoading(false);
  };

  // Geocode function for address to [lon, lat]
  const geocode = async (query: string): Promise<[number, number] | null> => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
    }
    return null;
  };

  // Plan route and draw on map for a given mode
  const handleRouteCalculation = async (mode: TravelMode = selectedMode) => {
    setSelectedMode(mode);
    setTravelTimes({});
    if (!userLocation || !endPoint) {
      toast({
        title: "Route Planning",
        description: "Could not determine your location or destination.",
        variant: "destructive",
      });
      return;
    }

    const endCoords = await geocode(endPoint);
    if (!endCoords) {
      toast({
        title: "Route Planning",
        description: "Could not find the destination.",
        variant: "destructive",
      });
      return;
    }

    // OSRM expects lon,lat;lon,lat
    const modes: TravelMode[] = ['car', 'bike', 'foot'];
    const modeProfile: Record<TravelMode, string> = {
      car: 'driving',
      bike: 'bike',
      foot: 'foot',
    };

    // Get travel times for all modes
    const times: { [mode in TravelMode]?: number } = {};
    for (const m of modes) {
      const url = `https://router.project-osrm.org/route/v1/${modeProfile[m]}/${userLocation[0]},${userLocation[1]};${endCoords[0]},${endCoords[1]}?overview=full&geometries=geojson`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          times[m] = data.routes[0].duration;
          // Draw the selected mode route
          if (m === mode) {
            const coords = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            if (routeLayer && map.current) {
              map.current.removeLayer(routeLayer);
            }
            const polyline = L.polyline(coords, { color: 'blue', weight: 5 }).addTo(map.current!);
            setRouteLayer(polyline);
            map.current!.fitBounds(polyline.getBounds(), { padding: [40, 40] });
          }
        }
      } catch (e) {
        // ignore errors for unavailable modes
      }
    }
    setTravelTimes(times);
  };

  // Community route creation
  useEffect(() => {
    if (!creatingRoute || !map.current) return;
    const handleClick = (e: L.LeafletMouseEvent) => {
      setNewRouteCoords(coords => [...coords, [e.latlng.lng, e.latlng.lat]]);
    };
    map.current.on('click', handleClick);
    return () => {
      map.current?.off('click', handleClick);
    };
  }, [creatingRoute]);

  // Draw new route polyline while creating
  useEffect(() => {
    if (!creatingRoute || !map.current) return;
    let tempLayer: L.Polyline | null = null;
    if (newRouteCoords.length > 1) {
      tempLayer = L.polyline(newRouteCoords.map(c => [c[1], c[0]]), { color: 'green', dashArray: '4 8' }).addTo(map.current);
    }
    return () => {
      if (tempLayer && map.current) map.current.removeLayer(tempLayer);
    };
  }, [newRouteCoords, creatingRoute]);

  // Draw selected community route
  useEffect(() => {
    if (!selectedCommunityRoute || !map.current) return;
    const polyline = L.polyline(selectedCommunityRoute.coordinates.map(c => [c[1], c[0]]), { color: 'purple', weight: 5 }).addTo(map.current);
    map.current.fitBounds(polyline.getBounds(), { padding: [40, 40] });
    return () => {
      if (polyline && map.current) map.current.removeLayer(polyline);
    };
  }, [selectedCommunityRoute]);

  // Handle saving a new route
  const handleSaveRoute = () => {
    if (!newRouteName || newRouteCoords.length < 2) {
      toast({ title: "Route creation", description: "Please add a name and at least two points.", variant: "destructive" });
      return;
    }
    setCommunityRoutes(routes => [
      ...routes,
      {
        id: Date.now().toString(),
        name: newRouteName,
        description: newRouteDesc,
        coordinates: newRouteCoords,
        ratings: [],
      }
    ]);
    setCreatingRoute(false);
    setNewRouteCoords([]);
    setNewRouteName('');
    setNewRouteDesc('');
    toast({ title: "Route saved!", description: "Your hiking route is now available to the community." });
  };

  // Handle rating a route
  const handleRateRoute = (route: RouteType, rating: number) => {
    setCommunityRoutes(routes =>
      routes.map(r =>
        r.id === route.id ? { ...r, ratings: [...r.ratings, rating] } : r
      )
    );
    setSelectedCommunityRoute(null);
    setRatingInput(0);
    toast({ title: "Thank you!", description: "Your rating has been submitted." });
  };

  const handleCurrentLocation = () => {
    if (userLocation && map.current) {
      map.current.setView([userLocation[1], userLocation[0]], 15);
      if (userMarker) {
        userMarker.openPopup();
      }
    }
  };

  // Format seconds to h:mm or mm:ss
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--';
    const mins = Math.round(seconds / 60);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    }
    return `${mins} min`;
  };

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Loading Screen */}
      {locationLoading && (
        <div className="absolute inset-0 z-50 bg-background flex items-center justify-center">
          <Card className="p-8 max-w-md w-full mx-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="animate-pulse p-3 rounded-full bg-primary/10">
                  <MapPin className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-xl font-bold">TrailFinder</h2>
              <p className="text-muted-foreground">Finding your location...</p>
              <p className="text-xs text-muted-foreground">100% Free • No API Keys Needed</p>
            </div>
          </Card>
        </div>
      )}

      {/* Offline Status Banner */}
      {isOfflineMode && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-accent text-accent-foreground p-2 text-center font-semibold">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            OFFLINE MODE - Using cached maps
          </div>
        </div>
      )}

      {/* Community Routes Button */}
      <Button
        className="fixed top-4 right-4 z-50"
        variant="secondary"
        onClick={() => setShowCommunity(true)}
      >
        Community Routes
      </Button>

      {/* Community Routes Modal */}
      {showCommunity && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-4 relative">
            <button className="absolute top-2 right-2" onClick={() => setShowCommunity(false)}>✕</button>
            <h2 className="font-bold text-lg mb-2">Community Hiking Routes</h2>
            <Button onClick={() => { setCreatingRoute(true); setShowCommunity(false); }} className="mb-4">Create Route</Button>
            <ul>
              {communityRoutes.length === 0 && <li className="text-muted-foreground">No routes yet.</li>}
              {communityRoutes.map(route => (
                <li key={route.id} className="border-b py-2">
                  <div className="font-semibold">{route.name}</div>
                  <div className="text-xs text-muted-foreground">{route.description}</div>
                  <div>
                    Rating: {route.ratings.length > 0 ? (route.ratings.reduce((a, b) => a + b, 0) / route.ratings.length).toFixed(1) : 'No ratings yet'}
                  </div>
                  <Button size="sm" className="mt-1 mr-2" onClick={() => { setSelectedCommunityRoute(route); setShowCommunity(false); }}>View</Button>
                  <Button size="sm" variant="secondary" className="mt-1" onClick={() => setSelectedCommunityRoute(route)}>Rate</Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Create Route Modal */}
      {creatingRoute && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-4 relative">
            <button className="absolute top-2 right-2" onClick={() => { setCreatingRoute(false); setNewRouteCoords([]); }}>✕</button>
            <h2 className="font-bold text-lg mb-2">Create Hiking Route</h2>
            <p className="text-xs mb-2">Tap on the map to add points. At least 2 points required.</p>
            <Input
              placeholder="Route Name"
              value={newRouteName}
              onChange={e => setNewRouteName(e.target.value)}
              className="mb-2"
            />
            <Input
              placeholder="Description"
              value={newRouteDesc}
              onChange={e => setNewRouteDesc(e.target.value)}
              className="mb-2"
            />
            <div className="mb-2 text-xs">
              Points: {newRouteCoords.length}
            </div>
            <Button onClick={handleSaveRoute} disabled={newRouteCoords.length < 2 || !newRouteName}>Save Route</Button>
          </div>
        </div>
      )}

      {/* Rate Route Modal */}
      {selectedCommunityRoute && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-xs w-full p-4 relative">
            <button className="absolute top-2 right-2" onClick={() => setSelectedCommunityRoute(null)}>✕</button>
            <h2 className="font-bold text-lg mb-2">Rate "{selectedCommunityRoute.name}"</h2>
            <div className="flex gap-1 mb-3">
              {[1,2,3,4,5].map(star => (
                <Star
                  key={star}
                  className={`h-6 w-6 cursor-pointer ${ratingInput >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                  onClick={() => setRatingInput(star)}
                  fill={ratingInput >= star ? 'currentColor' : 'none'}
                />
              ))}
            </div>
            <Button onClick={() => handleRateRoute(selectedCommunityRoute, ratingInput)} disabled={ratingInput === 0}>Submit Rating</Button>
          </div>
        </div>
      )}

      {/* Current Location Card */}
      {userLocation && !locationLoading && (
        <Card className="absolute top-4 left-4 right-4 z-40 p-4 bg-card/95 backdrop-blur-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                <h1 className="font-bold text-lg">TrailFinder</h1>
              </div>
              <div className="flex items-center gap-1 text-xs bg-trail-success/10 text-trail-success px-2 py-1 rounded-full">
                <Wifi className="h-3 w-3" />
                FREE
              </div>
            </div>

            {/* Current Location Display */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-accent mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Your Location</p>
                  <p className="text-xs text-muted-foreground">
                    {currentAddress || `${userLocation[1].toFixed(4)}, ${userLocation[0].toFixed(4)}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <Input
                placeholder="Destination"
                value={endPoint}
                onChange={async (e) => {
                  setEndPoint(e.target.value);
                  await fetchSuggestions(e.target.value);
                }}
                className="bg-background"
              />
              {suggestionLoading && <div className="text-xs text-muted-foreground">Loading...</div>}
              {suggestions.length > 0 && (
                <div className="bg-white border rounded shadow mt-1 max-h-48 overflow-auto z-50 absolute w-full">
                  {suggestions.map((s: any) => (
                    <div
                      key={s.place_id}
                      className="px-3 py-2 hover:bg-accent cursor-pointer text-sm"
                      onClick={() => {
                        setEndPoint(s.display_name);
                        setSuggestions([]);
                      }}
                    >
                      {s.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap mt-2">
              <Button
                onClick={() => handleRouteCalculation(selectedMode)}
                className="flex items-center gap-1 btn-trail"
                size="sm"
                disabled={locationLoading || !endPoint}
              >
                <Route className="h-4 w-4" />
                Plan Route
              </Button>
            </div>

            {/* Travel Times */}
            {Object.keys(travelTimes).length > 0 && (
              <div className="flex gap-3 mt-2 flex-wrap">
                {(['car', 'bike', 'foot'] as TravelMode[]).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={selectedMode === mode ? "default" : "secondary"}
                    className="flex items-center gap-1"
                    onClick={() => handleRouteCalculation(mode)}
                  >
                    {travelModeIcons[mode]}
                    {travelModeLabels[mode]}
                    <span className="ml-1">{formatDuration(travelTimes[mode])}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Map Container */}
      <div
        ref={mapContainer}
        className="absolute left-0 right-0"
        style={{
          top: isOfflineMode ? '130px' : '260px',
          bottom: '100px',
          left: '16px',
          right: '16px',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
        }}
      >
        {/* Center Map Button (bottom left, floating, does not affect map size) */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 1000,
            pointerEvents: 'auto',
          }}
        >
          <Button
            onClick={handleCurrentLocation}
            variant="secondary"
            size="icon"
            className="rounded-full shadow"
            style={{ background: 'rgba(255,255,255,0.85)' }}
            aria-label="Center Map"
          >
            <Compass className="h-5 w-5 text-primary" />
          </Button>
        </div>
      </div>

      {/* Responsive adjustments for mobile */}
      <style>
        {`
          @media (max-width: 740px) {
            .leaflet-container {
              border-radius: 0.5rem !important;
            }
            .map-container-responsive {
              top: 1rem !important;
              bottom: 6rem !important;
              left: 0.5rem !important;
              right: 0.5rem !important;
            }
          }
        `}
      </style>

      {/* Bottom Status Panel */}
      {userLocation && !locationLoading && (
        <Card className="absolute bottom-4 left-4 right-4 z-40 p-3 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOfflineMode ? 'bg-accent' : 'bg-trail-success'}`}></div>
              <span className="font-medium">
                {isOfflineMode ? 'Offline Ready' : 'OpenStreetMap • Free'}
              </span>
            </div>

            <div className="text-muted-foreground text-xs">
              GPS: {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MapInterface;
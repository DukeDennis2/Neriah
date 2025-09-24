import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Navigation, MapPin, Route, Compass, Zap, Settings, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MapInterfaceProps {
  mapboxToken?: string;
  onTokenSet?: (token: string) => void;
}

const MapInterface: React.FC<MapInterfaceProps> = ({ mapboxToken, onTokenSet }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [locationLoading, setLocationLoading] = useState(true);

  // Get user location immediately on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
          setUserLocation(coords);
          setLocationLoading(false);
          
          // Try to get address using reverse geocoding (if we have a token)
          if (mapboxToken) {
            try {
              const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?access_token=${mapboxToken}`
              );
              const data = await response.json();
              if (data.features && data.features.length > 0) {
                setCurrentAddress(data.features[0].place_name);
              }
            } catch (error) {
              console.error('Geocoding error:', error);
            }
          } else {
            setCurrentAddress(`${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
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
  }, [mapboxToken]);

  // Initialize map when we have a token
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !userLocation) return;

    // Initialize Mapbox
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12', // Perfect for hiking/outdoor use
      center: userLocation,
      zoom: 15,
      pitch: 0,
      bearing: 0,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
        showZoom: true,
        showCompass: true,
      }),
      'top-right'
    );

    // Add geolocation control
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: true,
    });

    map.current.addControl(geolocate, 'top-right');

    // Add a marker for current location
    new mapboxgl.Marker({ color: '#ff6b35' })
      .setLngLat(userLocation)
      .addTo(map.current);

    // Listen for offline/online status
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      map.current?.remove();
    };
  }, [mapboxToken, userLocation]);

  const handleRouteCalculation = () => {
    if (!startPoint || !endPoint) {
      toast({
        title: "Route Planning",
        description: "Please enter both start and end points.",
        variant: "destructive",
      });
      return;
    }

    // For now, show a message about route calculation
    toast({
      title: "Route Calculation",
      description: "Calculating optimal route for offline navigation...",
    });
  };

  const handleCurrentLocation = () => {
    if (userLocation && map.current) {
      map.current.flyTo({
        center: userLocation,
        zoom: 15,
        duration: 1000,
      });
    }
  };

  const handleTokenSubmit = () => {
    if (tokenInput.trim() && onTokenSet) {
      onTokenSet(tokenInput.trim());
      setShowTokenDialog(false);
      toast({
        title: "Map Enhanced",
        description: "Full navigation features are now available!",
      });
    }
  };

  const handleSetupMaps = () => {
    setShowTokenDialog(true);
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
            </div>
          </Card>
        </div>
      )}

      {/* Offline Status Banner */}
      {isOfflineMode && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-accent text-accent-foreground p-2 text-center font-semibold">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4" />
            OFFLINE MODE - Limited features
          </div>
        </div>
      )}

      {/* Current Location Card - Shows immediately like Google Maps */}
      {userLocation && !locationLoading && (
        <Card className="absolute top-4 left-4 right-4 z-40 p-4 bg-card/95 backdrop-blur-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-primary" />
                <h1 className="font-bold text-lg">TrailFinder</h1>
              </div>
              {!mapboxToken && (
                <Button
                  onClick={handleSetupMaps}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Settings className="h-4 w-4" />
                  Setup Maps
                </Button>
              )}
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
            
            {mapboxToken && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Start point (or use current location)"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    className="bg-background"
                  />
                  <Input
                    placeholder="Destination"
                    value={endPoint}
                    onChange={(e) => setEndPoint(e.target.value)}
                    className="bg-background"
                  />
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={handleCurrentLocation}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Compass className="h-4 w-4" />
                    Center Map
                  </Button>
                  
                  <Button 
                    onClick={handleRouteCalculation}
                    className="flex items-center gap-1 btn-trail"
                    size="sm"
                  >
                    <Route className="h-4 w-4" />
                    Plan Route
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      )}

      {/* Map Container or Basic View */}
      {mapboxToken ? (
        <div 
          ref={mapContainer} 
          className="absolute inset-0 rounded-lg"
          style={{ top: isOfflineMode ? '48px' : '0' }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="mb-4">
              <MapPin className="h-16 w-16 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Basic Location View</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Setup Mapbox for full navigation features
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Token Setup Dialog */}
      {showTokenDialog && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="p-6 max-w-lg w-full">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Setup Map Navigation</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTokenDialog(false)}
                >
                  ×
                </Button>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Mapbox Public Token
                </label>
                <Input
                  type="password"
                  placeholder="pk.eyJ1..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTokenSubmit()}
                  className="mb-3"
                />
                <Button 
                  onClick={handleTokenSubmit}
                  disabled={!tokenInput.trim()}
                  className="w-full btn-trail"
                >
                  Enable Full Navigation
                </Button>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-start gap-2 mb-2">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <span className="font-medium text-sm">Get your free token:</span>
                </div>
                <ol className="text-xs text-muted-foreground space-y-1 ml-6">
                  <li>1. Visit <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a></li>
                  <li>2. Create a free account</li>
                  <li>3. Go to Account → Tokens</li>
                  <li>4. Copy your Default Public Token</li>
                </ol>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Bottom Status Panel */}
      {userLocation && !locationLoading && (
        <Card className="absolute bottom-4 left-4 right-4 z-40 p-3 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${mapboxToken ? (isOfflineMode ? 'bg-accent' : 'bg-trail-success') : 'bg-trail-warning'}`}></div>
              <span className="font-medium">
                {mapboxToken ? (isOfflineMode ? 'Offline Ready' : 'Full Navigation') : 'Basic Mode'}
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
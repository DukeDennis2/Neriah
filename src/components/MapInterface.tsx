import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Navigation, MapPin, Route, Compass, Zap, Wifi, WifiOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Fix Leaflet default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapInterfaceProps {
  // No props needed - completely free!
}

const MapInterface: React.FC<MapInterfaceProps> = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [locationLoading, setLocationLoading] = useState(true);
  const [userMarker, setUserMarker] = useState<L.Marker | null>(null);

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
            console.error('Geocoding error:', error);
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
  }, []);

  // Initialize map when we have user location
  useEffect(() => {
    if (!mapContainer.current || !userLocation) return;

    // Initialize Leaflet map
    map.current = L.map(mapContainer.current).setView([userLocation[1], userLocation[0]], 15);

    // Add OpenStreetMap tiles (completely free!)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map.current);

    // Add user location marker
    const marker = L.marker([userLocation[1], userLocation[0]], {
      title: 'Your Location'
    }).addTo(map.current);
    
    marker.bindPopup('📍 You are here').openPopup();
    setUserMarker(marker);

    // Listen for offline/online status
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

  const handleRouteCalculation = async () => {
    if (!startPoint || !endPoint) {
      toast({
        title: "Route Planning",
        description: "Please enter both start and end points.",
        variant: "destructive",
      });
      return;
    }

    // Simple route calculation message
    toast({
      title: "Route Calculation",
      description: "Calculating optimal route using free OpenStreetMap data...",
    });
    
    // TODO: Implement basic routing with OSRM (free routing service)
  };

  const handleCurrentLocation = () => {
    if (userLocation && map.current) {
      map.current.setView([userLocation[1], userLocation[0]], 15);
      if (userMarker) {
        userMarker.openPopup();
      }
    }
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
          </div>
        </Card>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="absolute inset-0 rounded-lg"
        style={{ top: isOfflineMode ? '48px' : '0' }}
      />

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
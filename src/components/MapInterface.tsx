import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Navigation, MapPin, Route, Compass, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MapInterfaceProps {
  mapboxToken?: string;
}

const MapInterface: React.FC<MapInterfaceProps> = ({ mapboxToken }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [startPoint, setStartPoint] = useState('');
  const [endPoint, setEndPoint] = useState('');
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    // Initialize Mapbox
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12', // Perfect for hiking/outdoor use
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
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

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
          setUserLocation(coords);
          map.current?.flyTo({
            center: coords,
            zoom: 12,
            duration: 2000,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: "Location Access",
            description: "Unable to access your location. Please enable location services.",
            variant: "destructive",
          });
        }
      );
    }

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
  }, [mapboxToken]);

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

  if (!mapboxToken) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <MapPin className="h-12 w-12 text-accent" />
            </div>
            <h2 className="text-xl font-bold">Mapbox Setup Required</h2>
            <p className="text-muted-foreground">
              To use the offline navigation features, please provide your Mapbox public token.
            </p>
            <p className="text-sm text-muted-foreground">
              Get your free token at{' '}
              <a 
                href="https://mapbox.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                mapbox.com
              </a>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Offline Status Banner */}
      {isOfflineMode && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-accent text-accent-foreground p-2 text-center font-semibold">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-4 w-4" />
            OFFLINE MODE - Using cached maps
          </div>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapContainer} 
        className="absolute inset-0 rounded-lg"
        style={{ top: isOfflineMode ? '48px' : '0' }}
      />

      {/* Control Panel */}
      <Card className="absolute top-4 left-4 right-4 z-40 p-4 bg-card/95 backdrop-blur-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Navigation className="h-5 w-5 text-primary" />
            <h1 className="font-bold text-lg">TrailFinder</h1>
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
              My Location
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

      {/* Bottom Info Panel */}
      <Card className="absolute bottom-4 left-4 right-4 z-40 p-3 bg-card/95 backdrop-blur-sm">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOfflineMode ? 'bg-accent' : 'bg-trail-success'}`}></div>
            <span className="font-medium">
              {isOfflineMode ? 'Offline Ready' : 'Online'}
            </span>
          </div>
          
          {userLocation && (
            <div className="text-muted-foreground text-xs">
              GPS: {userLocation[1].toFixed(4)}, {userLocation[0].toFixed(4)}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MapInterface;
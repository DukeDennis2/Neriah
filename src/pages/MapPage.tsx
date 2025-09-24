import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MapPin, Settings, Info } from 'lucide-react';
import MapInterface from '@/components/MapInterface';

const MapPage = () => {
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [showTokenInput, setShowTokenInput] = useState(true);

  const handleTokenSubmit = () => {
    if (tokenInput.trim()) {
      setMapboxToken(tokenInput.trim());
      setShowTokenInput(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTokenSubmit();
    }
  };

  if (showTokenInput) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 max-w-lg w-full">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-primary/10">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold mb-2">TrailFinder</h1>
              <p className="text-muted-foreground">
                Offline-first navigation for wilderness and emergency situations
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-left">
                <label className="text-sm font-medium mb-2 block">
                  Mapbox Public Token
                </label>
                <Input
                  type="password"
                  placeholder="pk.eyJ1..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="mb-3"
                />
                <Button 
                  onClick={handleTokenSubmit}
                  disabled={!tokenInput.trim()}
                  className="w-full btn-trail"
                >
                  Start Navigation
                </Button>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg text-left">
                <div className="flex items-start gap-2 mb-2">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <span className="font-medium text-sm">Getting your token:</span>
                </div>
                <ol className="text-xs text-muted-foreground space-y-1 ml-6">
                  <li>1. Visit <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">mapbox.com</a></li>
                  <li>2. Create a free account</li>
                  <li>3. Go to your Account → Tokens</li>
                  <li>4. Copy your Default Public Token</li>
                </ol>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return <MapInterface mapboxToken={mapboxToken} />;
};

export default MapPage;
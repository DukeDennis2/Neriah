import React, { useState } from 'react';
import MapInterface from '@/components/MapInterface';

const MapPage = () => {
  const [mapboxToken, setMapboxToken] = useState<string>('');

  return <MapInterface mapboxToken={mapboxToken} onTokenSet={setMapboxToken} />;
};

export default MapPage;
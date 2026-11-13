import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';

console.log('Mapbox GL JS Loaded:', mapboxgl);

mapboxgl.accessToken = 'pk.eyJ1Ijoiajh4aW9uZy1iZWVwIiwiYSI6ImNtd2U4bGt5aDAxN3EzNW9zNmhkMHNmcDkifQ.FtgYju7j76Wp1YqqSQSmdg';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/j8xiong-beep/cmwe9tg7w002p01sl6it0613o',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

map.on('load', async () => {
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  map.addLayer({
    id: 'bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': '#32D400',
      'line-width': 5,
      'line-opacity': 0.6,
    },
  });
});

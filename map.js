import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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

const svg = d3.select('#map').select('svg');

const bikeLaneStyle = {
  'line-color': '#32D400',
  'line-width': 5,
  'line-opacity': 0.6,
};

let timeFilter = -1;

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterTripsbyTime(trips, timeFilter) {
  return timeFilter === -1
    ? trips
    : trips.filter((trip) => {
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
      });
}

function computeStationTraffic(stations, trips) {
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id,
  );

  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id,
  );

  return stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

map.on('load', async () => {
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  map.addLayer({
    id: 'bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: bikeLaneStyle,
  });

  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });

  map.addLayer({
    id: 'cambridge-bike-lanes',
    type: 'line',
    source: 'cambridge_route',
    paint: bikeLaneStyle,
  });

  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const jsonData = await d3.json(jsonurl);
    console.log('Loaded JSON Data:', jsonData);

    let trips = await d3.csv(
      'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
      (trip) => {
        trip.started_at = new Date(trip.started_at);
        trip.ended_at = new Date(trip.ended_at);
        return trip;
      },
    );
    console.log('Trips:', trips);

    const stations = computeStationTraffic(jsonData.data.stations, trips);
    console.log('Stations with traffic:', stations);

    const radiusScale = d3
      .scaleSqrt()
      .domain([0, d3.max(stations, (d) => d.totalTraffic)])
      .range([0, 25]);

    const circles = svg
      .selectAll('circle')
      .data(stations, (d) => d.short_name)
      .enter()
      .append('circle')
      .attr('r', (d) => radiusScale(d.totalTraffic))
      .each(function (d) {
        d3.select(this)
          .append('title')
          .text(
            `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`,
          );
      });

    function updatePositions() {
      circles
        .attr('cx', (d) => getCoords(d).cx)
        .attr('cy', (d) => getCoords(d).cy);
    }

    updatePositions();

    map.on('move', updatePositions);
    map.on('zoom', updatePositions);
    map.on('resize', updatePositions);
    map.on('moveend', updatePositions);

    const timeSlider = document.getElementById('time-slider');
    const selectedTime = document.getElementById('selected-time');
    const anyTimeLabel = document.getElementById('any-time');

    function updateTimeDisplay() {
      timeFilter = Number(timeSlider.value);

      if (timeFilter === -1) {
        selectedTime.textContent = '';
        anyTimeLabel.style.display = 'block';
      } else {
        selectedTime.textContent = formatTime(timeFilter);
        anyTimeLabel.style.display = 'none';
      }

      updateScatterPlot(timeFilter);
    }

    function updateScatterPlot(timeFilter) {
      const filteredTrips = filterTripsbyTime(trips, timeFilter);
      const filteredStations = computeStationTraffic(stations, filteredTrips);

      timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

      circles
        .data(filteredStations, (d) => d.short_name)
        .join('circle')
        .attr('r', (d) => radiusScale(d.totalTraffic));
    }

    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();
  } catch (error) {
    console.error('Error loading JSON:', error);
  }
});

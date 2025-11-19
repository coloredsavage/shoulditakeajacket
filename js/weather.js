/**
 * Weather API integration module
 * Uses Open-Meteo API (free, no API key required)
 */

const WeatherAPI = {
    BASE_URL: 'https://api.open-meteo.com/v1',
    GEO_URL: 'https://geocoding-api.open-meteo.com/v1',

    // Cache weather data for 10 minutes
    cache: {
        data: null,
        timestamp: null,
        CACHE_DURATION: 10 * 60 * 1000 // 10 minutes
    },

    /**
     * Check if cached data is still valid
     */
    isCacheValid() {
        if (!this.cache.data || !this.cache.timestamp) return false;
        return (Date.now() - this.cache.timestamp) < this.cache.CACHE_DURATION;
    },

    /**
     * Get weather data by coordinates
     */
    async getWeatherByCoords(lat, lon) {
        // Check cache first
        if (this.isCacheValid()) {
            return this.cache.data;
        }

        try {
            // Get current weather and forecast
            const response = await fetch(
                `${this.BASE_URL}/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,wind_speed_10m,precipitation_probability&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1`
            );

            if (!response.ok) {
                throw new Error('Weather API request failed');
            }

            const data = await response.json();

            // Get location name via reverse geocoding
            const locationName = await this.reverseGeocode(lat, lon);

            const weatherData = this.processWeatherData(data, locationName);

            // Cache the result
            this.cache.data = weatherData;
            this.cache.timestamp = Date.now();

            return weatherData;
        } catch (error) {
            console.error('Error fetching weather:', error);
            throw error;
        }
    },

    /**
     * Reverse geocode coordinates to get location name
     */
    async reverseGeocode(lat, lon) {
        try {
            const response = await fetch(
                `${this.GEO_URL}/search?name=&latitude=${lat}&longitude=${lon}&count=1`
            );

            // If reverse geocoding fails, return coordinates
            if (!response.ok) {
                return { name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, country: '' };
            }

            // Open-Meteo doesn't have true reverse geocoding, so we'll use the search results
            // For now, return a placeholder that will be overwritten by search selection
            return { name: 'Current Location', country: '' };
        } catch (error) {
            return { name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, country: '' };
        }
    },

    /**
     * Search for locations by query (for autocomplete)
     */
    async searchLocations(query) {
        if (!query || query.length < 2) {
            return [];
        }

        try {
            const response = await fetch(
                `${this.GEO_URL}/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
            );

            if (!response.ok) {
                throw new Error('Geocoding request failed');
            }

            const data = await response.json();

            if (!data.results) {
                return [];
            }

            return data.results.map(item => ({
                name: item.name,
                state: item.admin1 || '',
                country: item.country || '',
                lat: item.latitude,
                lon: item.longitude
            }));
        } catch (error) {
            console.error('Error searching locations:', error);
            return [];
        }
    },

    /**
     * Process raw weather data into our format
     */
    processWeatherData(data, locationInfo) {
        const current = data.current;
        const hourly = data.hourly;

        // Find forecast for 6 hours from now
        const currentHourIndex = new Date().getHours();
        const sixHourIndex = Math.min(currentHourIndex + 6, 23);
        const twelveHourIndex = Math.min(currentHourIndex + 12, 23);

        // Get precipitation probability for next 6 hours
        const precipChances = hourly.precipitation_probability.slice(currentHourIndex, sixHourIndex + 1);
        const maxPrecipChance = Math.max(...precipChances);

        // Determine weather conditions from code
        const currentConditions = this.getConditionsFromCode(current.weather_code);
        const sixHourConditions = this.getConditionsFromCode(hourly.weather_code[sixHourIndex]);

        return {
            location: {
                name: locationInfo.name,
                country: locationInfo.country,
                lat: data.latitude,
                lon: data.longitude
            },
            current: {
                temp: Math.round(current.temperature_2m),
                feelsLike: Math.round(current.apparent_temperature),
                humidity: current.relative_humidity_2m,
                windSpeed: Math.round(current.wind_speed_10m),
                conditions: currentConditions.main,
                description: currentConditions.description,
                icon: currentConditions.icon
            },
            forecast: {
                sixHour: {
                    temp: Math.round(hourly.temperature_2m[sixHourIndex]),
                    conditions: sixHourConditions.main,
                    windSpeed: Math.round(hourly.wind_speed_10m[sixHourIndex])
                },
                twelveHour: {
                    temp: Math.round(hourly.temperature_2m[twelveHourIndex]),
                    conditions: this.getConditionsFromCode(hourly.weather_code[twelveHourIndex]).main
                }
            },
            precipitation: {
                chance: maxPrecipChance,
                isRaining: [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(current.weather_code),
                isSnowing: [71, 73, 75, 77, 85, 86].includes(current.weather_code)
            },
            timestamp: Date.now(),
            timezone: data.timezone
        };
    },

    /**
     * Convert WMO weather code to conditions
     */
    getConditionsFromCode(code) {
        const conditions = {
            0: { main: 'Clear', description: 'clear sky', icon: '01d' },
            1: { main: 'Clear', description: 'mainly clear', icon: '01d' },
            2: { main: 'Clouds', description: 'partly cloudy', icon: '02d' },
            3: { main: 'Clouds', description: 'overcast', icon: '03d' },
            45: { main: 'Fog', description: 'fog', icon: '50d' },
            48: { main: 'Fog', description: 'depositing rime fog', icon: '50d' },
            51: { main: 'Drizzle', description: 'light drizzle', icon: '09d' },
            53: { main: 'Drizzle', description: 'moderate drizzle', icon: '09d' },
            55: { main: 'Drizzle', description: 'dense drizzle', icon: '09d' },
            61: { main: 'Rain', description: 'slight rain', icon: '10d' },
            63: { main: 'Rain', description: 'moderate rain', icon: '10d' },
            65: { main: 'Rain', description: 'heavy rain', icon: '10d' },
            71: { main: 'Snow', description: 'slight snow', icon: '13d' },
            73: { main: 'Snow', description: 'moderate snow', icon: '13d' },
            75: { main: 'Snow', description: 'heavy snow', icon: '13d' },
            77: { main: 'Snow', description: 'snow grains', icon: '13d' },
            80: { main: 'Rain', description: 'slight rain showers', icon: '09d' },
            81: { main: 'Rain', description: 'moderate rain showers', icon: '09d' },
            82: { main: 'Rain', description: 'violent rain showers', icon: '09d' },
            85: { main: 'Snow', description: 'slight snow showers', icon: '13d' },
            86: { main: 'Snow', description: 'heavy snow showers', icon: '13d' },
            95: { main: 'Thunderstorm', description: 'thunderstorm', icon: '11d' },
            96: { main: 'Thunderstorm', description: 'thunderstorm with slight hail', icon: '11d' },
            99: { main: 'Thunderstorm', description: 'thunderstorm with heavy hail', icon: '11d' }
        };

        return conditions[code] || { main: 'Unknown', description: 'unknown', icon: '01d' };
    },

    /**
     * Clear the cache (useful when changing locations)
     */
    clearCache() {
        this.cache.data = null;
        this.cache.timestamp = null;
    }
};

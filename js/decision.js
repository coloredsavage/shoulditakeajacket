/**
 * Jacket decision algorithm
 * Determines if user should bring a jacket based on weather conditions
 * Now includes regional climate and seasonal acclimation factors
 */

const JacketDecision = {
    // Base temperature thresholds (Fahrenheit) - Primary jacket decision factors
    BASE_THRESHOLDS: {
        NO_JACKET: 75,           // Above this = no jacket needed
        LIGHT_JACKET: 60,        // 60-75°F = light jacket/sweater
        MEDIUM_JACKET: 45,       // 45-60°F = medium jacket
        HEAVY_JACKET: 45,        // Below this = heavy jacket/coat
        
        TEMP_DROP_SIGNIFICANT: 10,  // Degrees drop that triggers recommendation
        WIND_CHILL_FACTOR: 5,       // Wind speed that significantly affects comfort
        HIGH_WIND: 15               // Wind speed that definitely needs a jacket
    },

    // Climate zones with adjustment factors (in °F)
    CLIMATE_ZONES: {
        WARM: -12,      // LA, Miami, Phoenix, San Diego, Houston
        MODERATE: 0,    // NYC, Seattle, San Francisco, Portland, Boston
        COLD: +8        // Chicago, Minneapolis, Toronto, Denver, Detroit
    },

    // Cache for seasonal data (24 hours) - now location-specific
    seasonalCache: {
        data: {}, // { "lat,lon": { adjustment: -5, timestamp: 123456 } }
        CACHE_DURATION: 24 * 60 * 60 * 1000 // 24 hours
    },

    /**
     * Determine climate zone based on location coordinates or city name
     */
    getClimateZone(lat, lon, cityName) {
        // Known warm cities (exact word matching)
        const warmCities = ['los angeles', 'miami', 'phoenix', 'san diego', 
                          'houston', 'tampa', 'las vegas', 'orlando', 'atlanta',
                          'san antonio', 'dallas', 'austin', 'jacksonville',
                          'mexico city', 'sydney', 'singapore', 'bangkok', 'dubai'];
        
        // Known cold cities (exact word matching)
        const coldCities = ['chicago', 'minneapolis', 'toronto', 'denver', 
                          'detroit', 'boston', 'milwaukee', 'cleveland', 'buffalo',
                          'minnesota', 'wisconsin', 'montreal', 'calgary',
                          'london', 'paris', 'berlin', 'moscow', 'stockholm'];
        
        const cityLower = cityName.toLowerCase();
        
        // Extract city name by splitting on common separators
        const cityWords = cityLower.split(/[,\s]+/);
        const primaryCity = cityWords[0]; // First word is usually the city name
        
        // Check against known cities using exact word matching
        if (warmCities.some(city => primaryCity === city || cityLower.includes(city + ','))) {
            return this.CLIMATE_ZONES.WARM;
        }
        if (coldCities.some(city => primaryCity === city || cityLower.includes(city + ','))) {
            return this.CLIMATE_ZONES.COLD;
        }
        
        // Use latitude as fallback
        // Closer to equator = warmer, closer to poles = colder
        const absLat = Math.abs(lat);
        if (absLat < 30) {
            return this.CLIMATE_ZONES.WARM;  // Tropical/subtropical
        } else if (absLat > 45) {
            return this.CLIMATE_ZONES.COLD;  // Northern/southern latitudes
        } else {
            return this.CLIMATE_ZONES.MODERATE;  // Temperate zones
        }
    },

    /**
     * Generate cache key for location-specific data
     */
    getCacheKey(lat, lon) {
        return `${lat.toFixed(2)},${lon.toFixed(2)}`;
    },

    /**
     * Check if seasonal cache is still valid for a specific location
     */
    isSeasonalCacheValid(lat, lon) {
        const key = this.getCacheKey(lat, lon);
        const cached = this.seasonalCache.data[key];
        if (!cached) return false;
        return (Date.now() - cached.timestamp) < this.seasonalCache.CACHE_DURATION;
    },

    /**
     * Get seasonal acclimation adjustment based on recent weather patterns
     */
    async getSeasonalAdjustment(lat, lon) {
        const key = this.getCacheKey(lat, lon);
        
        // Check cache first
        if (this.isSeasonalCacheValid(lat, lon)) {
            return this.seasonalCache.data[key].adjustment;
        }

        try {
            // Calculate date range for past 30 days (ending yesterday for data availability)
            const endDate = new Date();
            endDate.setDate(endDate.getDate() - 1); // End yesterday
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 30); // 30 days before yesterday
            
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            
            // Fetch historical temperature data in Fahrenheit
            const response = await fetch(
                `https://archive-api.open-meteo.com/v1/archive?` +
                `latitude=${lat}&` +
                `longitude=${lon}&` +
                `start_date=${startDateStr}&` +
                `end_date=${endDateStr}&` +
                `daily=temperature_2m_mean&` +
                `temperature_unit=fahrenheit&` + // Request Fahrenheit data
                `timezone=auto`
            );

            if (!response.ok) {
                throw new Error('Historical weather API request failed');
            }

            const data = await response.json();
            
            if (!data.daily || !data.daily.temperature_2m_mean) {
                throw new Error('No temperature data available');
            }

            // Calculate average temperature for the period
            const temps = data.daily.temperature_2m_mean.filter(temp => temp !== null);
            if (temps.length === 0) {
                return 0; // No data available
            }
            
            const avgTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
            
            // Determine adjustment based on average temperature (now in Fahrenheit)
            let adjustment = 0;
            if (avgTemp > 75) {
                adjustment = -8; // Very warm recently
            } else if (avgTemp > 70) {
                adjustment = -5; // Warm recently
            } else if (avgTemp < 30) {
                adjustment = +8; // Very cold recently
            } else if (avgTemp < 40) {
                adjustment = +5; // Cold recently
            }
            
            // Cache the result per location
            this.seasonalCache.data[key] = {
                adjustment,
                timestamp: Date.now()
            };
            
            return adjustment;
            
        } catch (error) {
            console.error('Error fetching seasonal adjustment:', error);
            return 0; // Fallback to no adjustment
        }
    },

    /**
     * Main decision function with regional and seasonal adjustments
     * Returns: { answer: 'YES'|'NO', reasoning: string, jacketType: string|null, rainAdvice: string|null }
     */
    async makeDecision(weatherData) {
        const { current, forecast, precipitation, location } = weatherData;

        // Get adjustment factors
        const climateAdjustment = this.getClimateZone(location.lat, location.lon, location.name);
        const seasonalAdjustment = await this.getSeasonalAdjustment(location.lat, location.lon);
        
        const totalAdjustment = climateAdjustment + seasonalAdjustment;

        // Apply adjustments to thresholds
        const adjustedThresholds = {
            NO_JACKET: this.BASE_THRESHOLDS.NO_JACKET + totalAdjustment,
            LIGHT_JACKET: this.BASE_THRESHOLDS.LIGHT_JACKET + totalAdjustment,
            MEDIUM_JACKET: this.BASE_THRESHOLDS.MEDIUM_JACKET + totalAdjustment,
            HEAVY_JACKET: this.BASE_THRESHOLDS.HEAVY_JACKET + totalAdjustment,
            TEMP_DROP_SIGNIFICANT: this.BASE_THRESHOLDS.TEMP_DROP_SIGNIFICANT,
            WIND_CHILL_FACTOR: this.BASE_THRESHOLDS.WIND_CHILL_FACTOR,
            HIGH_WIND: this.BASE_THRESHOLDS.HIGH_WIND
        };

        // Calculate effective temperature (considering wind chill)
        const effectiveTemp = this.calculateEffectiveTemp(current.temp, current.windSpeed);

        // Get current hour to determine time of day
        const hour = new Date().getHours();
        const isEvening = hour >= 18 || hour < 6;
        const isMorning = hour >= 6 && hour < 12;

        // Calculate temperature drop
        const tempDrop = current.temp - forecast.sixHour.temp;

        // Build decision factors using adjusted thresholds
        const factors = {
            isVeryCold: effectiveTemp < adjustedThresholds.HEAVY_JACKET,
            isCold: effectiveTemp < adjustedThresholds.MEDIUM_JACKET,
            isCool: effectiveTemp < adjustedThresholds.LIGHT_JACKET,
            isWarm: effectiveTemp >= adjustedThresholds.NO_JACKET,
            significantDrop: tempDrop >= adjustedThresholds.TEMP_DROP_SIGNIFICANT,
            isRainy: precipitation.isRaining || precipitation.chance > 50,
            isWindy: current.windSpeed >= adjustedThresholds.HIGH_WIND,
            isEvening,
            isMorning,
            willGetColder: forecast.sixHour.temp < current.temp - 5
        };

        // Determine answer based primarily on temperature (binary YES/NO)
        let answer, reasoning, jacketType, rainAdvice = null;

        // Primary jacket decision based on temperature
        if (factors.isVeryCold) {
            answer = 'YES';
            jacketType = 'Heavy jacket or coat';
            reasoning = this.buildTemperatureReasoning(current, forecast, factors, 'very-cold', climateAdjustment, seasonalAdjustment);
        }
        else if (factors.isCold) {
            answer = 'YES';
            jacketType = 'Medium jacket';
            reasoning = this.buildTemperatureReasoning(current, forecast, factors, 'cold', climateAdjustment, seasonalAdjustment);
        }
        else if (factors.isCool) {
            answer = 'YES';
            jacketType = 'Light jacket or sweater';
            reasoning = this.buildTemperatureReasoning(current, forecast, factors, 'cool', climateAdjustment, seasonalAdjustment);
        }
        else {
            // Above adjusted threshold = NO jacket needed
            answer = 'NO';
            jacketType = null;
            reasoning = this.buildTemperatureReasoning(current, forecast, factors, 'warm', climateAdjustment, seasonalAdjustment);
        }

        // Add rain advice as supplementary information
        if (factors.isRainy) {
            if (factors.isVeryCold || factors.isCold) {
                rainAdvice = 'Rain expected - consider waterproof jacket';
            } else if (factors.isCool) {
                rainAdvice = 'Rain expected - light rain gear recommended';
            } else {
                rainAdvice = 'Rain expected - no jacket needed for warmth, but consider rain gear';
            }
        }

        return {
            answer,
            reasoning,
            jacketType,
            rainAdvice,
            factors, // Include for debugging/transparency
            adjustments: {
                climate: climateAdjustment,
                seasonal: seasonalAdjustment,
                total: totalAdjustment
            }
        };
    },

    /**
     * Calculate effective temperature considering wind chill
     */
    calculateEffectiveTemp(temp, windSpeed) {
        // Simple wind chill approximation
        if (windSpeed >= this.BASE_THRESHOLDS.WIND_CHILL_FACTOR && temp < 70) {
            // Subtract 1 degree for every 3 mph of wind above threshold
            const windEffect = Math.floor((windSpeed - this.BASE_THRESHOLDS.WIND_CHILL_FACTOR) / 3);
            return temp - windEffect;
        }
        return temp;
    },

    /**
     * Build temperature-based reasoning messages with regional and seasonal context
     */
    buildTemperatureReasoning(current, forecast, factors, type, climateAdjustment, seasonalAdjustment) {
        const parts = [];

        // Base temperature description
        switch (type) {
            case 'very-cold':
                parts.push(`It's ${current.temp}°F`);
                if (factors.isWindy) {
                    parts.push(`and windy (${current.windSpeed} mph)`);
                }
                if (factors.willGetColder) {
                    parts.push(`dropping to ${forecast.sixHour.temp}°F later`);
                }
                break;

            case 'cold':
                parts.push(`It's ${current.temp}°F`);
                if (factors.isWindy) {
                    parts.push(`and breezy (${current.windSpeed} mph)`);
                }
                if (factors.willGetColder) {
                    parts.push(`dropping to ${forecast.sixHour.temp}°F later`);
                }
                break;

            case 'cool':
                parts.push(`It's a cool ${current.temp}°F`);
                if (factors.isWindy) {
                    parts.push(`with some wind (${current.windSpeed} mph)`);
                }
                if (factors.willGetColder) {
                    parts.push(`getting cooler later`);
                }
                break;

            case 'warm':
                parts.push(`It's ${current.temp}°F and comfortable`);
                if (!factors.willGetColder) {
                    parts.push(`staying warm through the day`);
                }
                break;
        }

        // Add regional context
        if (climateAdjustment === this.CLIMATE_ZONES.WARM && type !== 'warm') {
            parts.push(`but locals in warm climates tend to bundle up at this temperature`);
        } else if (climateAdjustment === this.CLIMATE_ZONES.COLD && type === 'warm') {
            parts.push(`and people here are used to much colder weather`);
        }

        // Add seasonal context
        if (Math.abs(seasonalAdjustment) > 5) {
            parts.push(`It's been ${seasonalAdjustment > 0 ? 'very cold' : 'very warm'} lately, so this feels ${seasonalAdjustment > 0 ? 'warmer' : 'cooler'} than usual`);
        }

        return parts.join(', ');
    },

    /**
     * Convert Fahrenheit to Celsius
     */
    toCelsius(fahrenheit) {
        return Math.round((fahrenheit - 32) * 5 / 9);
    },

    /**
     * Convert Celsius to Fahrenheit
     */
    toFahrenheit(celsius) {
        return Math.round(celsius * 9 / 5 + 32);
    }
};

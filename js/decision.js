/**
 * Jacket decision algorithm
 * Determines if user should bring a jacket based on weather conditions
 */

const JacketDecision = {
    // Temperature thresholds (Fahrenheit) - Primary jacket decision factors
    THRESHOLDS: {
        NO_JACKET: 75,           // Above this = no jacket needed
        LIGHT_JACKET: 60,        // 60-75°F = light jacket/sweater
        MEDIUM_JACKET: 45,       // 45-60°F = medium jacket
        HEAVY_JACKET: 45,        // Below this = heavy jacket/coat
        
        TEMP_DROP_SIGNIFICANT: 10,  // Degrees drop that triggers recommendation
        WIND_CHILL_FACTOR: 5,       // Wind speed that significantly affects comfort
        HIGH_WIND: 15               // Wind speed that definitely needs a jacket
    },

    /**
     * Main decision function
     * Returns: { answer: 'YES'|'NO', reasoning: string, jacketType: string|null, rainAdvice: string|null }
     */
    makeDecision(weatherData) {
        const { current, forecast, precipitation } = weatherData;

        // Calculate effective temperature (considering wind chill)
        const effectiveTemp = this.calculateEffectiveTemp(current.temp, current.windSpeed);

        // Get current hour to determine time of day
        const hour = new Date().getHours();
        const isEvening = hour >= 18 || hour < 6;
        const isMorning = hour >= 6 && hour < 12;

        // Calculate temperature drop
        const tempDrop = current.temp - forecast.sixHour.temp;

        // Build decision factors - temperature-based only for main decision
        const factors = {
            isVeryCold: effectiveTemp < this.THRESHOLDS.HEAVY_JACKET,
            isCold: effectiveTemp < this.THRESHOLDS.MEDIUM_JACKET,
            isCool: effectiveTemp < this.THRESHOLDS.LIGHT_JACKET,
            isWarm: effectiveTemp >= this.THRESHOLDS.NO_JACKET,
            significantDrop: tempDrop >= this.THRESHOLDS.TEMP_DROP_SIGNIFICANT,
            isRainy: precipitation.isRaining || precipitation.chance > 50,
            isWindy: current.windSpeed >= this.THRESHOLDS.HIGH_WIND,
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
            reasoning = this.buildTemperatureReasoning(current, forecast, factors, 'very-cold');
        }
        else if (factors.isCold) {
            answer = 'YES';
            jacketType = 'Medium jacket';
            reasoning = this.buildTemperatureReasoning(current, forecast, factors, 'cold');
        }
        else if (factors.isCool) {
            answer = 'YES';
            jacketType = 'Light jacket or sweater';
            reasoning = this.buildTemperatureReasoning(current, forecast, factors, 'cool');
        }
        else {
            // Above 60°F = NO jacket needed
            answer = 'NO';
            jacketType = null;
            reasoning = this.buildTemperatureReasoning(current, forecast, factors, 'warm');
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
            factors // Include for debugging/transparency
        };
    },

    /**
     * Calculate effective temperature considering wind chill
     */
    calculateEffectiveTemp(temp, windSpeed) {
        // Simple wind chill approximation
        if (windSpeed >= this.THRESHOLDS.WIND_CHILL_FACTOR && temp < 70) {
            // Subtract 1 degree for every 3 mph of wind above threshold
            const windEffect = Math.floor((windSpeed - this.THRESHOLDS.WIND_CHILL_FACTOR) / 3);
            return temp - windEffect;
        }
        return temp;
    },

    /**
     * Build temperature-based reasoning messages
     */
    buildTemperatureReasoning(current, forecast, factors, type) {
        const parts = [];

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

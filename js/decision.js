/**
 * Jacket decision algorithm
 * Determines if user should bring a jacket based on weather conditions
 */

const JacketDecision = {
    // Temperature thresholds (Fahrenheit)
    THRESHOLDS: {
        DEFINITELY_YES: 55,      // Below this = definitely bring a jacket
        PROBABLY_YES: 65,        // Below this = probably bring a jacket
        MAYBE: 70,               // Below this = maybe bring a jacket
        // Above MAYBE = probably fine without

        HEAVY_JACKET: 45,        // Below this = heavy jacket
        MEDIUM_JACKET: 60,       // Below this = medium jacket
        // Above MEDIUM = light jacket

        TEMP_DROP_SIGNIFICANT: 10,  // Degrees drop that triggers recommendation
        WIND_CHILL_FACTOR: 5,       // Wind speed that significantly affects comfort
        HIGH_WIND: 15               // Wind speed that definitely needs a jacket
    },

    /**
     * Main decision function
     * Returns: { answer: 'YES'|'NO'|'MAYBE', reasoning: string, jacketType: string|null }
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

        // Build decision factors
        const factors = {
            isCold: effectiveTemp < this.THRESHOLDS.PROBABLY_YES,
            isCoolish: effectiveTemp < this.THRESHOLDS.MAYBE,
            significantDrop: tempDrop >= this.THRESHOLDS.TEMP_DROP_SIGNIFICANT,
            isRainy: precipitation.isRaining || precipitation.chance > 50,
            isWindy: current.windSpeed >= this.THRESHOLDS.HIGH_WIND,
            isEvening,
            isMorning,
            willGetColder: forecast.sixHour.temp < current.temp - 5
        };

        // Determine answer
        let answer, reasoning, jacketType;

        // Definite YES conditions
        if (effectiveTemp < this.THRESHOLDS.DEFINITELY_YES) {
            answer = 'YES';
            reasoning = this.buildReasoning(current, forecast, factors, 'cold');
            jacketType = this.recommendJacketType(effectiveTemp, factors);
        }
        // YES conditions
        else if (factors.isCold || factors.isRainy ||
                 (factors.significantDrop && factors.willGetColder) ||
                 (factors.isWindy && effectiveTemp < this.THRESHOLDS.MAYBE)) {
            answer = 'YES';
            reasoning = this.buildReasoning(current, forecast, factors, 'yes');
            jacketType = this.recommendJacketType(effectiveTemp, factors);
        }
        // MAYBE conditions
        else if (factors.isCoolish ||
                 (factors.isEvening && current.temp < 75) ||
                 (factors.significantDrop) ||
                 (precipitation.chance > 30)) {
            answer = 'MAYBE';
            reasoning = this.buildReasoning(current, forecast, factors, 'maybe');
            jacketType = this.recommendJacketType(effectiveTemp, factors);
        }
        // NO - you're fine
        else {
            answer = 'NO';
            reasoning = this.buildReasoning(current, forecast, factors, 'no');
            jacketType = null;
        }

        return {
            answer,
            reasoning,
            jacketType,
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
     * Recommend jacket type based on conditions
     */
    recommendJacketType(effectiveTemp, factors) {
        if (effectiveTemp < this.THRESHOLDS.HEAVY_JACKET || factors.isRainy) {
            return 'Heavy jacket or coat';
        } else if (effectiveTemp < this.THRESHOLDS.MEDIUM_JACKET) {
            return 'Medium jacket';
        } else {
            return 'Light jacket';
        }
    },

    /**
     * Build human-readable reasoning
     */
    buildReasoning(current, forecast, factors, type) {
        const parts = [];

        switch (type) {
            case 'cold':
                parts.push(`It's ${current.temp}°F`);
                if (factors.isWindy) {
                    parts.push(`and windy (${current.windSpeed} mph)`);
                }
                if (factors.willGetColder) {
                    parts.push(`dropping to ${forecast.sixHour.temp}°F later`);
                }
                break;

            case 'yes':
                if (factors.isCold) {
                    parts.push(`It's ${current.temp}°F`);
                } else if (factors.isRainy) {
                    parts.push(`Rain is expected`);
                    if (current.temp < 70) {
                        parts.push(`and it's ${current.temp}°F`);
                    }
                } else if (factors.significantDrop) {
                    parts.push(`Currently ${current.temp}°F but dropping to ${forecast.sixHour.temp}°F`);
                } else if (factors.isWindy) {
                    parts.push(`Windy conditions (${current.windSpeed} mph) at ${current.temp}°F`);
                }
                break;

            case 'maybe':
                if (factors.isCoolish) {
                    parts.push(`It's a mild ${current.temp}°F`);
                }
                if (factors.isEvening) {
                    parts.push(`Evening temperatures can get chilly`);
                } else if (factors.significantDrop) {
                    parts.push(`Temperature dropping from ${current.temp}°F to ${forecast.sixHour.temp}°F`);
                }
                break;

            case 'no':
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

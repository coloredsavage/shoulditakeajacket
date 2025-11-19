/**
 * Main application logic
 * Handles UI state, location detection, and user interactions
 */

const App = {
    // State
    state: {
        useCelsius: false,
        weatherData: null,
        location: null,
        suggestions: [],
        selectedIndex: -1,
        searchTimeout: null,
        carouselIndex: 0,
        resultCarouselIndex: 0
    },

    // DOM Elements
    elements: {},

    /**
     * Initialize the application
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.initCarousels();
        this.startLocationDetection();
    },

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        this.elements = {
            // States
            loading: document.getElementById('loading'),
            permission: document.getElementById('permission'),
            result: document.getElementById('result'),
            error: document.getElementById('error'),

            // Buttons
            allowLocation: document.getElementById('allow-location'),
            changeLocation: document.getElementById('change-location'),
            retry: document.getElementById('retry'),
            toggleUnits: document.getElementById('toggle-units'),

            // Inputs
            locationInput: document.getElementById('location-input'),
            suggestions: document.getElementById('location-suggestions'),

            // Result elements
            answer: document.getElementById('answer'),
            jacketType: document.getElementById('jacket-type'),
            reasoning: document.getElementById('reasoning'),
            currentTemp: document.getElementById('current-temp'),
            laterTemp: document.getElementById('later-temp'),
            windSpeed: document.getElementById('wind-speed'),
            locationName: document.getElementById('location-name'),

            // Error
            errorMessage: document.getElementById('error-message'),

            // Carousels
            carouselTrack: document.getElementById('carousel-track'),
            carouselPrev: document.getElementById('carousel-prev'),
            carouselNext: document.getElementById('carousel-next'),
            resultCarouselTrack: document.getElementById('result-carousel-track'),
            resultCarouselPrev: document.getElementById('result-carousel-prev'),
            resultCarouselNext: document.getElementById('result-carousel-next')
        };
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        this.elements.allowLocation.addEventListener('click', () => this.requestLocation());
        this.elements.changeLocation.addEventListener('click', () => this.showPermission());
        this.elements.retry.addEventListener('click', () => this.retry());
        this.elements.toggleUnits.addEventListener('click', () => this.toggleUnits());

        // Location input events for autocomplete
        this.elements.locationInput.addEventListener('input', (e) => this.handleInput(e));
        this.elements.locationInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.elements.locationInput.addEventListener('focus', () => this.showSuggestions());

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.elements.locationInput.contains(e.target) &&
                !this.elements.suggestions.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        // Carousel events
        this.elements.carouselPrev.addEventListener('click', () => this.moveCarousel('main', -1));
        this.elements.carouselNext.addEventListener('click', () => this.moveCarousel('main', 1));
        this.elements.resultCarouselPrev.addEventListener('click', () => this.moveCarousel('result', -1));
        this.elements.resultCarouselNext.addEventListener('click', () => this.moveCarousel('result', 1));
    },

    /**
     * Move carousel in specified direction
     */
    moveCarousel(type, direction) {
        const track = type === 'main' ? this.elements.carouselTrack : this.elements.resultCarouselTrack;
        const items = track.querySelectorAll('.carousel-item');
        const totalItems = items.length;

        if (type === 'main') {
            this.state.carouselIndex = (this.state.carouselIndex + direction + totalItems) % totalItems;
            this.updateCarousel(track, items, this.state.carouselIndex);
        } else {
            this.state.resultCarouselIndex = (this.state.resultCarouselIndex + direction + totalItems) % totalItems;
            this.updateCarousel(track, items, this.state.resultCarouselIndex);
        }
    },

    /**
     * Update carousel display
     */
    updateCarousel(track, items, currentIndex) {
        const totalItems = items.length;

        // Hide all items first
        items.forEach((item, index) => {
            item.style.display = 'none';
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
        });

        // Show 3 items: prev, current, next
        const prevIndex = (currentIndex - 1 + totalItems) % totalItems;
        const nextIndex = (currentIndex + 1) % totalItems;

        items[prevIndex].style.display = 'block';
        items[prevIndex].style.opacity = '0.4';
        items[prevIndex].style.transform = 'scale(0.8)';

        items[currentIndex].style.display = 'block';
        items[currentIndex].style.transform = 'scale(1.1)';

        items[nextIndex].style.display = 'block';
        items[nextIndex].style.opacity = '0.4';
        items[nextIndex].style.transform = 'scale(0.8)';
    },

    /**
     * Initialize carousels
     */
    initCarousels() {
        const mainTrack = this.elements.carouselTrack;
        const mainItems = mainTrack.querySelectorAll('.carousel-item');
        this.updateCarousel(mainTrack, mainItems, this.state.carouselIndex);

        const resultTrack = this.elements.resultCarouselTrack;
        const resultItems = resultTrack.querySelectorAll('.carousel-item');
        this.updateCarousel(resultTrack, resultItems, this.state.resultCarouselIndex);
    },

    /**
     * Handle input changes for autocomplete
     */
    handleInput(e) {
        const query = e.target.value.trim();

        // Clear previous timeout
        if (this.state.searchTimeout) {
            clearTimeout(this.state.searchTimeout);
        }

        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }

        // Debounce the search
        this.state.searchTimeout = setTimeout(async () => {
            const locations = await WeatherAPI.searchLocations(query);
            this.state.suggestions = locations;
            this.state.selectedIndex = -1;
            this.renderSuggestions();
        }, 300);
    },

    /**
     * Handle keyboard navigation
     */
    handleKeydown(e) {
        const suggestions = this.state.suggestions;

        if (suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.state.selectedIndex = Math.min(
                    this.state.selectedIndex + 1,
                    suggestions.length - 1
                );
                this.renderSuggestions();
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.state.selectedIndex = Math.max(this.state.selectedIndex - 1, -1);
                this.renderSuggestions();
                break;

            case 'Enter':
                e.preventDefault();
                if (this.state.selectedIndex >= 0) {
                    this.selectLocation(suggestions[this.state.selectedIndex]);
                } else if (suggestions.length > 0) {
                    this.selectLocation(suggestions[0]);
                }
                break;

            case 'Escape':
                this.hideSuggestions();
                break;
        }
    },

    /**
     * Render suggestions dropdown
     */
    renderSuggestions() {
        const suggestions = this.state.suggestions;

        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.elements.suggestions.innerHTML = suggestions.map((loc, index) => {
            const detail = loc.state
                ? `${loc.state}, ${loc.country}`
                : loc.country;
            const selected = index === this.state.selectedIndex ? 'selected' : '';

            return `
                <li class="${selected}" data-index="${index}">
                    <div class="location-name">${loc.name}</div>
                    <div class="location-detail">${detail}</div>
                </li>
            `;
        }).join('');

        // Add click handlers to suggestions
        this.elements.suggestions.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', () => {
                const index = parseInt(li.dataset.index);
                this.selectLocation(this.state.suggestions[index]);
            });
        });

        this.showSuggestions();
    },

    /**
     * Select a location from suggestions
     */
    async selectLocation(location) {
        this.hideSuggestions();
        this.showLoading();

        WeatherAPI.clearCache();
        this.state.location = {
            lat: location.lat,
            lon: location.lon,
            name: location.name,
            state: location.state,
            country: location.country
        };

        try {
            const weatherData = await WeatherAPI.getWeatherByCoords(location.lat, location.lon);
            // Override location name with the selected location
            weatherData.location.name = location.name;
            weatherData.location.country = location.state
                ? `${location.state}, ${location.country}`
                : location.country;
            this.state.weatherData = weatherData;
            this.showResult(weatherData);
        } catch (error) {
            this.showError('Could not fetch weather data. Please try again.');
        }
    },

    /**
     * Show suggestions dropdown
     */
    showSuggestions() {
        if (this.state.suggestions.length > 0) {
            this.elements.suggestions.classList.remove('hidden');
        }
    },

    /**
     * Hide suggestions dropdown
     */
    hideSuggestions() {
        this.elements.suggestions.classList.add('hidden');
        this.state.selectedIndex = -1;
    },


    /**
     * Start location detection process
     */
    startLocationDetection() {
        // Show manual entry directly - no loading state
        this.showState('permission');
    },

    /**
     * Request location from user
     */
    requestLocation() {
        this.showLoading();
        this.getLocation();
    },

    /**
     * Get user's location using browser geolocation
     */
    getLocation() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.state.location = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                this.fetchWeather();
            },
            (error) => {
                console.error('Geolocation error:', error);
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        this.showError('Location access denied. Please enter your location manually.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        this.showError('Location unavailable. Please enter your location manually.');
                        break;
                    case error.TIMEOUT:
                        this.showError('Location request timed out. Please try again.');
                        break;
                    default:
                        this.showError('Could not get your location. Please enter it manually.');
                }
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    },


    /**
     * Fetch weather data for current location
     */
    async fetchWeather() {
        if (!this.state.location) {
            this.showError('No location available');
            return;
        }

        try {
            const weatherData = await WeatherAPI.getWeatherByCoords(
                this.state.location.lat,
                this.state.location.lon
            );
            this.state.weatherData = weatherData;
            this.showResult(weatherData);
        } catch (error) {
            if (WeatherAPI.API_KEY === 'YOUR_API_KEY_HERE') {
                this.showError('Please add your OpenWeatherMap API key to js/weather.js');
            } else {
                this.showError('Could not fetch weather data. Please try again.');
            }
        }
    },

    /**
     * Display the result
     */
    showResult(weatherData) {
        // Get decision
        const decision = JacketDecision.makeDecision(weatherData);

        // Update answer
        this.elements.answer.textContent = decision.answer;
        this.elements.answer.className = 'answer ' + decision.answer.toLowerCase();

        // Update jacket type
        if (decision.jacketType) {
            this.elements.jacketType.textContent = decision.jacketType;
        } else {
            this.elements.jacketType.textContent = '';
        }

        // Update reasoning
        this.elements.reasoning.textContent = decision.reasoning;

        // Update weather details
        this.updateTemperatureDisplay(weatherData);

        this.elements.windSpeed.textContent = `${weatherData.current.windSpeed} mph`;
        this.elements.locationName.textContent =
            `${weatherData.location.name}, ${weatherData.location.country}`;

        // Show result state
        this.showState('result');
    },

    /**
     * Update temperature display based on unit preference
     */
    updateTemperatureDisplay(weatherData) {
        const { current, forecast } = weatherData || this.state.weatherData;

        if (this.state.useCelsius) {
            this.elements.currentTemp.textContent =
                `${JacketDecision.toCelsius(current.temp)}°C`;
            this.elements.laterTemp.textContent =
                `${JacketDecision.toCelsius(forecast.sixHour.temp)}°C`;
        } else {
            this.elements.currentTemp.textContent = `${current.temp}°F`;
            this.elements.laterTemp.textContent = `${forecast.sixHour.temp}°F`;
        }
    },

    /**
     * Toggle between Fahrenheit and Celsius
     */
    toggleUnits() {
        this.state.useCelsius = !this.state.useCelsius;
        this.elements.toggleUnits.textContent = this.state.useCelsius ? '°C' : '°F';

        if (this.state.weatherData) {
            this.updateTemperatureDisplay();
        }
    },

    /**
     * Retry fetching weather
     */
    retry() {
        if (this.state.location) {
            this.showLoading();
            this.fetchWeather();
        } else {
            this.showPermission();
        }
    },

    /**
     * Show loading state
     */
    showLoading() {
        this.showState('loading');
    },

    /**
     * Show permission request state
     */
    showPermission() {
        this.showState('permission');
    },

    /**
     * Show error state
     */
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.showState('error');
    },

    /**
     * Show a specific state and hide others
     */
    showState(stateName) {
        const states = ['loading', 'permission', 'result', 'error'];

        states.forEach(state => {
            if (state === stateName) {
                this.elements[state].classList.remove('hidden');
            } else {
                this.elements[state].classList.add('hidden');
            }
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

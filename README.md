# Should I Bring a Jacket?

A simple, single-purpose website that answers one question based on your local weather conditions.

## Setup

### 1. Get an OpenWeatherMap API Key

1. Go to [OpenWeatherMap](https://openweathermap.org/api)
2. Sign up for a free account
3. Navigate to "API Keys" in your account
4. Copy your API key

### 2. Configure the API Key

Open `js/weather.js` and replace `YOUR_API_KEY_HERE` with your actual API key:

```javascript
API_KEY: 'your-actual-api-key-here',
```

### 3. Run the Site

You can run the site in several ways:

**Option A: Open directly**
- Simply open `index.html` in your browser
- Note: Geolocation may not work without HTTPS

**Option B: Local server (recommended)**
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## How It Works

### Decision Logic

The app considers multiple factors:

- **Current temperature** - The primary factor
- **Forecasted temperature** - Will it get colder?
- **Wind speed** - Affects perceived temperature
- **Precipitation** - Rain/snow probability
- **Time of day** - Evening temps can be tricky

### Jacket Recommendations

- **Light jacket**: 60-70°F or light wind
- **Medium jacket**: 45-60°F
- **Heavy jacket/coat**: Below 45°F or rain + wind

## Project Structure

```
Jacket/
├── index.html          # Main page
├── css/
│   └── styles.css      # All styling
├── js/
│   ├── app.js          # Main application logic
│   ├── weather.js      # Weather API integration
│   └── decision.js     # Jacket decision algorithm
└── README.md
```

## Features

- **Instant answer** - Large YES/NO/MAYBE display
- **Color-coded** - Green (no), Yellow (maybe), Red (yes)
- **Brief reasoning** - "It's 52°F and windy"
- **Weather details** - Current temp, later temp, wind
- **Unit toggle** - Switch between °F and °C
- **Location options** - Auto-detect or manual entry
- **Caching** - Weather data cached for 10 minutes

## Browser Support

Works in all modern browsers:
- Chrome
- Firefox
- Safari
- Edge

## Customization

### Adjust Temperature Thresholds

Edit the `THRESHOLDS` object in `js/decision.js`:

```javascript
THRESHOLDS: {
    DEFINITELY_YES: 55,    // Below this = definitely need jacket
    PROBABLY_YES: 65,      // Below this = probably need jacket
    MAYBE: 70,             // Below this = maybe need jacket
    // ... etc
}
```

### Change Colors

Edit CSS variables in `css/styles.css`:

```css
:root {
    --color-yes: #FF5252;
    --color-maybe: #FFC107;
    --color-no: #4CAF50;
}
```

## Deployment

The site is static and can be deployed anywhere:

- **GitHub Pages** - Free, simple
- **Netlify** - Free, with form handling
- **Vercel** - Free, fast
- **Any static host** - Just upload the files

## API Notes

- Uses OpenWeatherMap free tier
- Limit: 60 calls/minute, 1,000 calls/day
- Data is cached for 10 minutes to minimize API calls

## License

MIT - Do whatever you want with it.

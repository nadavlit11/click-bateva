# API Key Restrictions

Manual steps to restrict API keys in Google Cloud Console for production security.

## Firebase Browser Key (`click-bateva` project)

1. Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials?project=click-bateva)
2. Click on **Browser key (auto created by Firebase)**
3. Under **Application restrictions**, select **HTTP referrers (websites)**
4. Add allowed referrers:
   - `click-bateva.web.app/*`
   - `click-bateva-app.web.app/*`
   - `click-bateva-biz.web.app/*`
5. Under **API restrictions**, select **Restrict key** and enable only:
   - Cloud Firestore API
   - Firebase Installations API
   - Identity Toolkit API
   - Token Service API
6. Save

## Google Maps API Key (separate GCP project)

The Maps key (`VITE_GOOGLE_MAPS_API_KEY`) lives in a different GCP project.
Find the project it belongs to and restrict it there:

1. Under **Application restrictions**, select **HTTP referrers (websites)**
2. Add allowed referrers:
   - `click-bateva-app.web.app/*` (only user-web uses Maps)
3. Under **API restrictions**, select **Restrict key** and enable only:
   - Maps JavaScript API
4. Save

## Verification

After restricting, verify each app still works:
- Admin: https://click-bateva.web.app (no Maps, uses Leaflet/OSM)
- User: https://click-bateva-app.web.app (uses Google Maps)
- Business: https://click-bateva-biz.web.app (no Maps)

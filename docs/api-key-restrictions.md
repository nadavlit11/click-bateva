# API Key Restrictions

Manual steps to restrict API keys in Google Cloud Console for production security.

## Firebase API Key

1. Go to [Google Cloud Console > APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials?project=click-bateva)
2. Click on the Firebase API key (Browser key)
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

## Google Maps API Key

1. In the same Credentials page, click on the Google Maps API key
2. Under **Application restrictions**, select **HTTP referrers (websites)**
3. Add allowed referrers:
   - `click-bateva-app.web.app/*` (only user-web uses Maps)
4. Under **API restrictions**, select **Restrict key** and enable only:
   - Maps JavaScript API
5. Save

## Verification

After restricting, verify each app still works:
- Admin: https://click-bateva.web.app (no Maps, uses Leaflet/OSM)
- User: https://click-bateva-app.web.app (uses Google Maps)
- Business: https://click-bateva-biz.web.app (no Maps)

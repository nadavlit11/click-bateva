# API Key Restrictions

Manual steps to restrict API keys in Google Cloud Console for production security.

## Browser Key (auto created by Firebase)

This single key is used for both Firebase services and Google Maps.

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
   - Maps JavaScript API
6. Save

## Verification

After restricting, verify each app still works:
- Admin: https://click-bateva.web.app (no Maps, uses Leaflet/OSM)
- User: https://click-bateva-app.web.app (uses Google Maps)
- Business: https://click-bateva-biz.web.app (no Maps)

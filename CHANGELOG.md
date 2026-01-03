# Changelog

## [Unreleased]

### Added

- **Firebase Auth Persistence**: Implemented AsyncStorage persistence to keep users logged in after closing the app
  - Users can now close and reopen the app without needing to log in again
  - Works on both Expo and production builds
- **Auth Loading State**: Added instant authentication check on app startup using cached `auth.currentUser`
  - App now immediately shows Menu or Login screen based on auth state
  - Removed delays caused by server-side auth verification

### Changed

- **Firebase Configuration**: Updated `firebaseConfig.js` to use `initializeAuth` with `getReactNativePersistence`
  - Replaced `getAuth()` with `initializeAuth()` for proper persistence setup
  - Added `@react-native-async-storage/async-storage` dependency
- **Menu Not showing Items**: Updated `MenuScreen.js` to display items from menu with atleast 1 stock value

### Fixed

- Fixed user session persistence issue where users were logged out on app restart
- Fixed authentication flow not completing properly on Expo emulator
- Fixed Menu not showing items from firebase database

### Removed

- Removed time-based access restriction feature from CartScreen
  - These functions are only commented out
  - Users can now place orders at any time without time-based limitations
  - Removed time check states (`timeLoading`, `orderingDisabled`)
  - Removed server time fetching from timeapi.io
  - Removed restricted ordering windows (10:00-10:30 AM and 12:30 PM onwards)

### Dependencies Added

- `@react-native-async-storage/async-storage` - For persistent Firebase Auth storage

## How to Use This Changelog

- Add new changes under the [Unreleased] section
- When releasing a new version, create a new section with the version number and date
- Keep changes organized by Added, Changed, Fixed, Removed, etc.

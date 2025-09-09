# Unused Files Analysis - Voxxy Mobile

## ❌ DEFINITELY UNUSED (Safe to Delete)

### Components (4 files)
1. **`components/EmbeddedMapView.js`**
   - Not imported anywhere in the codebase
   - Appears to be an old map implementation replaced by NativeMapView

2. **`components/InteractiveMapView.js`**
   - Not imported anywhere
   - Likely replaced by NativeMapView

3. **`components/RecommendationsMapSimple.js`**
   - Not imported anywhere
   - Seems to be a simplified version that was never used

4. **`components/RecommendationsMapView.js`**
   - Not imported anywhere except its own style file
   - Replaced by newer map implementations

### Screens (2 files)
5. **`screens/RootScreenRouter.js`**
   - Not imported anywhere
   - Navigation is handled directly in App.js

6. **`screens/TripDashboardScreen.js`**
   - Not imported anywhere
   - Appears to be an unused feature

### Style Files (1 file)
7. **`styles/RecommendationsMapStyles.js`**
   - Only imported by unused RecommendationsMapView.js
   - Can be deleted along with RecommendationsMapView

## ⚠️ POTENTIALLY UNUSED (Need Verification)

### Components
1. **`components/TestMap.js`**
   - Only imported in AIRecommendations.js with comment "// Temporary test"
   - Should verify if still needed for testing

2. **`components/InvitationBadge.js`**
   - Has a commented-out self-import
   - Imported once but should verify if actively used

3. **`components/InvitationNotificationService.js`**
   - Component file in components folder (should be in services?)
   - Different from `services/InvitationNotificationService.js`

## ✅ USED FILES (Keep These)

### Components Currently in Use:
- `TryVoxxy.js` - Used in LandingScreen and VoxxyFooter
- `TryVoxxyChat.js` - Used in TryVoxxy
- `LocationPicker.js` - Used in chat components
- `SearchLocationModal.js` - Used in multiple places (5 imports)
- `CocktailsChatNew.js` - Used in UnifiedActivityChat
- `GameNightChatNew.js` - Used in UnifiedActivityChat
- `LetsEatChatNew.js` - Used in UnifiedActivityChat
- `UnifiedActivityChat.js` - Used in StartNewAdventure
- `CuisineResponseForm.js` - Used in LetsEatChatNew
- `GameNightResponseForm.js` - Used in GameNightChatNew
- `NightOutResponseForm.js` - Used in CocktailsChatNew
- `LetsMeetScheduler.js` - Used in chat components

### Screens Currently in Use:
- `TryVoxxScreen.js` - Used in navigation

## 📝 Deletion Commands

To safely remove the definitely unused files, run:

```bash
# Remove unused components
rm components/EmbeddedMapView.js
rm components/InteractiveMapView.js
rm components/RecommendationsMapSimple.js
rm components/RecommendationsMapView.js

# Remove unused screens
rm screens/RootScreenRouter.js
rm screens/TripDashboardScreen.js

# Remove unused style file
rm styles/RecommendationsMapStyles.js
```

## 🔍 Additional Checks Recommended

1. **TestMap.js**: Check with team if this is still needed for testing
2. **InvitationBadge.js**: Verify if this badge component is displayed anywhere
3. **Duplicate service file**: Check if `components/InvitationNotificationService.js` is different from `services/InvitationNotificationService.js`

## 📊 Summary

- **7 files** can be safely deleted (saving ~1000+ lines of code)
- **3 files** need verification before deletion
- All other files are actively used in the application

## 🎯 Benefits of Cleanup

1. Reduced app bundle size
2. Cleaner codebase for maintenance
3. Faster build times
4. Less confusion for developers
5. Easier iOS review process (less code to potentially flag)
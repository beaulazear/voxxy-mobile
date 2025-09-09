# Unused Variables List for Manual Cleanup

## Summary
Total files with unused variables: Multiple
Total unused variable issues: ~150+

## Files and Their Unused Variables

### 1. **App.js**
- No unused variables after cleanup ✅

### 2. **components/AIRecommendations.js**
- Line 268: `ProgressBar` - Component defined but never used
- Line 277: `SwipeableCard` - Component defined but never used  
- Line 277: `isGameNight` parameter in SwipeableCard
- Line 470: `loadingFavorites` - State variable never used
- Line 672: `selected_pinned_activity_id` - Variable never used
- Line 677: `isLetsEatActivity` - Variable never used
- Line 959: `handleSaveActivity` - Function never used
- Line 998: `handleFlag` - Function never used
- Line 1080: `handleFinalizeActivity` - Function never used
- Line 1933: `isFlagged` - Variable never used

### 3. **components/ActivityHeader.js**
- Line 87: `active` - Variable never used
- Line 138: `error` parameter never used
- Line 146: `user` - Variable never used
- Line 147: `isBouncing` - State variable never used
- Line 149: `navigation` - Variable never used
- Line 151: `activityInfo` - Variable never used
- Line 180: `steps` - Variable never used
- Line 343-345: `onBack`, `onEdit`, `onActivityUpdate` - Parameters never used
- Line 347: `setUser` - Function never used
- Line 348: `navigation` - Variable never used
- Line 349: `token` - Variable never used

### 4. **components/CommentsSection.js**
- Line 20: `Flag` - Import never used
- Line 25: `SPACING` - Constant never used
- Line 29: `screenWidth` - Variable never used
- Line 128: `authorName` - Parameter never used

### 5. **components/CocktailsChatNew.js**
- Line 22: `Clock` - Import never used
- Line 28: `Wine` - Import never used
- Line 29: `Martini` - Import never used
- Line 30: `X` - Import never used
- Line 39: `screenWidth` - Variable never used
- Line 258, 272: `e` - Error parameters never used (multiple instances)

### 6. **components/CuisineResponseForm.js**
- Line 19-22: `FormStyles`, `GradientButton`, `GradientCard`, `gradientConfigs` - Imports never used
- Line 60: `guestEmail` - Parameter never used
- Line 252, 267: `e` - Error parameters never used

### 7. **components/CustomHeader.js**
- Line 2: `Image` - Import never used

### 8. **components/EULAModal.js**
- Line 25: `setAgreedToPrivacy` - Function never used

### 9. **components/FinalizeActivityModal.js**
- Multiple unused imports and variables
- Line 430: `navigation` parameter never used
- Line 425, 457, 542: `index` parameters never used

### 10. **components/GameNightResponseForm.js**
- Line 19-22: `FormStyles`, `GradientButton`, `GradientCard`, `gradientConfigs` - Imports never used
- Line 60: `guestEmail` - Parameter never used
- Multiple `e` error parameters never used

### 11. **components/HorizontalTimeline.js**
- Line 11: `Animated` - Import never used
- Line 14: `Easing` - Import never used
- Line 35: `FULL_HEIGHT` - Constant never used
- Line 43: `PREVIEW_PAST` - Constant never used
- Line 45: `CARD_PADDING` - Constant never used
- Line 72: `pressedCard`, `setPressedCard` - State variables never used
- Line 104: `setIsUpdating` - Function never used
- Line 105: `lastRefreshTime` - Variable never used
- Line 109: `displayInfo` - Variable never used
- Line 110: `loadingPinned` - Variable never used
- Line 111: `loadingTimeSlots` - Variable never used

### 12. **components/HomeTabBar.js**
- Line 93: Multiple parameters never used: `setMainTab`, `invitesCount`, `inProgressCount`, `pastCount`, `onScrollToTop`, `setFilter`
- Line 97: `isNavbarMode` - Variable never used
- Line 98: `iconColor` - Variable never used

### 13. **components/InProgressTab.js**
- Line 209: `completedActivities` - Variable never used

### 14. **components/NativeMapView.js**
- Line 10: `isNavbarMode` - Variable never used
- Line 576: `showAllPast` - Variable never used
- Line 896: `activityDetails` - Variable never used

### 15. **components/NotificationsList.js**
- Line 238: `markAllAsRead` - Function never used
- Line 410: `notifErr` - Error variable never used

### 16. **components/PendingInvitesTab.js**
- Line 30: `setPendingInvitations` - Function never used (appears twice)
- Line 94: `disabledDays` - Variable never used

### 17. **components/ProfileView.js**
- Line 11: `Switch` - Import never used
- Line 12: `Keyboard` - Import never used
- Line 21: Multiple unused imports: `Trash2`, `LogOut`
- Line 22: Multiple unused imports: `ToggleLeft`, `ToggleRight`, `Coffee`, `User`
- Line 245: `currentIconColor` - Variable never used
- Line 250: `updatedUser` - Parameter never used
- Line 276: `handleSaveNotifications` - Function never used
- Multiple `e` error parameters never used

### 18. **components/RestaurantChatNew.js**
- Line 25: `Utensils` - Import never used
- Line 48: `screenWidth` - Variable never used
- Line 57: `pulseAnim` - State variable never used
- Line 58: `progressAnim` - Variable never used
- Line 60: `icon` - Variable never used
- Line 61: `setLoadingMessage` - Function never used
- Multiple `e` error parameters never used

### 19. **components/RestaurantResponseForm.js**
- Line 19-22: `FormStyles`, `GradientButton`, `GradientCard`, `gradientConfigs` - Imports never used
- Line 57: `guestEmail` - Parameter never used
- Multiple `e` error parameters never used

### 20. **components/Timeline.js**
- Line 12: `Coffee` - Import never used
- Line 13: `Droplet` - Import never used
- Line 23: `Clock` - Variable never used
- Line 24: `Users` - Variable never used
- Line 19: `screenWidth`, `screenHeight` - Variables never used

### 21. **components/TryVoxxyResponseForm.js**
- Line 19-22: `FormStyles`, `GradientButton`, `GradientCard`, `gradientConfigs` - Imports never used
- Line 53: `votes` - Parameter never used
- Line 58: `guestEmail` - Parameter never used
- Multiple `e` error parameters never used

### 22. **screens/HomeScreen.js**
- Line 30: `setPendingInvitations` - Function never used
- Line 331: `handleSkipInviting` - Function never used
- Line 419: `formatDate` - Function never used
- Line 849: `formatTime` - Function never used

### 23. **screens/LandingScreen.js**
- Line 34-36: `Film`, `Book`, `Edit` - Imports never used
- Line 40: `Plus` - Import never used
- Line 224: `CreateCard` - Component never used
- Line 224: `navigation` - Parameter never used

### 24. **screens/NotificationsScreen.js**
- Line 230: `err` - Error parameter never used

### 25. **screens/ProfileScreen.js**
- Line 37: `getUserDisplayImage` - Import never used
- Line 42: `error` - Variable never used
- Line 102: `userName` - Variable never used
- Line 123: `error` - Variable never used

### 26. **screens/VerificationCodeScreen.js**
- Line 3: `View` - Import never used
- Line 5: `Alert` - Import never used
- Line 10: `Linking` - Import never used

### 27. **services/ThumbnailGenerator.js**
- Line 6: `TextInput` - Import never used
- Line 234: `error` - Variable never used

### 28. **services/WebSocketService.js**
- Line 27: `Target` - Import never used
- Line 29: `Heart` - Import never used

### 29. **utils/avatarManager.js**
- Line 14: `filename` - Parameter never used
- Line 21: `language` - Variable never used
- Line 64: `fields` - Variable never used

### 30. **utils/filterHelpers.js**
- Line 1: `useCallback` - Import never used

## Recommendations for Fixing

### Quick Fixes (Safe to Remove):
1. **Unused imports** - Can be safely deleted
2. **Unused constants** - Can be safely deleted if not exported
3. **Error parameters** - Replace `catch (e)` with `catch {}` or use the error

### Requires Careful Review:
1. **Unused state variables** - Check if they're needed for future features
2. **Unused functions** - May be event handlers that are needed
3. **Unused parameters** - Prefix with underscore (e.g., `_index`) or remove if safe

### Pattern Fixes:
- For unused error parameters: Change `catch (e) {}` to `catch {}`
- For unused function parameters: Prefix with `_` (e.g., `_navigation`)
- For unused destructured variables: Use rest operator or omit

## Command to Auto-fix Some Issues:
```bash
npx eslint . --ext .js,.jsx --fix
```

Note: This will only fix some formatting issues. Most unused variables need manual review to ensure removing them won't break functionality.
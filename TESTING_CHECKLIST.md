# 🧪 Testing Checklist - Recommendation Modals

## Quick Testing Guide

Test these scenarios to verify everything works perfectly:

---

## ✅ Cards View Testing

### Basic Flow
- [ ] Tap a recommendation card
- [ ] Modal slides up smoothly
- [ ] Photos display correctly (if available)
- [ ] Can swipe through multiple photos
- [ ] Pagination dots update as you swipe
- [ ] Photo counter shows correct numbers (e.g., "2/5")

### Content Display
- [ ] "Why this place?" tags display properly
- [ ] Rating badge shows (if available)
- [ ] Category badge shows (if available)
- [ ] Quick action buttons appear (Directions/Call/Website)
- [ ] Details grid shows all available info
- [ ] Hours are formatted nicely
- [ ] Description displays (if available)
- [ ] Reviews show up (if available)

### Actions
- [ ] Tap "Add to Favorites" - should work with loading state
- [ ] Tap "Flag" - should toggle state
- [ ] Tap "Directions" - opens maps app
- [ ] Tap "Call" - opens phone dialer (if phone number exists)
- [ ] Tap "Website" - opens browser (if website exists)
- [ ] Tap X button to close - modal dismisses smoothly

### Reviews
- [ ] If >3 reviews, "Show More" button appears
- [ ] Tap "Show More" - all reviews expand
- [ ] Tap "Show Less" - collapses back to 3

---

## ✅ Map View Testing

### Basic Flow
- [ ] Tap a map marker
- [ ] Bottom sheet springs up from bottom (45% height)
- [ ] Backdrop appears and dims the map
- [ ] Title shows in handle area
- [ ] Chevron-up icon shows in top-right

### Interactions
- [ ] Swipe up on handle - expands to 92%
- [ ] Chevron icon changes to chevron-down
- [ ] Swipe down when expanded - collapses to 45%
- [ ] Swipe down when collapsed - closes sheet
- [ ] Tap backdrop - closes sheet
- [ ] Scroll content - doesn't interfere with gestures

### Content (Same as Cards View)
- [ ] All content displays identically to cards view
- [ ] Photos, actions, details, reviews all work
- [ ] Quick actions work (Directions/Call/Website)
- [ ] Favorite/Flag buttons work

---

## ✅ Edge Cases

### Missing Data
- [ ] Recommendation with no photos - shows placeholder
- [ ] Recommendation with no reviews - section doesn't appear
- [ ] Recommendation with no phone - Call button doesn't appear
- [ ] Recommendation with no website - Website button doesn't appear
- [ ] Recommendation with no address - Directions button doesn't appear

### Error States
- [ ] Photo fails to load - shows "Image unavailable" placeholder
- [ ] Multiple photos, some fail - working ones still display
- [ ] Malformed reviews JSON - doesn't crash

### Data Formats
- [ ] Reason with periods - shows as tags
- [ ] Reason with commas - shows as tags
- [ ] Reason as long sentence - shows as paragraph text
- [ ] Hours with newlines - formatted properly
- [ ] Hours as single string - displays correctly

---

## ✅ Performance

- [ ] Modal opens quickly (<100ms perceived)
- [ ] Photo swiping is smooth (60fps)
- [ ] Scrolling is smooth
- [ ] Backdrop animation is smooth
- [ ] No stuttering when favoriting/flagging
- [ ] Modal closes cleanly without flashing

---

## ✅ Visual Polish

- [ ] Gradient buttons look good (purple, green, blue)
- [ ] Favorite button has gold gradient when active
- [ ] Flag button shows red when flagged
- [ ] Section titles are clear and readable
- [ ] Spacing feels balanced
- [ ] Icons are properly sized and colored
- [ ] Badge pills look polished
- [ ] Review cards have nice styling

---

## 🐛 Known Limitations (Expected Behavior)

1. **Photo Loading** - If server is slow, images may take time to load
2. **Game Night** - Special layout for game night activities (intentional)
3. **Backdrop Opacity** - Set to 60% opacity (intentional for map visibility)

---

## 🚨 If You Find Issues

### Common Fixes

**Photos not showing:**
- Check that `recommendation.photos` exists
- Verify image URLs are valid

**Actions not working:**
- Check that `onFavorite` / `onFlag` callbacks are passed
- Verify `isFavorited` / `isFlagged` props are correct

**Bottom sheet not appearing:**
- Check that `visible={true}` is set
- Verify `DraggableBottomSheet` is imported correctly

**Content looks wrong:**
- Clear Metro bundler cache: `npx react-native start --reset-cache`
- Reload app

---

## ✅ Success Criteria

You know everything works when:

1. ✨ Cards and map views show identical content
2. 🎨 Everything looks polished and professional
3. ⚡ Interactions are smooth and responsive
4. 🎯 All buttons work as expected
5. 📱 Gestures feel natural and intuitive
6. 🔄 Loading states are clear
7. 🎉 The whole experience feels modern and delightful!

---

## 📝 Notes

- All existing functionality is preserved
- No breaking changes to existing code
- Performance is improved through code consolidation
- Maintenance is easier with unified component

**If everything checks out, you're good to go! 🚀**

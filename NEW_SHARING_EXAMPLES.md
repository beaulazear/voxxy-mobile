# New Personalized Sharing System

## Overview
The sharing experience now adapts based on place type and characteristics, creating unique, contextual messages with emoji-based visual cards that work perfectly in all messaging apps.

---

## Example 1: Upscale Cocktail Bar

```
🍸 Found a cocktail spot with serious vibes

🎯 The Blue Velvet Lounge
💰 $$$$
📍 123 Main St, San Francisco

💭 Craft cocktails with a speakeasy vibe and live jazz on weekends

Perfect for a fancy night out

💜 View on Voxxy:
https://www.heyvoxxy.com/share/favorite/456?...

🗺️ Get Directions:
[Maps link]
```

---

## Example 2: Casual Restaurant

```
🍽️ Found a spot with incredible food

🎯 Tony's Pizza Kitchen
💰 $$
📍 456 Market St, Brooklyn

💭 Wood-fired pizzas and fresh pasta made daily

Perfect for our next dinner

💜 View on Voxxy:
https://www.heyvoxxy.com/share/favorite/789?...

🗺️ Get Directions:
[Maps link]
```

---

## Example 3: Brunch Spot

```
🥂 Brunch spot alert

🎯 Sunrise Cafe
💰 $$
📍 789 Park Ave, Austin

💭 Best avocado toast and bottomless mimosas in town

Weekend plans incoming?

💜 View on Voxxy:
https://www.heyvoxxy.com/share/favorite/123?...

🗺️ Get Directions:
[Maps link]
```

---

## Example 4: Coffee Shop

```
☕ New coffee spot unlocked

🎯 Brew House Coffee
💰 $
📍 321 Oak St, Portland

💭 Local roasters with cozy seating and great wifi

Perfect for catching up

💜 View on Voxxy:
https://www.heyvoxxy.com/share/favorite/234?...

🗺️ Get Directions:
[Maps link]
```

---

## Contextual Elements

### Activity Type Detection
- **Cocktails/Bar** → 🍸 "Found a cocktail spot..." / "Discovered this bar..."
- **Restaurant/Dinner** → 🍽️ "This restaurant is calling..." / "Found a spot with incredible food"
- **Brunch** → 🥂 "Brunch spot alert"
- **Coffee/Cafe** → ☕ "New coffee spot unlocked"
- **Default** → 💜 "Just saved this gem on Voxxy"

### Price Range Adaptation
- **Upscale** ($$$, $$$$) → "Perfect for a fancy night out" / "Date night worthy"
- **Budget/Moderate** ($, $$) → "Great for drinks with the crew" / "Perfect for our next dinner"

---

## Features

🎯 **Context-Aware** - Messages adapt based on place type and price range

💬 **Conversational** - Natural, friendly language that feels personal

📱 **Deep Links** - Direct links to open the place in Voxxy app

🗺️ **Navigation** - Platform-specific map links for easy directions

🎨 **Clean & Simple** - Easy to read with emoji prefixes for each detail

✅ **Universal Compatibility** - Works perfectly in all messaging apps

---

## Modal Updates

The ShareFavoriteModal now shows:
- "Personalized for [Activity Type]" subtitle
- Scrollable preview for longer messages
- "Your Personalized Message" label
- Three sharing options: Share Now, Copy Link, Copy All

---

## Technical Notes

- Simple, clean format without decorative borders
- Each info line has a relevant emoji prefix (🎯 for name, 💰 for price, 📍 for location, 💭 for description)
- Messages are scannable and visually distinct from regular texts
- Uses standard emojis that render consistently across all platforms

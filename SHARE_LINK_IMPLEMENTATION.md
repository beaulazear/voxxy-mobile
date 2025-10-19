# Voxxy Share Links - Backend Implementation Guide

## Overview
The mobile app now generates shareable links for favorites in the format:
```
https://www.heyvoxxy.com/share/favorite/{id}?name=...&address=...&lat=...&lng=...
```

These links need to be handled by your Rails backend to provide:
1. A beautiful web preview page
2. Deep linking back to the mobile app
3. Rich social media previews (Open Graph tags)

## Backend Implementation

### 1. Create Share Controller

Create a new controller to handle share links:

```ruby
# app/controllers/share_controller.rb
class ShareController < ApplicationController
  skip_before_action :authenticate_user! # Public links

  def favorite
    @favorite_id = params[:id]
    @name = params[:name]
    @address = params[:address]
    @latitude = params[:lat]
    @longitude = params[:lng]

    # Optional: Fetch full details from database
    @favorite = UserActivity.find_by(id: @favorite_id) if @favorite_id.present?

    # Set meta tags for social sharing
    set_meta_tags(
      title: "Check out #{@name} on Voxxy",
      description: "#{@address} - Shared from Voxxy, your social discovery app",
      og: {
        title: "#{@name} - Voxxy",
        description: @address,
        type: 'website',
        url: request.original_url,
        image: asset_url('voxxy-triangle.png') # Use your logo
      },
      twitter: {
        card: 'summary_large_image',
        title: "#{@name} - Voxxy",
        description: @address,
        image: asset_url('voxxy-triangle.png')
      }
    )

    render :favorite, layout: 'share'
  end
end
```

### 2. Add Routes

```ruby
# config/routes.rb
Rails.application.routes.draw do
  # ... existing routes

  # Share routes
  namespace :share do
    get 'favorite/:id', to: 'share#favorite', as: :favorite
  end
end
```

### 3. Create Share View

Create a beautiful landing page for shared favorites:

```erb
<!-- app/views/share/favorite.html.erb -->
<!DOCTYPE html>
<html>
<head>
  <title><%= @name %> - Voxxy</title>
  <%= csrf_meta_tags %>
  <%= csp_meta_tag %>

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="<%= request.original_url %>">
  <meta property="og:title" content="<%= @name %> - Voxxy">
  <meta property="og:description" content="<%= @address %>">
  <meta property="og:image" content="<%= asset_url('voxxy-triangle.png') %>">

  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="<%= request.original_url %>">
  <meta property="twitter:title" content="<%= @name %> - Voxxy">
  <meta property="twitter:description" content="<%= @address %>">
  <meta property="twitter:image" content="<%= asset_url('voxxy-triangle.png') %>">

  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #2a1e2e 0%, #201925 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .container {
      max-width: 600px;
      width: 100%;
      background: rgba(42, 30, 46, 0.8);
      border-radius: 24px;
      padding: 40px;
      border: 1px solid rgba(147, 51, 234, 0.3);
      box-shadow: 0 8px 32px rgba(147, 51, 234, 0.2);
      text-align: center;
    }

    .logo {
      width: 100px;
      height: 100px;
      margin: 0 auto 30px;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    h1 {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 16px;
      color: #fff;
    }

    .place-name {
      font-size: 24px;
      font-weight: 600;
      color: #9333ea;
      margin-bottom: 24px;
    }

    .address {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn {
      display: block;
      padding: 16px 32px;
      border-radius: 16px;
      text-decoration: none;
      font-weight: 700;
      font-size: 16px;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
      color: white;
      box-shadow: 0 4px 16px rgba(147, 51, 234, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(147, 51, 234, 0.4);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
    }

    @media (max-width: 600px) {
      .container {
        padding: 30px 20px;
      }

      h1 {
        font-size: 24px;
      }

      .place-name {
        font-size: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <img src="<%= asset_path('voxxy-triangle.png') %>" alt="Voxxy" class="logo">

    <h1>✨ Check out this gem!</h1>

    <div class="place-name"><%= @name %></div>

    <% if @address.present? %>
      <div class="address">
        📍 <%= @address %>
      </div>
    <% end %>

    <div class="buttons">
      <!-- Deep link to open in app -->
      <a href="voxxy://share/favorite/<%= @favorite_id %>?name=<%= @name %>&address=<%= @address %>&lat=<%= @latitude %>&lng=<%= @longitude %>" class="btn btn-primary">
        Open in Voxxy App
      </a>

      <% if @latitude.present? && @longitude.present? %>
        <a href="https://maps.apple.com/?ll=<%= @latitude %>,<%= @longitude %>&q=<%= @name %>" class="btn btn-secondary">
          Get Directions
        </a>
      <% elsif @address.present? %>
        <a href="https://maps.apple.com/?address=<%= CGI.escape(@address) %>" class="btn btn-secondary">
          Get Directions
        </a>
      <% end %>

      <a href="https://www.heyvoxxy.com" class="btn btn-secondary">
        Learn About Voxxy
      </a>
    </div>

    <div class="footer">
      💜 Shared from Voxxy - Your social discovery app
    </div>
  </div>

  <script>
    // Try to open app immediately on mobile
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      const deepLink = 'voxxy://share/favorite/<%= @favorite_id %>?name=<%= @name %>&address=<%= @address %>&lat=<%= @latitude %>&lng=<%= @longitude %>';
      window.location = deepLink;

      // Fallback to App Store/Play Store after timeout
      setTimeout(() => {
        if (document.hidden) return; // App opened successfully

        // Show app store links
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isIOS) {
          window.location = 'https://apps.apple.com/app/your-app-id';
        } else {
          window.location = 'https://play.google.com/store/apps/details?id=your.package.name';
        }
      }, 2000);
    }
  </script>
</body>
</html>
```

### 4. Configure Deep Linking (Already Done!)

Your `app.config.js` already has deep linking configured:
```javascript
associatedDomains: [
  "applinks:heyvoxxy.com",
  "applinks:www.heyvoxxy.com"
]
```

### 5. Create Apple App Site Association File

Add this to your Rails public folder:

```json
// public/.well-known/apple-app-site-association
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.voxxy.app",
        "paths": ["/share/*"]
      }
    ]
  }
}
```

### 6. Handle Deep Links in Mobile App

Add deep link handling to your app (App.js or navigation):

```javascript
import * as Linking from 'expo-linking';

// In your App.js or navigation setup
useEffect(() => {
  const handleDeepLink = (event) => {
    let { path, queryParams } = Linking.parse(event.url);

    if (path === 'share/favorite') {
      // Navigate to the favorite detail
      // You can show it in a modal or navigate to it
      navigation.navigate('FavoriteDetail', {
        favoriteId: queryParams.id,
        name: queryParams.name,
        address: queryParams.address,
        latitude: queryParams.lat,
        longitude: queryParams.lng,
      });
    }
  };

  // Handle deep links when app is already open
  Linking.addEventListener('url', handleDeepLink);

  // Handle deep links when app opens from link
  Linking.getInitialURL().then((url) => {
    if (url) {
      handleDeepLink({ url });
    }
  });

  return () => {
    Linking.removeEventListener('url', handleDeepLink);
  };
}, []);
```

## Testing

### Test the share link:
1. Share a favorite from the app
2. Copy the link: `https://www.heyvoxxy.com/share/favorite/123?name=...`
3. Open in mobile browser - should show web preview and try to open app
4. Open on desktop - should show nice web preview
5. Share on social media - should show rich preview with image

### Test deep linking:
1. Click "Open in Voxxy App" button on web preview
2. App should open and navigate to the favorite detail
3. If app not installed, should redirect to App Store/Play Store

## Social Media Preview

When shared on platforms like:
- **iMessage**: Shows card with Voxxy logo, place name, and address
- **WhatsApp**: Shows link preview with image and description
- **Twitter/X**: Shows card with image and place details
- **Facebook**: Shows link preview with Open Graph data

## Benefits

✨ **Professional**: Branded, beautiful share experience
🔗 **Deep Links**: Opens directly in app when installed
🌐 **Web Fallback**: Works even without app installed
📱 **Social Rich**: Beautiful previews on all platforms
🎯 **Analytics Ready**: Track share link clicks on backend
🚀 **Viral**: Makes sharing favorites exciting and personal

## Next Steps

1. Implement the Rails controller and view
2. Deploy to heyvoxxy.com
3. Test deep linking on iOS and Android
4. Add analytics to track share link performance
5. Consider adding QR code generation for in-person sharing

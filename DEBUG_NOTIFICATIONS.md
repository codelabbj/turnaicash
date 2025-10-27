# Debug Notification Permission Prompt

## What to Check

### 1. Console Logs
After login, check the browser console for these logs:
```
[Login] Setting up notifications for user: ...
[FCM] Starting initialization...
[FCM] Current permission: ...
[FCM] Registering service worker...
[FCM] Service worker registered
[FCM] Requesting notification permission...
```

### 2. Browser Settings
Check if notifications are already blocked:
- **Chrome/Edge**: Open DevTools → Application → Notifications
- Look for your site's notification permission status
- If blocked: Click the lock icon in address bar → Site settings → Notifications → Allow

### 3. Common Issues

#### Issue 1: Prompt Doesn't Show
**Possible causes:**
- Notification permission was already dismissed/blocked
- Browser requires HTTPS (localhost is OK)
- User has notifications globally disabled for browser

**Solution**: Check browser settings and reset permission:
```javascript
// Run in browser console to check
console.log('Current permission:', Notification.permission);
```

#### Issue 2: Prompt Shows But Disappears
**Possible cause**: Page redirects before user can click Allow/Block

**Solution**: Already added 300ms delay before redirect

#### Issue 3: VAPID Key Missing
**Check**: Look for errors in console about missing vapidKey

**Solution**: VAPID key is already configured in `.env.local`

### 4. Testing Permission State

Open browser console and run:
```javascript
// Check current permission
Notification.permission

// Test request permission
Notification.requestPermission().then(permission => console.log('Permission:', permission))

// Check if Notification API exists
'Notification' in window

// Check service worker
navigator.serviceWorker.getRegistration().then(reg => console.log('Service Worker:', reg))
```

### 5. How to Reset Permission

If you want to test again, you need to reset the notification permission:

**Chrome/Edge:**
1. Click lock icon (left of address bar)
2. Click Site settings
3. Find Notifications
4. Click "Reset"

OR

1. Navigate to `chrome://settings/content/notifications`
2. Find your site
3. Delete it

**Firefox:**
1. Click info icon (left of address bar)
2. Click More Information
3. Go to Permissions tab
4. Find Notifications and reset

### 6. Expected Behavior

When you login, you should see:
1. ✅ Login success toast
2. ✅ Browser notification prompt appears (near address bar)
3. ✅ Click "Allow" or "Block"
4. ✅ If allowed: "Notifications activées!" toast
5. ✅ Console shows: `[FCM] Token generated successfully`
6. ✅ Redirect to dashboard

### 7. Debug Steps

1. **Clear browser cache and reload**
2. **Open DevTools console** to see logs
3. **Login again**
4. **Watch console for** `[FCM]` and `[Login]` logs
5. **Look for errors** in red
6. **Check Notification.permission** value in console

### 8. Testing Without Login

You can test the notification setup directly:

```javascript
// In browser console
import { setupNotifications } from '@/lib/fcm-helper';
await setupNotifications('test-user-id');
```

### 9. Service Worker Check

Verify the service worker is loaded:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers:', registrations);
});
```

Check if it's receiving messages:
- Open DevTools → Application → Service Workers
- Look for `firebase-messaging-sw.js`

### 10. Force Permission Prompt

If permission is already set, you can force test:
```javascript
// Run in console
await Notification.requestPermission();
```

## Most Likely Issues

1. **Permission already dismissed** - Browser remembers the "Block" choice
   - Solution: Reset in browser settings (see above)

2. **Browser blocking automatic prompts** - Some browsers block prompts without user interaction
   - Solution: Already handled - login button click counts as user interaction

3. **HTTPS required** - Some browsers require HTTPS for notifications
   - Solution: Already covered - localhost works fine for development

4. **Service worker not registered** - Service worker needs to be registered first
   - Solution: Already in the flow - registration happens before requesting permission

## Console Commands Summary

```javascript
// Check permission
Notification.permission

// Request permission
await Notification.requestPermission()

// Check service worker
await navigator.serviceWorker.getRegistration()

// Check VAPID key (from env)
localStorage.getItem('firebase_config')

// Test notification manually
new Notification('Test', { body: 'This is a test' })
```

## Next Steps

If the prompt still doesn't show:
1. Check console logs for errors
2. Verify Notification.permission state
3. Try resetting browser notification settings
4. Test on different browser
5. Check if HTTPS is required (should work on localhost)



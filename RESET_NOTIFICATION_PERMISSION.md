# How to Reset Notification Permission

Your browser has the notification permission set to "denied" from a previous attempt.

## Quick Reset (Chrome/Edge)

### Method 1: Via Address Bar (Easiest)

1. Go to `http://localhost:3000`
2. Click the **lock icon** 🔒 or **info icon** ℹ️ (left of the address bar)
3. Look for **Notifications**
4. Change it from "Block" to **"Ask (default)"** or **"Allow"**
5. Click **Done** or refresh the page
6. Log in again

### Method 2: Via DevTools

1. Press `F12` to open DevTools
2. Go to **Application** tab (or **Storage** in older Chrome)
3. Click **Notifications** in the left sidebar
4. Find `http://localhost:3000`
5. Click **Clear** or the X button
6. Reload the page
7. Log in again

### Method 3: Via Browser Settings

**Chrome:**
1. Go to `chrome://settings/content/notifications`
2. Find `http://localhost:3000` in the list
3. Click the trash/delete icon
4. Close and restart Chrome

**Edge:**
1. Go to `edge://settings/content/notifications`
2. Find `http://localhost:3000` in the list
3. Click the trash/delete icon
4. Close and restart Edge

## Alternative: Test in Incognito Mode

If you want to test without resetting:
1. Press `Ctrl+Shift+N` (Chrome) or `Ctrl+Shift+P` (Edge) to open incognito window
2. Go to `http://localhost:3000`
3. Log in
4. You should see the notification prompt

## Verify Reset

After resetting, you can verify in the browser console:
```javascript
console.log(Notification.permission)
```

Should show: `"default"` (not "denied")

## Then Try Login Again

After resetting the permission:
1. Refresh the page
2. Log in
3. You should see the browser notification prompt appear
4. Click "Allow"
5. You should see "Notifications activées!" toast



# 📱 Samsung Phone Connection Guide - SlipScan App

This guide shows you how to connect your Samsung phone via WiFi ADB and install the SlipScan app for development and testing.

## 🚀 Quick Setup Commands

Copy and paste these commands in PowerShell to connect your Samsung phone:

### **Step 1: Setup ADB Path**

```powershell
$env:PATH += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
```

### **Step 2: Check Current Connections**

```powershell
adb devices
```

### **Step 3: Pair Samsung Phone (First Time Only)**

**On your Samsung phone:**

1. Go to **Settings** → **Developer options**
2. Enable **"Wireless debugging"**
3. Tap **"Pair device with pairing code"**
4. Note the **IP:Port** and **6-digit PIN**

**On your computer:**

```powershell
adb pair [YOUR_IP:PORT] [YOUR_PIN]
```

**Example:** `adb pair 192.168.3.8:39945 407751`

### **Step 4: Connect to Samsung**

```powershell
adb connect 192.168.3.8:40081
```

_Note: Use the main wireless debugging IP:Port (usually port 40081), not the pairing port_

### **Step 5: Verify Connection**

```powershell
adb devices
```

_Should show your Samsung device like: `adb-R5CR70DQ15H-Y8fLMB._adb-tls-connect._tcp device`_

### **Step 6: Install/Update SlipScan App**

```powershell
cd "f:\coding\SlipScan\slipscan"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
npx expo run:android
```

## 📋 Samsung Phone Setup (One-Time)

### Enable Developer Options:

1. **Settings** → **About phone**
2. Tap **"Build number"** 7 times
3. Go back to **Settings** → **Developer options**
4. Enable **"USB debugging"**
5. Enable **"Wireless debugging"**

### Network Requirements:

- Samsung phone on **WiFi**
- Computer on **Ethernet or WiFi** (same network/router)
- Both devices must be on the **same local network**

## 🔧 Troubleshooting

### Phone Not Detected:

```powershell
# Check devices
adb devices

# If empty, reconnect:
adb connect [YOUR_PHONE_IP]:40081
```

### Connection Lost:

```powershell
# Disconnect and reconnect
adb disconnect
adb connect [YOUR_PHONE_IP]:40081
```

### New IP Address:

- Check Samsung: **Settings** → **Connections** → **Wi-Fi** → tap network → **IP address**
- Or: **Settings** → **Developer options** → **Wireless debugging** for current IP:Port

### Port Changed:

- Samsung may use different ports (39945, 40081, etc.)
- Always check the **Wireless debugging** screen for current port

## 📱 App Installation Results

After successful installation:

- **App Name:** SlipScan
- **Location:** Samsung app drawer/home screen
- **Features:** Native camera, ML Kit OCR, Firebase auth, offline storage
- **Icon:** Custom SlipScan logo (blue background)

## 🎯 Development Workflow

### Daily Connection:

```powershell
# Quick connect (if already paired)
$env:PATH += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
adb connect 192.168.3.8:40081
adb devices
```

### Update App:

```powershell
# After making code changes
cd "f:\coding\SlipScan\slipscan"
npx expo run:android
```

### Rebuild with Clean:

```powershell
# For major changes (new dependencies, config changes)
npx expo prebuild --clean
npx expo run:android
```

## 📝 Notes

- **IP addresses change** - Always check your Samsung's current IP
- **Ports may vary** - Pairing port vs connection port are different
- **Same network required** - Ethernet + WiFi on same router works fine
- **Development build** - App connects to Metro server for hot reloading
- **Offline capable** - ML Kit OCR works without internet once installed

## 🚨 Common IP:Port Examples

Your Samsung may show different addresses:

- Pairing: `192.168.3.8:39945` (temporary)
- Connection: `192.168.3.8:40081` (main)
- Different sessions may use: `192.168.3.8:41234`, etc.

Always use the **current** IP:Port shown in your Samsung's Wireless debugging screen!

## 🐛 Navigation Troubleshooting

### Profile Page Not Opening:

If the profile/settings page shows logs but doesn't render:

```powershell
# Check if navigation logs appear but page doesn't render
# Look for: "Settings button pressed - navigating to profile"
# Should also see: "ProfileIndex component mounted!"

# If you see navigation logs but no mount logs:
# 1. Try connecting via USB cable temporarily
# 2. Rebuild the app completely:
npx expo prebuild --clean
npx expo run:android
```

### Route Structure:

- Main app routes: `/landing`, `/signup`, `/profile`, `/scanner`, `/review`
- Tab routes: `/tabs/index` (home), `/tabs/budget`
- Profile nested route: `/profile/index`

### Development Server Issues:

```powershell
# If app tries to connect to development server and fails:
# Make sure both computer and phone are on same network
# The app may show: "Unmatched route page could not be found"

# Quick fix - start development server:
npx expo start --dev-client
```

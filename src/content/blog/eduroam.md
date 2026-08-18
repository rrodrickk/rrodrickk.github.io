---
title: "How to Connect to Eduroam"
description: "Step-by-step instructions for connecting to eduroam WiFi on Arch Linux and Android/Boox devices, including certificate installation and authentication settings."
date: 2025-07-25
tags: ["Linux/Arch"]
---

## Linux (Arch) setup

### 1. Get the CA certificate from your school

This process seems different for every school. For me, I had to go to my school's onboarding website, then downloaded it from there.

### 2. Connect to eduroam

Connect to the hidden WiFi network → SSID → `eduroam`, then connect with the following settings:

```
Security:            WPA & WPA2 Enterprise
Authentication:       Protected EAP (PEAP)
Anonymous identity:   (blank)
Domain:               (blank)
CA certificate:       my_school_certificate.cer
PEAP version:         automatic
Inner authentication: MSCHAPv2
Username:             meow_man@alunosuminho.pt
Password:             ******* (your school password)
```

---

## Boox devices setup

For whatever reason my Boox Go 10.3 doesn't seem to work with my university's WiFi directly, so I resort to eduroam.

### 1. Get the CA certificate from your school

Same as above, this process seems different for every school. For me, I had to go to my school's onboarding website, then downloaded it from there.

### 2. Install the CA certificate on Android

1. Install the "Android Hidden Settings" app, available in the Play Store.
2. Android Hidden Settings → Settings → Security → Encryption & Credentials → Install from Storage → select the CA certificate → name it.

### 3. Connect to eduroam

1. Home → Settings → (+) at the top right → SSID: `eduroam`, security → WPA/WPA2/WPA3-Enterprise.
2. Connect with the following settings:

```
EAP method:            PEAP
Phase 2 authentication: MSCHAPv2
CA certificate:        (select the previously installed certificate)
Identity:              meow_man@alunosuminho.pt
Anonymous identity:    (leave blank)
Password:              ******* (your school password)
```

#!/usr/bin/env bash
HOME=/app
cd /app
if [ ! -d "/app/ring-mqtt-${BRANCH}" ]; then
    echo "Updating ring-mqtt to the ${BRANCH} version..."
    if [ "${BRANCH}" = "latest" ]; then
        git clone https://github.com/tsightler/ring-mqtt ring-mqtt-latest
    else 
        git clone -b dev https://github.com/tsightler/ring-mqtt ring-mqtt-dev
    fi
    cd "/app/ring-mqtt-${BRANCH}"
    echo "Installing node module dependencies, please wait..."
    npm install --no-progress > /dev/null 2>&1
    chmod +x ring-mqtt.js scripts/*.sh

    # This runs the downloaded version of this script in case there are 
    # additonal component upgrade actions that need to be performed
    exec "/app/ring-mqtt-${BRANCH}/scripts/update2branch.sh"
    echo "-------------------------------------------------------"
else
    # Branch has already been initialized, run any post-update command here
    echo "The ring-mqtt-${BRANCH} branch has been updated."
    cd "/app/ring-mqtt-${BRANCH}"
    RSS_VERSION="v0.21.0"
    APK_ARCH="$(apk --print-arch)"
    case "${APK_ARCH}" in
        x86_64)
            RSS_ARCH="amd64";;
        aarch64)
            RSS_ARCH="arm64v8";;
        armv7|armhf)
            RSS_ARCH="armv7";;
        *)
            echo >&2 "ERROR: Unsupported architecture '$APK_ARCH'"
            exit 1;;
    esac
    rm -f /usr/local/bin/rtsp-simple-server
    curl -L -s "https://github.com/aler9/rtsp-simple-server/releases/download/${RSS_VERSION}/rtsp-simple-server_${RSS_VERSION}_linux_${RSS_ARCH}.tar.gz" | tar zxf - -C /usr/local/bin rtsp-simple-server
    
    GO2RTC_VERSION="v0.1-rc.5"
    case "${APK_ARCH}" in
        x86_64)
            GO2RTC_ARCH="amd64";;
        aarch64)
            GO2RTC_ARCH="arm64";;
        armv7|armhf)
            GO2RTC_ARCH="arm";;
        *)
            echo >&2 "ERROR: Unsupported architecture '$APK_ARCH'"
            exit 1;;
    esac
    rm -f /usr/local/bin/go2rtc
    https://github.com/AlexxIT/go2rtc/releases/download/v0.1-rc.5/go2rtc_linux_arm
    curl -L -s -o /usr/local/bin/go2rtc "https://github.com/AlexxIT/go2rtc/releases/download/${GO2RTC_VERSION}/go2rtc_linux_${GO2RTC_ARCH}"
    chmod +x /usr/local/bin/go2rtc


fi
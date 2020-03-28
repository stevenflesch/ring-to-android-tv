# ring-to-android-tv

A `nodejs` application that acts as a bridge between `ring-client-api` and the [PiPup Android application](https://github.com/rogro82/pipup) in order to view Ring Doorbell camera events on Android TVs like the Nvidia SHIELD.

![](https://raw.githubusercontent.com/stevenflesch/ring-to-android-tv/master/extras/sample-tv-shot.jpg)

## Requirements

- Android TV
- `nodejs` Server (a Raspberry Pi works fine)
- Ring API Token for 2FA Bypass (instructions below)

## Setup

1. Install [PiPup](https://github.com/rogro82/pipup) on your Android TV.  Follow instructions on the PiPup page to gain access to the public beta.
2. Use ADB Shell to grant overlay permissions - see instructions below in *ADB Shell over Network* section.
	>`adb shell appops set nl.rogro82.pipup SYSTEM_ALERT_WINDOW allow`
3. Install `node` and `git` on your server, if not already.
4. Clone the `ring-to-android-tv` repo.
	> `git clone https://github.com/stevenflesch/ring-to-android-tv.git`
5. Run `npm install` in the `ring-to-android-tv` folder.
	> `cd ring-to-android-tv`

	> `npm install`
6. Generate an API token and save it to `token.txt`.  Copy the key value only, no quotes.  *Note: keep this secret, as it allows complete access to your Ring account.*
	> `npx -p ring-client-api ring-auth-cli`
7. Test the script using snapshot.js
	> `node snapshot.js`
8. Configure `app.js` with your Android TV's IP address and change other options, if desired.  *See configuration below.*
8. Run the application!
	> `node app.js`
9. *TODO: persist app after server restarts with forever.js and crontab*
10. *TODO: Automatic updates with crontab and `git pull`*

#### ADB Shell over Network

If you'd like to execute the adb shell command with your Android phone, you can do so with a free app called [Remote ADB Shell](https://play.google.com/store/apps/details?id=com.cgutman.androidremotedebugger&hl=en_US).  Follow these instructions to do so:

1. On your Android TV, open **Settings**.
2. Open **Device Preferences -> About**.
3. Scroll down to **Build** and click on it several times rapidly to enable Developer Mode.
4. Press back button, scroll down to **Developer options**.
5. Scroll down and enable **Network debugging**.
6. Open Remote ADB Shell on your phone.
7. Connect to your Android TV.
8. Execute the following command: **`appops set nl.rogro82.pipup SYSTEM_ALERT_WINDOW allow`**
9. You can now disable **Network debugging** if you desire, for security purposes.

## Configuration

| Option  | Explanation  |
|:----------|:----------|
| `tvIpAddress`    | *Address of the IP address of the Android TV running PiPup.  Required.*    |
| `displayTime`    | *Time, in seconds, to display popup notifications.*    |

## License & Contributions

### License

This application is released under an MIT license.

### Contributions

Please submit contributions with a pull request, they are very welcome!  A short list of needed enhancements are below:
- Ability to show notifications from multiple cameras and locations

## Acknowledgements

A huge thank you to both [rogro82](https://github.com/rogro82) for the PiPup application and [dgreif](https://github.com/dgreif) for the `ring-client-api` library.
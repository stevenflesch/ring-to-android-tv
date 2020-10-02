/*
 * app.js
 * 
 * This node application acts as a bridge between the ring-client-api and the PiPup Android
 * application to show Ring camera snapshots as an overlay/popup on Android TV devices.
 * 
 * Remember to change the tvIpAddress variable and save your API token to token.txt.
 */

// Dependencies
const Ring = require('ring-client-api')
const fs = require('fs')
const request = require('request')
const { exit } = require('process')
require('dotenv').config()

// Configuration
const tvIpAddress = process.env.R2ATV_IP_ADDRESS            // IP address of the Android TV you are running PiPup on
const displayTime = process.env.R2ATV_DISPLAY_TIME || 12    // Display time for notifications, in seconds

/**
 * Returns the API token from `token.txt` or gracefully exits the script with error.
 */
function getApiToken() {
    try {
        return(process.env.R2ATV_API_TOKEN.toString().trim())     // Grab plain-text token from .env file.
    } catch(err) {
        console.log('Unable to read API token from .env file - ensure you have an API token before running the script.')
        process.exit(1)
    }
}

/**
 * Sends a notification to PiPup app on Android TV.
 * @param {*} title Title of notification message.
 * @param {*} message Text of notification message.
 * @param {*} imageFile Path to image file, can be blank string to display no image.
 * @param {*} exitAfter If true, calls process.exit() after completing request.
 */
async function sendNotification(title, message, imageFile, exitAfter = false) {    
    const options = {
        method: "POST",
        url: "http://" + tvIpAddress + ":7979/notify",
        port: 7979,
        headers: {
            "Content-Type": "multipart/form-data"
        },
        formData: {
            "duration": displayTime,
            "position": 0,
            "title": title,
            "titleColor": "#0066cc",
            "titleSize": 20,
            "message": message,
            "messageColor": "#000000",
            "messageSize": 14,
            "backgroundColor": "#ffffff",
            "image" : (imageFile == '') ? "" : fs.createReadStream(__dirname + '/' + imageFile),
            "imageWidth": 640
        }
    }
    
    // Fire off POST message to PiPup with 'request'
    request(options, function (err, res, body) {
        if(err) {
            console.log(`[ERROR] Error sending notification: ${title} - ${message}`)
            console.log(err)
            process.exitCode = 1
        } else {
            console.log(`Sent notification successfully: ${title} - ${message}`)
        }
        if(exitAfter) process.exit()
    })
}

async function listLocationsAndCameras() {
    locations = await ringApi.getLocations().catch(error => {
        console.log('[ERROR] Unable to retrieve camera locations because: ' + error.message)
        process.exit(1) // exit with error code
    })
    intLocation = 0
    intCamera = 0

    locations.forEach(function(location) {
        intCamera = 0
        console.log(`Found location[${intLocation}]: ${location.name}`)

        // Subscribe to each camera at this location.
        location.cameras.forEach(function(camera) {
            console.log(`\t - Found ${camera.model} named ${camera.name}. Test with --test ${intLocation},${intCamera}`)
            intCamera++
        })
        intLocation++
    })

    process.exit()
}

/**
 * For testing: onnects to the first camera at first detected location, saves and sends a snapshot notification.
 * @param {*} intLocation Number of location to use in Location array.
 * @param {*} intCamera Number of camera to use in Location->Camera array.
 */
async function getTestSnapshot(intLocation = 0, intCamera = 0) {
    const locations = await ringApi.getLocations().then(locations => {
        const location = locations[intLocation]
        const camera = location.cameras[intCamera]
    }).catch(error => {
        console.log('[ERROR] Unable to retrieve camera locations because: ' + error.message)
        process.exit(1) // exit with error code
    })

    console.log(`Attempting to get snapshot for location #${intLocation}, camera #${intCamera}`)
    
    try {
        const snapshotBuffer = await camera.getSnapshot()
        console.log('Snapshot size: ' + Math.floor(snapshotBuffer.byteLength/1024) + ' kb')
    
        fs.writeFile(__dirname + '/snapshot.png', snapshotBuffer, (err) => {
            // throws an error, you could also catch it here
            if (err) throw err;
        
            // success case, the file was saved
            console.log('Snapshot saved!')
            sendNotification('Test Snapshot', 'This is a test snapshot message!', 'snapshot.png', true)
        })
    } catch (e) {
        // failed to get a snapshot.  handle the error however you please
        console.log('Unable to get snapshot...')
        console.log(e)
        sendNotification('Test Snapshot Failed', 'An error occured trying to get a snapshot!', 'error.png', true)
    }
}

/**
 * Starts polling a Ring camera for events and grabs snapshots on motion/dings.
 * @param {*} notifyOnStart Whether to send a notification when beginning camera polling.
 */
async function startCameraPolling(notifyOnStart) {
    const locations = await ringApi.getLocations().catch(error => {
        console.log('Unable to retrieve camera locations because: ' + error.message)
        process.exit(1) // exit with error code
    })
    
    locations.forEach(function(location) {
        console.log(`Found location: ${location.name}`)

        // Subscribe to each camera at this location.
        location.cameras.forEach(function(camera) {
            console.log(`\t - Found ${camera.model} named ${camera.name}.`)

            // Start the camera subscription to listen for motion/rings/etc...
            camera.onNewDing.subscribe(async ding => {
                
                var event = "Unknown Event"
                var notifyTitle;
                var notifyMessage;

                // Get friendly name for event happening and set notification params.
                switch(ding.kind) {
                    case "motion":
                        event = "Motion detected"
                        notifyTitle = 'Motion Detected'
                        notifyMessage = `Motion detected at ${camera.name}!`
                        break
                    case "ding":
                        event = "Doorbell pressed"
                        notifyTitle = 'Doorbell Ring'
                        notifyMessage = `Doorbell rung at ${camera.name}!`
                        break
                    default:
                        event = `Video started (${ding.kind})`
                        notifyTitle = 'Video Started'
                        notifyMessage = `Video started at ${camera.name}`
                }

                console.log(`[${new Date()}] ${event} on ${camera.name} camera.`)

                // Grab new snapshot
                try {
                    const snapshotBuffer = await camera.getSnapshot().catch(error => {
                        console.log('[ERROR] Unable to retrieve snapshot because:' + error.message)
                    })
            
                    fs.writeFile(__dirname + '/snapshot.png', snapshotBuffer, (err) => {
                        // throws an error, you could also catch it here
                        if (err) throw err;
                    
                        // success case, the file was saved
                        console.log('Snapshot saved!');
                        sendNotification(notifyTitle, notifyMessage, 'snapshot.png')
                    })
                } catch (e) {
                    // Failed to retrieve snapshot. We send text of notification along with error image.
                    // Most common errors are due to expired API token, or battery-powered camera taking too long to wake.
                    console.log('Unable to get snapshot.')
                    sendNotification(notifyTitle, notifyMessage, 'error.png')
                }

                console.log('')
            }, err => {
                console.log(`Error subscribing to ${location.name} ${camera.name}:`)
                console.log(err)
            },
            () => {
                console.log('Subscription complete.') // We shouldn't get here!
            })

        })
    })

    // Send notification on app start, if enabled.
    if(notifyOnStart) sendNotification('ring-to-android-tv', 'Ring notifications started!', '')
}

// Set up Ring API object
ringApi = new Ring.RingApi({
    refreshToken: getApiToken(),
    controlCenterDisplayName: 'ring-to-android-tv',
    cameraDingsPollingSeconds: 5    // Default is 5, less seems to cause API token to expire.
})

if(process.argv.includes('--test')) {
    // Just grab a snapshot for testing, then exit.
    console.log('Attempting to get demo snapshot...')
    try {
        intArg = process.argv.indexOf('--test')
        var intLocation = intCamera = 0
        if(process.argv.length > intArg + 1) {
            // Attempt to get location,camera from next arg.
            strLocCam = process.argv[intArg + 1]
            intLocation = strLocCam.split(',')[0]
            intCamera = strLocCam.split(',')[1]
        }
        getTestSnapshot(intLocation, intCamera)
    } catch (e) {
        console.log('Error attempting to call getTestSnapshot().')
        console.log(e)
        process.exit()
    } finally {
        //process.exit()
    }
} else if(process.argv.includes('--list')) {
    listLocationsAndCameras()
} else {
    // Begin polling camera for events
    startCameraPolling(true)
}
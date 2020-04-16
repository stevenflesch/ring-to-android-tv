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

// Configuration
const tvIpAddress = '192.168.1.11'                                  // IP address of the Android TV you are running PiPup on
const displayTime = 12                                              // Display time for notifications, in seconds

/**
 * Returns the API token from `token.txt` or gracefully exits the script with error.
 */
function getApiToken() {
    try {
        return(fs.readFileSync(__dirname + '/token.txt').toString().trim())     // Grab plain-text token from token.txt
    } catch(err) {
        console.log('Unable to read API token from token.txt - ensure you have an API token before running the script.')
        process.exit(-1)
    }
}

/**
 * Sends a notification to PiPup app on Android TV.
 * @param {*} title Title of notification message.
 * @param {*} message Text of notification message.
 * @param {*} imageFile Path to image file, can be blank string to display no image.
 */
async function sendNotification(title, message, imageFile) {    
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
            console.log('Error sending notification.')
            console.log(err)
        } else {
            console.log('Sent notification successfully.')
        }
    })
}

/**
 * Starts polling a Ring camera for events and grabs snapshots on motion/dings.
 * @param {*} notifyOnStart Whether to send a notification when beginning camera polling.
 */
async function startCameraPolling(notifyOnStart) {
    const locations = await ringApi.getLocations()
    const location = locations[0]
    const camera = location.cameras[0]

    if(notifyOnStart) sendNotification('ring-to-android-tv', 'Ring notifications started!', '')

    // Start the camera subscription to listen for motion/rings/etc...
    camera.onNewDing.subscribe(async ding => {
        const event =
          ding.kind === 'motion'
            ? 'Motion detected'
            : ding.kind === 'ding'
            ? 'Doorbell pressed'
            : `Video started (${ding.kind})`

        console.log(
          `${event} on ${camera.name} camera. Ding id ${
            ding.id_str
          }.  Received at ${new Date()}`
        )

        // Build notification
        switch(ding.kind) {
            case 'motion':
                notifyTitle = 'Motion Detected'
                notifyMessage = 'Motion detected at front door!'
                break;
            case 'ding':
                notifyTitle = 'Doorbell Ring'
                notifyMessage = 'Doorbell rung at front door!'
                break;
        }

        // Grab new snapshot
        try {
            const snapshotBuffer = await camera.getSnapshot()
    
            fs.writeFile(__dirname + '/snapshot.png', snapshotBuffer, (err) => {
                // throws an error, you could also catch it here
                if (err) throw err;
            
                // success case, the file was saved
                console.log('Snapshot saved!');
                sendNotification(notifyTitle, notifyMessage, 'snapshot.png')
            })
        } catch (e) {
            // failed to get a snapshot.  handle the error however you please
            console.log('Unable to get snapshot.')
            sendNotification(notifyTitle, notifyMessage, 'error.png')
        }

        console.log('')
      }, err => {
          console.log(err)
      },
      () => {
          console.log('finished?')
      })
}

// Set up Ring API object
ringApi = new Ring.RingApi({
    refreshToken: getApiToken(),
    controlCenterDisplayName: 'ring-to-android-tv',
    cameraDingsPollingSeconds: 2
})

// Begin polling camera for events
startCameraPolling(true)
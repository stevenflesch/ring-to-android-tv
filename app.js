/**
 * ring-to-android-tv
 * This node application acts as a bridge between the ring-client-api and the PiPup Android
 * application.
 */

// Dependencies
const Ring = require('ring-client-api')
const fs = require('fs')
const request = require('request')

// Configuration
const apiToken = fs.readFileSync('token.txt').toString()    // Grab plain-text token from token.txt
const tvIpAddress = '192.168.1.11'                          // IP address of the Android TV you are running PiPup on
const displayTime = 10                                      // Display time for notifications, in seconds
const opacity = 75                                          // Opacity of notification background, in percentage

// Set up Ring API object
ringApi = new Ring.RingApi({
    refreshToken: apiToken,
    cameraDingsPollingSeconds: 2
})

// Send notification to PiPup
async function sendNotification(title, message, imageFile) {
    const options = {
        method: "POST",
        url: "http://" + tvIpAddress + ":7979/notify",
        port: 7979,
        headers: {
            "Content-Type": "multipart/form-data"
        },
        formData : {
            "duration": displayTime,
            "position": 0,
            "title": title,
            "titleColor": "#0066cc",
            "titleSize": 20,
            "message": message,
            "messageColor": "#000000",
            "messageSize": 14,
            "backgroundColor": "#ffffff",
            "image" : fs.createReadStream(imageFile),
            "imageWidth": 640
        }
    }
    
    // Fire off POST message to PiPup with 'request'
    request(options, function (err, res, body) {
        if(err) {
            console.log(err)
        } else {
            console.log('Sent notification successfully.')
        }
    })
}

async function startCameraPolling() {
    const locations = await ringApi.getLocations()
    const location = locations[0]
    const camera = location.cameras[0]

    /*
    try {
        const snapshotBuffer = await camera.getSnapshot()
        console.log(snapshotBuffer)

        fs.writeFile('snapshot.png', snapshotBuffer, (err) => {
            // throws an error, you could also catch it here
            if (err) throw err;
        
            // success case, the file was saved
            console.log('Snapshot saved!')
            sendNotification('test', 'test', 'snapshot.png')
        })
    } catch (e) {
        // failed to get a snapshot.  handle the error however you please
        console.log('Unable to get snapshot...')
        sendNotification('test-error', 'error occured!', 'error.png')
    }
    */

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
                notifyTitle = '🏃‍♂️ Motion Detected 🏃‍♂️'
                notifyMessage = 'Motion detected at front door!'
                break;
            case 'ding':
                notifyTitle = '🔔 Doorbell Ring 🔔'
                notifyMessage = 'Doorbell rung at front door!'
                break;
        }

        // Grab new snapshot
        try {
            const snapshotBuffer = await camera.getSnapshot()
    
            fs.writeFile('snapshot.png', snapshotBuffer, (err) => {
                // throws an error, you could also catch it here
                if (err) throw err;
            
                // success case, the file was saved
                console.log('Snapshot saved!');
            })

            sendNotification(notifyTitle, notifyMessage, 'snapshot.png')
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

startCameraPolling()
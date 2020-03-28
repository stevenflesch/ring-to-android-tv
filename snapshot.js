/*
 * snapshot.js
 * This file is used for debugging purposes, it simply retrieves a snapshot and sends it to PiPup
 * for display on an Android TV device.
 * 
 * Remember to change the tvIpAddress variable and save your API token to token.txt.
 */

// Dependencies
const Ring = require('ring-client-api')
const fs = require('fs')
const request = require('request')

// Configuration
const tvIpAddress = '192.168.1.11'                                  // IP address of the Android TV you are running PiPup on
const displayTime = 20                                              // Display time for notifications, in seconds
const opacity = 100                                                 // Opacity of notification background, in percentage

/**
 * Returns the API token from `token.txt` or gracefully exits the script with error.
 */
function getApiToken() {
    try {
        return(fs.readFileSync('token.txt').toString().trim())     // Grab plain-text token from token.txt
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
            "image" : (imageFile == '') ? "" : fs.createReadStream(imageFile),
            "imageWidth": 640
        }
    }
    
    // Fire off POST message to PiPup with 'request'
    request(options, function (err, res, body) {
        if(err) {
            console.log('Error sending notification.')
            console.log(err)
            process.exit(-1)
        } else {
            console.log('Sent notification successfully.')
            process.exit()  // exit the script for debugging!
        }
    })
}

async function getSnapshot() {
    const locations = await ringApi.getLocations()
    const location = locations[0]
    const camera = location.cameras[0]
    
    try {
        const snapshotBuffer = await camera.getSnapshot()
        console.log('Snapshot size: ' + Math.floor(snapshotBuffer.byteLength/1024) + ' kb')
    
        fs.writeFile('snapshot.png', snapshotBuffer, (err) => {
            // throws an error, you could also catch it here
            if (err) throw err;
        
            // success case, the file was saved
            console.log('Snapshot saved!')
            sendNotification('Test Snapshot', 'This is a test snapshot message!', 'snapshot.png')
        })
    } catch (e) {
        // failed to get a snapshot.  handle the error however you please
        console.log('Unable to get snapshot...')
        sendNotification('Test Snapshot Failed', 'An error occured trying to get a snapshot!', 'error.png')
    }
}

// Set up Ring API object
ringApi = new Ring.RingApi({
    refreshToken: getApiToken(),
    controlCenterDisplayName: 'ring-to-android-tv',
    cameraDingsPollingSeconds: 2
})

// Grab snapshot and exit!
getSnapshot()
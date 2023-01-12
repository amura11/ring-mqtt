import { parentPort, workerData } from 'worker_threads'
import { WebrtcConnection } from '../node_modules/ring-client-api/lib/streaming/webrtc-connection.js'
import { RingEdgeConnection } from '../node_modules/ring-client-api/lib/streaming/ring-edge-connection.js'
import { StreamingSession } from '../node_modules/ring-client-api/lib/streaming/streaming-session.js'
import chalk from 'chalk'
import debugModule from 'debug'
const debug = debugModule('ring-mqtt')

const locationId = workerData.locationId
const deviceId = workerData.deviceId
const deviceName = workerData.deviceName
const doorbotId = workerData.doorbotId
let liveCall = false

parentPort.on("message", async(data) => {
    debug(chalk.yellowBright(`[${deviceName}] `)+'Live call worker thread received command')
    const streamData = data.streamData
    if (data.command === 'start' && !liveCall) {
        try {
            const cameraData = {
                name: deviceName,
                id: doorbotId
            }
            const streamConnection = (streamData.sessionId)
                ? new WebrtcConnection(streamData.sessionId, cameraData)
                : new RingEdgeConnection(streamData.authToken, cameraData)
            debug(chalk.yellowBright(`[${deviceName}] `)+'Live call streaming connection initialized')
            liveCall = new StreamingSession(cameraData, streamConnection)
            debug(chalk.yellowBright(`[${deviceName}] `)+'Live call streaming session initialized')
            await liveCall.startTranscoding({
                // The native AVC video stream is copied to the RTSP server unmodified while the audio 
                // stream is converted into two output streams using both AAC and Opus codecs.  This
                // provides a stream with wide compatibility across various media player technologies.
                input: [
                    '-sync', 'ext'
                ],
                audio: [
                    '-map', '0:v',
                    '-map', '0:a',
                    '-map', '0:a',
                    '-c:a:0', 'libfdk_aac',
                    '-c:a:1', 'copy',
                ],
                video: [
                    '-c:v', 'copy',
                ],
                output: [
                    '-f', 'rtsp',
                    '-rtsp_transport', 'tcp',
                    streamData.rtspPublishUrl
                ]
            })
            debug(chalk.yellowBright(`[${deviceName}] `)+'Live call ffmpeg process started')
            parentPort.postMessage({ state: 'active' })
            liveCall.onCallEnded.subscribe(() => {
                debug(chalk.green(`[${deviceName}] `)+'Live stream for camera has ended')
                parentPort.postMessage({ state: 'inactive' })
                liveCall = false
            })
        } catch(e) {
            debug(e)
            parentPort.postMessage({ state: 'failed', liveCallData: { deviceId: streamData.deviceId }})
            return false
        }
    } else if (data.command === 'stop') {
        if (liveCall) {
            liveCall.stop()
            await new Promise(res => setTimeout(res, 2000))
            if (liveCall) {
                debug(chalk.yellowBright(`[${deviceName}] `)+'Live stream failed to stop on request, deleting anyway...')
                liveCall = false
                parentPort.postMessage({ state: 'inactive' })
            }
        } else {
            debug(chalk.yellowBright(`[${deviceName}] `)+'Received live stream stop command but no active live call found')
            parentPort.postMessage({ state: 'inactive' })
        }
    }
})  
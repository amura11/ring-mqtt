const RingSocketDevice = require('./base-socket-device')

class Siren extends RingSocketDevice {
    constructor(deviceInfo) {
        super(deviceInfo)
        this.deviceData.mdl = 'Siren'

        this.entities.siren = {
            component: 'binary_sensor',
            legacy: true
        }

        this.initInfoEntities()
    }

    publishData() {
        const sirenState = this.device.data.sirenStatus === 'active' ? 'ON' : 'OFF'
        this.publishMqtt(this.entities.siren.state_topic, sirenState, true)
        this.publishAttributes()
    }
}

module.exports = Siren
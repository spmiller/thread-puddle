const { parentPort } = require('worker_threads')
const createDebug = require('debug')

parentPort.once('message', (msg) => {
  if (msg.action === 'init') {
    const { workerPath, port, id } = msg
    const debug = createDebug(`puddle:thread:${id}`)
    debug('Initializing worker thread...')

    const worker = require(workerPath)

    worker.__ID__ = id

    port.on('message', async ({ action, key, args, callbackId }) => {
      switch (action) {
        case 'call': {
          debug('calling worker thread method %s', key)

          try {
            if (typeof worker[key] !== 'function') {
              debug('%s is not a function', key)
              throw new Error(`"${key}" is not a function in this worker thread`)
            }
            const result = await worker[key](...args)
            port.postMessage({ action: 'resolve', callbackId, result })
          } catch ({ message, stack }) {
            debug(message)
            port.postMessage({ action: 'reject', callbackId, message, stack })
          }
          break
        }
        default: {
          throw new Error(`Unknown action "${msg.action}" for worker thread`)
        }
      }
    })

    msg.port.postMessage({ action: 'ready' })
  }
})

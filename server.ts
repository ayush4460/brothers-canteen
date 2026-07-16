import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  })

  // Make io available globally so Server Actions can broadcast events
  // Note: This works because Server Actions share the Node process in this custom server setup.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(global as any).io = io

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('join_vendor_dashboard', () => {
      socket.join('vendor_dashboard')
    })

    socket.on('join_customer', (customerId) => {
      socket.join(`customer_${customerId}`)
      console.log(`Socket joined customer room: customer_${customerId}`)
    })

    socket.on('join_room', (roomName: string) => {
      socket.join(roomName)
      console.log(`Socket joined room: ${roomName}`)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port} with Socket.io`)
    })
})

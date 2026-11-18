
import "./App.css"
import Editor from "@monaco-editor/react"
import { MonacoBinding } from "y-monaco"
import { useRef, useMemo, useState, useEffect } from "react"
import * as Y from "yjs"
import { SocketIOProvider } from "y-socket.io"

function App() {
  const editorRef = useRef(null)
  const bindingRef = useRef(null)

  const [username, setUsername] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || ""
  })

  const [users, setUsers] = useState([])

  const ydoc = useMemo(() => new Y.Doc(), [])
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc])

  // Connect Monaco Editor with Yjs
  const handleMount = (editor) => {
    editorRef.current = editor

    const model = editor.getModel()

    if (!model) return

    bindingRef.current = new MonacoBinding(
      yText,
      model,
      new Set([editor])
    )
  }

  // Join with username
  const handleJoin = (e) => {
    e.preventDefault()

    const name = e.target.username.value.trim()

    if (!name) return

    setUsername(name)

    window.history.pushState(
      {},
      "",
      "?username=" + encodeURIComponent(name)
    )
  }

  // Connect to collaboration server
  useEffect(() => {
    if (!username) return

    console.log("Connecting user:", username)
    console.log("Backend URL: http://localhost:3000")

    const provider = new SocketIOProvider(
      window.location.origin,
      "monaco",
      ydoc,
      {
        autoConnect: true,
      }
    )

    // Socket connection status
    provider.on("status", ({ status }) => {
      console.log("Socket status:", status)
    })

    // Connection errors
    provider.on("connection-error", (error) => {
      console.error("Connection error:", error)
    })

    // Connection closed
    provider.on("connection-close", (reason) => {
      console.log("Connection closed:", reason)
    })

    // Yjs synchronization
    provider.on("sync", (synced) => {
      console.log("Yjs synced:", synced)
    })

    // Set current user information
    provider.awareness.setLocalStateField("user", {
      username,
    })

    // Update connected users
    const updateUsers = () => {
      const states = Array.from(
        provider.awareness.getStates().values()
      )

      console.log("Connected users:", states)

      const activeUsers = states
        .filter(state => state.user?.username)
        .map(state => state.user)

      setUsers(activeUsers)
    }

    // Initial users update
    updateUsers()

    // Listen for user changes
    provider.awareness.on("change", updateUsers)

    // Cleanup
    return () => {
      provider.awareness.off("change", updateUsers)

      provider.awareness.setLocalState(null)

      provider.disconnect()

      setUsers([])

      console.log("Disconnected user:", username)
    }

  }, [username, ydoc])

  // Username login screen
  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex items-center justify-center">
        <form
          onSubmit={handleJoin}
          className="flex flex-col gap-4"
        >
          <input
            type="text"
            placeholder="Enter your username"
            className="p-3 rounded-lg bg-gray-800 text-white"
            name="username"
            required
          />

          <button
            type="submit"
            className="p-3 rounded-lg bg-amber-50 text-gray-950 font-bold"
          >
            Join
          </button>
        </form>
      </main>
    )
  }

  // Main collaborative editor
  return (
    <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">

      {/* Users sidebar */}
      <aside className="h-full w-1/4 shrink-0 bg-amber-50 rounded-lg overflow-y-auto">

        <h2 className="text-2xl font-bold p-4 border-b border-gray-300">
          Users
        </h2>

        <ul className="p-4">
          {users.map((user, index) => (
            <li
              key={index}
              className="p-2 bg-gray-800 text-white rounded mb-2"
            >
              {user.username}
            </li>
          ))}
        </ul>

      </aside>

      {/* Code editor */}
      <section className="h-full flex-1 min-w-0 bg-neutral-800 rounded-lg overflow-hidden">

        <Editor
          height="100%"
          defaultLanguage="javascript"
          defaultValue="// some comment"
          theme="vs-dark"
          onMount={handleMount}
        />

      </section>

    </main>
  )
}

export default App

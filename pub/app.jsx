const { useEffect, useRef, useState } = React

const useLatest = val => {
  const ref = useRef(val)
  ref.current = val
  return ref
}

const sleep = async ms => new Promise(res => setTimeout(res, ms))

const cOk   = { background: "lime", color: "black" }
const cWarn = { background: "yellow", color: "black", fontWeight: "bold" }
const cErr  = { background: "red", color: "white", fontWeight: "bold" }

// 1 day
const isGone = ts =>
  Date.now() - new Date(ts).getTime() > 1000 * 3600 * 24

const dateFmt = ts => {
  const date = new Date(ts)
  const pref = date.toLocaleString("ja")

  const ds = (Date.now() - date.getTime()) / 1000

  const d = Math.trunc(ds / 3600 / 24)
  if(d) return `${pref} (${d}日前)`

  const h = Math.trunc((ds - 3600 * 24 * d) / 3600)
  if(h) return `${pref} (${h}時間前)`

  const m = Math.trunc((ds - 3600 * (24 * d + h)) / 60)
  if(m) return `${pref} (${m}分前)`

  const s = Math.trunc(ds)
  return `${pref} (さっき)`
}

const Layout = ({ children }) => (
  <>
    <header>
      <h1>YamaD Status</h1>
    </header>
    <main>{children}</main>
    <footer style={{
      fontWeight: "bolder",
      textAlign: "center",
    }}>
      <p>&copy; 2022 YamaD</p>
    </footer>
  </>
)

const Lav = () => {
  const [cur, setCur] = useState({})
  const [ord, setOrd] = useState([])
  const curr = useLatest(cur)
  const ordr = useLatest(ord)

  const statusStyle = s => {
    switch(s) {
      case "ok":    return cOk
      case "still": return cWarn
      case "busy":  return cErr
      default:      return {}
    }
  }

  const onMsg = ({ data }) => {
    const msg = JSON.parse(data)
    setCur({ ...curr.current, [msg.id]: msg })
    if(!ordr.current.includes(msg.id))
      setOrd([msg.id, ...ordr.current])
  }

  const con = () => {
    const url = new URL("/ws", location.href)
    url.protocol = "ws" + url.protocol.slice(4, -1)

    const ws = new WebSocket(url)
    ws.onmessage = onMsg
    ws.onclose = async e => {
      await sleep(1000)
      con()
    }
  }

  const poll = async () => {
    const res = await fetch("/api/lav").then(res => res.json())
    const current = Object.fromEntries(res.map(i => [i.id, i]))
    setCur(current)
    setOrd(Object.keys(current).sort())
    // setOrd(res.sort((a, b) => b.ts - a.ts).map(i => i.id))
  }

  useEffect(() => {
    poll()
    con()
  }, [])

  return (
    <>
      <h2>Load Average</h2>
      <table style={{
        display: "block",
        fontFamily: "monospace",
        overflowX: "scroll",
        whiteSpace: "nowrap",
      }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Load Average</th>
            <th>CPU</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {ord.map((id, i) => {
            const { nick, status, lav, cores, threads, ts } = cur[id]
            const gone = isGone(ts) ? "gone" : ""
            return (
              <tr key={i}>
                <td>{nick}</td>
                <td style={statusStyle(gone || status)}>
                  {gone || status}
                </td>
                <td>
                  [{lav
                    .map(i => String(Math.round(i * 1000) / 1000))
                    .map(s => {
                      const [before, after = ""] = s.split(".")
                      if(before.length >= 3)
                        return before
                      return `${before}.${(after + "000").slice(0, 3)}`
                    })
                    .join(",")
                  }]
                </td>
                <td>{cores}C{threads}T</td>
                <td style={gone ? cErr : {}}>
                  {dateFmt(ts)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}

const App = () => (
  <Layout>
    <Lav />
  </Layout>
)

ReactDOM.render(<App />, document.getElementById("root"))

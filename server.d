#!/usr/bin/env dub
/+ dub.sdl:
name "lav-server"
dependency "vibe-d" version="~>0.9"
dflags "-preview=shortenedMethods"
+/

import std;
import vibe.d;

auto timestamp() => (Clock.currTime.toUTC - SysTime.fromUnixTime(0)).total!"msecs";

auto main() {
  const token = readRequiredOption!string("token", "api authorization");

  ushort port = 8080;
  auto pubDir = "pub";
  readOption("port", &port, "listen port");
  readOption("pubDir", &pubDir, "pub dir location");

  auto settings = new HTTPServerSettings;
  settings.port = port;

  auto router = new URLRouter;
  router.get("*", serveStaticFiles(pubDir));

  ////

  Json[string] current;
  WebSocket[] socks;

  auto notify(string id) {
    auto data = current[id].to!string;
    socks = socks.filter!`a.connected`.array;
    socks.each!(sock => sock.send(data));
  }

  router.get("/ws", handleWebSockets(delegate(sock) {
    socks ~= sock;
    while(sock.connected) {
      auto msg = sock.receiveText;
      //
    }
  }));

  router.get("/api/lav", (req, res) {
    res.writeJsonBody(current.values);
  });
  router.post("/api/lav", (req, res) {
    try req.json;
    catch(JSONException) {
      import vibe.http.common: HTTPStatusException;
      throw new HTTPStatusException(HTTPStatus.badRequest, "invalid json");
    }

    enum fields = ["i", "id", "nick", "lav", "cores", "threads"];

    auto body = req.json.byKeyValue.assocArray;
    enforceHTTP(!fields.map!(i => i in body).canFind(null), HTTPStatus.badRequest, "missing field");
    enforceHTTP(body["i"].to!string == token, HTTPStatus.unauthorized, "authorization failed");

    const id = body["id"].to!string;
    const nick = body["nick"].to!string;

    const lav = body["lav"][]
      .map!(i => i.type == Json.Type.float_ ? i.to!double : i.to!long.to!double)
      .array;
    const cores = body["cores"].to!long;
    const threads = body["threads"].to!long;
    const lavRatio = lav[0] / real(threads);

    const status =
      lavRatio < 1 ? "ok" :
      lavRatio < 1.5 ? "still" :
      "busy";

    current[id] = [
      "id": Json(id),
      "nick": Json(nick),
      "status": Json(status),
      "lav": Json(lav.map!Json.array),
      "cores": Json(cores),
      "threads": Json(threads),
      "ts": Json(timestamp),
    ];

    res.writeBody("ok");

    notify(id);
  });

  listenHTTP(settings, router);
  runApplication;
}

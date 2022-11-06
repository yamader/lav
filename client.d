#!/usr/bin/env dub
/+ dub.sdl:
name "lav-client"
dependency "vibe-d" version="~>0.9"
dflags "-preview=shortenedMethods"
+/

import std;
import core.cpuid;
import vibe.d;

extern(C) int getloadavg(double* loadavg, int nelem);

auto lavg() {
  auto buf = new double[3];
  if(getloadavg(buf.ptr, 3) < 0)
    throw new Error("getloadavg failed");
  return buf;
}

auto main() {
  const token = readRequiredOption!string("token", "api authorization");

  auto id = Socket.hostName;
  auto nick = Socket.hostName;
  auto entrypoint = "http://localhost:8080/api/lav";

  readOption("id", &id, "id");
  readOption("nick", &nick, "nickname");
  readOption("entrypoint", &entrypoint, "api entrypoint");

  requestHTTP(entrypoint,
    (req) {
      req.method = HTTPMethod.POST;
      req.writeJsonBody([
        "i": Json(token),
        "id": Json(id),
        "nick": Json(nick),
        "lav": Json(lavg.map!Json.array),
        "cores": Json(coresPerCPU),
        "threads": Json(threadsPerCPU),
      ]);
    },
    (res) {
      res.statusCode.writeln;
    });
}

/**
 * @name index.ts
 * @version 2026-01-13
 * @summary Configuration
 **/

import defu from "defu"
import localConfig from "./local"

export default defu(localConfig, {
  debug: false,
  database: "",
  discord: { token: "", client_id: "", activity: "" },
  steam: { api_key: "" }
})
